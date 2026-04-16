# Test Spec: Sim-Harness Bedside Workflow MVP

**Date:** 2026-04-16  
**Status:** Approved for execution handoff  
**Validates:** [prd-sim-harness-bedside-workflow-mvp.md](/home/ark/noah-rn/docs/plans/prd-sim-harness-bedside-workflow-mvp.md)

## Scope

Validate that the approved PRD for the sim-harness bedside workflow MVP is bounded, testable, architecture-aligned, and execution-ready for later `ralph` or `team` implementation.

## Assertions

1. The PRD defines one dense ICU MVP patient and one full `0700 -> 1900` shift as the only required first milestone.
2. The PRD explicitly keeps `L0` canonical truth separate from Medplum/FHIR as shared `L3` chart boundary.
3. The PRD includes a first-class `L2/L3` temporal-visibility gate.
4. The PRD requires no post-`0700` fact to become visible before simulated release.
5. The PRD requires a canonical scenario authority matrix covering:
   - release timing
   - visibility gating
   - authorship/finalization policy
   - obligation creation
   - compression validity checks
6. The PRD makes `L4` obligations/work pressure first-class.
7. The PRD explicitly constrains synthesis to replay scope and rejects reusable platform tooling as a success condition.
8. The PRD explicitly constrains FHIR writes to replay scope and rejects broad write-surface expansion.
9. The PRD includes explicit charting-authority/provenance rules, including device-auto preliminary vs validated artifacts and `preliminary -> final` promotion.
10. The PRD includes an explicit clock/compression policy.
11. The PRD includes an explicit agent-performance-under-compression invalidation rule.
12. The PRD keeps nursing-station as primary chart proof and dashboard as sidecar-only proof.
13. The PRD includes concrete phased lanes with bounded ownership.
14. The PRD includes concrete execution guidance for both `ralph` and `team`.
15. The PRD includes a sequenced verification ladder and lowest-failing-layer-first rule.

## Verification Commands

```bash
sed -n '1,320p' docs/plans/prd-sim-harness-bedside-workflow-mvp.md
sed -n '1,240p' docs/plans/test-spec-sim-harness-bedside-workflow-mvp.md
rg -n "L0|L3 chart boundary|L2/L3|temporal|authority matrix|obligation|compression|preliminary|final|nursing-station|dashboard" docs/plans/prd-sim-harness-bedside-workflow-mvp.md
```

## Manual Review Checklist

- The plan proves one bounded patient path before any broad platform growth.
- The plan preserves temporal honesty as a load-bearing requirement, not a future detail.
- The plan cannot pass by preloading future in-shift data into agent-visible surfaces.
- The plan cannot pass by treating Medplum as canonical truth.
- The plan cannot pass by widening writes beyond the replay’s needs.
- The plan requires one authority matrix rather than lane-local rule forks.
- The plan is concrete enough for downstream execution without reopening requirements discovery.

## Execution-Evidence Checklist

The later execution lane must produce all of the following:

- canonical shift timeline artifact
- clock/compression policy artifact
- pre-shift vs in-shift release map
- temporal-visibility rules artifact
- no-future-leak verification results for search, `_include`, direct reads, and cache paths
- obligation/work-pressure audit
- replay log for the full shift
- FHIR query evidence for replay-scoped resources
- authorship/provenance policy artifact with promotion examples
- nursing-station walkthrough evidence
- dashboard sidecar walkthrough evidence
- Noah-RN simulation transcript or eval trace
- residual-risk log
