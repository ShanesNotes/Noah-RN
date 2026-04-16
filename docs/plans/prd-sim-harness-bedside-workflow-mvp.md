# PRD: Sim-Harness Bedside Workflow MVP

**Date:** 2026-04-16  
**Status:** Approved for execution handoff  
**Source:** `$ralplan` consensus from `.omx/specs/deep-interview-sim-harness-bedside-workflow.md`

## Requirements Summary

Build one dense ICU MVP patient simulation spanning a full `0700 -> 1900` nursing shift in a hybrid MIMIC-plus-synthetic chart environment, with Pulse-backed monitor realism, canonical `L0` simulation truth, explicit `L2/L3` temporal visibility control, Medplum/FHIR used as the shared `L3` chart boundary, and Noah-RN operating inside that environment from incoming report through outgoing handoff.

Governing sources:
- `.omx/specs/deep-interview-sim-harness-bedside-workflow.md`
- [sim-harness-bedside-workflow.md](/home/ark/noah-rn/docs/plans/sim-harness-bedside-workflow.md)
- [README.md](/home/ark/noah-rn/README.md)
- [PLAN.md](/home/ark/noah-rn/PLAN.md)
- [TASKS.md](/home/ark/noah-rn/TASKS.md)
- [invariant-kernel-simulation-architecture.md](/home/ark/noah-rn/docs/foundations/invariant-kernel-simulation-architecture.md)
- [foundational-contracts-simulation-architecture.md](/home/ark/noah-rn/docs/foundations/foundational-contracts-simulation-architecture.md)

## RALPLAN-DR Summary

### Principles

1. Prove one believable ICU shift before widening scenario count or tooling scope.
2. Keep `L0` canonical truth in the simulation kernel; use Medplum/FHIR only as the shared `L3` chart boundary.
3. Enforce temporal honesty: post-`0700` facts must not become agent-visible before simulated release.
4. Treat narrative chart context and `L4` obligation pressure as load-bearing simulation surfaces.
5. Add only the synthesis, runtime, write-path, and visibility complexity required for one full-shift replay.

### Decision Drivers

1. The success bar is one dense immersive ICU shift, not scenario breadth.
2. Repo architecture requires strict separation across `L0`, release/visibility control, monitor/runtime projection, chart projection, and obligations.
3. Noah-RN must operate against the same evolving chart-and-work environment a clinician would see, without future leakage or side-channel fixtures.

### Viable Options

**Option A: Runtime-first respiratory scenario, dense chart second**

Pros:
- Fastest visible runtime progress.
- Smaller first integration surface.

Cons:
- Risks a vitals demo with weak chart context.
- Under-proves narrative fidelity and temporal chart honesty.

**Option B: One bounded full-shift ICU MVP with hybrid chart substrate, Pulse monitor realism, first-class obligations, and explicit temporal visibility**

Pros:
- Matches the clarified acceptance bar.
- Produces the first environment Noah-RN can actually be tested inside.
- Forces correct layer separation.

Cons:
- Larger integration surface.
- Needs strict scope guardrails.
- Requires replay policy discipline.

**Option C: Dense pre-seeded chart plus minimal live runtime deltas**

Pros:
- Lowers integration risk.
- Keeps chart realism primary.

Cons:
- Risks under-proving live monitor and workload behavior.
- Can fail the immersive live-environment bar if taken too narrowly.

Favored option: `Option B`, with Option C-style guardrails on scope and replay-scoped implementation only.

## Decision

Adopt a one-patient, one-shift MVP that combines:
- hybrid MIMIC-backed chart seeding plus replay-scoped synthetic augmentation
- Pulse-backed live monitor behavior and alarming
- canonical `L0` simulation truth
- explicit `L2/L3` temporal visibility gate
- Medplum/FHIR as the shared `L3` chart boundary
- `L4` obligation/work-pressure generation tied to the shift
- Noah-RN harness operation through the full nursing shift

## Scope

### In Scope

- One ICU MVP patient.
- One full `0700 -> 1900` shift replay.
- Incoming report, assessment, scheduled work, evolving events, and outgoing handoff.
- Dense chart context: notes, labs, vitals, meds, procedures, events, continuity.
- Pulse-backed monitor realism and bedside alarm conventions.
- Replay-scoped FHIR writes required for this one shift path.
- First-class `L4` obligations/work pressure during the shift.
- Explicit `L2/L3` release and visibility control for all in-shift facts.
- Noah-RN-in-simulation verification.

### Non-Goals

- Broad patient corpus.
- Real-time waveform interpretation by the agent.
- Generalized scenario platform work not required for the MVP replay.
- Reusable synthesis platform tooling as a success condition.
- Dashboard growth into a second chart.
- Pure raw-MIMIC fidelity as a product constraint.
- Broad write-surface expansion beyond replay needs.

## MVP Boundaries

The MVP succeeds when one dense patient path works end to end. It does not need:
- ten scenarios
- generalized authoring infrastructure beyond what the replay requires
- a reusable MIMIC-synthesis platform
- perfect device mimicry
- complete future-proof coverage of every FHIR write class

## Clock And Compression Policy

- Canonical clinical timeline remains `0700 -> 1900`.
- Runtime executes as a compressed replay, not a real-time 12-hour wall-clock session.
- Compression ratio is configurable per verification run, but must preserve event ordering, dependency correctness, alarm timing relationships, med/lab scheduling semantics, release-state timing, and handoff boundaries.
- All scenario artifacts must carry both canonical clinical timestamp and replay/runtime timestamp.
- Acceptance is based on clinical coherence across the canonical 12-hour shift, not wall-clock duration.
- Verification must prove replay faithfulness under the chosen compression setting.
- Agent-performance-under-compression rule:
  - If Noah cannot keep up with obligations, chart review, or required actions at the chosen replay speed, the system must do one of:
  - slow the replay clock
  - explicitly shed lower-priority pressure according to the replay spec
  - mark the run invalid
  - A run that silently outruns Noah’s ability to operate is not a valid acceptance run.

## Canonical Scenario Authority Matrix

Before implementation fans out, the execution lane must define one scenario authority matrix that acts as the single source of truth for:
- release timing
- visibility gating
- authorship and finalization policy
- obligation creation
- compression validity checks

No lane may invent its own local variant of those rules.

## Phased Implementation Lanes

### Lane 1: Canonical Shift Spec

Owner types:
- `planner`
- `executor`

Deliver:
- one canonical ICU patient identity and hospital-course summary
- one `0700 -> 1900` shift timeline
- explicit event-by-event authority map:
  - `L0` hidden truth
  - `L1` monitor-visible projection
  - `L2/L3` release and chart visibility state
  - `L4` obligation/work-pressure artifact
  - nurse-authored/provider-authored/Noah-authored outputs as applicable
- explicit replay clock/compression policy
- explicit pre-shift seed vs in-shift authored/released boundary
- canonical scenario authority matrix

Output:
- execution-ready scenario brief for all downstream lanes

### Lane 2: Dense Chart Seed

Owner types:
- `researcher`
- `executor`

Deliver:
- MIMIC source selection and stitching rules
- dense pre-shift chart bundle
- replay-scoped synthetic augmentation for continuity and note fidelity
- provenance model for source lineage into seeded chart artifacts
- explicit designation of what exists before `0700` versus what must be authored/released during shift replay

Guardrail:
- every seeded artifact must support the canonical replay directly
- no reusable synthesis platform is required for MVP success

### Lane 3: Temporal Visibility Gate

Owner types:
- `executor`
- `debugger`

Deliver:
- named `L2/L3` temporal-visibility model for the replay
- authoritative timestamps for every replay artifact class
- release-state rules defining when artifacts become agent-visible
- `clinical-mcp` read filtering that prevents future leakage
- filtering coverage for:
  - search queries
  - `_include` / related-resource expansion
  - direct resource reads
  - cache/materialized-read paths
- verification harness proving hidden future data cannot be observed early

Guardrail:
- no post-`0700` fact becomes agent-visible before its release condition is met
- temporal gating applies uniformly across UI, MCP, and agent access paths

### Lane 4: Pulse Runtime And Alarm Projection

Owner types:
- `executor`
- `debugger`

Deliver:
- Pulse sidecar or equivalent bounded integration path
- adapter from `L0` physiology truth to monitor-visible state
- alarm thresholds and policies for the MVP patient path
- clear separation between hidden truth and monitor/chart projections

Guardrail:
- no runtime generalization that is not needed for the shift replay

### Lane 5: Replay-Scoped FHIR Write Surface And Charting Authority

Owner types:
- `executor`
- `architect`

Deliver only the write paths required for the replay:
- observations
- medication administration
- procedures
- tasks/communications only if the replay requires them
- provenance linkage

Charting-authority/provenance policy must explicitly define:
- which artifacts are device-auto preliminary
- which artifacts require nurse-authored validation
- which artifacts require provider-authored validation
- which Noah-authored artifacts are allowed
- how `preliminary -> final` promotion works
- how authorship, validation state, and provenance are represented

Guardrail:
- keep write semantics narrow and replay-scoped
- no generalized write framework beyond this patient replay
- Medplum remains `L3` chart boundary, not truth source
- chart finalization rules must align with release-state timing and clinical authority

### Lane 6: Obligation And Work-Pressure Model

Owner types:
- `executor`
- `architect`

Deliver:
- explicit `L4` obligation set for the shift
- scheduled and event-driven nursing tasks
- work-pressure transitions tied to patient state and chart events
- handoff-relevant unresolved items and pending work at `1900`

Guardrail:
- obligations must arise from the same replay spec and chart state
- do not build a broad task platform beyond what the replay requires

### Lane 7: Noah-RN Workflow Harness

Owner types:
- `executor`
- `writer`

Deliver:
- `0700` report consumption surface
- assessment-time context gathering path
- mid-shift operational checkpoints against live chart plus obligations
- `1900` outgoing report target

Guardrail:
- Noah-RN must act inside the shared chart environment and obligation surface, not against side-channel fixtures
- Noah access must respect the same temporal visibility rules as any clinician-facing read path

### Lane 8: Verification And Replay Evidence

Owner types:
- `test-engineer`
- `verifier`

Deliver:
- full-shift replay runner
- FHIR verification queries
- nursing-station verification path as primary chart proof
- dashboard verification path as sidecar/runtime observability only
- Noah-RN-in-simulation evidence pack
- residual-risk log
- temporal-leakage verification pack

## Acceptance Criteria

1. One ICU patient can be run through a coherent full shift from `0700` to `1900`.
2. The chart reads like a believable ICU hospital course, not disconnected data fragments.
3. Narrative fidelity is strong enough that notes and structured record both serve as meaningful agent context.
4. Pulse-backed monitor behavior and alarm patterns are clinically plausible for the replay.
5. `L0` remains canonical simulation truth while Medplum/FHIR correctly reflects the replay as the shared `L3` chart boundary.
6. Required replay-scoped FHIR artifacts land correctly without broadening write semantics beyond the single replay.
7. `L4` obligations/work pressure are present and materially shape the shift workflow.
8. Nursing-station proves the primary clinician chart workflow.
9. Dashboard proves sidecar/runtime support only and does not become a second chart.
10. Noah-RN can complete incoming report consumption, patient assessment context gathering, mid-shift operation, and outgoing handoff inside the same environment.
11. Pre-shift seeded data is explicitly distinguished from in-shift authored/released data.
12. No post-`0700` fact is visible to Noah or clinician-facing reads before its simulated release time.
13. Temporal visibility controls are verified across search, `_include`, direct reads, and cache/materialized-read paths.
14. Charting authority and provenance are explicit for replay artifacts, including device-auto preliminary versus nurse/provider/Noah authored or validated outputs and `preliminary -> final` promotion rules.
15. If replay compression outruns Noah’s ability to operate, the run is slowed, pressure is explicitly reduced per policy, or the run is marked invalid.
16. The MVP remains bounded to one patient path and does not require multi-scenario breadth or reusable platform tooling to pass.

## Verification Strategy

### Verification Ladder

1. Validate the canonical shift spec and clock/compression policy.
2. Validate pre-shift seeded chart completeness and pre/in-shift boundary correctness.
3. Validate `L2/L3` temporal-visibility gating and no-future-leak behavior.
4. Validate `L4` obligation/work-pressure generation against the shift spec.
5. Validate Pulse-driven replay against the planned event arc.
6. Validate replay-scoped FHIR/chart projection, authorship state, and provenance separation from `L0`.
7. Validate nursing-station as the primary chart surface.
8. Validate dashboard as sidecar/runtime support only.
9. Validate a full Noah-RN simulation run from report to handoff.
10. Validate compression fitness for Noah operation under the chosen replay speed.

### Required Evidence

- canonical shift timeline artifact
- clock/compression policy artifact
- seeded chart audit with continuity checks
- pre-shift vs in-shift release map
- temporal-visibility rules artifact
- no-future-leak verification results for search, `_include`, direct reads, and cache paths
- obligation/work-pressure audit for the shift
- replay log for the full shift
- FHIR query evidence for required replay resource classes
- authorship/provenance policy artifact with promotion examples
- nursing-station walkthrough evidence
- dashboard sidecar walkthrough evidence
- Noah-RN run transcript or eval trace
- residual-risk log

### Failure Rule

If any layer fails, stop widening scope. Fix the lowest failing layer first.

## Risks

- Narrative synthesis may miss the required fidelity on the first pass.
- Compression policy may distort clinical cadence or overload Noah if not validated carefully.
- Temporal visibility may leak future context through secondary read paths if not tested exhaustively.
- Replay-scoped writes may still creep broader unless explicitly constrained.
- The MVP can sprawl into platform work unless every lane is forced back to the one bounded patient replay.

## ADR

### Decision

Build the simulation-harness bedside MVP as one bounded ICU shift replay with hybrid MIMIC-plus-synthetic chart seeding, Pulse-backed monitor realism, explicit `L2/L3` temporal visibility control, explicit `L4` obligations, and Medplum/FHIR as shared `L3` chart boundary over canonical `L0` simulation truth.

### Drivers

- One dense scenario is preferred over many sparse ones.
- Noah-RN requires robust chart context, live runtime evolution, realistic work pressure, and temporally honest access.
- Existing repo direction supports Medplum-first clinician workflow while preserving simulation-kernel truth separation.

### Alternatives Considered

- Runtime-first narrow scenario with chart realism deferred.
- Dense chart seed with minimal live runtime only.
- Pure synthetic game-engine path without MIMIC grounding.

### Why Chosen

This is the smallest plan that still satisfies the product goal: a believable environment Noah-RN can operate inside without future-data leakage or platform drift.

### Consequences

- Data synthesis is part of the MVP, but only at replay scope.
- Provenance, authority state, and temporal release rules must be explicit early.
- Obligation/work-pressure modeling is part of the MVP, not later polish.
- Verification must include replay, chart proof, temporal-leak proof, and Noah-RN-in-simulation.
- Scope discipline is mandatory to avoid platform drift.

### Follow-Ups

- Lock the first replay runbook and compression defaults.
- Lock the temporal-visibility model and read-filter contract.
- Choose exact replay-scoped write classes and authorship states.
- Decide exact MIMIC blend and augmentation method only to the degree the first replay needs.

## Execution Guidance

### Available Agent Types

- `planner`
- `architect`
- `critic`
- `executor`
- `researcher`
- `test-engineer`
- `verifier`
- `debugger`
- `writer`

### If Using `ralph`

Use `ralph` when one owner should carry the bounded patient path sequentially.

Suggested order:
1. Lock canonical shift spec and sim-time policy.
2. Lock seeded chart substrate.
3. Lock `L2/L3` temporal-visibility gate.
4. Lock `L4` obligations/work-pressure layer.
5. Land Pulse runtime integration.
6. Land replay-scoped FHIR write surface and authority policy.
7. Land Noah-RN workflow integration.
8. Run verification ladder until green.

Suggested reasoning:
- `executor`: high
- `architect`: high at lane boundaries
- `verifier`: high
- `test-engineer`: medium

Launch hint:
- `$ralph docs/plans/prd-sim-harness-bedside-workflow-mvp.md`

### If Using `team`

Use `team` only after lane scopes and write ownership are explicit.

Suggested staffing:
- Lane A: sim-harness runtime and Pulse integration
- Lane B: dense chart seed and replay-scoped synthesis
- Lane C: temporal-visibility gate plus `clinical-mcp` filtering
- Lane D: replay-scoped write surface, authority, and provenance policy
- Lane E: obligations plus Noah harness integration
- Lane F: verification/replay harness

Coordination rules:
- one leader owns the canonical shift spec
- all lanes consume that spec
- no lane widens beyond the one patient replay without explicit re-plan

Launch hint:
- `$team docs/plans/prd-sim-harness-bedside-workflow-mvp.md`

### Team Verification Path

1. Reconcile all lane outputs against the canonical shift spec.
2. Validate seeded chart and pre/in-shift boundary rules.
3. Validate temporal visibility and no-future-leak behavior.
4. Validate obligation and runtime layers.
5. Run full-shift replay.
6. Run replay-scoped FHIR verification queries.
7. Validate nursing-station primary role.
8. Validate dashboard sidecar-only role.
9. Run Noah-RN simulation pass.
10. Open final verifier pass before declaring completion.
