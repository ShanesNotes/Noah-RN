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

The current bridge scaffold already produces a sectioned dry-run artifact through:
- `.noah-pi-runtime/extensions/noah-router/build-shift-report-dry-run-output.mjs`

That renderer is useful as a scaffold because it already proves:
- section ordering
- input-mode split
- gap placeholders
- workflow-boundary preservation

But it is not yet the canonical output contract.

## Contract

### Required output shape

The first renderer contract should preserve:
- seven-section handoff structure
- copy-paste-ready text output
- nurse-facing draft framing
- explicit placeholders or gaps where context is missing

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

## Non-goals

The first renderer should not:
- infer undocumented clinical content
- silently fill missing sections
- write directly to Medplum
- collapse provenance/limitations into invisible UI behavior

## Current scaffold limitations

The current renderer now uses real assembled data for:
- `PATIENT`
- `STORY`
- `ASSESSMENT`
- `LINES & ACCESS`
- `ACTIVE ISSUES & PLAN`

Remaining sections may still contain bounded placeholders where bedside-only detail is unavailable.
That is acceptable for the current scaffold state as long as the placeholders remain explicit.

## Success condition

The first renderer is good enough when:
- it obeys the seven-section contract
- it preserves source-mode differences
- it reports missing data explicitly
- it remains draft-oriented and provenance-safe

## Current implementation anchor

- `.noah-pi-runtime/extensions/noah-router/build-shift-report-dry-run-output.mjs`

## References

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/shift-report-output-boundary.md`
- `tests/agents/test_shift_report_dry_run_output.sh`
