# Foundational Contracts: Simulation Architecture

## Governing Artifacts

- Invariant kernel: `docs/foundations/invariant-kernel-simulation-architecture.md`
- Scaffold audit: `docs/foundations/scaffold-salvage-audit-simulation.md`
- PRD: `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`

This is the Lane 2 deliverable. Nine contracts using the standard schema. Every contract must be validated against encounter flow in Lane 3 before acceptance.

## Standard Schema

Every contract includes: purpose, owner boundary, inputs, outputs, invariants, failure modes, deferred decisions, clinical-pressure justification, acceptance criteria.

---

## Contract 1: Hidden Patient Truth

### Purpose

Define what patient truth is, where it lives, who can access it, and how it evolves. This is the L0 foundation — the source that all projections derive from.

### Owner Boundary

`services/sim-harness/` — specifically, the engine adapter layer. No other service owns, computes, or stores L0 state.

### Inputs

- **Patient seed (amendment T1).** A grounded patient drawn from **MIMIC-IV or Synthea** is the preferred seed substrate. The scenario declares `source_patient = { dataset, patient_id, cut_point }` (per Contract 6 T5). Hand-authored or synthetic seeds are permitted **only** for engine unit-test fixtures, not for scenarios in the vision sense. Rationale: grounded seeds are the precondition for the temporal-partition and authored-stream-dualism regime (kernel Appendix A.1–A.3) and for dual-source waveform fidelity.
- **Insults:** Pathophysiological events applied by the scenario controller (hemorrhage, sepsis progression, tension pneumothorax, etc.).
- **Interventions:** Actions applied by the agent, nurse, or scenario controller (medication administration, procedures, ventilator changes). Routed through Contract 6 (Scenario and Intervention).
- **Clock ticks:** Simulation time advances from Contract 3 (Simulation Clock). The engine computes state for each tick.

### Outputs

L0 state is not directly output to any consumer except the evaluation recorder. Instead, L0 produces:

- **L1 feed:** Continuous physiological values (HR, BP, SpO2, RR, EtCO2, temp, waveforms) pushed to the monitor projection layer. These are the engine's emergent outputs, not settable parameters.
- **L2 eligibility triggers:** State thresholds that make source events *eligible* for release (e.g., lactate crosses 4.0 → lab is physiologically ready; pH drops below 7.25 → ABG is physiologically ready). Eligibility is necessary but not sufficient — the scenario controller performs the actual release on the simulation clock per Contract 6. See amendment D2 for the two-stage release model.
- **Eval snapshot:** Full internal state available to the evaluation recorder for scoring. This is the only L0 consumer. Snapshot cadence and trigger policy are specified in Contract 8 (amendment D4).

### Invariants

1. L0 state is canonical. All other representations are lossy projections.
2. Vitals are emergent outputs of physiology computation, never directly settable.
3. No agent-facing surface may read L0 directly. The agent works from L1, L3, and L4.
4. L0 evolves continuously on the simulation clock. It does not pause for agent deliberation unless the clock itself is frozen.
5. The engine adapter boundary isolates L0 computation so engines can be swapped without affecting projection layers.
6. **Historical-state carry-over (amendment T2).** When the seed is a grounded patient, L0 at simulation time T=0 is initialized from the patient's state at the scenario-declared `cut_point` in the source trajectory (MIMIC chartevents, Synthea record). L0 evolution after T=0 is produced by the engine, not by replaying the source. The source trajectory past T=0 is engine ground-truth input only (for driving scripted insults/interventions at scenario-authored times) — it is **never** rendered into any projection that the agent can read. Any leak of post-T=0 source rows into L1/L2/L3 is a contract violation (see CCPS-1 failure modes).

### Failure Modes

- **Engine crash/hang:** L0 state becomes stale. L1 must signal stale data (signal quality degradation). Obligations continue accruing on the clock. The evaluation recorder logs the gap.
- **Seed incompatibility:** Patient seed parameters exceed engine capability. Fail loudly at scenario start, not silently during execution.
- **Physiological impossibility:** Engine computes state outside survivable bounds (e.g., MAP 0 while interventions are running). The scenario controller may declare death; the engine must not silently clamp.
- **Post-T=0 source-trajectory leak (amendment T2).** Any code path that exposes source-record rows with `effectiveDateTime > T=0` to a non-engine consumer (L1, L2, or L3 reads) is a defective path. Detection is owned by Contract 8 (eval recorder) and CCPS-1.

### Deferred Decisions

- ~~Which engine (Pulse, BioGears, other). Governed by Contract 9 (Research-Hook).~~ — **Resolved 2026-04-13.** Engine choice: **Pulse Physiology Engine** (Apache-2.0, Kitware). Locked via Contract 9 research brief `docs/foundations/contract-9-research-brief-physiology-engine.md`. Scope: cardiopulmonary + hemodynamic + basic renal outputs for the first bedside workflow and derived scenarios. BioGears retained as fallback substrate for capabilities Pulse does not cover cleanly. Tick cadence: Pulse-native 20 ms. Integration pattern: Phase 2 sidecar wrapping the Pulse C API; Phase 3 WASM-in-browser deferred.
- Engine transport (REST, WebSocket, WASM). Sidecar implementation decision deferred to Lane A follow-on.
- Specific pharmacokinetic parameter values. Clinical content, tunable per engine.
- State serialization format: Pulse-native protobuf for Pulse-backed encounters; engine-specific for fallback.

### Clinical-Pressure Justification

Hidden patient truth creates the foundation for every other pressure: monitor divergence from chart, delayed lab results, intervention lag, artifact vs. deterioration ambiguity. Without L0, the substrate is a chart replay — no clinical reasoning is required.

### Acceptance Criteria

- [ ] L0 state evolves on clock ticks without external prompting.
- [ ] No agent-facing API returns L0 state (eval recorder excepted).
- [ ] Insults produce emergent vital sign changes, not parameter jumps.
- [ ] Interventions produce temporal response profiles (onset, peak, decay), not instantaneous changes.
- [ ] Engine adapter can be replaced without modifying any L1–L4 code.

---

## Contract 2: L0–L4 Projection

### Purpose

Define the five-layer truth/projection model, the access semantics for each layer, the temporal characteristics of each layer, and the rules for crossing layer boundaries.

### Owner Boundary

No single service owns this contract — it is the architectural constitution that all services implement. Enforcement is structural: each service declares which layers it reads and writes.

| Layer | Primary Owner | Reads | Writes |
|-------|--------------|-------|--------|
| L0 | sim-harness (engine adapter) | engine adapter | engine adapter |
| L1 | sim-harness (monitor projection) | sim-harness, clinical-mcp (sim tools) | sim-harness |
| L2 | sim-harness (scenario controller) | sim-harness, clinical-mcp | scenario controller |
| L3 | clinical-mcp + Medplum | clinical-mcp, agent, nurse UI | nurse, agent (policy-gated), FHIR write-back |
| L4 | obligation engine (placement pending — see amendment D1) | agent, nurse UI, eval | obligation engine, policy rules |

### Inputs

Each layer receives inputs from a specific source:

- **L0:** Clock ticks, insults, interventions (from Contract 1).
- **L1:** L0 continuous output, signal processing (noise, artifact, alarm evaluation).
- **L2:** L0 threshold triggers, scenario timeline events, external event injections.
- **L3:** L1 values crossing the validation decision boundary (nurse/agent charting action), L2 events written to FHIR.
- **L4:** L2 events triggering obligations (medication → follow-up), L3 charted state triggering policy rules, clock-driven obligation timers.

### Outputs

Each layer produces outputs consumed by specific downstream layers and surfaces:

- **L0 →** L1 (continuous feed), L2 (threshold triggers), eval recorder (snapshot).
- **L1 →** Monitor UI, agent sim tools, alarm engine, L3 (via validation gate).
- **L2 →** L3 (via FHIR write-back), L4 (obligation triggers), eval recorder.
- **L3 →** Agent context (via clinical-mcp), nurse UI, L4 (policy triggers), eval recorder.
- **L4 →** Agent task queue, nurse task queue, eval recorder, escalation surface.

### Invariants

1. **No layer collapse.** Each layer exists independently even if a given deployment has thin implementations.
2. **No upward writes.** L3 cannot modify L0. L4 cannot modify L1. Information flows downward through projections; actions flow upward through interventions (Contract 7).
3. **L1→L3 requires a validation gate (strengthened by amendment T4).** The monitor surface (L1) is a **read-only projection** to the agent. Every L3 write originates in an authored actor — `noah-nurse` via Contract 5 charting tools, `provider` via Contract 6 scheduled/reactive events, or the narrow `device-auto` path (preliminary-only Observations; Contract 5 D5 vital-sign validation path). Nothing flows implicitly from L1 or L2 into `status=final` L3 state without an authored validation or attestation Provenance.
4. **L2 events are time-released under a two-stage authority model (amendment D2).** Stage 1: L0 makes an event *eligible* by crossing a physiological threshold. Stage 2: the scenario controller *releases* the event on the simulation clock (simulating lab processing, imaging turnaround, consult availability). Neither stage alone produces an L2 event. A lab that is physiologically ready at L0 does not appear in L2 until the controller releases it.
5. **L4 derives from L2/L3 + policy.** Obligations are never fabricated from L0 directly.
6. **Each layer has its own temporal character.** L0 is continuous. L1 is near-real-time. L2 is discrete/event-driven. L3 is delayed/workflow-shaped. L4 is derived/policy-driven.
7. **Temporal visibility (amendment T3).** Chart queries executed at simulation time T must return **only** FHIR resources whose authoritative timestamp (`effectiveDateTime`, `occurrence[x]`, `issued`, or `recorded` — whichever applies to the resource type) is ≤ T **and** whose scenario release-state is `released`. Resources that exist in the Medplum store but are (a) tagged historical-beyond-window, (b) scheduled for future release via Contract 6, or (c) post-T=0 source-trajectory rows that have not yet been released as L2 events, must be invisible to the agent's chart read path. Enforcement lives in the clinical-mcp read layer — **not** in Medplum itself — so the filter travels with every agent query. See CCPS-1 for the full partition spec.

### Failure Modes

- **Projection lag:** L1 falls behind L0 (engine outpaces monitor update rate). Acceptable if bounded and observable (signal quality marker).
- **L2 event queue overflow:** Too many events released simultaneously. Events must be ordered by simulation time; overflow triggers back-pressure on scenario controller.
- **L3/L0 divergence beyond clinical plausibility:** Chart says MAP 72 while patient truth is MAP 45. This is architecturally correct (chart is delayed) but eval must detect and score it.
- **L4 orphan obligations:** Obligation references a charted value that was later amended. Obligation must re-evaluate against amended state.
- **Temporal-visibility leak (amendment T3).** Agent receives a FHIR resource whose authoritative timestamp exceeds the current simulation time, or whose scenario release-state is not `released`. Classes include: `_include` leak, future `date=` search parameter leak, direct Medplum API bypass, stale cache. Detection is an eval dimension (Contract 8 + CCPS-1).

### Deferred Decisions

- Physical process topology (which layers colocate in which process).
- L2 event serialization format.
- L4 obligation engine placement (inside sim-harness, inside clinical-mcp, or standalone). **Decision trigger (amendment D1):** resolve when the first obligation-generating scenario is implemented. Trade-off: sim-harness placement gives native clock + L2 access but requires Medplum reach-in for L3; clinical-mcp placement gives native L3 access but requires L2 + clock subscription; standalone placement is cleanest architecturally but adds a third process.

### Retention Policy (amendment M3)

Each layer has a configurable retention window during a running scenario:

- **L0:** engine-native state, persisted only through eval snapshots per Contract 8.
- **L1:** minimum 60 seconds of waveform ring buffer per active lead (per waveform vision contract); numeric telemetry retained for full scenario.
- **L2:** full scenario event log.
- **L3:** full scenario chart state (persistent in Medplum; survives scenario reset only if explicitly archived).
- **L4:** full scenario obligation log including resolved/deferred/escalated records.

Long wall-clock scenarios (e.g., 12-hour shifts) must configure memory-safe retention for L1 waveforms beyond the 60-second minimum — implementation-time decision.

### Clinical-Pressure Justification

The five-layer model is the source of every clinically meaningful divergence: monitor shows one thing, chart says another, obligations demand a third. Without layer separation, the agent lives in a world of perfect information — which is a world that doesn't exist in clinical practice.

### Acceptance Criteria

- [ ] Every agent-facing tool declares which layer(s) it exposes.
- [ ] L1 values differ from L3 values during normal operation (charting lag is visible).
- [ ] L2 events arrive with non-zero delay from L0 state changes.
- [ ] L4 obligations derive from L2/L3, never from L0 directly.
- [ ] No API path exists from agent to L0 (eval recorder excepted).
- [ ] Layer boundaries are enforceable by code review (imports, API surface).

---

## Contract 3: Simulation Clock

### Purpose

Define the shared time authority for all simulation-aware components. Every time-dependent computation — physiology ticks, event scheduling, obligation timers, alarm evaluation, trace timestamps — derives from this clock.

### Owner Boundary

`services/sim-harness/` — clock subsystem. All other components consume time; none produce it.

### Inputs

- **Mode selection:** `wall-clock`, `accelerated(N)`, `frozen`, `skip-ahead(target_time)`. Set at scenario start or changed by authorized controllers (dashboard, eval harness).
- **Tick request (frozen mode):** Explicit advance command with tick count or target time.
- **Skip-ahead target (skip-ahead mode):** Target simulation time. Clock computes all intermediate states.

### Outputs

- **Current simulation time:** Monotonically increasing timestamp. All consumers read this, never wall-clock.
- **Tick events:** Broadcast to all time-aware subscribers (engine, scenario controller, monitor projection, obligation timers, alarm evaluation).
- **Mode change notifications:** Broadcast when clock mode changes, so components can adjust behavior (e.g., UI updates, trace annotations).

### Invariants

1. All time-aware components derive time from this clock. No ambient `Date.now()` or `performance.now()` for simulation-relevant decisions.
2. The clock supports at minimum: wall-clock (1:1), accelerated (N×), frozen (no advance without command), skip-ahead (jump with intermediate computation).
3. Causality is preserved under all modes. Skip-ahead must compute intermediate engine ticks — it cannot jump without propagating state. Acceleration must not skip ticks.
4. If the clock is frozen, the patient is frozen. If the clock is running, the patient is evolving. There is no mode where time runs but physiology pauses.
5. Time control is a first-class architectural surface, not a developer backdoor.
6. **Agent performance awareness (amendment M1).** If the agent cannot process obligations at clock speed (token budget exhaustion, response latency exceeding obligation cadence), the system must do one of three things, declared per run: (a) slow the clock automatically, (b) degrade gracefully with explicit priority-based obligation shedding, or (c) declare the run invalid for eval purposes. Silent degradation is not permitted.

### Failure Modes

- **Clock drift under acceleration:** Engine cannot keep up with N× real-time. Clock must either slow to engine throughput or declare degraded mode with observable signal.
- **Skip-ahead timeout:** Target time is too far ahead; intermediate computation exceeds resource budget. Must fail explicitly with partial state rather than silently truncating.
- **Concurrent mode changes:** Two controllers request different modes simultaneously. Last-writer-wins with logged conflict is acceptable for now; formal arbitration is deferred.

### Deferred Decisions

- Tick cadence (20ms matches Pulse default, but should be configurable per engine).
- Clock distribution mechanism (event bus, polling, direct call).
- Multi-encounter clock isolation (shared clock vs. per-encounter clock instances).
- Clock persistence across session boundaries.

### Clinical-Pressure Justification

Without clock semantics, the substrate cannot create temporal pressure. A nurse's shift is 12 hours of continuous obligation accumulation. An accelerated eval run compresses that pressure. A frozen golden test removes temporal ambiguity for deterministic scoring. Each mode creates a different but necessary pressure shape.

### Acceptance Criteria

- [ ] No component reads wall-clock time for simulation decisions.
- [ ] Switching from wall-clock to frozen preserves exact state (deterministic snapshot).
- [ ] Skip-ahead produces the same final state as running wall-clock to the same target time (within floating-point tolerance).
- [ ] Accelerated mode at N× produces N× more obligation pressure per wall-second.
- [ ] Traces record simulation time, not wall time.

---

## Contract 4: Monitor Telemetry, Alarm, and Artifact

### Purpose

Define the L1 projection layer: how hidden patient truth becomes the monitor surface the nurse and agent perceive, including telemetry streams, alarm evaluation, signal quality, and artifact modeling.

### Owner Boundary

`services/sim-harness/` — monitor projection subsystem. Reads L0 output. Writes L1 state. Exposes L1 through sim tools registered at `services/clinical-mcp/`.

### Inputs

- **L0 continuous feed:** Emergent vital signs and waveforms from the engine adapter.
- **Signal processing parameters:** Per-sensor noise profiles, artifact models, alarm thresholds (factory → institutional → patient-customized).
- **Intervention effects on signal:** Lead disconnects during repositioning, motion artifact during procedures, arterial line damping.

### Outputs

- **Numeric telemetry frames:** HR, RR, SpO2, EtCO2, MAP, SBP, DBP, temp, rhythm label (advisory). Pushed at configurable cadence (default: 1Hz for numerics).
- **Waveform streams:** Per-lead voltage samples at engine-native sample rate. Subject to the waveform vision contract (`sim-harness-waveform-vision-contract.md`).
- **Alarm events:** Priority-tagged (high/medium/low per IEC 60601-1-8), with alarm type (threshold, arrhythmia, technical), source parameter, trigger value, timestamp, **and `attention_class` (amendment D7):** `wake` (force agent turn if idle), `notify` (enter queue), `ambient` (log only). Default mapping: high→wake, medium→notify, low→ambient; scenario-configurable. Attention routing is a first-class monitor output, not an external UI concern.
- **Preliminary Observations to chart (amendment D5 bridge clause).** The monitor posts continuous vital-sign Observations with `status=preliminary` and `agent.who=device-auto` to Medplum at scenario-configured cadence. These entries are inert until promoted to `status=final` via Noah's validation tool (Contract 5 vital-sign validation path). This is the only L1→L3 auto-write path; it produces preliminary entries only, never `final`.
- **Signal quality state:** Per-parameter quality indicator (good, marginal, artifact, disconnected, stale). Observable by agent and nurse.
- **Ring buffer:** At least 60 seconds of waveform history per active lead (per waveform vision contract).

### Invariants

1. The monitor is the primary current-state avatar of the patient. It is the most temporally immediate projection available.
2. Monitor state can diverge from charted state. This divergence is architectural, not a bug.
3. Monitor telemetry is not noiseless. Artifact, false alarms, signal degradation, and stale readings are modeled.
4. Alarm burden is part of the architecture. 100–400+ alarms/patient/day is the empirical target range. Nuisance alarms (72–99% false per Drew 2014) are included by design.
5. Rhythm labels are advisory. The agent must validate rhythm claims against the waveform surface per the waveform vision contract.
6. The validation decision boundary (glance → assess patient → determine plausibility → accept into record) is the architectural gate between L1 and L3. This contract owns the L1 side; Contract 5 owns the L3 side.
7. **Alarm-mediated agent wake (amendment D7).** Attention routing is a first-class monitor output. Each alarm carries an `attention_class` in the set `{ wake, notify, ambient }`. The `wake` class is the bridge between Contract 4 and the agent runtime — it is the mechanism by which the monitor forces attention. Mapping from IEC 60601-1-8 priority to `attention_class` is scenario-configurable but defaults to high→wake, medium→notify, low→ambient. Traces must record attention-class assignment and any resulting attention shift.

### Failure Modes

- **Sensor disconnect:** Monitor displays disconnect indicator, alarms if configured, marks signal quality as `disconnected`. L0 state continues evolving — the patient doesn't stop deteriorating because a lead fell off.
- **Artifact during intervention:** Motion artifact during repositioning, electrical interference during defibrillation. Artifact type is tagged so the agent can distinguish it from pathology.
- **Alarm fatigue cascade:** Too many simultaneous alarms exceed the agent's attention budget. This is intentional pressure, not a bug — but the alarm system must still prioritize correctly per IEC 60601-1-8.
- **Stale data:** Engine tick lags behind clock. Monitor marks affected parameters as stale with timestamp of last valid reading.

### Deferred Decisions

- Specific alarm threshold values (clinical content, per-scenario configurable).
- Alarm sound model (audio is a UI decision).
- Specific artifact probability distributions (parameterized per scenario).
- Monitor display layout (UI decision).
- Which alarm events persist to the medical record (see open question in wiki: `alarm-log-medical-record-status`).

### Clinical-Pressure Justification

The monitor is where urgency detection, titration timing, and trust/plausibility judgment happen. Without alarm burden, the agent is never forced to triage attention. Without artifact, the agent is never forced to distinguish real deterioration from bad signal. Without signal quality, every reading is equally trustworthy — which is never true at a real bedside.

### Acceptance Criteria

- [ ] Monitor values update independently of chart values (L1 ≠ L3 by default).
- [ ] At least one alarm type fires during a representative ICU scenario.
- [ ] At least one artifact event occurs that the agent must distinguish from true deterioration.
- [ ] Signal quality state is exposed to the agent through sim tools.
- [ ] Waveform vision contract is satisfied (both numeric samples and rendered image available).
- [ ] Alarm events carry IEC 60601-1-8 priority tags.
- [ ] Alarm events carry an `attention_class` per amendment D7.
- [ ] At least one scenario beat fires a `wake`-class alarm that the trace records as an attention-routing event with a measurable agent behavior change.
- [ ] Monitor posts continuous vital-sign Observations with `status=preliminary` and `agent.who=device-auto` at scenario-configured cadence (per D5 bridge clause).

---

## Contract 5: Charting Policy and Provenance

### Purpose

Define how monitor-derived facts and clinical events cross the L1→L3 boundary to become charted record, who may perform that crossing, under what authority, and with what provenance trail.

### Owner Boundary

Split ownership:
- **Policy engine:** Determines what authority states are available for a given entry type in a given workflow. Placement TBD (likely `services/clinical-mcp/` or a policy sidecar).
- **Write surface:** `services/clinical-mcp/` → Medplum FHIR. All L3 writes go through this path.
- **Provenance surface:** FHIR Provenance resources attached to every chart entry.

### Inputs

- **Charting action:** An agent or nurse initiates a chart write with a declared authority state.
- **Source data:** L1 values (monitor-derived), L2 events (lab results, medication records), or original clinical narrative.
- **Policy context:** Workflow identity, entry type, current authority ceiling for the actor.

### Outputs

- **L3 chart entry:** FHIR Observation, DocumentReference, or other resource with appropriate `status` (`preliminary` or `final`).
- **Provenance resource:** FHIR Provenance attached to every entry, recording: author (nurse/agent), authority state, source layer (L1/L2/original), timestamp (simulation time), policy citation if agent-executed.
- **Authority audit trail:** Queryable log of all charting actions, authority states invoked, and approval/rejection decisions.

### Invariants

1. Every chart write carries an explicit authority state: `observe`, `propose`, `prepare`, `execute`, `attest`, or `escalate`.
2. `execute` (autonomous agent charting) requires explicit policy authorization for the specific entry type in the specific workflow. No blanket execute authority. **The authority ceiling for a given entry type in a given scenario is read from the scenario definition's `charting_policy` field (amendment D3, Contract 6).** A teaching scenario may permit `execute` for device-sourced vitals; an eval scenario may restrict to `propose` only.
3. `prepare` produces a `preliminary` status entry. `execute` and nurse-validated entries produce `final` status. The distinction is always visible.
4. Provenance distinguishes: auto-populated from device, nurse-validated from monitor, nurse-entered, agent-prepared/nurse-approved, and agent-executed with policy citation.
5. No silent chart writes. Every L3 entry has a provenance chain traceable to its source layer and authoring actor.
6. The three documentation modes (ordered, event-driven, judgment-driven) are distinct in the provenance model. Each has different triggers and different clinical significance.
7. **Authored-actor taxonomy (amendment D5).** Every chart write declares its authoring actor, drawn from a **closed set**:
   - `noah-nurse` — the agent under test; writes via clinical-mcp charting tools.
   - `provider` — the provider actor; writes via Contract 6 scheduled and reactive events.
   - `scenario-director` — reserved for emergency/death events and scenario termination; not an agent-invocable author.
   - `device-auto` — narrow: posts `status=preliminary` vital-sign Observations only. Never authors `final`. Not a runtime third author; see D5 bridge clause in Contract 4.
   - `historical-seed` — used only during the Contract 6 T6 one-shot T=0 load pass to seed the chart with the pruned historical snapshot. **Runtime writes with `historical-seed` author are forbidden.**

   Every Provenance resource's `agent.who` must reference one of these five roles. The kernel anchor for this taxonomy is Appendix A.3.
8. **Vital-sign validation path (amendment D5).** When Noah charts a monitor-observed vital, the charting tool follows one of two paths:
   - **Promote:** locate the `device-auto` `preliminary` Observation for the parameter/timestamp, update `status` to `final`, and attach an attestation Provenance with `agent.who = noah-nurse` and `activity = attest`. The preliminary source is cited in the Provenance chain.
   - **Fresh-author:** if no preliminary exists (e.g., Noah charts an assessed-not-device-measured value, or the device-auto stream is offline), create a new `status=final` Observation authored `noah-nurse` with source Provenance.

   Either path produces a Provenance record. The agent's charting tool chooses the path based on whether a matching preliminary exists in the configured validation window.

### Failure Modes

- **Policy violation:** Agent attempts `execute` without policy authorization. Write is rejected; escalation is triggered. Entry may be downgraded to `propose`.
- **Provenance gap:** Entry written without provenance. Must be detectable by audit query and flagged as defective.
- **Stale source:** Agent charts an L1 value that has since changed significantly. Provenance records the L1 timestamp; downstream consumers can detect staleness.
- **Conflicting entries:** Two actors chart the same parameter at overlapping times. Both entries persist with independent provenance; reconciliation is a workflow concern, not an architecture concern.

### Deferred Decisions

- Specific policy rules per entry type (clinical content, configurable per facility/scenario).
- Approval workflow UI (nurse-facing, deferred to UI lane).
- Whether `attest` creates a new resource or amends the existing one (FHIR modeling decision).
- Policy engine placement and configuration format.

### Clinical-Pressure Justification

Charting authority creates the pressure that matters most for an agent-native substrate: the agent must decide not just *what* to chart but *whether it can* chart, and if not, *how to get a human to do it*. Without authority states, the agent either charts everything (practicing medicine) or charts nothing (useless). The six states create a graduated pressure surface that mirrors real clinical workflow.

### Acceptance Criteria

- [ ] Every chart entry has a FHIR Provenance resource.
- [ ] `preliminary` and `final` entries are visually and programmatically distinguishable.
- [ ] Agent cannot `execute` a chart write without policy authorization.
- [ ] At least one workflow path exercises `propose` → nurse approval → `final`.
- [ ] At least one workflow path exercises `prepare` (agent drafts, nurse reviews).
- [ ] Provenance correctly identifies source layer (L1, L2, or original).
- [ ] Every Provenance `agent.who` resolves to the closed D5 actor set.
- [ ] At least one workflow path exercises the vital-sign validation promote path (`preliminary` → `final` with `noah-nurse` attestation).
- [ ] Runtime write attempts with `agent.who = historical-seed` are rejected.

---

## Contract 6: Scenario and Intervention

### Purpose

Define how clinical scenarios are authored, how they schedule events on the simulation clock, and how nurse/agent interventions are received, validated, routed to the engine, and propagated through the projection layers.

### Owner Boundary

`services/sim-harness/` — scenario controller subsystem.

- **Scenario lifecycle:** Load, start, pause, reset, complete.
- **Event scheduling:** Timeline events dispatched on clock ticks.
- **Intervention routing:** Agent/nurse actions validated and forwarded to the engine adapter.
- **Propagation coordination:** Ensures intervention effects propagate L0→L1→L2→L3→L4.

### Inputs

- **Scenario definition (amended by T5).** Patient seed, timeline of scheduled events, visibility rules, `charting_policy` (amendment D3), plus the following **required additional fields** introduced by amendment T5:
  - `source_patient`: `{ dataset: "mimic-iv" | "synthea" | "synthetic", patient_id: string, cut_point: ISO8601 | duration-from-admission }` — declares the grounded patient (or opts into `"synthetic"` only for engine unit-test fixtures) and the T=0 cut. Consumed by Contract 1 T2.
  - `history_window`: `{ mode: "full" | "bounded", bounded_to?: duration }` — portion of the source record loaded into the chart as the T=0 baseline. **Default: `full` (full ICU stay up to the cut-point).** Consumed by the T6 loader.
  - `provider_schedule`: ordered list of provider-authored events, each shaped `{ at: sim-time, author: "provider", kind: "note" | "lab-result" | "order" | "imaging-read" | "reactive-response", payload, trigger?: escalation-event-ref, latency_window?: duration }`. Consumed by D6.

  Existing `charting_policy` (D3) remains required; its `agent.who` references must resolve to the closed D5 actor set.
- **Interventions:** Medication administration, procedures, ventilator changes, positioning. Source: agent (via sim tools), nurse (via UI), or scenario director (scripted).
- **Clock ticks:** From Contract 3. Events fire at scheduled simulation times.

### Outputs

- **Engine actions:** Insults and interventions dispatched to L0 via engine adapter.
- **L2 source events:** Released facts on the simulation timeline (lab results, imaging, consult notes, order completions).
- **Obligation triggers:** Intervention events forwarded to Contract 7 (Workspace and Obligation) for follow-up obligation generation.
- **Propagation confirmation:** After an intervention, confirmation that L0 state changed, L1 projection updated, and any L2/L4 consequences are queued.
- **T=0 load pass (amendment T6).** At scenario start, the controller performs a one-shot load pass against the source dataset: extracts resources within `history_window`, writes them to Medplum as the T=0 chart baseline with `agent.who = historical-seed` Provenance, registers the post-T=0 physiological trajectory with the engine adapter as driving input (insults + timed interventions), and registers the `provider_schedule` with the event queue. This is the **only** time `historical-seed` may author chart entries. Runtime `historical-seed` write attempts are rejected by Contract 5 D5.
- **Run-scoped chart instantiation (amendment T6).** Each scenario run is a fresh instance. Noah's runtime writes are scoped to that instance and do not persist across runs. Prior-run writes must not leak into a new run's T=0 baseline. See CCPS-1 cross-instance isolation failure mode.
- **Provider-authored events (amendment D6).** Two classes, both with `agent.who = provider`:
  1. **Scheduled** — dispatched on the simulation clock from `provider_schedule` baseline entries (notes, lab results, orders, imaging reads). Pre-authored; no agent initiation.
  2. **Reactive** — triggered by Noah escalation events received via the `escalate_to_provider` tool call at the clinical-mcp boundary. The provider policy evaluates the escalation payload plus the current L0 (via eval-privileged read)/L3 state and produces a response in `{ accept, defer, modify, decline }` within a bounded latency window (default 5–15 min simulation time, scenario-configurable via `latency_window`). Accepted responses produce their own L2/L3 writes (orders, notes, procedure responses).

  Provider writes do **not** pass Contract 5 authority gating — they are pre-authored (scheduled) or policy-authored (reactive). The provider policy is small, deterministic, and scenario-configurable; it is **not** an agent under test.

### Invariants

1. Interventions are not instantaneous. Every intervention has a temporal profile (onset, peak, decay, plateau) governed by the engine's pharmacokinetic/pharmacodynamic models.
2. Interventions propagate through all layers: L0 (patient truth changes) → L1 (monitor updates) → L2 (source events generated) → L3 (charting obligations arise) → L4 (follow-up obligations created).
3. The patient continues evolving during intervention onset. Time does not freeze for action.
4. Iatrogenic events are architecturally possible. An intervention can create new problems (right mainstem intubation, pneumothorax from central line, adverse drug reaction).
5. L2 event release timing is controlled by the scenario controller under the two-stage authority model (amendment D2, Contract 2). L0 makes events eligible; the controller releases them on the simulation clock. A lab may be physiologically ready at L0 but not resulted at L2 until the controller releases it (simulating lab processing time).
6. Scenario visibility rules determine what the agent can see of upcoming events. Teaching mode may reveal; eval mode may hide.
7. **Patient death and scenario termination (amendment M2).** The scenario controller may declare patient death based on L0 state crossing irrecoverable bounds (e.g., asystole sustained beyond resuscitation, MAP unrecoverable after maximal intervention, DNR-scoped withdrawal complete). Death terminates L1 projection (monitor shows asystole/flatline), clears all non-documentation obligations at L4, creates a mandatory death-documentation obligation, and signals the eval recorder with a terminal event. Death is a scenario-authored possibility, not a silent engine crash.
8. **History-vs-present partition (amendment T5/T6).** The scenario controller enforces a three-region partition of the source record: (a) **historical-bounded** — loaded at T=0 under `historical-seed` author, visibility unrestricted post-load; (b) **pruned-historical** — source rows outside `history_window` or scenario-excluded, **never** agent-reachable; (c) **post-T=0 trajectory** — engine ground-truth input + scripted provider inputs, agent visibility gated by Contract 2 T3 temporal-visibility filter and the two-stage release of D2. Each scenario run is a fresh instance per T6; cross-instance write bleed is a CCPS-1 failure mode.
9. **Provider actor authority (amendment D6).** The provider is a first-class authored writer, lightweight-behavioral. Scheduled provider events fire on simulation clock; reactive provider events fire in response to Noah escalation tool calls within the scenario-configured latency window. The provider's decision surface is restricted to `{ accept, defer, modify, decline }`. Provider writes carry `agent.who = provider`. Reactive response outside the latency window is a failure mode; wall-clock scheduling is a failure mode.

### Failure Modes

- **Unsupported intervention:** Engine does not model the requested action. Reject explicitly with reason. Do not silently ignore.
- **Intervention during intervention:** Agent titrates a pressor while a bolus onset is still in progress. Both must coexist in the engine's state. This is normal clinical reality, not an error.
- **Scenario timeline conflict:** Two events scheduled for the same simulation time. Process in definition order; log if ordering matters clinically.
- **Cascade failure:** Intervention triggers iatrogenic event that triggers alarm that triggers obligation. The cascade must complete within one logical tick without infinite loops.

### Deferred Decisions

- Scenario authoring format (JSON, YAML, DSL).
- Scenario catalog management and versioning.
- Multi-patient scenario orchestration.
- Specific intervention parameter ranges (engine-dependent).

### Clinical-Pressure Justification

Intervention closure is the feedback loop that makes the simulation a living system rather than a playback. Without temporal profiles, the agent never learns to wait for onset. Without iatrogenic possibility, the agent never learns defensive practice. Without L2 release timing, labs arrive instantly and the agent never experiences the uncertainty of waiting for results.

### Acceptance Criteria

- [ ] An intervention applied at time T produces visible L1 changes by time T + onset_delay, not at time T.
- [ ] An intervention generates at least one L4 follow-up obligation (via Contract 7).
- [ ] At least one scenario includes an iatrogenic possibility.
- [ ] L2 events release at scenario-controlled times, not at L0 state-change times.
- [ ] Scenario visibility rules are enforced (agent cannot see hidden future events in eval mode).
- [ ] Two concurrent interventions coexist without conflict.

---

## Contract 7: Workspace and Obligation

### Purpose

Define the L4 projection layer: how documentation duties, follow-up windows, and workflow pressure are created, tracked, escalated, and resolved. Obligations are first-class architectural objects, not implicit side effects.

### Owner Boundary

Obligation engine — placement pending architectural decision (amendment D1). The engine may live as a subsystem within `services/sim-harness/`, a module within `services/clinical-mcp/`, or a standalone service. **Decision trigger:** resolve when the first obligation-generating scenario is implemented. Trade-off recap: sim-harness placement = native clock + L2 access, reach-in for L3; clinical-mcp placement = native L3 access, subscription to L2 + clock; standalone = clean boundary, extra process. Regardless of placement, it:

- Reads L2 (source events) and L3 (charted state) to generate obligations.
- Reads the simulation clock to track obligation timers.
- Writes L4 (obligation state) to the agent and nurse task surfaces.

### Inputs

- **L2 events:** Medication administered → follow-up vital sign obligations. Lab resulted → review obligation. Order placed → execution obligation.
- **L3 state:** Charted assessment → reassessment cadence obligation. Missing documentation → gap obligation.
- **Policy rules:** Ordered cadence (q1h vitals, q2h neuro checks), event-driven chains (vasopressor → q5min MAP ×6, blood products → baseline/15min/hourly/completion/post, insulin → q1h BG), judgment-driven triggers.
- **Clock ticks:** Obligation timers advance on simulation time.

### Outputs

- **Obligation queue:** Ordered list of active obligations with status (pending, due, overdue, resolved, deferred, escalated).
- **Pressure signals:** Due and overdue obligations visible to the agent and nurse as workflow pressure.
- **Escalation events:** Overdue obligations escalate per policy (notification → alert → critical).
- **Resolution records:** When and how each obligation was resolved (charting action, explicit deferral with rationale, escalation).

### Invariants

1. Three documentation modes are architecturally distinct:
   - **Ordered cadence:** Metronome from ServiceRequests. Generates recurring obligations.
   - **Event-driven:** Reactive to L2 events. Medication administration creates a follow-up tree.
   - **Judgment-driven:** Discretionary charting by nurse or agent. Not obligation-generated but observable and scoreable.
2. Obligations have lifecycle: created → pending → due → overdue → (resolved | deferred | escalated).
3. Overdue obligations generate escalating pressure. The escalation curve is configurable per obligation type.
4. Obligations are simulation-time-aware. A q5min MAP check means 5 simulation minutes, not 5 wall minutes.
5. Deferral is an explicit clinical decision, not a silent timeout. The agent must declare why it is deferring and what it is prioritizing instead.
6. Follow-up obligation trees can branch. A medication administration creates multiple follow-up timepoints, each an independent obligation.

### Failure Modes

- **Obligation storm:** Too many obligations due simultaneously (shift change, multiple concurrent medications). Prioritization must be explicit — the agent must triage.
- **Unresolvable obligation:** Obligation requires a charting action the agent lacks authority for. Must escalate per Contract 5 authority model.
- **Clock acceleration mismatch:** Obligations pile up faster than the agent can process under accelerated time. This is intentional pressure for eval — but the system must not silently drop obligations.
- **Circular obligation:** Resolving obligation A creates obligation B, which creates obligation A. Must detect and break cycles.

### Deferred Decisions

- Specific follow-up cadences per medication/intervention (clinical content, configurable).
- Obligation priority ranking algorithm.
- Obligation persistence format.
- Whether resolved obligations are visible in the agent's history or archived.
- Obligation engine process placement.

### Clinical-Pressure Justification

Obligations are the pressure that turns a simulation into a shift. Without them, the agent responds to events but never manages competing priorities under time. The three documentation modes create layered pressure: ordered cadence is the baseline, event-driven chains spike the workload, and judgment-driven documentation is where clinical vigilance lives. The CONCERN study proved that above-cadence documentation independently predicts deterioration — making it a scoreable eval dimension.

### Acceptance Criteria

- [ ] A medication administration creates at least one follow-up obligation with a simulation-time deadline.
- [ ] An overdue obligation generates visible escalation pressure.
- [ ] The agent can explicitly defer an obligation with rationale.
- [ ] Ordered-cadence, event-driven, and judgment-driven obligations are distinguishable in the obligation queue.
- [ ] Under accelerated clock, obligations accumulate faster (no wall-time coupling).
- [ ] Obligation resolution is recorded with timestamp and resolving action.

---

## Contract 8: Evaluation and Trace

### Purpose

Define how the simulation substrate captures truth, projections, actions, and outcomes for downstream scoring. The evaluation recorder is the only consumer permitted L0 access. Traces are the evidentiary surface for all eval assertions.

### Owner Boundary

`evals/` — evaluation infrastructure. The recorder has read access to all layers. No other consumer has this privilege.

### Inputs

- **L0 snapshots:** Periodic or event-triggered captures of hidden patient truth. The recorder reads these; no one else does. **Snapshot policy (amendment D4):** periodic captures at a configurable cadence (default: every engine tick for short scenarios, every N seconds for long scenarios — scenario-configurable) **plus** event-triggered captures whenever (a) any monitored parameter crosses a configured threshold, (b) an agent action is invoked, (c) an L2 event releases, or (d) a scenario timeline event fires. Cadence defaults and trigger thresholds are scenario-level configuration. The periodic + event-triggered combination is required to catch transient artifacts (e.g., 8-second SpO2 drops) that would be missed by periodic-only snapshots.
- **L1 captures:** Monitor telemetry, alarm events, signal quality state, waveform windows at key moments.
- **L2 event log:** All released source events with simulation timestamps.
- **L3 chart snapshots:** All charted entries with provenance.
- **L4 obligation log:** All obligations created, their lifecycle transitions, and resolution records.
- **Agent action trace:** Every tool call, every charting action, every intervention, every observation read, with simulation timestamps and layer annotations.
- **Clock mode log:** All mode changes and their timestamps.

### Outputs

- **Trace artifact:** A structured record of a complete encounter that can be replayed, scored, and compared.
- **Scoring inputs:** Derived signals for eval assertions:
  - L0/L3 divergence at scored moments (did the agent chart what was actually happening?)
  - Obligation resolution timing (was the follow-up on time?)
  - Alarm response patterns (did the agent triage correctly?)
  - Waveform vision usage (did the agent look at the strip before claiming a rhythm?)
  - Charting authority compliance (did the agent stay within its authority?)
  - Intervention appropriateness (did the action improve L0 state?)

### Invariants

1. The evaluation recorder is the only consumer with L0 access.
2. Traces record simulation time, not wall time.
3. Every agent action is traceable to the layer(s) it read and the layer(s) it wrote.
4. Traces are immutable once written. Scoring is a read-only operation on traces.
5. The trace format is substrate-agnostic — a trace from a Pulse-backed scenario and a trace from a future BioGears-backed scenario must be scoreable by the same eval harness.

### Failure Modes

- **Trace gap:** Recorder misses events during high-throughput periods. Traces must flag gaps rather than silently omit them.
- **L0 snapshot timing:** Snapshot taken too infrequently to capture a transient event. Configurable snapshot cadence with event-triggered captures as supplement.
- **Storage exhaustion:** Long scenarios generate large traces. Configurable retention with explicit truncation markers.

### Deferred Decisions

- Trace serialization format (JSON, protobuf, NDJSON).
- Trace storage location and retention policy.
- Specific scoring rubrics (domain content, not architecture).
- Whether traces are human-readable or machine-only.
- Gym-compatible observation-space wrapper (deferred until golden test suite matures per scaffold docs).

### Clinical-Pressure Justification

Evaluation is how the substrate proves its pressures work. Without traces that capture L0/L3 divergence, alarm response, obligation timing, and charting authority compliance, the simulation is entertainment — realistic-looking but unmeasured. The eval surface is what makes simulation an engineering tool rather than a demo.

### Acceptance Criteria

- [ ] A trace captures L0 state at scored moments alongside the corresponding L1/L3 state.
- [ ] A trace captures every agent tool call with simulation timestamp and layer annotation.
- [ ] Scoring can detect L0/L3 divergence (chart doesn't match reality).
- [ ] Scoring can detect obligation timing (was follow-up on time?).
- [ ] Scoring can detect waveform vision usage (did agent inspect strip before rhythm claim?).
- [ ] Traces from different engine backends are structurally compatible.

---

## Contract 9: Research-Hook Decision

### Purpose

Define the gate that controls when and how vendor, engine, or technology decisions are made. No engine, rendering library, transport mechanism, or UI framework is chosen until a specific development need triggers this gate.

### Owner Boundary

Architecture decision authority — the human architect (or designated decision-maker). This contract defines the process, not the decision.

### Inputs

- **Trigger condition:** A foundational contract's acceptance criteria cannot be met with the current technology posture. Specifically:
  - The engine adapter cannot produce a required physiological behavior.
  - The monitor projection cannot produce a required alarm/artifact behavior.
  - The waveform surface cannot produce required leads or sample rates.
  - The clock cannot achieve required acceleration ratios.
- **Research request:** Specifies what capability is needed, what the current gap is, and what the decision boundary is.

### Outputs

- **Research brief:** Comparative analysis of options against the specific capability gap. Not a general survey — scoped to the trigger.
- **Decision record:** ADR documenting the choice, alternatives considered, and consequences.
- **Contract amendment:** If the choice affects a foundational contract, the contract is amended with the new constraint and its rationale.

### Invariants

1. No engine, vendor, or technology is chosen before a trigger condition is met.
2. Every trigger must cite the specific contract and acceptance criterion that cannot be met.
3. The research brief is scoped to the trigger, not a general technology survey.
4. The decision record is explicit about what it locks and what remains open.
5. Existing research (`research/simulation-environments/`, wiki entities) is the first source consulted, not re-generated.

### Failure Modes

- **Premature trigger:** Someone invokes the research hook for curiosity rather than necessity. The trigger condition must be testable.
- **Scope creep:** Research brief expands beyond the triggering gap. Scoping must be enforced.
- **Decision reversal:** A chosen technology later fails to meet a different contract's criteria. The research hook can be re-triggered with the new gap as the trigger.

### Deferred Decisions

Everything. That is the point of this contract.

### Clinical-Pressure Justification

This contract creates negative pressure — it prevents complexity that doesn't yet serve a clinical pressure need. Every technology choice adds maintenance burden, learning curve, and integration risk. Deferring until the need is concrete ensures every choice is justified by the clinical pressure it enables.

### Acceptance Criteria

- [ ] No engine or vendor is named in any other foundational contract as a binding decision.
- [ ] At least one existing deferred decision has a clear trigger condition defined.
- [ ] The research hook process has been exercised at least once (even in simulation/tabletop) before the first real trigger.

---

## Cross-Contract Dependency Matrix

```
Contract 1 (Patient Truth) ──► Contract 2 (Projections) ──► Contracts 4, 5, 7
                                       │
Contract 3 (Clock) ────────────────────┤──► all time-aware contracts (1, 4, 6, 7, 8)
                                       │
Contract 6 (Scenario/Intervention) ────┤──► Contracts 1, 4, 7
                                       │
Contract 4 (Monitor) ──────────────────┤──► Contract 5 (L1→L3 gate)
                                       │
Contract 5 (Charting) ─────────────────┤──► Contract 7 (obligation triggers)
                                       │
Contract 7 (Obligations) ──────────────┤──► Contract 8 (eval dimension)
                                       │
Contract 8 (Eval/Trace) ◄─────────────┘    reads all layers
                                       
Contract 9 (Research-Hook) ◄─── gates technology decisions for all contracts
```

**Implementation ordering implication:** Contracts 1, 2, 3 form the foundation. Contract 4 depends on 1–3. Contract 5 depends on 2, 4. Contract 6 depends on 1, 3. Contract 7 depends on 2, 5, 6. Contract 8 depends on all. Contract 9 is invoked on-demand.

---

## Provenance

- **Governing kernel:** `docs/foundations/invariant-kernel-simulation-architecture.md`
- **Scaffold audit findings:** `docs/foundations/scaffold-salvage-audit-simulation.md`
- **PRD schema:** `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md` (Foundational Contract Standard Schema)
- **Clinical evidence grounding:** Collins et al. 2018 (charting patterns), Drew 2014 (alarm burden), CONCERN study (documentation as biomarker), IEC 60601-1-8 (alarm priority)

---

## Amendments Log

Tracks every amendment applied to this document after initial publication. Each entry cites the source review and the affected contract(s).

### 2026-04-13 — Lane 4 consistency review amendments (D1–D4, M1–M3)

Source: `docs/foundations/contract-consistency-review-simulation-architecture.md` §Summary of Required Amendments.

| ID | Severity | Contract(s) | Change |
|----|----------|-------------|--------|
| D1 | Medium | 2, 7 | Added explicit obligation-engine-placement decision hook with trigger condition ("resolve when first obligation-generating scenario is implemented"). Trade-offs recorded in both contracts. |
| D2 | Medium | 1, 2, 6 | Clarified two-stage L2 release authority: L0 eligibility + scenario-controller release. Neither stage alone produces an L2 event. |
| D3 | Low | 5, 6 | Added `charting_policy` field to the scenario definition in Contract 6. Referenced from Contract 5 as the configuration source for the authority ceiling. |
| D4 | Low | 1, 8 | Specified L0 snapshot policy in Contract 8: periodic (configurable cadence) + event-triggered (threshold cross, agent action, L2 release, timeline event). Motivated by encounter-validation's 8-second SpO2 artifact gap. |
| M1 | Low | 3 | Added agent-performance-awareness invariant: slow the clock, degrade with explicit priority, or declare the run invalid. Silent degradation is not permitted. |
| M2 | Medium | 6 | Added patient-death / scenario-termination clause: monitor flatline, clear non-doc obligations, mandatory death-documentation obligation, signal recorder. Death is scenario-authored, not a silent crash. |
| M3 | Low | 2 | Added per-layer retention policy: L1 ≥ 60s waveform ring buffer, full-scenario retention for L2/L3/L4 logs. |

None of these amendments changed the acceptance criteria or dependency ordering. The Lane 5 brownfield mapping and Lane 6 execution packet remain valid against the amended contracts.

### 2026-04-13 — Contract 9 first exercise: L0 physiology engine selection

Source: `docs/foundations/contract-9-research-brief-physiology-engine.md`. Trigger: Contract 1 acceptance gap surfaced by `docs/foundations/first-bedside-workflow-spec.md` §Physiology fidelity requirements.

| Contract | Change |
|----------|--------|
| 1 | Deferred-decision entry "Which engine (Pulse, BioGears, other)" replaced with a resolution entry locking Pulse as the primary L0 engine, BioGears as fallback, Phase 2 sidecar as integration pattern. State-serialization entry updated to reference Pulse protobuf. |

This is the first exercise of Contract 9's research-hook process. Scope intentionally narrow: cardiopulmonary + hemodynamic + basic renal only. Future triggers required for neurological, endocrine, hepatic, tissue-level modeling.
