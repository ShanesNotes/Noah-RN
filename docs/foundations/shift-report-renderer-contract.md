# Shift Report Renderer Contract

## Purpose

Define the output-shaping contract for the first `Shift Report` renderer path.

This is not a UI design doc.
It is the contract for what the first renderer is expected to emit.

## Governing alignment

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/shift-report-output-boundary.md`
- `docs/foundations/shift-report-runtime-path.md`

## Current renderer posture

The active shared renderer surface now lives at:
- `packages/agent-harness/shift-report-renderer.mjs`

It is currently reused by:
- `packages/agent-harness/invoke-workflow.mjs`
- `services/clinical-mcp/src/worker/shift-report-worker.ts`
- `.noah-pi-runtime/extensions/noah-router/build-shift-report-dry-run-output.mjs`

The older dry-run scaffold remains useful because it helped prove:
- section ordering
- input-mode split
- gap placeholders
- workflow-boundary preservation

But the shared renderer module is now the implementation anchor for the first real renderer contract.

## Contract

### Required output shape

The first renderer contract should preserve:
- seven-section handoff structure
- copy-paste-ready text output
- nurse-facing draft framing
- explicit placeholders or gaps where context is missing
- explicit Evidence + Confidence + Provenance + Disclaimer layers
- explicit context-lane coverage in Noah RN terms

### Required sections

1. `PATIENT`
2. `STORY`
3. `ASSESSMENT`
4. `LINES & ACCESS`
5. `ACTIVE ISSUES & PLAN`
6. `HOUSEKEEPING`
7. `FAMILY`

### Mode behavior

#### Narrative mode

Renderer should:
- preserve nurse language
- avoid over-normalizing narrative
- organize without fabricating detail

#### Patient-context mode

Renderer should:
- render from assembled bundle
- surface known facts
- emit explicit gaps where the bundle is thin
- render `LINES & ACCESS` from `Device` timeline entries when present
- render `timing unknown` rather than inventing recency for untimed devices
- surface context-budget truncation explicitly when older entries were dropped
- surface bounded Evidence lines for key available facts (e.g. latest HR / MAP / lactate / SpO2 when present)
- surface bounded cross-skill suggestions when trigger conditions are clearly present
- surface renderer lane coverage using the stable Noah RN lane vocabulary:
  - `ehr/chart`
  - `memory`
  - `clinical-resources`
  - `patient-monitor/simulation`

## Non-goals

The first renderer should not:
- infer undocumented clinical content
- silently fill missing sections
- write directly to Medplum
- collapse provenance/limitations into invisible UI behavior

## Current scaffold limitations

The current shared renderer now uses real assembled data for:
- `PATIENT`
- `STORY`
- `ASSESSMENT`
- `LINES & ACCESS`
- `ACTIVE ISSUES & PLAN`

It also now emits:
- Evidence layer
- Confidence layer
- provenance footer
- disclaimer
- bounded trigger suggestions
- lane coverage block

Remaining sections may still contain bounded placeholders where bedside-only detail is unavailable.
That is acceptable for the current scaffold state as long as the placeholders remain explicit.

## Success condition

The first renderer is good enough when:
- it obeys the seven-section contract
- it preserves source-mode differences
- it reports missing data explicitly
- it remains draft-oriented and provenance-safe

## Current implementation anchor

- `packages/agent-harness/shift-report-renderer.mjs`
- `.noah-pi-runtime/extensions/noah-router/build-shift-report-dry-run-output.mjs` (bridge consumer)
- `services/clinical-mcp/src/worker/shift-report-worker.ts` (draft artifact consumer)

## References

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/shift-report-output-boundary.md`
- `tests/agents/test_shift_report_dry_run_output.sh`
