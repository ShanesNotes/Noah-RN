# Encounter Validation: Simulation Architecture Contracts

## Governing Artifacts

- Foundational contracts: `docs/foundations/foundational-contracts-simulation-architecture.md`
- Invariant kernel: `docs/foundations/invariant-kernel-simulation-architecture.md`
- PRD: `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`

This is the Lane 3 deliverable. Two encounters — one primary, one adversarial — validate that the nine contracts support the required architecture behaviors.

## PRD Validation Requirements

Every encounter must demonstrate:

- [ ] Hidden truth evolving over time
- [ ] Live monitor divergence from charted record
- [ ] At least one released source event
- [ ] At least one Noah-RN charting path governed by policy
- [ ] At least one obligation or follow-up pressure event
- [ ] Time acceleration or skip-ahead semantics
- [ ] At least one action feeding back into hidden patient truth or future obligations

---

## Primary Encounter: Septic Shock with Pressor Titration

### Clinical Synopsis

**Patient:** 67F, 78kg, PMH: DM2, HTN, CKD3. Admitted from ED with urosepsis. Current: intubated, sedated, on norepinephrine infusion.

**Shift context:** Noah-RN is supporting a night shift nurse who received this patient at 1900. The patient was relatively stable on arrival but deteriorates over the next 4 hours. The encounter covers 1900–2300 (4 simulated hours, runnable in minutes under acceleration).

### Timeline

| Sim Time | L0 (Hidden Truth) | L1 (Monitor) | L2 (Events) | L3 (Chart) | L4 (Obligations) |
|----------|-------------------|--------------|-------------|------------|-------------------|
| **T+0min** (1900) | MAP 68, HR 95, SpO2 96, lactate 2.8, temp 38.6. Norepi at 0.06 mcg/kg/min. | Monitor shows: MAP 68, HR 95, SpO2 96, EtCO2 34. Sinus tachycardia. | Shift handoff received. Prior nurse charted MAP 72 at 1845. | L3 shows MAP 72 (stale — charted 15min ago). Norepi at 0.06 documented. | Ordered: q1h vitals. q4h neuro. q1h I&O. Event: Shift assessment due within 1h of assuming care. |
| **T+20min** | Lactate rising to 3.4 (not yet resulted). MAP drifting to 64. | MAP 64, trend visible on monitor. No alarm yet (threshold 60). | — | L3 still shows MAP 72 from prior nurse. **Gap: monitor ≠ chart.** | q1h vitals due at 2000. |
| **T+30min** | MAP 61. Lactate 3.8 (resulted at lab). | MAP 61. **Low MAP alarm fires** (threshold 60, medium priority). HR 102. | Lab released: lactate 3.8 mmol/L, WBC 18.2, creatinine 2.1. | Agent sees alarm. Nurse verifies patient. | Alarm response obligation: acknowledge + assess within 5min. Lab review obligation: lactate, WBC, Cr. |
| **T+35min** | MAP 59 (continuing drift). | MAP 59. Alarm continues. SpO2 waveform shows motion artifact from nurse assessment. | — | **Charting decision point #1:** Noah-RN reads L1 (MAP 59), reads L3 (MAP 72 stale). Agent must decide: propose charting current MAP? Prepare a note about trending? Escalate the MAP trend? | Alarm still unresolved. Lab review pending. |
| **T+40min** | — | SpO2 artifact resolves. Motion was from repositioning. | — | **Charting action:** Noah-RN `prepare`s a vitals entry (MAP 59, HR 102) with authority state `prepare`, status `preliminary`. Nurse reviews on-screen. | Vitals obligation partially resolved (pending nurse validation). |
| **T+45min** | Nurse validates. MAP charted as 59 (final). | — | — | **L3 updated:** MAP 59, HR 102, SpO2 96 charted with provenance: source L1, agent-prepared, nurse-validated. Lactate 3.8 reviewed and charted. | Vitals obligation resolved. Lab review resolved. New: reassess MAP in 15min (event-driven, not ordered). |
| **T+55min** | MAP 55. Lactate 4.2 (not yet resulted). Renal output dropping. | MAP 55. **MAP alarm escalates to high priority.** HR 108. | — | L3 shows MAP 59 (10min stale). | **Obligation storm:** MAP reassessment overdue. q1h vitals approaching. Agent must triage. |
| **T+60min** | — | — | — | **Charting decision point #2:** Noah-RN proposes: "MAP trending down 68→64→61→59→55 over 60min despite norepi 0.06. Recommend titration." Authority: `propose`. | q1h vitals now due. MAP reassessment overdue. |
| **T+65min** | **Intervention:** Nurse titrates norepi 0.06 → 0.10 mcg/kg/min. | Norepi rate change visible on pump display. | MedicationAdministration: norepi dose change. | Agent `prepare`s medication documentation. Nurse validates. | **Follow-up tree created:** Vasopressor titration → q5min MAP ×6 (at T+70, T+75, T+80, T+85, T+90, T+95). |
| **T+70min** | MAP 54 (onset lag — norepi hasn't peaked yet). | MAP 54. Agent sees MAP hasn't improved yet. | — | **Charting decision point #3:** Agent must chart MAP 54 (first q5min follow-up) while understanding this is within expected onset window. Authority: `prepare`. | First q5min MAP obligation due. Five more pending. |
| **T+80min** | MAP 60 (norepi onset taking effect). Lactate 4.2 resulted. | MAP 60. Trend turning. Alarm clears (MAP > threshold). | Lab released: lactate 4.2 (worsening despite fluid). | Agent charts MAP 60. Notes improving trend. Reviews lactate — considers proposing second-line vasopressor. | Third q5min MAP obligation due. Lab review obligation created. |
| **T+100min** | MAP 66 (norepi at steady state for 0.10). | MAP 66. Stable. | — | Agent charts MAP 66. Trend note: "MAP responding to norepi titration 0.06→0.10." | Last q5min obligation resolving. Ordered q1h vitals cycle resumes. |
| **T+120min** | MAP 64 (slight drift — underlying sepsis progression). Lactate 4.5 (not yet resulted). | MAP 64. | — | **Judgment-driven charting:** Agent notices MAP drifting again despite stable norepi dose. Prepares a clinical note: "MAP 64, slight downtrend. Lactate trend 2.8→3.8→4.2. May need further escalation." Authority: `prepare`. | **Above-cadence documentation.** This is CONCERN-style clinical vigilance. |

### Contracts Exercised

| Contract | How Exercised |
|----------|--------------|
| **1. Patient Truth** | L0 evolves continuously: MAP drifts, lactate rises, norepi onset lag, renal output drops. All emergent. |
| **2. L0–L4 Projection** | MAP 72 in chart while monitor shows 64 (T+20). Lab resulted at L0 before released at L2 (T+30). Obligations derive from L2/L3, not L0. |
| **3. Clock** | 4-hour encounter runs under acceleration. q5min obligations fire on simulation time. Onset lag is clock-aware. |
| **4. Monitor/Alarm/Artifact** | MAP alarm fires at threshold (T+30). SpO2 motion artifact during assessment (T+35). Alarm escalation (T+55). |
| **5. Charting Authority** | Three `prepare` actions (T+40, T+65, T+70). One `propose` (T+60 — titration recommendation). One judgment-driven `prepare` (T+120). Nurse validates → `final`. |
| **6. Scenario/Intervention** | Norepi titration at T+65 with onset lag. MAP doesn't improve until T+80. Iatrogenic: not in this encounter (see adversarial). |
| **7. Obligations** | Ordered cadence (q1h vitals). Event-driven tree (q5min MAP ×6 post-titration). Judgment-driven (above-cadence note at T+120). Obligation storm at T+55. |
| **8. Eval/Trace** | L0/L3 divergence scoreable at T+20 (chart stale). Alarm response timing scoreable. Obligation resolution timing scoreable. Waveform vision: SpO2 artifact at T+35 requires waveform inspection to distinguish from desaturation. |
| **9. Research-Hook** | Not triggered. Current engine requirements (MAP response to norepi, lactate trending) are within Pulse's validated capabilities. |

### PRD Checklist

- [x] Hidden truth evolving over time — continuous MAP drift, lactate rise, renal output change
- [x] Live monitor divergence from charted record — MAP 64 on monitor vs 72 in chart at T+20
- [x] At least one released source event — lactate results at T+30 and T+80
- [x] At least one Noah-RN charting path governed by policy — `prepare` → nurse validation → `final` (3 instances)
- [x] At least one obligation or follow-up pressure event — q5min MAP ×6 tree, obligation storm at T+55
- [x] Time acceleration or skip-ahead semantics — 4h encounter runs under N× acceleration
- [x] At least one action feeding back into hidden patient truth — norepi titration changes L0 MAP trajectory

---

## Adversarial Encounter: Artifact vs. Deterioration with Approval-Gated Charting

### Clinical Synopsis

**Patient:** 54M, 92kg, PMH: obesity, OSA, A-fib (rate-controlled). Post-op day 1, open cholecystectomy complicated by bile leak. Current: on telemetry, PCA for pain, IV antibiotics. Not intubated.

**Adversarial focus:** This encounter attacks three failure-prone edges simultaneously:
1. **Artifact vs. deterioration** — Is the SpO2 drop real or motion artifact? Is the rhythm change A-fib with RVR or lead artifact?
2. **Approval-gated charting** — Agent identifies a critical finding but lacks `execute` authority. Must navigate the propose/prepare/escalate path under time pressure.
3. **Intervention lag** — Intervention is applied but physiological response is delayed. Agent must manage uncertainty during the lag window.

### Timeline

| Sim Time | L0 (Hidden Truth) | L1 (Monitor) | L2 (Events) | L3 (Chart) | L4 (Obligations) |
|----------|-------------------|--------------|-------------|------------|-------------------|
| **T+0min** | HR 82 (A-fib, rate-controlled with diltiazem), SpO2 94, RR 18, MAP 78, temp 37.8. Bile leak causing slow peritoneal irritation. | A-fib on ECG. SpO2 94. All parameters within threshold. | Shift handoff. Prior assessment: "comfortable, PCA adequate." | Chart current. Diltiazem 30mg PO q6h documented. Last vitals 30min ago. | Ordered: q4h vitals. PCA usage review q4h. Antibiotic due at T+60. |
| **T+15min** | Peritoneal irritation increasing. HR creeping to 88. Patient shifting in bed (pain). | **SpO2 drops to 87 for 8 seconds, then recovers to 93.** SpO2 alarm fires (low priority). ECG shows motion artifact overlaying A-fib. | — | — | SpO2 alarm response obligation. |
| **T+16min** | SpO2 is actually 93 (the 87 was motion artifact from patient shifting). HR 88 (real — mild tachycardia from pain/irritation). | SpO2 93 (recovered). ECG artifact resolved. **This is the critical decision point:** Was the SpO2 dip real desaturation or artifact? | — | **Agent must inspect waveform.** Plethysmography waveform during the dip shows low amplitude, irregular morphology (classic motion artifact). ECG strip shows baseline wander consistent with movement, not rhythm change. | Agent must resolve alarm obligation. |
| **T+17min** | — | — | — | **Charting decision:** Agent `prepare`s alarm response note: "SpO2 transient dip to 87, pleth waveform consistent with motion artifact during patient repositioning. SpO2 recovered to 93. Patient assessed, no respiratory distress." Authority: `prepare`. | Alarm obligation resolved. |
| **T+45min** | **Actual deterioration begins.** Bile peritonitis progressing. HR climbing: 94→102 over 15 min. SpO2 drifting: 93→91. Temp rising to 38.4 internally (not yet reflected in spot check). | HR 102. SpO2 91 (real this time — splinting, shallow breathing from peritoneal pain). ECG shows A-fib rate increasing. **SpO2 alarm fires again.** | — | L3 shows HR 82, SpO2 94 from T+0 assessment (stale). | SpO2 alarm obligation. q4h vitals approaching. |
| **T+47min** | SpO2 continues at 91. HR 104. | SpO2 91 sustained. **Plethysmography waveform is clean this time** — good amplitude, regular morphology. This is real desaturation, not artifact. | — | **Agent must inspect waveform again.** This time pleth shows clean signal. Agent recognizes: unlike T+15, this is real. **Charting decision:** Agent wants to chart "SpO2 91, real desaturation, recommend assessment" but this is a clinical finding that may trigger a care escalation. Authority ceiling for autonomous charting of clinical assessments: `propose` only. | Alarm obligation requires action. Agent must propose assessment to nurse. |
| **T+50min** | HR 108. SpO2 90. A-fib rate increasing (diltiazem wearing off + stress response). | **New alarm: HR >100 (medium priority).** Two simultaneous alarms. ECG shows A-fib with RVR (rate 108). | — | **Approval-gated charting:** Agent `propose`s: "A-fib with RVR, HR 108. SpO2 90, clean pleth — real desaturation. Trending: HR 82→102→108, SpO2 94→91→90. Recommend provider notification." Agent cannot `execute` this — it's a clinical assessment requiring nurse review. | **Obligation storm:** SpO2 alarm, HR alarm, proposed assessment awaiting nurse review. |
| **T+55min** | HR 112. ABG at L0: pH 7.33, PaCO2 48. | HR 112. SpO2 89. | — | **Nurse reviews agent proposal.** Agrees. Validates assessment to `final`. Nurse calls provider. Provider orders: IV diltiazem 10mg, repeat ABG, portable CXR. | Orders generate new obligations: medication administration, ABG follow-up, CXR follow-up. |
| **T+60min** | **Intervention:** IV diltiazem 10mg administered. Onset: 2-5 minutes for rate effect. | HR still 112 (onset lag). SpO2 89. | MedicationAdministration: IV diltiazem. | Agent `prepare`s medication documentation. Nurse validates. **Agent must not chart "rate controlled" yet — onset lag.** | **Follow-up tree:** IV diltiazem → q5min HR/rhythm check ×4. Antibiotic also due (competing obligation). |
| **T+63min** | HR 106 (diltiazem onset beginning). | HR 106. Slight rate decrease visible on trend. | — | **Intervention lag window:** Agent charts HR 106 at first follow-up. Notes: "HR trending down post-diltiazem, onset in progress." Does NOT chart "rate controlled" — premature. | First q5min HR check resolved. Antibiotic overdue (was due at T+60, nurse giving diltiazem instead). |
| **T+70min** | HR 92 (diltiazem effective). SpO2 91 (improving slightly with better cardiac output). ABG resulted at lab. | HR 92. SpO2 91. | Lab released: ABG pH 7.33, PaCO2 48, PaO2 72, HCO3 22. | Agent charts HR 92, notes rate control achieved. Reviews ABG — mild respiratory acidosis with hypoxemia. `propose`s: "Consider supplemental O2 or respiratory therapy assessment." | q5min HR checks resolving. ABG review obligation. Antibiotic still overdue. CXR pending. |
| **T+75min** | — | — | CXR resulted. | **Multiple competing obligations:** ABG documented, CXR review needed, antibiotic still not given, next q5min HR check due. Agent must triage and communicate priorities to nurse. Agent `escalate`s antibiotic delay: "Antibiotic was due at T+60, currently 15min overdue due to concurrent diltiazem administration." | Agent explicitly prioritizes and documents triage rationale. |

### Adversarial Edges Tested

#### Edge 1: Artifact vs. Deterioration

At T+15, SpO2 drops to 87 with artifact-quality pleth waveform — agent must use waveform vision to identify motion artifact. At T+45, SpO2 drops to 91 with clean pleth waveform — agent must use waveform vision to confirm real desaturation. The same parameter, the same alarm, two different clinical realities. Without the waveform vision contract (Contract 4, enforced by `sim-harness-waveform-vision-contract.md`), the agent cannot distinguish these cases.

**Contracts stressed:** 4 (Monitor/Alarm/Artifact), 8 (Eval — waveform vision usage as scored dimension).

#### Edge 2: Approval-Gated Charting Under Time Pressure

At T+47, agent identifies real desaturation. At T+50, agent identifies A-fib with RVR and wants to document a clinical assessment + provider notification recommendation. Agent lacks `execute` authority for clinical assessments — must `propose` and wait for nurse review (T+55). During the 5-minute wait, the patient continues deteriorating (HR 108→112). The architecture must preserve the approval gate even under time pressure.

**Contracts stressed:** 5 (Charting Authority — `propose` → nurse approval → `final`), 7 (Obligations — alarm obligations accumulate during the approval wait).

#### Edge 3: Intervention Lag

At T+60, IV diltiazem administered. HR doesn't respond until T+63 and doesn't reach target until T+70. During the lag window, agent must chart honestly ("onset in progress") rather than prematurely claiming success. Concurrently, the antibiotic obligation becomes overdue because the nurse is busy with the diltiazem.

**Contracts stressed:** 6 (Scenario/Intervention — onset lag), 7 (Obligations — competing obligations, explicit triage), 1 (Patient Truth — continuous evolution during lag).

### PRD Checklist

- [x] Hidden truth evolving over time — bile peritonitis progression, HR/SpO2 deterioration, diltiazem onset
- [x] Live monitor divergence from charted record — HR 82 in chart while monitor shows 102 at T+45
- [x] At least one released source event — ABG and CXR results
- [x] At least one Noah-RN charting path governed by policy — `propose` for clinical assessment (T+50), `escalate` for overdue antibiotic (T+75)
- [x] At least one obligation or follow-up pressure event — diltiazem q5min HR checks, overdue antibiotic, competing obligations at T+75
- [x] Time acceleration or skip-ahead semantics — 75-minute encounter under acceleration
- [x] At least one action feeding back into hidden patient truth — diltiazem changes HR trajectory at L0

---

## Uncovered Gaps

These scenarios do not validate:

1. **Multi-patient pressure.** Both encounters are single-patient. Real ICU nurses manage 1–2 patients simultaneously. Multi-patient obligation interleaving is not tested.
2. **Shift handoff as a workflow event.** The encounters start at handoff but don't exercise the handoff-out (end of shift with pending obligations).
3. **Agent-executed charting.** Neither encounter exercises the `execute` authority state. Both use `prepare` and `propose`. A scenario where policy explicitly permits autonomous agent charting (e.g., auto-documenting device-sourced vitals with device provenance tag) is not tested.
4. **Death or code scenario.** Neither encounter reaches cardiac arrest or death. The architecture must support scenario termination, but it's not validated here.
5. **Frozen/manual clock mode.** Both encounters use accelerated mode. Frozen mode (for golden tests) is not exercised.
6. **Skip-ahead with intermediate computation.** Acceleration is tested but explicit skip-ahead (jump to T+60 from T+0) is not.
7. **Waveform-dependent rhythm claim.** The adversarial encounter tests SpO2 pleth interpretation but not ECG rhythm interpretation (e.g., distinguishing V-tach from SVT with aberrancy by QRS morphology).

These gaps should be addressed by additional validation encounters during Lane 4 (consistency review) or deferred to implementation-phase acceptance testing.

---

## Provenance

- **Governing contracts:** `docs/foundations/foundational-contracts-simulation-architecture.md`
- **Clinical grounding:** Septic shock pressor titration is a standard ICU scenario. Post-op bile peritonitis with A-fib RVR is a common surgical ICU admission. Pharmacokinetics (norepi onset 2–5min, diltiazem IV onset 2–5min) from standard clinical references.
- **Adversarial design:** Artifact vs. deterioration edge drawn from Drew 2014 alarm data and `wiki/sources/2026-04-13-simulation-vision-and-icu-charting-reality.md`. Approval-gated charting edge drawn from Collins et al. 2018 nurse documentation patterns.
