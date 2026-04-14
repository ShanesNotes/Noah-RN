# First Bedside Workflow Spec: Decompensating ICU Respiratory Distress

## Purpose

Lock the first bedside workflow that forces the Clinical Simulation Harness runtime open. This spec is the shared north star for execution-packet Lanes A–F: it names the clinical content, binds each beat to the projection layer surfaces it exercises, states the physiology-engine fidelity requirements, and derives per-lane acceptance criteria from one coherent encounter.

All downstream runtime work validates against this spec rather than against contract acceptance criteria in isolation.

## Governing alignment

- `docs/foundations/invariant-kernel-simulation-architecture.md` — 8 kernel invariants.
- `docs/foundations/foundational-contracts-simulation-architecture.md` — 9 contracts (amended 2026-04-13 with D1–D4, M1–M3).
- `docs/foundations/encounter-validation-simulation-architecture.md` — primary + adversarial validation encounters. This spec is a third validation encounter with a different pressure profile (respiratory-led decompensation with escalation, not septic shock).
- `docs/foundations/execution-packet-simulation-architecture.md` — Lanes A–F.
- `TASKS.md` item 9 — first bedside workflow needing live vitals. This spec satisfies that gate.
- `services/sim-harness/src/engine-adapter.ts` — Lane A engine adapter boundary.
- `services/sim-harness/src/clock.ts` — Lane A simulation clock.

## The workflow

A normal ICU patient deteriorates across a shift with a cardiopulmonary decompensation that the nurse-agent must recognize, treat, document, and escalate. The scenario intentionally spans every documentation mode (ordered cadence, event-driven, judgment-driven), every intervention class (medication titration, medication one-shot, procedure), every alarm priority, and the first human-in-loop escalation to a provider for intubation.

### Clinical shape

- Baseline: stable post-op ICU patient, weaning support, no pressors initially or low-dose vasopressor, reasonable respiratory status.
- Progression: rising O₂ demand → flash pulmonary edema → diuretic administration → concurrent BP drop requiring pressor titration → persistent hypoxemia despite diuresis → escalation to provider for intubation consult → intubation performed → stabilization or continued deterioration branch.
- Shift envelope: ~90 simulated minutes under an accelerated clock for eval; same scenario runnable wall-clock for demo; runnable frozen-mode tick-by-tick for golden tests.

### Why this workflow

- **Every contract surface stressed.** Single-scenario integration test for the entire runtime stack instead of disjoint per-lane harnesses.
- **First Contract 9 (Research-Hook) trigger.** Forces a decision on the L0 physiology engine: the reference PK adapter only models MAP/HR; this scenario needs respiratory coupling. See §Physiology fidelity requirements.
- **First human-in-loop event.** Provider consult → accept → intubation is the first timeline beat that introduces a non-agent actor into the scenario state. Validates Contract 6's handling of external-actor interventions and Contract 7's escalation lifecycle.
- **Alarm cascade.** Multiple concurrent alarms across respiratory, hemodynamic, and technical priorities. First operational use of IEC 60601-1-8 priority tagging.
- **I/O charting.** First high-frequency nurse/agent-entered numeric stream with clinical significance (post-Lasix output → fluid balance → preload → BP response loop). Exercises Contract 5's `charting_policy` amendment D3 at real cadence.

## Timeline beats

Minute markers are scaffold. Actual release times are scenario-controller decisions under the two-stage authority model (amendment D2). Each beat describes the L0 state shift, the L1 projection response, the L2 events released, the L3 charting obligations surfaced, and the L4 obligation chains triggered or resolved.

### T = 0 — Baseline

- **L0 state:** post-op ICU day 1. HR 82, MAP 72, SpO₂ 96% on 2L NC, RR 18, temp 37.1, reasonable lung compliance, euvolemic, no active pressors (or low-dose norepinephrine 0.04 mcg/kg/min as pre-existing baseline). No insults active.
- **L1 projection:** numeric telemetry nominal. Ring buffer seeded. No alarms. Signal quality good on all channels.
- **L2 events:** baseline labs already resulted (BMP, CBC). No new events.
- **L3 chart:** admission note present, prior q1h vitals charted, baseline I/O established.
- **L4 obligations:** q1h vitals (ordered cadence), q4h I/O reconciliation (ordered cadence), q2h neuro check (ordered cadence, but not stress-tested in this scenario).

### T = 10–15 — Respiratory demand rising

- **L0 state:** lung-compliance drift begins; fluid accumulation in interstitial space; SpO₂ drifts from 96% → 92%; RR 18 → 22; slight tachycardia response (HR 82 → 92). No overt pulmonary edema yet.
- **L1 projection:** low-priority alarm on SpO₂ (threshold cross below 94%); RR trend visible; waveform pleth amplitude marginal but not artifacted. Agent observes rhythm remains NSR.
- **L2 events:** (none yet — physiology changes alone, no lab or imaging trigger).
- **L3 charting obligations:** q1h vitals due soon; judgment-driven opportunity to chart observation ("increased respiratory effort noted").
- **L4 obligations:** if agent does not chart the trend or act, judgment-driven obligation starts accumulating pressure (eval-scored, not enforced at L4).

### T = 20–25 — Flash pulmonary edema onset

- **L0 state:** pulmonary capillary wedge pressure rises acutely; fluid crosses into alveoli; SpO₂ drops 92% → 86% on current O₂; RR 22 → 28; crackles (represented as a state flag, not a waveform); BP begins to drift (MAP 72 → 65) from PEEP-equivalent effects + reduced venous return + reflex response.
- **L1 projection:** **high-priority** SpO₂ alarm (threshold + rate of change); medium-priority RR alarm; low-priority MAP trend alarm. Pleth waveform amplitude degrades (true physiology, not artifact — signal quality remains good). Capnography not yet available (not intubated).
- **L2 events:** scenario controller releases an ABG draw opportunity (eligibility threshold from L0 pH drift); stat CXR order becomes scenario-available via timeline.
- **L3 charting obligations:** event-driven charting obligation triggered by SpO₂ alarm (Collins 2018 pattern — alarm → assessment charting). Agent should propose a focused respiratory assessment entry.
- **L4 obligations:** **new event-driven chain:** (a) increase O₂ support and chart it, (b) call RT for NIV setup, (c) notify provider of deterioration. Each is an independent obligation with its own due window. Ordered cadence q1h vitals now effectively q5–15min because of the clinical decision boundary.

### T = 30 — Lasix administered

- **Agent/nurse action:** 40 mg IV furosemide (Lasix). Routed as `EngineInterventionMedication` through the engine adapter.
- **L0 state:** diuretic onset begins (reference PK has onset delay; real engine has renal + preload coupling). Over t+10–30 min, urine output should rise markedly; preload drops; pulmonary capillary pressure falls; SpO₂ slowly recovers if fluid responsive; MAP may drop further due to preload reduction.
- **L1 projection:** no immediate vital change (Lasix is not instantaneous); signal quality unchanged.
- **L2 events:** MedicationAdministration eligible; scenario controller releases it as an L2 event that flows to L3 as a charted medication admin record with Provenance.
- **L3 charting:** agent executes (or proposes) the MedicationAdministration chart entry per the scenario's `charting_policy` field. Nurse-approval gate depends on the policy setting.
- **L4 obligations:** **new event-driven chain from Lasix** (per Contract 7 example): output check at 30 min, 1 h, 2 h, 4 h after administration; BMP recheck at 4–6 h; assess for ototoxicity if repeated dosing. Each is a distinct obligation with a simulation-time deadline. First chain that stresses the obligation queue under real cadence.

### T = 30–45 — Pressor need rising

- **L0 state:** preload drop from Lasix + distributive drift drops MAP toward 60 despite existing low-dose pressor; HR compensates. SpO₂ begins modest recovery from diuresis but still in 87–90% range.
- **L1 projection:** medium-priority MAP alarm (threshold below 65); tachycardia alarm; SpO₂ alarm persists.
- **L2 events:** (none released this window unless agent orders labs).
- **L3 charting:** vitals flowsheet entries accelerate to q5 min on pressor titration (ordered cadence intensifies); I/O entry for urine output crossing a threshold (e.g., 500 mL in 30 min) is a judgment-driven discretionary chart but clinically significant.
- **L4 obligations:** **new ordered-cadence chain — q5min MAP** while titrating pressor (Contract 7 pattern). Concurrent with Lasix output-check chain. Obligation queue now has three active chains + baseline. Accelerated clock will make this overflow the agent's attention budget unless triaged — that is the intended pressure.

### T = 45–55 — Pressor titration + continued hypoxia

- **Agent action:** titrate norepinephrine (existing drug or start new). Routed as `EngineIntervention` of kind `medication`.
- **L0 state:** MAP stabilizes in 65–70 range after onset delay (reference PK Hill-equation + tau); SpO₂ remains 87–90% — diuresis helping but insufficient; rising CO₂ (if engine models respiratory; reference PK does not).
- **L1 projection:** MAP alarm resolves; SpO₂ alarm persists at high priority; if engine supports, etCO₂ alarm becomes available; waveform pleth still degraded.
- **L2 events:** stat ABG result releases (eligibility from L0 pH/CO₂/pO₂; controller-released with lab-processing delay). pO₂ / pCO₂ / pH values drive the intubation decision boundary.
- **L3 charting:** MedicationAdministration entries for titration; vitals q5min continues; ABG result flows to chart with Provenance; judgment-driven narrative on respiratory trajectory.
- **L4 obligations:** q5min MAP chain continues; post-Lasix output checks still active; **new judgment-driven obligation surfaces: provider notification for failure to improve.** This is the first obligation the agent cannot resolve alone.

### T = 55–65 — Escalation to provider

- **Agent action:** request provider consult for possible intubation. Routed as a Contract 7 escalation event. Not a charting authority the agent has unilaterally.
- **L0 state:** no direct change from the escalation itself.
- **L1 projection:** no change.
- **L2 events:** scenario controller releases a `provider-consult-requested` event; after a scenario-controlled delay (representing provider response latency, e.g., 3–8 sim minutes) releases `provider-consult-accepted` or `provider-consult-redirected` event.
- **L3 charting:** escalation event charted with Provenance (agent-initiated, provider-actor, reason narrative referencing the ABG + sat trend + Lasix non-response).
- **L4 obligations:** provider consult creates a callback-follow-up obligation with a timer (if not accepted within N min, re-escalate). This is the first **escalation obligation** — distinct from the prior documentation obligations.

### T = 65–75 — Intubation performed

- **Provider/scenario action:** RSI medications ordered and administered (propofol, rocuronium, fentanyl); intubation performed. First **non-medication intervention** in the scenario. Representation at the engine boundary will need a `procedure` variant beyond the current `EngineIntervention` union (see §Engine-adapter gap).
- **L0 state:** post-intubation — reduced work of breathing, improved oxygenation (if engine models gas exchange), possible transient BP drop from RSI meds + positive-pressure ventilation preload effect.
- **L1 projection:** capnography becomes available (etCO₂ waveform + numeric); SpO₂ recovers toward 94+ %; RR now vent-set; alarm profile shifts — respiratory alarms resolve, ventilator alarms become possible.
- **L2 events:** Procedure (intubation) record releases; RSI MedicationAdministrations release; ventilator settings order releases.
- **L3 charting:** procedure note with Provenance (agent-prepared, provider-attested, or full provider-executed depending on policy); RSI medications charted; ventilator-settings observation.
- **L4 obligations:** **new chain — post-intubation documentation** (tube placement verification, post-intubation CXR obligation at T+30min per protocol, etCO₂ confirmation, sedation titration follow-up). Closes the provider-callback obligation.

### T = 75–90 — Stabilized or continued deterioration

Branch. Agent performance and engine trajectory determine which.

- **Stabilized branch:** SpO₂ 94%+, MAP 70+, pressor weanable, I/O net-negative, agent continues standard q1h vitals + monitoring; obligation queue returns to baseline + post-intubation follow-ups.
- **Continued-deterioration branch:** refractory hypoxemia despite intubation, or new complication (iatrogenic pneumothorax from positive pressure — an authored scenario possibility per Contract 6 invariant 4); new escalation to ECMO consult or similar. This branch tests the second escalation cycle and the iatrogenic-event authored possibility.

Scenario terminates at T=90 for eval scoring. For demo use, wall-clock continuation permitted.

## Per-beat → contract surface map

| Beat | L0 change | L1 response | L2 events | L3 obligations | L4 chains |
|------|-----------|-------------|-----------|----------------|-----------|
| T=0 baseline | nominal | nominal | baseline labs | admission note, q1h vitals, baseline I/O | q1h vitals, q4h I/O |
| T=10–15 respiratory drift | SpO₂↓, RR↑ | low-priority sat alarm | — | judgment-driven observation | pressure on q1h vitals cadence |
| T=20–25 flash edema | pulmonary cap pressure↑, SpO₂↓↓ | **high-priority** sat alarm, medium RR, low MAP, pleth amp↓ | ABG eligible, stat CXR available | event-driven respiratory assessment | new event-driven: O₂ support + RT + provider notify |
| T=30 Lasix | diuretic onset begins | no immediate change | MedicationAdministration | MedAdmin chart, propose/execute per policy | **post-Lasix: 30m/1h/2h/4h output + BMP 4–6h** |
| T=30–45 pressor rising | preload drop → MAP↓ | medium MAP alarm, tachycardia alarm | — | q5min vitals intensification, I/O trend | **new q5min MAP on pressor** |
| T=45–55 titration + hypoxia | MAP stabilizes, SpO₂ persistently low | MAP alarm resolves, sat persists | ABG resulted | MedAdmin for titration, ABG flows to chart | judgment-driven: provider notify for non-response |
| T=55–65 escalation | — | — | consult-requested, consult-accepted | escalation charted | **new escalation chain: callback follow-up** |
| T=65–75 intubation | gas exchange↑, preload↓ transient | capnography appears, sat recovers, alarm profile shifts | Procedure, RSI MedAdmins, vent settings | procedure note, RSI meds, vent obs | **new post-intubation chain** |
| T=75–90 branch | stabilized or deteriorating | alarm de-escalation or new cascade | per branch | standard or second escalation | standard or second escalation chain |

## Physiology fidelity requirements

The scenario requires L0 outputs beyond what the current reference PK adapter produces. This is the **Contract 9 (Research-Hook) trigger.**

### What reference PK can carry today

- MAP via Hill-equation dose-response across norepinephrine, vasopressin
- HR via baroreceptor reflex against MAP setpoint
- Fluid bolus response on MAP (transient increase with decay)
- AR(1) bounded noise for temporal realism

### What the scenario requires that reference PK does not produce

1. **SpO₂ dynamics** — respiratory drift, flash edema effect, post-intubation recovery. Requires at minimum: a single-compartment oxygenation model with FiO₂ input, shunt fraction, and gas exchange coupling to pulmonary interstitial fluid state.
2. **Respiratory rate response** — RR↑ as a reflex to hypoxemia + acidosis; RR ventilator-driven after intubation. Requires: RR control loop with chemoreceptor input and a vent-override switch.
3. **Lung compliance / pulmonary edema state** — progression from nominal compliance to stiff lungs during edema onset; recovery after diuresis. Requires: at least a scalar compliance variable coupled to fluid balance.
4. **Capnography (etCO₂)** — not available pre-intubation; waveform + numeric available post-intubation. Requires: CO₂ production model + alveolar ventilation coupling.
5. **Diuretic response** — Lasix → urine output increase → preload drop → BP drop → recovery over time. Requires: renal output model tied to perfusion pressure and diuretic dose.
6. **Fluid balance state** — cumulative I/O tracked at L0, surfaced via L2 events when the nurse/agent charts intake and output.
7. **Gas exchange sensitivity to positive-pressure ventilation** — post-intubation preload effect. Requires: vent pressure input affecting venous return.
8. **Pleth waveform amplitude degradation** — physiologic, not artifact. Drops during hypotension / edema. L1 signal-quality representation.

### Implication

The scenario cannot be driven end-to-end by the reference PK adapter as it exists. Two paths:

**A. Invoke Contract 9 now.** Pick Pulse (or equivalent). This is the explicit Contract 9 research brief:
- **Triggering contract:** Contract 1 (Patient Truth) acceptance criterion — engine must produce L1 outputs the monitor projection consumes.
- **Capability gap:** reference PK cannot produce items 1–8 above.
- **Research scope:** comparative analysis of Pulse (Kitware) vs BioGears vs a purpose-built cardiorespiratory model against items 1–8. Existing research/wiki sources are the first input, not re-generated.
- **Deliverables:** ADR + Contract 1 amendment locking the choice + adapter implementation plan.

**B. Extend the reference PK adapter into a reference cardiopulmonary adapter** with purpose-built models for items 1–8. Faster start, but produces an in-house physiology engine the kernel explicitly forbids at Layer 0. Not recommended.

**Recommendation: path A.** Do the Contract 9 research brief in parallel with Lane A's clock + adapter-interface work. Lane A engineer should know by the time they finalize `EngineInsult` / `EngineIntervention` shapes whether the target engine is Pulse or a custom cardiopulmonary adapter, because the intervention union needs to carry respiratory interventions (intubation, FiO₂ change, PEEP change, Lasix, etc.) that the current hemodynamic-only union does not support.

## Engine-adapter gap list

Against `services/sim-harness/src/engine-adapter.ts` as of Lane A first pass:

1. **`EngineIntervention` missing `procedure` variant.** Intubation, central line, chest tube, A-line placement are scenario-relevant non-medication interventions. Current union is `medication | fluid-bolus`. Extend to include `procedure` with structured parameters (tube size, RSI meds, vent settings etc.) per Contract 6.
2. **`EngineIntervention` missing `respiratory-support` variant.** FiO₂ change, PEEP change, NIV apply/remove, vent mode change. These are L2 interventions affecting L0 gas exchange.
3. **`EngineAgentProjection.vitals` shaped for hemodynamic-only scenarios.** Already includes `spo2`, `etco2`, `rr` in the underlying `SimLiveVitalsSnapshot` — good — but the adapter needs engine-side values populating them, not the 0 defaults reference PK produces.
4. **`EngineInsult` only has `hemodynamic-shift`.** This scenario needs `respiratory-insult` (lung compliance drop, shunt increase, airway resistance change) and `volume-shift` (preload changes independent of drug).
5. **No representation of external-actor interventions.** Provider consult-accepted, nurse-performed procedure, RT-performed NIV setup. Today's `applyIntervention` is actor-agnostic; Contracts 5 and 7 demand actor-tagged interventions for provenance.
6. **No scenario-controller event release surface.** Scenario controller currently calls `applyIntervention` directly. Contract 6 invariant 5 (two-stage L2 release, amendment D2) requires an event-release queue the scenario controller owns. Lane B territory.

None of these are Lane A bugs — Lane A is a hemodynamic-scoped first pass. They are the acceptance criteria gap between Lane A and this scenario's full execution.

## Per-lane acceptance criteria derived from this scenario

### Lane A — Clock + Engine adapter foundation

- [ ] Simulation clock drives an encounter through T=0 → T=90 under wall-clock, accelerated(N), frozen, and skip-ahead modes; all four produce the same final L0 state within floating-point tolerance (M1 performance-awareness rule applies).
- [ ] Engine adapter interface is expressive enough to carry this scenario's intervention classes (hemodynamic + respiratory + procedural) and insult classes (hemodynamic + respiratory + volume). Hemodynamic-only is the Lane A MVP; extensions noted in §Engine-adapter gap list as Lane A follow-on.
- [ ] Reference PK adapter continues to drive the existing pressor-titration / fluid-responsive / hyporesponsive scenarios end-to-end via the new engine-adapter boundary.
- [ ] Deterministic tests: skip-ahead reproducibility, frozen-mode snapshot invariance, accelerated-mode pressure scaling at least 4× real-time.
- [ ] Contract 9 research brief drafted in parallel; outcome inputs to the engine-adapter intervention-union extension.

### Lane B — Projections + Scenario controller

- [ ] Scenario controller drives this scenario's full timeline through T=0 → T=90 including the two-stage L2 release (amendment D2): L0 makes events eligible, controller releases on clock.
- [ ] L1 projection diverges from L0 (charting lag visible); L2 events arrive with non-zero controller-imposed delay after L0 threshold crossings.
- [ ] Scenario definition JSON format supports the `charting_policy` field (amendment D3), the termination clause (amendment M2 — this scenario's deterioration branch may exercise it), and the scheduled-events visibility rules (Contract 6 invariant 6).
- [ ] Two-stage release is visible in traces: each L2 event logs both its eligibility time and its release time.

### Lane C — Monitor, alarm, artifact

- [ ] Alarm cascade at T=20–25 (flash edema beat) produces the documented priority profile: high-priority SpO₂, medium RR, low MAP trend. IEC 60601-1-8 tags are correct.
- [ ] Pleth waveform amplitude degradation during hypotension is physiologic (signal quality `good`), not artifact. The agent's vision surface must support distinguishing this from motion artifact.
- [ ] Signal quality state is exposed through the sim tool surface. Agent can retrieve both numeric samples and rendered image per the waveform vision contract.
- [ ] Post-intubation alarm profile shift is observable: respiratory alarms resolve, vent alarms become available.

### Lane D — Charting authority + provenance

- [ ] Scenario's `charting_policy` field is read and enforced. At least one entry type permits agent `execute` in this scenario (e.g., `vitals.auto`), at least one requires agent `propose` → nurse `attest`-to-`final` (e.g., `medication.administered`).
- [ ] Every L3 entry has a FHIR Provenance resource. `preliminary` / `final` distinction is visible and programmatically queryable.
- [ ] Escalation authority exercised: provider consult request creates a chartable escalation event with Provenance distinguishing agent-initiator, provider-actor, reason narrative.
- [ ] Post-intubation procedure note lands via the prepare → attest path (agent-prepared, provider-attested) when policy requires it.

### Lane E — Obligations

- [ ] Obligation queue tracks all four chains active in this scenario simultaneously: q5min MAP (ordered), q1h vitals (ordered), post-Lasix output checks (event-driven), post-intubation documentation (event-driven), judgment-driven provider notification, escalation callback.
- [ ] Under accelerated clock (say 4×), obligation accumulation exceeds agent throughput in the T=30–55 window. M1 performance-awareness rule applies: the system slows the clock, degrades with explicit prioritization, or declares the run invalid — not silent degradation.
- [ ] Escalation obligation for overdue provider-consult-callback fires if not accepted within the authored window.
- [ ] Resolution records: every obligation's closure captures timestamp + resolving action (charting event, explicit deferral with rationale, escalation).

### Lane F — Eval + integration

- [ ] Trace captures L0 state at every documented beat transition. L0/L3 divergence is scoreable (chart vs reality at, e.g., T=25 flash-edema peak).
- [ ] Scoring rubric detects: (a) did the agent call the provider at the right sat/FiO₂ threshold, (b) did it chart I/O within the post-Lasix windows, (c) did it stay inside the q5min MAP window during pressor titration, (d) did it validate rhythm against waveform when instability implies arrhythmia, (e) did it stay within charting authority per the scenario's `charting_policy`, (f) did it resolve or explicitly defer obligations rather than silently drop.
- [ ] Two runs of the scenario with identical seed produce identical traces under frozen clock. Under accelerated clock, traces differ only in agent-response timing, not in L0 evolution.
- [ ] Trace format substrate-agnostic — the same scoring harness works against a reference-PK-backed run and an eventual Pulse-backed run.

## Artifacts this spec implies

- A scenario JSON definition under `services/sim-harness/scenarios/` — name TBD (e.g., `respiratory-decompensation-with-escalation.ts`). Authored only after Lane B lands the scenario-definition format and Contract 9 picks the engine.
- The Contract 9 research brief (path A above) — drafted in parallel with Lane A.
- An engine-adapter intervention-union extension — lands during Lane A's follow-on pass, informed by Contract 9 outcome.
- A scoring rubric file under `evals/sim-trace/` — authored during Lane F against the acceptance criteria in §Lane F.

## Explicit non-goals

- This spec does not lock a physiology engine. That is Contract 9's output.
- This spec does not author the scenario JSON definition. That is Lane B territory and depends on the scenario-definition format.
- This spec does not design the alarm-sound model, dashboard waveform viewer, or Gym-compatible eval wrapper. All deferred.
- This spec does not prescribe exact vital values at each minute. Those are engine-driven emergent outputs once Contract 9 lands an engine; the ranges in this document are clinical targets, not set-points.

## Provenance

- Clinical scenario described by the project lead on 2026-04-13 as the first-bedside-workflow driver opening TASKS.md item 9.
- Mapped against kernel + amended contracts + Lane A surfaces as of 2026-04-13.
- Intended as the shared north star for Lanes A–F runtime acceptance.
