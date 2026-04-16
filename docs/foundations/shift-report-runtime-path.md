# Shift Report Runtime Path

## Purpose

Define the first end-to-end runtime path for `Shift Report` across Noah RN workspace centers.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/shift-report-bridge-handoff.md`

## Canonical path

The first runtime path should be read as:

1. **Agent harness**
   - `packages/agent-harness/`
   - classify request
   - validate required context
   - select `shift-report`

2. **Clinical workspace boundary**
   - `services/clinical-mcp/`
   - resolve `patient_id` when needed
   - assemble patient-context bundle

3. **Workflow contract + shared renderer**
   - `packages/workflows/shift-report/`
   - `packages/agent-harness/shift-report-renderer.mjs`
   - render the seven-section handoff structure plus Evidence / Confidence / Provenance / Disclaimer layers

4. **Clinical resources**
   - `clinical-resources/`
   - provide any referenced templates / trigger guidance needed by the workflow

5. **Output surface**
   - draft handoff artifact via `services/clinical-mcp/src/worker/shift-report-worker.ts`
   - sidecar rendering or dry-run surface if needed
   - Pi dry-run bridge should consume the same renderer lineage
   - no automatic Medplum write-back beyond the narrow draft `DocumentReference` path

## Authority rule

For this first path:

- `packages/workflows/shift-report/` is the workflow authority
- `services/clinical-mcp/` is the patient-context authority
- `clinical-resources/` is the resource authority
- `.noah-pi-runtime/` may mirror or bridge this path, but is not authoritative (it mounts as `/runtime/.pi` in the isolated lane)

## What is intentionally deferred

- production runtime promotion of bridge artifacts
- generalized multi-workflow runtime orchestration
- broader dashboard productization
- memory-heavy workflow state beyond immediate handoff needs

## First success condition

One realistic bedside request should move through this path cleanly and produce:
- a bounded handoff draft
- explicit gaps where data is missing
- preserved provenance and limitations
- explicit lane coverage for the current runtime path
- a shared renderer contract reused across harness, worker, and dry-run bridge

## References

- `docs/foundations/shift-report-bridge-handoff.md`
- `docs/foundations/agent-harness-runtime-contract.md`
- `docs/foundations/patient-context-bundle-contract.md`
