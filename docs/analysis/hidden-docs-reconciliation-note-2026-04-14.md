# Hidden Docs Reconciliation Note — 2026-04-14

Purpose: give a follow-on agent a grounded cleanup snapshot before deleting hidden planning surfaces.

## Current conclusion

Do **not** bulk-delete hidden docs yet.

The repo is in a mid-migration state where some hidden planning has already been promoted into visible docs, but several visible docs are still being rewritten from those hidden sources.

## What is actively in flight

Visible docs currently absorbing or reconciling hidden planning:

- `docs/plans/p0.1-persistent-patient-header.md`
- `docs/analysis/ehr-ui-ux-start-here.md`
- `docs/analysis/ehr-ui-ux-hidden-surface-map.md`
- `docs/analysis/clinician-ui-phased-roadmap.md`
- `docs/analysis/clinician-ui-feature-matrix.md`
- `docs/analysis/ui-ux-foundations-caveman.md`
- `docs/analysis/ui-resource-ledger.md`
- `docs/README.md`
- `README.md`
- `services/README.md`
- `services/sim-harness/README.md`
- `docs/foundations/clinical-workspace-first-batch.md`
- `docs/foundations/clinical-workspace-scaffold.md`
- `docs/foundations/sim-harness-engine-wrapping.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`

## Hidden sources that should be kept for now

### UI / clinician workspace planning

Keep these for now; they appear to be source material for the newly promoted visible docs:

- `.hermes/plans/2026-04-13_071112-clinician-ui-resource-gathering-plan.md`
- `.hermes/plans/2026-04-13_090057-epic-doc-refinement-and-screenshot-plan.md`
- `.hermes/plans/2026-04-13_091500-caveman-ui-foundations-synthesis-plan.md`
- `.hermes/plans/2026-04-13_092300-agent-native-frontend-direction-note.md`
- `.hermes/plans/2026-04-13_093000-ui-foundations-future-dev-plan.md`
- `.hermes/plans/2026-04-13_093600-patient-header-implementation-plan.md`

Notes:
- `docs/plans/p0.1-persistent-patient-header.md` is a more execution-ready promoted plan, but it is clearly derived from the hidden patient-header planning lane.
- `agent-native-frontend-direction-note.md` still appears to exist only as hidden planning and has no exact visible replacement yet.

### Simulation architecture planning provenance

Keep these for now; visible simulation docs are still being realigned around them:

- `.omx/specs/deep-interview-simulation-architecture-agent-native.md`
- `.omx/interviews/simulation-architecture-agent-native-20260413T212448Z.md`
- `.omx/context/simulation-scaffold-audit-foundation-plan-20260413T214329Z.md`
- `.omx/plans/invariant-kernel-simulation-architecture.md`

Notes:
- `.omx/plans/invariant-kernel-simulation-architecture.md` explicitly says the canonical copy moved to `docs/foundations/invariant-kernel-simulation-architecture.md`.
- Even so, the visible simulation docs are still being rewritten to point at the invariant-kernel + foundational-contract authority, so this planning-origin material is still useful provenance.

## Hidden surfaces that are probably local/tool-only

These do not currently look like product-doc surfaces that need promotion:

- `.dmux-hooks/`
- `.claude/commands/wiki.md`
- `.emdash.json`

Guidance:
- keep if the local tool/workflow is still wanted
- otherwise treat as local/tool residue, not canonical repo documentation

## Non-doc residue that should not drive product cleanup decisions

These are not hidden docs that need resurfacing:

- `.omx/logs/*`
- `.omx/state/*`
- `.omc/sessions/*`
- other lock/state/config files in hidden tool folders

## Suggested cleanup rule for the next agent

### Keep
If a hidden file is:
- recently touched
- clearly feeding a visible doc rewrite
- or still contains planning/provenance that has not been promoted cleanly

### Delete later
If a hidden file is:
- tool-generated
- logs/state/session residue
- local workflow/config only
- or fully duplicated by a settled visible doc

## Practical recommendation

Order of operations:

1. finish the visible doc reconciliation first
2. commit the visible/promoted docs
3. then do a second pass on hidden folders and classify each file as one of:
   - promoted, safe to remove
   - keep as local provenance
   - tool residue, safe to delete

## Immediate delete caution

Before deleting any hidden planning docs, re-check whether these visible files are still in flux:

- `docs/README.md`
- `README.md`
- `services/README.md`
- `services/sim-harness/README.md`
- `docs/foundations/clinical-workspace-first-batch.md`
- `docs/foundations/clinical-workspace-scaffold.md`
- `docs/foundations/sim-harness-engine-wrapping.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`
- `docs/plans/p0.1-persistent-patient-header.md`

If they are still moving, hidden planning deletion is premature.
