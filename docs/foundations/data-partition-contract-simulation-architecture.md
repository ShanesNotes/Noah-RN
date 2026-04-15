# CCPS-1: Cross-Contract Partition Spec — Simulation Architecture

## Governing Source

- Kernel anchor: `docs/foundations/invariant-kernel-simulation-architecture.md` Appendix A (Temporal Partition and Authored Stream Dualism)
- Contract anchors: `docs/foundations/foundational-contracts-simulation-architecture.md` amendments T1–T6, D5, D7
- Companion: `docs/foundations/scenario-authoring-contract-simulation-architecture.md` (SAC-1)
- Vision pass: `/home/ark/.claude/plans/sunny-noodling-stearns.md` Session 1

## Purpose

CCPS-1 codifies the temporal partition of any grounded-patient scenario — how the source patient record (MIMIC-IV or Synthea) splits across the T=0 cut-point, how the chart baseline is seeded, and how post-T=0 source material is kept invisible to the agent. It consolidates amendments T1–T6 into a single citeable spec so Lane B (scenario controller), Lane D (charting authority), and Lane F (eval recorder) validate against one document rather than chasing clauses through five contracts.

This is **not** a 10th foundational contract. It is a cross-cutting partition specification that sits alongside the 1–9 numbering, referenced from Contracts 1, 2, 5, and 6.

## The Problem CCPS-1 Solves

MIMIC-IV and Synthea patient records are loaded into the Medplum store as whole trajectories today. Without a partition regime, Noah can query the chart at simulation time T=0 and see lab values from T+10h, progress notes from T+4h, or medication administrations that have not yet occurred in the scenario. This is a **data-leakage failure** — the agent is no longer reasoning under clinical uncertainty; it is reasoning over an oracle.

Two distinct sub-problems:

1. **Chart-read leakage.** The agent reads a FHIR resource whose authoritative timestamp is in the scenario future.
2. **Source-trajectory-as-second-truth confusion.** The post-T=0 portion of the source record must drive engine behavior (as authored insults/interventions) without being rendered into any projection the agent reads. A charted value and a source-record row for the same parameter at the same sim-time are not the same thing — the charted value is what Noah (or the provider) wrote; the source-record row is engine input.

## Video-Game-Level Framing

Scenarios are instantiated like levels in a video-game progression. Each run is a **fresh instance**: a blank-canvas chart-state whose runtime writes belong to that instance and do not persist across runs. Outcomes are dynamic — the same scenario definition, same historical seed, same provider schedule can terminate differently depending on Noah's actions. Cross-instance write bleed — where a prior run's runtime writes appear in a new instance's T=0 baseline — is a contract violation.

This framing is not decorative. It is the rationale for run-scoped chart instantiation (T6) and for the cross-instance-isolation eval dimension below.

## The Three Regions of Any Source Record

| Region | Timestamp range | Author at load | Runtime visibility | Runtime writability |
|--------|-----------------|----------------|--------------------|--------------------|
| **Historical-bounded** | Within `history_window`, ≤ T=0 | `historical-seed` | Unrestricted post-load | Immutable (but amendable via Contract 5 attest flow) |
| **Pruned-historical** | Pre-dates `history_window` or scenario-excluded | Not loaded | **Never** | N/A |
| **Post-T=0 trajectory** | > T=0 in source record | Not loaded to Medplum | Only via Contract 6 controlled release (L2 events + provider schedule) | Writes come from engine-driven L2 releases and `provider` author; never from replay |

### Historical-bounded

At scenario start, the T6 loader extracts resources from the source dataset whose authoritative timestamp falls within `history_window` and whose effective timestamp is ≤ T=0. These are written to Medplum with `agent.who = historical-seed` Provenance. This is the only time `historical-seed` may author chart entries. Default `history_window.mode = "full"` — full ICU stay up to the cut-point plus admission note and active-list resources (per SAC-1 default).

### Pruned-historical

Source-record material outside `history_window` or excluded by scenario configuration is **never written** to the scenario-instance Medplum view. The pruned region is therefore unreachable by any agent read path that goes through clinical-mcp or Medplum. If the underlying MIMIC/Synthea data happens to live in a shared store, CCPS-1 requires that the agent's read path be mediated by a scenario-scoped filter so that pruned rows are invisible.

### Post-T=0 trajectory

Post-T=0 source-record rows serve two purposes and **only** those two:
- **Engine input.** Authored insults (e.g., documented hemorrhage, arrhythmia events) and scripted interventions become engine tick-time inputs per Contract 1.
- **Provider-schedule input.** Authored notes, orders, labs, imaging reads from the source record populate the `provider_schedule` as scheduled provider events (Contract 6 D6), dispatched on the simulation clock with `agent.who = provider`.

Rows not mapped to either of these channels are not used. A post-T=0 row is never rendered directly into the chart.

## Enforcement Surfaces

CCPS-1 is enforced at four surfaces. Lane F eval must detect failures at each surface.

1. **Scenario loader (Lane B, Contract 6 T6).** At T=0, the loader prunes before writing. Only `history_window`-eligible resources enter Medplum. Post-T=0 source rows are registered with the engine/provider-schedule subsystems, never with Medplum directly.
2. **Clinical-mcp read path (Lane D).** Every agent read through clinical-mcp applies a scenario-scoped visibility filter: result rows retained only if `authoritative_timestamp ≤ current_simulation_time` **and** `release_state = released`. The filter is keyed to the active scenario instance so cross-instance reads are impossible.
3. **Scenario controller (Lane B).** Future events (provider schedule entries, L2 eligibility-released events) are gated on the simulation clock per Contract 6 D2 two-stage release. No wall-clock scheduling.
4. **Eval recorder (Lane F).** Trace-time assertions detect any of the failure modes below. At least one leak-detection test is required per scenario.

## Failure Modes

Each failure mode below must be detectable by Lane F. Acceptance is not just "the partition is specified" but "the partition is observable and the detector fires when it is broken."

- **FM-1: `_include` leak.** A FHIR `_include` or `_revinclude` parameter pulls related resources past the visibility filter. Detector: inspect result bundles for resources whose `authoritative_timestamp > T` or `release_state ≠ released`.
- **FM-2: Future `date=` parameter leak.** Agent queries with `date=gt<future>` and the clinical-mcp filter does not apply. Detector: log all outgoing FHIR searches; assert every search parameter set is visibility-filter-aware.
- **FM-3: Direct Medplum API bypass.** Agent runtime somehow obtains a direct Medplum client handle and queries without clinical-mcp mediation. Detector: structural — there must be no code path from the agent runtime to Medplum that does not pass through clinical-mcp; audit via import graph in Lane F CI check.
- **FM-4: Stale cache.** Cached result entries from a prior scenario instance are served to a new instance. Detector: cache keys must include scenario-instance-id; cache hits across instance boundaries are structural failures.
- **FM-5: Cross-instance write bleed.** Runtime writes from instance A appear in instance B's T=0 baseline. Detector: at instance start, compare loaded Medplum state against expected `history_window` extraction; any additional resources indicate bleed.
- **FM-6: Post-T=0 source-row leak.** A source-record row with `effectiveDateTime > T=0` appears in a chart read. Detector: tag every `historical-seed`-authored resource at load with its source-record row id; any Medplum resource outside that set whose `agent.who` is not a valid runtime author is a leak.
- **FM-7: Runtime `historical-seed` write.** An L3 write request carries `agent.who = historical-seed` after the T=0 load pass completes. Detector: Contract 5 D5 enforcement — reject the write and log; Lane F eval asserts no such events occurred.
- **FM-8: Provider event on wall-clock.** A provider scheduled event fires from wall-clock rather than simulation time. Detector: every provider event dispatch records its dispatching clock source; wall-clock dispatch is a structural failure.
- **FM-9: Unreleased-provider-event visibility.** A provider event that has been queued but not yet released (sim-time not yet reached) appears in an agent read. Detector: Contract 2 T3 visibility filter must respect release state.

## Acceptance Criteria

- [ ] Every scenario definition declares `source_patient` with a valid dataset/patient_id/cut_point per SAC-1.
- [ ] Every scenario defines `history_window` (or accepts the `full` default).
- [ ] Scenario instance start loads only `history_window`-eligible resources; Medplum baseline matches the extracted set exactly.
- [ ] Agent read via clinical-mcp at simulation time T returns only resources with `authoritative_timestamp ≤ T` and `release_state = released`.
- [ ] Lane F eval detects FM-1 through FM-9 with at least one scripted leak injection per failure mode.
- [ ] Cross-instance isolation: two concurrent scenario instances of the same scenario definition do not see each other's runtime writes.
- [ ] Runtime writes with `agent.who = historical-seed` are rejected and logged.
- [ ] Every agent-visible Medplum query path flows through clinical-mcp; no direct-client bypass exists (verified by import-graph CI check).

## Relationship to Other Contracts

- **Contract 1 (T1, T2):** defines grounded seed and historical-state carry-over. CCPS-1 operationalizes what "grounded" means at the partition level.
- **Contract 2 (T3, T4):** defines temporal visibility and monitor-read-only. CCPS-1 provides the filter semantics and the full failure-mode catalog that Lane F implements.
- **Contract 5 (D5):** defines author taxonomy. CCPS-1 enforces that `historical-seed` is load-only, `device-auto` is preliminary-only, and runtime writes respect the closed set.
- **Contract 6 (T5, T6, D6):** defines scenario-definition fields and loader responsibility. CCPS-1 spells out what the loader must and must not do.
- **Contract 8:** consumes CCPS-1 failure modes as scorable eval dimensions.

## Relationship to SAC-1

SAC-1 defines the shape of a scenario authoring file (fields, validation, derivation pipeline from MIMIC/Synthea). CCPS-1 defines what the runtime does with the partition-relevant fields SAC-1 requires. The two are co-deliverables: no scenario can be authored without SAC-1; no scenario can be run safely without CCPS-1 enforcement.

## Open Questions

- **O2 (from plan):** default provider reactive latency window. Current default 5–15 min simulation time; scenario-configurable per SAC-1.
- **O3 (from plan):** default monitor `preliminary` Observation cadence. Current default: scenario-configurable; sensible default q5min for continuous-lead-driven vitals and q1h aligned to ordered cadence for validation prompts.
- **Ingest posture:** whether the underlying MIMIC/Synthea bulk load in the shared Medplum store must be pruned-at-rest per scenario, or whether the runtime-filter approach is sufficient when all agent reads are clinical-mcp-mediated. Runtime-filter is preferred under the current clinical-mcp architecture; if a direct-Medplum-read path ever emerges, this question reopens.

## Provenance

- **User vision input (2026-04-14):** recorded in `/home/ark/.claude/plans/sunny-noodling-stearns.md` §Decisions
- **Wiki grounding:** `wiki/concepts/five-layer-patient-ontology.md`, `wiki/concepts/dual-source-waveform-pipeline.md`, `wiki/concepts/federated-digital-twin-architecture.md`, `wiki/concepts/nurse-as-information-gatekeeper.md`
- **Kernel anchor:** `docs/foundations/invariant-kernel-simulation-architecture.md` Appendix A
- **Contract amendments:** T1, T2, T3, T4, T5, T6 in the 2026-04-14 Amendments Log entry of `foundational-contracts-simulation-architecture.md`
