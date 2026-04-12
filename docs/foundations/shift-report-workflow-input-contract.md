# Shift Report Workflow Input Contract

## Purpose

Define the minimum input contract for the first `Shift Report` workflow path.

## Governing alignment

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/patient-context-bundle-contract.md`
- `docs/foundations/agent-harness-runtime-contract.md`

## Canonical input modes

The first workflow supports exactly two canonical inputs:

### 1. `clinical_narrative`

Use when:
- the nurse provides verbal or typed bedside handoff content directly

The contract expects:
- free-text narrative
- enough signal to organize a seven-section handoff

### 2. `patient_id`

Use when:
- the nurse wants the handoff assembled from chart context

The contract expects:
- a patient identifier that resolves through the clinical workspace boundary
- assembled patient context from `services/clinical-mcp/`

## Minimum sufficient input

### Sufficient for narrative mode

- identifiable clinical story
- enough facts to organize a handoff

### Sufficient for patient mode

- resolvable `patient_id`
- bundle containing the minimum patient-context contract:
  - identity
  - encounter snapshot
  - recent timeline
  - medications
  - labs
  - notes when available
  - explicit gaps when unavailable

## Explicit insufficiency

The workflow should block or request clarification when:
- a narrative contains no real clinical content
- the `patient_id` does not resolve
- the patient bundle lacks the minimum handoff-supporting structure

## Optional context

The workflow may accept, but should not require:
- `acuity_level`
- `patient_history`
- `active_orders`

Optional context should sharpen the handoff, not redefine the contract.

## Rules

- no fabricated findings
- no inferred chart content when the bundle is missing data
- missing data should surface as gaps, not silent omission
- the workflow should consume only the minimum context it needs

## Workspace centers touched

- `packages/workflows/shift-report/`
- `packages/agent-harness/`
- `services/clinical-mcp/`

## References

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/patient-context-bundle-contract.md`
