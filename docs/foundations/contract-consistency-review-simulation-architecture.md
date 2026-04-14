# Contract Consistency Review: Simulation Architecture

## Governing Artifacts

- Foundational contracts: `docs/foundations/foundational-contracts-simulation-architecture.md`
- Encounter validation: `docs/foundations/encounter-validation-simulation-architecture.md`
- Invariant kernel: `docs/foundations/invariant-kernel-simulation-architecture.md`

This is the Lane 4 deliverable. Critic-mode review of the nine contracts for cross-contract defects, overlap, missing invariants, and blocking dependencies.

---

## Cross-Contract Defects

### Defect 1: L4 Obligation Engine Placement Is Unresolved

**Contracts affected:** 2 (Projection), 7 (Obligations)

Contract 2 lists the obligation engine owner as "TBD placement." Contract 7 repeats this. No other contract resolves it. This is not a deferred decision — it is a blocking placement question that affects the dependency graph.

**Why it matters:** The obligation engine must read L2 events (from sim-harness), L3 state (from clinical-mcp/Medplum), and the simulation clock (from sim-harness). If it lives in sim-harness, it has native clock access but must reach into Medplum for L3. If it lives in clinical-mcp, it has native L3 access but must subscribe to L2 and the clock. Neither placement is clean.

**Recommendation:** Add an explicit architectural decision hook. The placement is not a deferred technology decision (Contract 9 territory) — it is an architectural boundary decision that should be resolved during Lane 5 (Brownfield Mapping) or early Lane 6. Record the trade-off explicitly in Contract 7 and name the decision trigger: "resolve when the first obligation-generating scenario is implemented."

**Severity:** Medium. Does not block contract acceptance but blocks implementation.

---

### Defect 2: L2 Event Release Authority Is Split

**Contracts affected:** 1 (Patient Truth), 2 (Projection), 6 (Scenario/Intervention)

Contract 1 says L0 produces "L2 triggers" (threshold crossings that make events releasable). Contract 6 says the scenario controller owns L2 release timing. Contract 2 says L2 events are "time-released on simulation clock." The three descriptions are compatible but the authority chain is unclear: does L0 trigger the release, or does the scenario controller? What happens if L0 crosses a threshold but the scenario controller hasn't scheduled the release?

**Resolution:** The authority is two-stage. L0 makes events *eligible* (the lab is physiologically ready). The scenario controller makes events *released* (the lab is resulted and available). This two-stage model should be stated explicitly in Contracts 1, 2, and 6. Neither L0 nor the scenario controller alone controls release — both are required.

**Severity:** Medium. Could cause implementation confusion if not clarified.

---

### Defect 3: Charting Authority Ceiling Is Not Linked to Scenario Configuration

**Contracts affected:** 5 (Charting), 6 (Scenario)

Contract 5 defines six authority states but doesn't specify how the authority ceiling is configured. Contract 6 defines scenario visibility rules but doesn't mention charting authority. In practice, the authority ceiling should be scenario-configurable: a teaching scenario might permit `execute` for device-sourced vitals; an eval scenario might restrict to `propose` only.

**Resolution:** Add a `charting_policy` field to the scenario definition in Contract 6. This field specifies the maximum authority ceiling per entry type for the scenario. Contract 5 should reference this as the configuration source.

**Severity:** Low. Does not block contracts but will be needed at implementation.

---

### Defect 4: Eval Recorder L0 Access Is Asserted But Not Bounded

**Contracts affected:** 1 (Patient Truth), 8 (Eval/Trace)

Contract 1 says the eval recorder is the "only consumer permitted L0 access." Contract 8 says the recorder has "read access to all layers." But neither contract specifies *when* L0 snapshots are taken, how frequently, or what triggers a capture. The encounter validation showed this matters: a transient SpO2 artifact lasting 8 seconds could be missed if L0 snapshots are taken at 60-second intervals.

**Resolution:** Contract 8 should specify a minimum snapshot policy: periodic captures at configurable cadence (default: every engine tick or every N seconds), plus event-triggered captures when any monitored parameter crosses a threshold or when an agent action occurs. The snapshot policy should be a scenario-level configuration.

**Severity:** Low. Does not block contracts but affects eval fidelity.

---

## Overlap Analysis

### Overlap 1: Intervention Routing Described in Three Contracts

Contracts 1, 6, and 7 all describe aspects of intervention flow:
- Contract 1: Interventions are inputs to L0.
- Contract 6: Scenario controller routes interventions to the engine.
- Contract 7: Interventions create obligations.

**Assessment:** This is correct decomposition, not problematic overlap. Each contract owns a different phase of the intervention lifecycle. Contract 6 is the authoritative routing contract. Contracts 1 and 7 describe their respective consumption of intervention events. No cleanup needed.

### Overlap 2: Waveform Vision Referenced in Contracts 4 and 8

Contract 4 (Monitor) defines the waveform surface. Contract 8 (Eval) scores waveform vision usage. The existing `sim-harness-waveform-vision-contract.md` (classified KEEP in the audit) covers both.

**Assessment:** Correct. The standalone waveform vision contract is the authoritative source. Contracts 4 and 8 reference it without duplicating it. No cleanup needed.

### Overlap 3: Clock Dependency Repeated Across Many Contracts

Contracts 1, 3, 4, 6, 7, and 8 all reference the simulation clock. Contract 3 is the authority.

**Assessment:** Correct. Clock is a cross-cutting concern. Each contract states its clock dependency; Contract 3 is the single source. No cleanup needed.

---

## Missing Invariants

### Missing 1: No Agent Self-Monitoring Invariant

None of the nine contracts address the agent's ability to monitor its own performance — token budget awareness, response latency under time pressure, or graceful degradation when the agent cannot keep up with obligation velocity.

**Impact:** Under accelerated clock modes, obligations accumulate faster than the agent may be able to process. The architecture should state whether the agent is expected to degrade gracefully (skip lower-priority obligations), request clock slowdown, or fail explicitly.

**Recommendation:** Add a performance-awareness invariant to Contract 3 (Clock) or Contract 7 (Obligations): "If the agent cannot process obligations at clock speed, the system must either slow the clock, degrade gracefully with explicit prioritization, or declare the run invalid for eval purposes."

---

### Missing 2: No Patient Death / Scenario Termination Invariant

The encounter validation explicitly notes this gap. No contract defines what happens when L0 state becomes incompatible with life. Does the scenario end? Do obligations clear? Does the eval recorder capture a terminal event?

**Recommendation:** Add a termination clause to Contract 6 (Scenario): "The scenario controller may declare patient death based on L0 state. Death terminates L1 projection (monitor shows asystole/flatline), clears non-documentation obligations, creates a mandatory death-documentation obligation, and signals the eval recorder."

---

### Missing 3: No Data Retention / Archival Invariant

Contract 8 mentions "configurable retention with explicit truncation markers" but no contract defines how long L1 ring buffers, L2 event logs, L3 chart state, or L4 obligation records are retained during a running scenario. For long scenarios (12-hour shifts under wall-clock), memory management matters.

**Recommendation:** Add a retention clause to Contract 2 (Projection): "Each layer has a configurable retention window. L1 waveform buffer: minimum 60 seconds (per waveform vision contract). L2 event log: full scenario. L3 chart state: full scenario (persistent in Medplum). L4 obligation log: full scenario."

---

## Blocking Matrix

Which contracts block implementation of which other contracts?

| Contract | Blocked By | Blocks |
|----------|-----------|--------|
| 1. Patient Truth | 3 (Clock) | 2, 4, 6 |
| 2. L0–L4 Projection | 1 | 4, 5, 7, 8 |
| 3. Clock | — (foundation) | 1, 4, 6, 7, 8 |
| 4. Monitor/Alarm | 1, 2, 3 | 5, 8 |
| 5. Charting | 2, 4 | 7, 8 |
| 6. Scenario/Intervention | 1, 3 | 7, 8 |
| 7. Obligations | 2, 5, 6 | 8 |
| 8. Eval/Trace | all (reads all layers) | — (terminal consumer) |
| 9. Research-Hook | — (process, not implementation) | gates technology choices for all |

**Critical path:** 3 → 1 → 2 → {4, 6} → {5, 7} → 8

**Parallelizable after foundation:**
- Contracts 4 (Monitor) and 6 (Scenario) can be implemented in parallel once 1, 2, 3 are stable.
- Contracts 5 (Charting) and 7 (Obligations) can be implemented in parallel once 2, 4, 6 are stable.
- Contract 8 (Eval) is the integrator and must come last.

---

## Summary of Required Amendments

| ID | Severity | Contract(s) | Amendment |
|----|----------|-------------|-----------|
| D1 | Medium | 2, 7 | Add explicit obligation engine placement decision hook with trigger condition |
| D2 | Medium | 1, 2, 6 | Clarify two-stage L2 event release authority (L0 eligibility + scenario controller release) |
| D3 | Low | 5, 6 | Add `charting_policy` to scenario definition; reference from Contract 5 |
| D4 | Low | 1, 8 | Specify L0 snapshot policy (periodic + event-triggered) in Contract 8 |
| M1 | Low | 3 or 7 | Add agent performance-awareness invariant for clock/obligation mismatch |
| M2 | Medium | 6 | Add patient death / scenario termination clause |
| M3 | Low | 2 | Add per-layer data retention policy |

**None of these amendments block Lane 5 or Lane 6.** They should be applied before the contracts are used as implementation specifications, but the contract set is stable enough for brownfield mapping and execution decomposition.

---

## Provenance

- **Review method:** Systematic cross-contract comparison of inputs, outputs, invariants, and owner boundaries. Each contract pair checked for conflicting claims, unresolved references, and implicit assumptions.
- **Encounter stress-testing:** Defects D2 and D4 were surfaced by re-reading the encounter validation against the contract text.
- **Missing invariants M1 and M2:** Surfaced from the encounter validation's uncovered gaps section.
