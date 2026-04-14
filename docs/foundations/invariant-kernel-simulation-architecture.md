# Invariant Kernel: Simulation Architecture

## Governing Source

This artifact derives from and is governed by:
- `.omx/specs/deep-interview-simulation-architecture-agent-native.md`
- `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`

It is the Lane 0 deliverable. All later scaffold audit (Lane 1), foundational contracts (Lane 2), encounter validation (Lane 3), and execution decomposition (Lanes 4–6) must be tested against these invariants. Any artifact that violates an invariant stated here is defective regardless of its other merits.

---

## 1. Patient Truth

### Invariant

The patient exists as a hidden physiological state that evolves continuously over simulated time. This state is canonical. Every other representation of the patient — monitor, chart, agent context, obligation queue — is a lossy, delayed, or policy-filtered projection of this truth.

### Why It Exists

A nurse does not have omniscient access to the patient. The nurse has a monitor, a chart, their own assessment, and whatever the last nurse told them. The gap between what is happening inside the patient and what the nurse knows is where clinical reasoning lives. An agent-native substrate must preserve this gap or it trains agents against a fiction.

Computational physiology engines (Pulse, BioGears) enforce this naturally: you apply an insult and the engine computes what happens. You do not set vital signs directly. The invariant captures this property as an architectural requirement independent of which engine is eventually chosen.

### What It Forbids

- Exposing hidden patient truth as a convenience surface to the agent. The agent must work from projections, never from L0 directly.
- Setting vital signs as independent parameters. Vitals are emergent outputs of physiology, insults, and interventions.
- Treating charted values as ground truth for what is happening in the patient. The chart is L3; the patient is L0. They diverge by design.
- Implementing a "god mode" API that leaks internal engine state to any consumer outside the evaluation recorder.

### What Later Work It Governs

- Hidden Patient Truth Contract (Lane 2)
- L0–L4 Projection Contract (Lane 2)
- Every engine adapter: must preserve the insult-in / emergent-vitals-out discipline
- Every agent-facing tool: must return projections, not truth
- Evaluation Recorder: the only consumer permitted L0 access, and only for scoring

---

## 2. Simulation Clock Semantics

### Invariant

All time-aware components derive their sense of time from a single, shared simulation clock. The clock supports at minimum four modes: wall-clock (1:1 with real time), accelerated (N× compression), frozen (deterministic testing, no time advances without explicit command), and skip-ahead (jump to a future point, computing intermediate state). No component may use ambient wall-clock APIs (e.g., `Date.now()`, `performance.now()`) as a substitute for simulation time.

### Why It Exists

Clinical shifts are 12 hours. Eval runs must complete in minutes. Golden tests must be deterministic. Teaching scenarios must be pausable. These are not convenience features — they are architectural requirements for an agent-native substrate that must support development, evaluation, and demonstration without separate codepaths.

The three enduring invariants from the deep interview crystallized this: "realism must remain explorable." Explorable means the user can slow down, speed up, pause, and jump without breaking the causal chain of patient physiology, released events, and documentation obligations.

### What It Forbids

- Any component reading wall-clock time for simulation-relevant decisions.
- Any component that breaks causality under time acceleration (e.g., skipping a medication onset window because the clock jumped past it).
- Freezing time until action, thereby removing continuous deterioration pressure. If time is frozen, the patient is frozen. If time is running, the patient is evolving whether or not anyone is acting.
- Implementing time control as a developer-only backdoor. Clock semantics are a first-class architectural surface.

### What Later Work It Governs

- Simulation Clock Contract (Lane 2)
- Scenario and Intervention Contract: events are clock-scheduled, not wall-clock-scheduled
- Obligation Lifecycle: follow-up windows are simulation-time windows
- Evaluation and Trace Contract: traces must record simulation time, not wall time
- Every adapter, every projection, every obligation timer

---

## 3. Monitor-As-Avatar

### Invariant

The bedside monitor is the primary current-state avatar of the patient. It is the most temporally immediate projection of hidden patient truth available to the nurse and the agent. It is not a cosmetic display layer. It drives urgency detection, titration timing, trust/plausibility judgment, and handoff emphasis.

Monitor state can diverge from charted state. Monitor state can include artifact, noise, signal degradation, and alarm fatigue. These properties are architectural, not optional polish.

### Why It Exists

In a real ICU, the monitor emits ~3,600 data points per hour per parameter. The nurse charts approximately 1 validated snapshot per hour during stability. The 3,600:1 data reduction from continuous display to charted value is the core cognitive act of clinical nursing (Collins et al. 2018). An agent that bypasses the monitor and reads directly from the chart is bypassing the cognitive surface where clinical judgment happens.

The deep interview locked this as one of three enduring invariants: "the monitor becomes the patient's avatar for the most up-to-date vital clinical context."

### What It Forbids

- Treating the chart as the patient's current state. The chart is a delayed, selective, validated subset of what the monitor shows.
- Modeling monitor telemetry as noiseless or perfectly trustworthy. Real monitors produce false alarms (72–99% of all alarms per Drew 2014), motion artifact, lead disconnects, damped arterial lines, and stale readings.
- Removing alarm burden from the substrate. 100–400+ alarms per patient per day is the empirical reality. IEC 60601-1-8 three-tier priority is the reference standard.
- Making the monitor a write-through to the chart. The validation decision boundary — glance, assess patient, determine plausibility, accept into record — must be preserved as an explicit architectural gate.
- Treating waveform surfaces as optional. Rhythm labels alone are a silent-failure surface. The agent must be able to inspect the raw waveform to validate any rhythm or hemodynamic claim. This is the waveform vision requirement.

### What Later Work It Governs

- Monitor Telemetry, Alarm, and Artifact Contract (Lane 2)
- Waveform vision enforcement in any sim-backed workflow
- Alarm model: threshold-driven, nuisance, false, sensor-specific degradation, disconnects, intervention-linked disruptions
- The distinction between true deterioration and bad signal as a first-class eval dimension
- Any future monitor UI surface

---

## 4. L0–L4 Projection Separation

### Invariant

The substrate is defined by five layers of truth and projection. Each layer has distinct access semantics, distinct temporal characteristics, and distinct consumers. No layer may be collapsed into another.

| Layer | Name | What It Contains | Temporal Character | Primary Consumer |
|-------|------|------------------|--------------------|-----------------|
| **L0** | Hidden patient truth | Canonical internal physiological state | Continuous, tick-driven | Evaluation recorder only |
| **L1** | Live monitor projection | Streaming telemetry, alarms, signal quality, artifacts, waveforms | Near-real-time, possibly lossy | Nurse (via monitor), agent (via sim tools) |
| **L2** | Released source events | Labs resulted, meds given, notes authored, orders placed, interventions applied | Discrete, time-released on simulation clock | Scenario controller, chart projection |
| **L3** | Charted/documented record | Selective, workflow-shaped chart truth | Delayed, policy-filtered, nurse/agent-validated | Agent (via clinical-mcp), downstream systems |
| **L4** | Obligations and workflow pressure | Documentation duties, follow-up windows, task chains, handoff pressure | Derived from L2/L3 + policy | Agent, nurse, evaluation |

### Why It Exists

The deep interview spec and the five-layer patient ontology research converge on the same insight: the gap between immediate patient state and charted truth is not a bug to eliminate — it is the reasoning surface. Collapsing any two layers destroys a clinically meaningful distinction:

- Collapsing L0 into L1 removes artifact and signal degradation.
- Collapsing L1 into L3 removes the validation decision boundary (the 3,600:1 data reduction).
- Collapsing L2 into L3 removes the distinction between "a lab resulted" and "a nurse reviewed and documented it."
- Collapsing L3 into L4 removes the distinction between "it was charted" and "there is an obligation to act on it."

### What It Forbids

- Auto-bridging L1 monitor state directly into L3 chart truth. This is anti-pattern #1 from the ICU charting research.
- Giving the agent direct access to L0. The agent observes L1 (via monitor tools), L3 (via chart/context), and L4 (via obligation queue). L0 is for eval scoring only.
- Treating L2 events as simultaneously available. Labs, imaging, and orders arrive on the simulation clock with realistic delays and may arrive in any order.
- Treating L3 as complete or current. The chart is always a subset of what has happened, shaped by who documented what and when.

### What Later Work It Governs

- L0–L4 Projection Contract (Lane 2) — the central architectural contract
- Every agent-facing tool must declare which layer(s) it exposes
- Every eval assertion must declare which layer(s) it validates against
- The charting workflow must explicitly cross the L1→L3 boundary through a policy gate
- Obligation generation must derive from L2/L3 events, not from L0

---

## 5. Charting Authority and Provenance

### Invariant

Charting is a workflow surface, not a data sink. Noah-RN's relationship to the chart is governed by explicit authority states. At any point in a workflow, the agent's charting posture must be one of:

| Authority State | Meaning |
|----------------|---------|
| **observe** | Agent reads chart data. No write intent. |
| **propose** | Agent suggests a chart entry for nurse review. Entry does not exist in the record until approved. |
| **prepare** | Agent assembles a chart entry in draft form. Entry exists as `preliminary` in the record, visually distinguished, not yet part of the legal chart. |
| **execute** | Agent writes a chart entry directly. Only permitted when workflow policy explicitly authorizes autonomous charting for this entry type. |
| **attest** | Agent co-signs or validates an existing entry. Provenance records agent attestation alongside the original author. |
| **escalate** | Agent determines that a charting situation exceeds its authority or confidence and routes to a human. |

Every chart write must carry a provenance chain that distinguishes:
- auto-populated from device (L1→L3 with device source tag)
- nurse-validated from monitor (L1→L3 with nurse attestation)
- nurse-entered (L3 original, nurse authored)
- agent-prepared, nurse-approved (L3, dual provenance)
- agent-executed (L3, agent authored, policy citation)

### Why It Exists

The empirical research is unambiguous: charting is where clinical reasoning becomes a legal record. Collins et al. (2018) found only 5–20% of ICU chart entries are auto-populated from devices. The remaining 80–95% involve nurse judgment — selecting which values to chart, when, and with what context. The CONCERN study proved that documentation patterns (specifically, above-cadence free-text comments) independently predict patient deterioration (p<.01 for ≥3 optional comments).

An agent that writes to the chart without explicit authority policy is practicing medicine without a license in silicon. The authority states make the policy surface auditable.

### What It Forbids

- Silent chart writes. No entry may appear in L3 without an explicit provenance chain.
- Collapsing all charting into one mode. Ordered-cadence charting, event-driven charting, and judgment-driven charting are distinct documentation modes with different triggers and different clinical significance.
- Agent charting without policy citation. If the agent executes a chart write, the provenance must cite which policy authorized it.
- Treating `preliminary` and `final` as the same status. FHIR `Observation.status` maps directly to the authority model: `preliminary` = agent-prepared, `final` = nurse-validated or policy-authorized.

### What Later Work It Governs

- Charting Policy and Provenance Contract (Lane 2)
- Every workflow that touches L3 must declare its maximum charting authority
- FHIR write-back must carry provenance resources
- Evaluation must score charting authority compliance
- The nursing station UI must visually distinguish preliminary from final entries

---

## 6. Obligation Lifecycle

### Invariant

Documentation duties, follow-up windows, and workflow pressure are first-class architectural objects, not implicit side effects. An obligation is created by an event (L2) or a policy rule applied to charted state (L3). An obligation has a lifecycle: it is created, becomes pending, may become overdue, and is resolved by a charting action, an escalation, or an explicit clinical decision to defer.

Obligations generate pressure. Overdue obligations escalate. The agent and the nurse both experience obligation pressure as part of the clinical workflow, not as an external reminder system.

### Why It Exists

The ICU charting research identifies three interacting documentation modes:

1. **Ordered cadence** — ServiceRequest-driven: "chart vitals q1h," "chart neuro checks q2h." These are the metronome.
2. **Event-driven** — reactive: medication administered → chart follow-up vitals at protocol-specified intervals (vasopressor → q5min MAP ×6; blood products → baseline/15min/hourly/completion/post; insulin → q1h BG).
3. **Judgment-driven** — discretionary: the nurse notices something and chooses to document it. The CONCERN study proved this mode independently predicts deterioration.

Intervention-linked documentation chains are the most complex: every medication creates a time-bound follow-up obligation tree. Missing a follow-up is a clinical event, not merely an administrative lapse.

Without obligations as first-class objects, the substrate cannot create the documentation pressure that defines a real ICU shift. Without documentation pressure, the agent is never tested on prioritization, time management, or the decision to defer one obligation in favor of a more urgent one.

### What It Forbids

- Flattening all documentation into one task model. The three modes are architecturally distinct.
- Treating obligations as optional or cosmetic. Obligations must generate visible pressure and escalate when overdue.
- Generating documentation cadence from the simulation engine rather than from orders and policy. The metronome is clinical, not physical.
- Ignoring the judgment-driven mode. Above-cadence documentation is clinically meaningful and must be observable and scoreable.

### What Later Work It Governs

- Workspace and Obligation Contract (Lane 2)
- Scenario and Intervention Contract: interventions create obligation trees
- Evaluation and Trace Contract: obligation resolution patterns are eval dimensions
- Every medication administration creates follow-up obligations
- Handoff pressure at shift boundaries is an obligation-derived phenomenon

---

## 7. Intervention Closure

### Invariant

Nurse and agent actions feed back into hidden patient truth (L0), propagate through monitor projection (L1), generate new source events (L2), may require charting (L3), and create new obligations (L4). The loop is closed. No intervention is fire-and-forget.

Interventions are not instantaneous. Physiology lags. A vasopressor titration takes minutes to reach hemodynamic effect. An intubation changes respiratory mechanics over seconds to minutes. A fluid bolus has a peak effect and an exponential decay. The temporal profile of an intervention's effect is part of the architecture, not an implementation detail.

### Why It Exists

The deep interview spec explicitly names intervention closure as an architectural requirement. The anti-pattern list includes "modeling interventions as instantaneous rather than delayed/partial where physiology should lag." The physiology engine's pharmacokinetic models (Hill equation dose-response, first-order onset delay, baroreceptor reflex compensation) are the mechanism, but the invariant is that the mechanism must exist regardless of which engine provides it.

Closure also means that an intervention can create new problems. Intubation may cause a right mainstem bronchus intubation. A central line placement may cause a pneumothorax. A medication may cause an adverse reaction. The substrate must support iatrogenic events as emergent consequences of interventions, not only as scripted scenario events.

### What It Forbids

- Fire-and-forget interventions. Every action must propagate through L0→L1→L2→L3→L4.
- Instantaneous effect models. The temporal profile (onset, peak, decay, plateau) must be preserved.
- Interventions that only affect L1 (monitor display) without changing L0 (patient truth). The patient must actually change.
- Freezing time until an intervention completes. The patient continues to evolve during the intervention's onset window.

### What Later Work It Governs

- Scenario and Intervention Contract (Lane 2)
- Hidden Patient Truth Contract: must specify how interventions modify state
- Every engine adapter: must expose pharmacokinetic/pharmacodynamic response profiles
- Obligation Lifecycle: interventions generate follow-up obligation trees
- Evaluation: intervention timing, lag awareness, and iatrogenic event handling are scoreable dimensions

---

## 8. Clinical Pressure Filter

### Invariant

No simulation complexity survives unless it creates clinically meaningful pressure on the agent. Clinically meaningful pressure means the complexity changes what the agent must perceive, decide, document, or prioritize. Decorative realism — fidelity that does not alter agent behavior — is architectural waste.

### Why It Exists

The deep interview spec makes this the gatekeeping principle: "Simulation complexity is justified only when it creates clinically meaningful pressure on the agent." The examples are explicit:

**Justified complexity:**
- Live streaming vitals instead of static chart snapshots — forces the agent to reason about trending, not snapshots.
- Alarm burden and nuisance alarms — forces the agent to triage attention.
- Artifact and signal-quality ambiguity — forces the agent to distinguish true deterioration from bad signal.
- Delayed and selective charting — forces the agent to reason about what it knows vs. what has been documented.
- Intervention-linked follow-up obligations — forces the agent to manage time and competing priorities.
- Shift-like pacing with adjustable clocks — forces the agent to operate under realistic temporal pressure.

**Unjustified complexity:**
- Realism that does not change what the agent must perceive, decide, or document.
- Decorative fidelity with no effect on task pressure or workflow reasoning.
- Implementation detail that binds the architecture prematurely to a specific engine or UI stack.

### What It Forbids

- Adding architectural complexity that cannot be justified by a specific agent-pressure scenario.
- Retaining scaffold or contract surfaces whose complexity does not trace to a clinical pressure source.
- Pursuing engine fidelity beyond what the agent's perception and action surfaces can distinguish.
- Treating "realism" as self-justifying. Every realistic element must name the agent behavior it pressures.

### What Later Work It Governs

- Every foundational contract must include a `clinical-pressure justification` field.
- Every scaffold audit classification must score against this filter.
- The Research-Hook Decision Contract: engine research is triggered only when the current substrate cannot produce a clinically meaningful pressure the architecture requires.
- Every future increase in simulation complexity must be justified in terms of the additional clinically meaningful pressure it creates.

---

## Cross-Invariant Dependencies

The eight invariants are not independent. They form a directed dependency structure:

```
Patient Truth (1) ──────────────────────────────┐
    │                                            │
    ▼                                            │
Simulation Clock (2) ──► all time-aware layers   │
    │                                            │
    ▼                                            │
Monitor-As-Avatar (3) ◄─────────────────────────┘
    │                         │
    ▼                         ▼
L0-L4 Projection (4) ◄── defines the layer model
    │         │
    ▼         ▼
Charting Authority (5)    Obligation Lifecycle (6)
    │                         │
    └────────┬────────────────┘
             ▼
    Intervention Closure (7)
             │
             ▼
    Clinical Pressure Filter (8) ◄── gates all of the above
```

- **Patient Truth** is the source. Without it, projections have nothing to project.
- **Simulation Clock** governs all temporal behavior across all layers.
- **Monitor-As-Avatar** is the first projection of truth and the gateway to clinical reasoning.
- **L0–L4 Projection Separation** gives the layer model its structure.
- **Charting Authority** and **Obligation Lifecycle** are the two workflow surfaces that operate on the layer model.
- **Intervention Closure** is the feedback loop that connects agent/nurse action back to patient truth.
- **Clinical Pressure Filter** is the gatekeeper that determines whether any of the above complexity is justified.

---

## Deferred Decisions

The invariant kernel intentionally does not decide:

| Decision | Why Deferred | Decision Hook |
|----------|-------------|---------------|
| Which physiology engine | Does not affect invariants; affects adapter implementation | Research-Hook Decision Contract |
| Engine transport (Python binding, REST, WASM) | Implementation topology, not architecture | First runtime batch |
| Specific alarm threshold values | Clinical content, not architecture | Monitor Telemetry Contract |
| FHIR write-back cadence | Operational tuning, not invariant | Monitor Telemetry Contract |
| UI rendering approach | Does not affect invariants; UI follows architecture | Specialized UI/UX lane |
| Repo file layout | Topology, not architecture | Brownfield Mapping (Lane 5) |
| Scenario authoring format | Implementation convenience, not invariant | Scenario and Intervention Contract |
| Waveform rendering library | Implementation, not architecture | First runtime batch |

---

## Appendix A. Temporal Partition and Authored Stream Dualism

This appendix is the kernel-level anchor for the Cross-Contract Partition Spec (CCPS-1) and the Scenario Authoring Contract (SAC-1), and is the citable foundation for the T- (temporal-partition) and D- (decision-class) amendments in `foundational-contracts-simulation-architecture.md` that land alongside it. It does not renumber or replace invariants 1–8; it clarifies how those invariants apply once scenarios are grounded in real-patient substrate (MIMIC-IV or Synthea) rather than hand-authored synthetic seeds.

### A.1 The T=0 cut

Every grounded-patient scenario carries an explicit simulation-time zero — **T=0** — drawn from a chosen cut-point in the source patient's trajectory (e.g., ICU day 2, hour 14). The cut-point is a scenario-authored field (`source_patient.cut_point`), not an implementation detail. The source record splits cleanly against this cut:

- Before T=0 → historical substrate. Eligible for chart seeding subject to the scenario's `history_window`.
- After T=0 → present-progressive substrate. Engine ground-truth input only (driving insults, interventions) and/or scripted input to the provider actor's event queue. **Never** rendered into any projection the agent can read directly.

### A.2 The pruned-historical snapshot

The chart Noah reads at T=0 is a **pruned historical snapshot** of the source record, not the record itself. The snapshot is produced by the scenario loader during a one-shot load pass (governed by Contract 6 T6) and is the only time the synthetic provenance actor `historical-seed` is permitted to author L3 entries. Runtime writes by `historical-seed` are forbidden.

The default snapshot is the full ICU stay up to the cut-point plus admission H&P, active problems/meds/allergies, and last prior discharge summary (if present in the source cohort). Scenarios may narrow this via `history_window.bounded_to`; the full-stay default is the baseline.

### A.3 Authored-stream dualism

After T=0, the chart is only written by two runtime authors:

1. **`noah-nurse`** — the agent under test. Writes via clinical-mcp charting tools.
2. **`provider`** — the provider actor. Writes via scheduled events on the simulation clock and via reactive events triggered by Noah's escalation tool calls, with a bounded-latency policy response (accept / defer / modify / decline).

The **monitor** is a read-only sibling surface. It posts continuous vital-sign Observations with `status=preliminary` and `agent.who=device-auto` into the chart; these are inert until Noah's validation tool promotes them to `status=final` with `noah-nurse` attestation Provenance. This is the only narrow L1→L3 auto-write path and it does not constitute a third author — `device-auto` produces only preliminary, never final, chart state.

`scenario-director` is reserved for emergency/death events that are neither a nurse action nor a provider policy response (e.g., cardiac arrest state flip, scenario termination).

### A.4 Video-game-level instantiation

Each scenario run is a **fresh instance** — a blank-canvas level in a progression. Noah's runtime writes during a run are scoped to that run and do not persist across instances. Outcomes are dynamic: the same scenario definition with the same historical seed and same provider schedule can end differently depending on Noah's actions. Cross-instance write bleed is a CCPS-1 failure mode.

### A.5 Citing this appendix

All six T-amendments (T1–T6) and three D-amendments (D5–D7) in the foundational contracts cite this appendix. CCPS-1 and SAC-1 cite it directly. The first-bedside-workflow-spec addendum (per-beat L3-author column) cites A.3. Future contracts that touch scenario loading, agent chart reads, or provider behavior must be consistent with A.1–A.4.

---

## Provenance

- **Planning origin:** `.omx/plans/invariant-kernel-simulation-architecture.md` (gitignored planning surface; canonical copy is this file)
- **Primary source:** `.omx/specs/deep-interview-simulation-architecture-agent-native.md`
- **Structuring source:** `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`
- **Clinical evidence:** `wiki/sources/2026-04-13-simulation-vision-and-icu-charting-reality.md` (Collins et al. 2018, Drew 2014, CONCERN study)
- **Ontological foundation:** `wiki/sources/2026-04-13-clinical-sim-architecture-documentation-emergence.md` (five-layer patient ontology, five invariants, IDI)
- **Brownfield evidence reviewed but not governing:** `services/sim-harness/`, `services/clinical-mcp/src/events/`, `docs/foundations/sim-harness-*.md`
- **Research reviewed but not governing:** `research/simulation-environments/` (Pulse, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS comparative analysis)
