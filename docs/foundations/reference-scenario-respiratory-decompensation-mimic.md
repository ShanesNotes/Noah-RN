# Reference Scenario: MIMIC-Grounded Respiratory Decompensation

## Governing Source

- Companion to: `docs/foundations/first-bedside-workflow-spec.md`
- SAC-1 reference implementation: `docs/foundations/scenario-authoring-contract-simulation-architecture.md`
- CCPS-1 partition enforcement: `docs/foundations/data-partition-contract-simulation-architecture.md`
- Kernel anchor: `docs/foundations/invariant-kernel-simulation-architecture.md` Appendix A
- Contract anchors: amendments T1, T2, T5, T6, D3, D5, D6, D7

## Purpose

This document is the **reference SAC-1 scenario specification**. It binds the first-bedside-workflow-spec timeline (ICU respiratory decompensation, 9 beats, 90 simulated minutes) to a MIMIC-IV source patient and produces the scenario authoring shape Lane B must consume. It is the first end-to-end validation that SAC-1 + CCPS-1 + all contract amendments hold together as a coherent system.

This is a **specification**, not a code deliverable. Lane B will translate this spec into whatever serialization format the loader consumes (JSON, YAML, or TypeScript DSL — SAC-1 is format-agnostic).

## Scope

- Fully-specified SAC-1 scenario fields for the respiratory-decompensation scenario.
- Crosswalk to `first-bedside-workflow-spec.md` 9 beats: for every beat, name the L0 change, L1 projection, L2 events, L3 writes by author, L4 obligation chain.
- Synthea fallback profile for when the MIMIC-IV candidate subject is not identified.
- Open questions gated on implementation.

## Source Patient Binding

### Candidate dataset

**MIMIC-IV (preferred).** MIMIC-IV provides real waveforms (via the MIMIC-IV Waveform Database cohort — 198 patients, 200 records, 250 Hz ECG, 125 Hz SpO2/ABP, 62.5 Hz respiratory impedance). For waveform-bound scenarios this is the substrate of choice. Discrete chartevents / labevents / noteevents / procedureevents come from the MIMIC-IV v2.2 (or later) FHIR projection.

### Candidate subject

**TBD (Open Question O1 from Session 1 plan, 2026-04-14).** Selection criteria:

- Post-operative ICU admission (ideally CABG, valve replacement, or abdominal surgery with significant third-spacing risk).
- Cardiopulmonary decompensation event during the ICU stay with:
  - Documented rising O₂ requirement (chartevents `O2_delivery_device` progression, SpO₂ drift).
  - Documented flash-pulmonary-edema-equivalent event (nursing note phrasing, BNP rise, CXR reading).
  - Lasix (furosemide) administration within the trajectory.
  - Vasopressor administration (norepinephrine preferred) before or during the event.
  - Intubation performed during the ICU stay, with RSI drug documentation.
- Subject has a waveform record in the MIMIC-IV Waveform cohort covering at least ±2 hours around the decompensation event.
- Stay length ≥ 48 hours (to give `history_window = full` meaningful content).

Candidate selection is a Lane B / SAC-1 loader task. The selected subject_id + icustay_id are recorded here once resolved.

### Cut-point (T=0)

Positioned **just before the flash-edema onset** in the source trajectory. Concretely: the first chartevents row within the stay showing SpO₂ ≤ 94% on the device configuration prior to escalation (the inflection point before the trajectory steepens). This produces:

- Historical region: full ICU stay from admission to cut-point (typically 6–36 hours, depending on subject).
- Post-T=0 region: the decompensation event itself plus 90 sim-minutes of continued trajectory.

### History window

`history_window.mode = "full"` (SAC-1 default). Includes:
- Admission H&P and surgical operative note (if present).
- All prior chartevents (vitals, assessments, I/O).
- All prior labevents.
- All prior medication administrations.
- All prior noteevents within the stay.
- Active problems/meds/allergies as they stand at cut-point.
- Last prior discharge summary (if the subject is in a cohort that has one).

All seeded under `agent.who = historical-seed` Provenance at the T=0 load pass (Contract 6 T6).

## SAC-1 Scenario Authoring Shape

The following is the specification the loader produces. Field names match SAC-1. Values marked **TBD-O1** are gated on subject selection.

### Metadata

```
id: respiratory-decompensation-mimic.v1
name: ICU Respiratory Decompensation (MIMIC-grounded)
description: >
  Post-op ICU patient decompensating with flash pulmonary edema, requiring
  diuresis, pressor titration, provider-assisted intubation. Grounded in a
  MIMIC-IV trajectory. First scenario exercising every contract surface.
version: 0.1.0
maturity: draft
```

### Grounded seed

```
source_patient:
  dataset: mimic-iv
  patient_id: TBD-O1             # MIMIC subject_id / icustay_id
  cut_point: TBD-O1               # ISO-8601 anchored to selected stay

history_window:
  mode: full

initial_engine_state:
  derive_from_source: true        # Pulse L0 initialized from patient state at cut_point
```

### Ordered cadence (Contract 7)

Mirrors typical post-op ICU orders. Adjusted against the source subject's documented orders during subject selection.

```
ordered_cadence:
  - { code: vitals.set,       display: "Vital signs q1h",        interval: PT1H }
  - { code: neuro.check,      display: "Neuro assessment q2h",    interval: PT2H }
  - { code: io.reconcile,     display: "I/O reconciliation q4h",  interval: PT4H }
  - { code: assessment.full,  display: "Full nursing assessment q4h", interval: PT4H }
```

### Provider schedule (Contract 6 D6)

Mixed scheduled + reactive. Scheduled entries seed the clinical narrative; reactive entries bind to Noah escalation tool calls.

```
provider_schedule:
  # Scheduled baseline — from post-T=0 source noteevents/labevents
  - { at: "PT12M",  author: provider, kind: note,
      payload: { title: "ABG result comment", code: provider-note-abg, body: "Acute hypoxemic respiratory failure, likely pulmonary edema. Recommend diuresis and close monitoring." } }
  - { at: "PT25M",  author: provider, kind: order,
      payload: { code: furosemide-order, dose: 40mg, route: IV, indication: "Acute pulmonary edema" } }
  - { at: "PT40M",  author: provider, kind: lab-result,
      payload: { code: bnp, value: TBD-from-source, units: pg/mL, interpretation: elevated } }

  # Reactive — respond to Noah escalation within latency window
  - { trigger: escalate_to_provider.intubation,
      author: provider,
      kind: reactive-response,
      latency_window: "PT5M/PT15M"
      decision_policy:
        - if: noah.escalation.context.pao2_fio2_ratio < 150
          decide: accept
          payload:
            - { kind: consult-note, body: "Accepting intubation request. Proceed with RSI." }
            - { kind: order, code: rsi-sequence, items: [propofol-100mg-iv, rocuronium-100mg-iv, fentanyl-100mcg-iv] }
            - { kind: order, code: vent-settings-initial, mode: AC-VC, tv: 6ml/kg-ibw, rr: 14, peep: 5, fio2: 1.0 }
        - if: noah.escalation.context.pao2_fio2_ratio < 200
          decide: modify
          payload:
            - { kind: consult-note, body: "Trial BiPAP first at 12/5, FiO₂ 80%. Reassess in 20 min. If no improvement, proceed to intubation." }
            - { kind: order, code: bipap-trial, settings: "IPAP 12 EPAP 5 FiO₂ 0.8 ×20min" }
        - default:
          decide: defer
          payload:
            - { kind: consult-note, body: "Pulm consult requested. Continue current support. Call me if worsens." }

  - { trigger: escalate_to_provider.pressor_consult,
      author: provider,
      kind: reactive-response,
      latency_window: "PT3M/PT10M"
      decision_policy:
        - default:
          decide: modify
          payload:
            - { kind: order, code: vasopressin-add, dose: 0.03U/min, indication: "Catecholamine-sparing adjunct" }
}
```

### Scenario timeline (engine-directed)

Derived from post-T=0 source rows classified as engine-input.

```
scenario_timeline:
  - { at: "PT10M",  kind: insult,       payload: { code: pulmonary-edema-onset, severity: 0.4 } }
  - { at: "PT20M",  kind: insult,       payload: { code: pulmonary-edema-flash, severity: 0.9 } }
  - { at: "PT30M",  kind: intervention, payload: { code: furosemide-administered, dose: 40mg, route: IV, source: nurse-action } }
  # Pressor titrations are routed from Noah's tool calls at runtime, not pre-scripted.
  # Intubation event is driven by the reactive provider accept path, not pre-scripted.
```

### Charting policy (amendment D3)

```
charting_policy:
  vitals.auto:            execute       # Noah autonomously validates preliminary→final during ordered cadence
  vitals.critical:        execute       # Same for critical-alarm-triggered readings
  medication.administered: propose      # MedAdmin drafts require provider attestation on critical paths
  assessment.narrative:   propose
  assessment.focused:     propose
  procedure.note:         prepare       # Noah drafts; provider attests to final
  escalation.request:     execute
  io.entry:               execute       # Urine output, intake
```

### Monitor-to-chart bridge

```
monitor_bridge:
  enabled: true
  cadence:
    hr: PT5M
    spo2: PT5M
    rr: PT5M
    nibp: PT15M              # Or when alarm triggers off-cycle
    temp: PT1H               # Aligned to q1h vitals ordered cadence
    etco2: PT5M              # After intubation only
  validation_window: PT15M   # Noah may validate preliminary within ±15 sim-minutes
  parameters: [hr, spo2, rr, nibp, temp, etco2]
```

### Termination (amendment M2)

```
termination_conditions:
  - { kind: elapsed,           criterion: "PT90M",                 outcome: eval_complete }
  - { kind: l0_threshold,      criterion: "asystole_sustained",    outcome: death }
  - { kind: l0_threshold,      criterion: "map_unrecoverable",     outcome: death }
  - { kind: eval_rubric_complete, criterion: "respiratory-decompensation.v1", outcome: eval_complete }
```

### Eval hooks (Contract 8)

```
eval_hooks:
  - { at_or_event: "T+20min",                      rubric_ref: "respiratory-decompensation.v1#flash-edema-recognition",        description: "Did Noah recognize and document deterioration within 5 min of flash-edema onset?" }
  - { at_or_event: "medication.furosemide.administered", rubric_ref: "respiratory-decompensation.v1#diuretic-timeliness",       description: "Time from flash-edema onset to Lasix administration." }
  - { at_or_event: "provider.reactive-response.intubation.accept", rubric_ref: "respiratory-decompensation.v1#intubation-escalation-timeliness", description: "Time from intubation criteria met to escalation accepted by provider." }
  - { at_or_event: "T+75min",                      rubric_ref: "respiratory-decompensation.v1#documentation-completeness",      description: "Obligation-resolution completeness at scenario end." }
  - { at_or_event: "post-intubation-30min",        rubric_ref: "respiratory-decompensation.v1#post-intubation-obligation-chain", description: "Tube placement verification, CXR obligation, capnography validation documented." }
  - { at_or_event: "alarm.attention-class.wake.fire", rubric_ref: "respiratory-decompensation.v1#attention-routing-response",    description: "Did Noah's attention shift within N clock ticks of a wake-class alarm?" }
```

## Crosswalk to First-Bedside-Workflow-Spec Beats

Each beat maps to exact L0/L1/L2/L3 state changes with authors. This mirrors and extends the per-beat author table in `first-bedside-workflow-spec.md`.

| Beat | Engine input (L0) | Monitor projection (L1) | L2 events | L3 writes by author | L4 obligations triggered |
|------|-------------------|-------------------------|-----------|---------------------|--------------------------|
| T=0 | Initial state from `source_patient.cut_point` | `device-auto` preliminary stream begins | Baseline labs seeded as `historical-seed` at T=0 load | All history under `historical-seed`; `device-auto` preliminaries begin | q1h vitals, q4h I/O, q2h neuro (from `ordered_cadence`) |
| T=10–15 | Respiratory demand rising (scenario_timeline `PT10M`) | SpO₂ alarm low-priority, `attention_class: ambient` | — | `noah-nurse` validates preliminary vitals; optional judgment narrative | Judgment-driven observation obligation accumulates |
| T=20–25 | Flash pulmonary edema (scenario_timeline `PT20M`) | SpO₂ alarm high-priority, `attention_class: wake`; RR alarm medium `notify`; MAP alarm low `ambient` | ABG eligibility released at `PT22M`; CXR order released | `noah-nurse` focused respiratory assessment (propose); provider-scheduled ABG note arrives at `PT12M` actually — see note below | New event-driven chain: O₂ support + RT + provider-notify |
| T=30 | Lasix intervention (scenario_timeline `PT30M`, sourced from nurse-action — Noah's tool call) | No immediate L1 change; onset delay before urine response | MedicationAdministration released | `noah-nurse` MedicationAdministration (`propose` per policy); nurse-approval gate simulated | **New post-Lasix chain:** output checks 30m/1h/2h/4h, BMP 4–6h |
| T=30–45 | Preload drop → MAP drift | MAP alarm medium `notify`; tachycardia alarm | — | `noah-nurse` q5min vitals validation; I/O narrative | **New q5min MAP on pressor** chain |
| T=45–55 | Pressor titration (Noah action); ABG eligible | MAP alarm resolves; SpO₂ persists | ABG result released at `PT50M` | `noah-nurse` MedAdmin for titration; provider-scheduled repeat ABG note; ABG result flows with Provenance | Judgment-driven provider-notify obligation |
| T=55–65 | — (no engine change from escalation itself) | — | `escalate_to_provider.intubation` tool call fires; provider reactive path evaluates; accept/modify/defer decision | `noah-nurse` authors escalation request note; `provider` reactive writes consult acceptance note + RSI order set (on `accept`) or BiPAP trial order (on `modify`) | **New escalation-callback obligation chain** |
| T=65–75 | RSI administration + intubation; positive-pressure ventilation begins | Capnography preliminary stream begins; SpO₂ recovers; alarm profile shifts | Procedure resource released; RSI MedAdmins released; vent-settings order released | `noah-nurse` RSI MedAdmins + post-intubation vitals validation + capnography validation; `provider` attests to procedure note (policy `procedure.note: prepare`); `device-auto` capnography preliminaries begin | **New post-intubation chain:** tube placement, post-intubation CXR at T+30min, etCO₂ confirmation, sedation follow-up |
| T=75–90 | Stabilized or deteriorating branch | Alarm de-escalation or new cascade | Per branch (second escalation possible) | `noah-nurse` continued validation + any second-escalation request; `provider` attests if re-escalated; `scenario-director` authors iatrogenic-pneumothorax event on the authored deteriorating branch | Standard post-intubation or second escalation chain |

Note on T=20–25 vs T=12: the scheduled provider ABG note at `PT12M` in the `provider_schedule` is timed to precede the flash-edema onset at `PT20M`. In the source MIMIC trajectory, the provider's ABG interpretation note is typically written during the approach to decompensation. The exact offset is subject-specific and is tuned during Session 2 / Lane B loader development.

## Synthea Fallback Profile

If no clean MIMIC subject is identifiable during SAC-1 reference-scenario authoring, a Synthea generation profile can substitute:

- **Synthea generation parameters:** post-operative ICU module invoked with CABG or valve-replacement setting; respiratory-failure module triggered at ICU day N; comorbidities: HF with reduced EF, CKD stage 3.
- **Limitations:** Synthea does not produce waveform data — the monitor bridge for a Synthea-grounded run would either synthesize waveforms via the Pulse engine at runtime or rely on waveform template synthesis scaled to the Synthea-derived vitals (per wiki `dual-source-waveform-pipeline`).
- **Acceptability:** Synthea is a secondary option; MIMIC is strongly preferred for the reference scenario because it anchors the scenario to real clinical reasoning documented by real nurses. Synthea remains viable for additional scenario variants where waveform fidelity is less critical (e.g., endocrine or infectious scenarios added later).

## Acceptance Criteria

- [ ] Source subject_id + icustay_id resolved and recorded (closes O1).
- [ ] Full SAC-1 scenario file authored and passes SAC-1 validator.
- [ ] T=0 load pass produces a Medplum chart baseline whose resource set exactly matches the extracted `history_window` (CCPS-1 cross-instance isolation precondition).
- [ ] Engine initializes L0 from the patient's state at `cut_point` (Lane A verification).
- [ ] Scenario runs under accelerated clock end-to-end; every beat in the crosswalk table produces the expected L0/L1/L2/L3 signature.
- [ ] The reactive provider path fires at T=55–65 within `latency_window` for each of the three decision-policy branches (tested by varying the escalation payload).
- [ ] The T=20–25 `wake`-class alarm produces a trace-visible attention shift.
- [ ] Every chart write at runtime carries `agent.who` in the closed D5 set; no `historical-seed` runtime writes.
- [ ] All eval hooks fire and produce rubric-scored results.
- [ ] CCPS-1 leak detectors (FM-1 through FM-9) report no violations.

## Open Questions

- **O1:** Source subject_id + icustay_id selection. Gated on Lane B loader development or manual selection during SAC-1 authoring.
- **ABG note timing:** exact offset from cut-point for the scheduled ABG note; tune during loader development.
- **Decision-policy thresholds:** PaO₂/FiO₂ thresholds (150 / 200) are clinically reasonable defaults; subject-specific tuning may adjust.
- **Iatrogenic branch:** whether the T=75–90 deteriorating branch includes the scenario-director-authored iatrogenic pneumothorax event by default, or only on explicit scenario variant.

## Provenance

- **Companion spec:** `docs/foundations/first-bedside-workflow-spec.md`
- **Authoring contract:** `docs/foundations/scenario-authoring-contract-simulation-architecture.md` (SAC-1)
- **Partition contract:** `docs/foundations/data-partition-contract-simulation-architecture.md` (CCPS-1)
- **Contract amendments:** T1, T2, T5, T6, D3, D5, D6, D7 (Amendments Log 2026-04-14)
- **Wiki grounding:** `wiki/concepts/dual-source-waveform-pipeline.md`, `wiki/entities/mimic-iv-waveforms.md`, `wiki/concepts/alarm-mediated-attention-routing.md`, `wiki/concepts/intervention-linked-documentation-chain.md`
