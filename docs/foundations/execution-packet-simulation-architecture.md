# Execution Packet: Simulation Architecture

## Governing Artifacts

- Invariant kernel: `docs/foundations/invariant-kernel-simulation-architecture.md`
- Foundational contracts: `docs/foundations/foundational-contracts-simulation-architecture.md`
- Encounter validation: `docs/foundations/encounter-validation-simulation-architecture.md`
- Consistency review: `docs/foundations/contract-consistency-review-simulation-architecture.md`
- Brownfield mapping: `docs/foundations/brownfield-mapping-simulation-architecture.md`

This is the Lane 6 deliverable — the portable handoff packet for implementation. A future agent or team can start from this document without rediscovering architecture intent.

---

## Execution Lanes

Implementation decomposes into six bounded lanes with explicit dependencies. Each lane cites the contracts it implements, the files it touches, and the verification it must produce.

### Implementation Lane A: Clock and Engine Foundation

**Implements:** Contract 1 (Patient Truth), Contract 3 (Clock)

**Scope:** Build the time authority and the engine adapter boundary. After this lane, the sim-harness can tick a physiology engine forward in simulated time under all four clock modes.

**File targets:**
- `services/sim-harness/src/clock.ts` — simulation clock with wall/accelerated/frozen/skip-ahead modes
- `services/sim-harness/src/engine-adapter.ts` — abstract engine adapter interface (insult-in, emergent-vitals-out)
- `services/sim-harness/src/reference/pharmacokinetics.ts` — relocated from `clinical-mcp/src/events/physiology.ts` as reference implementation / test fixture behind the adapter interface
- `services/sim-harness/src/config.ts` — relocated PK and scenario config from clinical-mcp

**Brownfield moves:**
- Move `clinical-mcp/src/events/physiology.ts` → `sim-harness/src/reference/pharmacokinetics.ts`
- Move `clinical-mcp/src/config.ts` PK section → `sim-harness/src/config.ts`
- Delete `clinical-mcp/src/events/physiology.ts` after move

**Dependencies:** None. This is the foundation.

**Verification:**
- [ ] Clock supports all four modes with mode-switching.
- [ ] Engine adapter interface accepts insults/interventions, returns emergent vitals.
- [ ] Reference PK implementation passes existing test cases behind the adapter interface.
- [ ] No component reads wall-clock time for simulation decisions.
- [ ] Skip-ahead produces same state as wall-clock to same target time (deterministic test).

**Agent type:** `executor` with `architect` review on adapter interface design.

**Reasoning depth:** High for adapter interface. Medium for clock implementation.

---

### Implementation Lane B: Projection Layer and Scenario Controller

**Implements:** Contract 2 (Projections), Contract 6 (Scenario/Intervention)

**Scope:** Build the L0→L1→L2 projection pipeline and the scenario controller. After this lane, a scenario can be loaded, events scheduled on the clock, interventions routed to the engine, and projections produced at each layer.

**File targets:**
- `services/sim-harness/src/projections/monitor.ts` — L0→L1 projection (numeric telemetry, waveform buffer, signal quality state)
- `services/sim-harness/src/projections/events.ts` — L0→L2 event release (two-stage: eligibility + controller release)
- `services/sim-harness/src/scenario/controller.ts` — scenario lifecycle, timeline scheduling, intervention routing
- `services/sim-harness/src/scenario/types.ts` — scenario definition types
- `services/sim-harness/scenarios/` — relocated scenario seeds from clinical-mcp

**Brownfield moves:**
- Decompose `clinical-mcp/src/events/generator.ts` → scenario controller + projection modules
- Move `clinical-mcp/src/events/scenarios/*.ts` → `sim-harness/scenarios/`
- Delete `clinical-mcp/src/events/generator.ts` after decomposition

**Dependencies:** Lane A (clock, engine adapter).

**Verification:**
- [ ] L1 values differ from L0 values (projection is lossy — includes noise, sampling).
- [ ] L2 events release at scenario-controlled times, not at L0 state-change times.
- [ ] Two-stage event release works (L0 eligibility + controller release).
- [ ] An intervention produces visible L1 change after onset delay, not immediately.
- [ ] Scenario can be loaded, started, paused, reset.
- [ ] Two concurrent interventions coexist.

**Agent type:** `executor` with `architect` review on projection semantics.

**Reasoning depth:** High for projection boundaries. Medium for scenario controller.

---

### Implementation Lane C: Monitor, Alarm, and Artifact Model

**Implements:** Contract 4 (Monitor/Alarm/Artifact)

**Scope:** Build the alarm evaluation engine, signal quality model, and artifact generation. After this lane, the monitor projection includes alarms, signal quality indicators, and artifact events that the agent must interpret.

**File targets:**
- `services/sim-harness/src/monitor/alarms.ts` — alarm evaluation (threshold, arrhythmia, technical), priority tagging (IEC 60601-1-8)
- `services/sim-harness/src/monitor/signal-quality.ts` — per-parameter quality state (good, marginal, artifact, disconnected, stale)
- `services/sim-harness/src/monitor/artifacts.ts` — artifact generation models (motion, electrical interference, lead disconnect, damping)
- Updated `services/sim-harness/src/index.ts` — alarm types, signal quality types

**Dependencies:** Lane B (L1 projection feeds alarm evaluation).

**Verification:**
- [ ] At least one alarm type fires during the primary encounter scenario.
- [ ] At least one artifact event produces a signal quality change the agent can query.
- [ ] Alarm events carry IEC 60601-1-8 priority tags.
- [ ] SpO2 motion artifact is distinguishable from real desaturation via waveform inspection (adversarial encounter T+15 vs T+45).
- [ ] Sensor disconnect produces disconnect indicator, not false zero.

**Agent type:** `executor`. Clinical domain knowledge required for alarm thresholds and artifact models.

**Reasoning depth:** Medium. Contract 4 is well-specified; implementation is primarily parameterization.

---

### Implementation Lane D: Charting Authority and Provenance

**Implements:** Contract 5 (Charting Policy/Provenance)

**Scope:** Build the charting policy engine, FHIR Provenance generation, and the L1→L3 validation gate. After this lane, the agent can propose, prepare, or (policy-permitting) execute chart entries with full provenance.

**File targets:**
- `services/clinical-mcp/src/charting/policy.ts` — authority state evaluation (per entry type, per workflow, per scenario)
- `services/clinical-mcp/src/charting/provenance.ts` — FHIR Provenance resource generation
- `services/clinical-mcp/src/charting/types.ts` — authority state types, provenance types
- Updated `services/clinical-mcp/src/server.ts` — charting tools (`chart_propose`, `chart_prepare`, `chart_execute`, `chart_attest`, `chart_escalate`)

**Dependencies:** Lane B (L2 events trigger charting opportunities). Lane C (L1 alarm events may require charting).

**Verification:**
- [ ] Every chart entry has a FHIR Provenance resource.
- [ ] `preliminary` and `final` entries are distinguishable.
- [ ] Agent cannot `execute` without policy authorization (rejection test).
- [ ] `propose` → nurse approval → `final` workflow works end-to-end.
- [ ] Provenance correctly identifies source layer.

**Agent type:** `executor` with `architect` review on FHIR Provenance modeling.

**Reasoning depth:** High. Charting authority is the most policy-sensitive contract.

---

### Implementation Lane E: Obligation Engine

**Implements:** Contract 7 (Obligations)

**Scope:** Build the obligation lifecycle engine. After this lane, interventions create follow-up obligation trees, ordered-cadence obligations recur, and overdue obligations escalate.

**File targets:**
- Placement TBD per consistency review Defect 1. Likely `services/sim-harness/src/obligations/` or a standalone module.
- `*/obligations/engine.ts` — obligation creation, lifecycle management, escalation
- `*/obligations/types.ts` — obligation types (ordered, event-driven, judgment-driven), lifecycle states
- `*/obligations/policies/` — follow-up cadence definitions per medication/intervention type

**Dependencies:** Lane B (L2 events trigger obligations), Lane D (charting resolves obligations).

**Verification:**
- [ ] Medication administration creates follow-up obligations with simulation-time deadlines.
- [ ] Overdue obligation generates escalation event.
- [ ] Agent can explicitly defer an obligation with rationale.
- [ ] Three documentation modes distinguishable in obligation queue.
- [ ] Under accelerated clock, obligations accumulate at clock speed.

**Agent type:** `executor`. Domain knowledge required for follow-up cadence clinical content.

**Reasoning depth:** Medium. Contract 7 is well-specified; primary complexity is the obligation tree data structure.

---

### Implementation Lane F: Eval Integration and Sim Tool Surface

**Implements:** Contract 8 (Eval/Trace), sim tool registration, end-to-end integration

**Scope:** Build the evaluation recorder, wire all sim tools through clinical-mcp with `sim_` prefix and conditional registration, and validate the complete system against the two encounter scenarios.

**File targets:**
- `evals/sim-trace/recorder.ts` — trace capture across all layers
- `evals/sim-trace/types.ts` — trace format types
- Updated `services/clinical-mcp/src/server.ts` — conditional `sim_` tool registration
- `evals/scenarios/septic-shock-pressor-titration.ts` — primary encounter as executable test
- `evals/scenarios/artifact-vs-deterioration.ts` — adversarial encounter as executable test

**Brownfield cleanup (also in this lane):**
- Rewrite `services/clinical-mcp/src/server.ts` sim tool section (remove old tools, add sim-prefixed)
- Rewrite `services/sim-harness/README.md` to align with kernel
- Archive `docs/foundations/sim-harness-first-batch.md`
- Add headers to `sim-harness-engine-wrapping.md` and `sim-harness-waveform-vision-contract.md`

**Dependencies:** All previous lanes (A through E). This is the integrator.

**Verification:**
- [ ] Primary encounter runs end-to-end under accelerated clock.
- [ ] Adversarial encounter runs end-to-end, including artifact vs deterioration distinction.
- [ ] Trace captures L0 snapshots alongside L1/L3 at scored moments.
- [ ] Scoring detects L0/L3 divergence.
- [ ] Scoring detects obligation timing.
- [ ] Scoring detects waveform vision usage.
- [ ] Sim tools register only when sim-harness is present.
- [ ] All brownfield cleanup items completed.

**Agent type:** `executor` with `verifier` support for end-to-end acceptance.

**Reasoning depth:** High. Integration reveals cross-contract gaps.

---

## Lane Dependency Graph

```
Lane A (Clock + Engine) ────────────────────────┐
                                                 │
Lane B (Projections + Scenario) ◄────────────────┘
         │              │
         ▼              ▼
Lane C (Monitor/Alarm)  Lane D (Charting Authority)
         │              │
         └──────┬───────┘
                ▼
Lane E (Obligations) ◄── needs B + D
                │
                ▼
Lane F (Eval + Integration) ◄── needs all
```

**Parallelizable:**
- Lanes C and D can run in parallel (both depend on B, not on each other).
- Lane E depends on B and D but not directly on C.
- Lane F is strictly sequential after all others.

---

## Contract-to-Lane Dependency Matrix

| Contract | Implementing Lane | Also Referenced In |
|----------|------------------|-------------------|
| 1. Patient Truth | A | B, F |
| 2. L0–L4 Projection | B | C, D, E, F |
| 3. Clock | A | B, C, D, E, F |
| 4. Monitor/Alarm | C | D, F |
| 5. Charting | D | E, F |
| 6. Scenario/Intervention | B | C, E, F |
| 7. Obligations | E | F |
| 8. Eval/Trace | F | — |
| 9. Research-Hook | — (invoked when needed) | A (engine choice) |

---

## Verification Expectations Per Lane

Each lane must produce:

1. **Unit tests** for all new modules.
2. **Integration test** demonstrating the lane's acceptance criteria against at least one encounter fragment.
3. **Contract citation** — each module's doc comment or README must cite the contract(s) it implements.
4. **Invariant assertion** — at least one test per lane that would fail if a kernel invariant were violated (e.g., Lane A: test that agent-facing API cannot return L0 state).

---

## Gating for Later Execution

### Sequential execution (`$ralph`)

Available after Lane F exists. Run lanes A→B→C/D→E→F in order.

### Parallel execution (`$team`)

Available once lane scopes, file targets, and contract dependencies are explicit (this document). Assign:
- Agent 1: Lane A → Lane B
- Agent 2: Lane C (after B checkpoint)
- Agent 3: Lane D (after B checkpoint)
- Agent 4: Lane E (after B + D checkpoints)
- Integrator: Lane F (after all checkpoints)

### Verification for team execution

- Each lane must produce local verification evidence (tests pass, contract citations present).
- A final verifier pass must confirm no contract invariant was broken across lane boundaries.
- The verifier should re-run both encounter scenarios end-to-end after Lane F.

---

## Open Decision Hooks

| Decision | Trigger | Contract | Lane |
|----------|---------|----------|------|
| Engine choice (Pulse, BioGears, other) | Lane A adapter interface cannot meet a Contract 1 acceptance criterion with the reference PK implementation | 9 | A |
| Obligation engine placement | Lane E implementation begins | 7, consistency review D1 | E |
| Scenario charting policy format | Lane D implementation begins | 5, consistency review D3 | D |
| L0 snapshot cadence | Lane F eval integration | 8, consistency review D4 | F |
| Patient death/termination | First scenario that reaches incompatible-with-life state | 6, consistency review M2 | B or F |

---

## Provenance

- **Lane structure:** Derived from contract dependency matrix in `foundational-contracts-simulation-architecture.md` and blocking matrix in `contract-consistency-review-simulation-architecture.md`.
- **File targets:** Derived from brownfield mapping in `brownfield-mapping-simulation-architecture.md`.
- **Verification expectations:** Derived from PRD verification path and contract acceptance criteria.
- **Gating rules:** Derived from PRD launch hints.
