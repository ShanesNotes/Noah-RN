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

3. **Workflow contract**
   - `packages/workflows/shift-report/`
   - render the seven-section handoff structure

4. **Clinical resources**
   - `clinical-resources/`
   - provide any referenced templates / trigger guidance needed by the workflow

5. **Output surface**
   - draft handoff artifact
   - sidecar rendering or dry-run surface if needed
   - no automatic Medplum write-back

## Authority rule

For this first path:

- `packages/workflows/shift-report/` is the workflow authority
- `services/clinical-mcp/` is the patient-context authority
- `clinical-resources/` is the resource authority
- `.pi/` may mirror or bridge this path, but is not authoritative

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

## References

- `docs/foundations/shift-report-bridge-handoff.md`
- `docs/foundations/agent-harness-runtime-contract.md`
- `docs/foundations/patient-context-bundle-contract.md`
