# EHR UI/UX Start Here

Purpose: one visible repo-local entrypoint for Noah-RN clinician workspace planning. This consolidates the load-bearing UI/UX decisions that were previously split across `docs/analysis/`, `research/`, `.hermes/plans/`, `.omx/`, `wiki/`, and `notes/`.

## Canonical local reading order

Read these first:

1. `docs/analysis/ui-ux-foundations-caveman.md`
2. `docs/analysis/clinician-ui-feature-matrix.md`
3. `docs/analysis/clinician-ui-phased-roadmap.md`
4. `docs/foundations/medplum-primary-workspace-note.md`
5. `docs/analysis/ui-resource-ledger.md`
6. `docs/analysis/epic-source-triage.md`

Use these as supporting source corpus, not first-read doctrine:

- `research/medplum-react-workspace-research.md`
- `research/epic-ehr-ux-workflow-patterns-for-clinicians.md`
- `research/openemr-workflow-prior-art-analysis.md`
- `wiki/sources/2026-04-13-medplum-react-workspace-substrate.md`
- `wiki/sources/2026-04-13-ehr-workflow-prior-art.md`

## Settled architecture decisions

- Medplum is the primary clinician-facing workspace substrate.
- `apps/nursing-station/` is the primary clinician UI.
- `apps/clinician-dashboard/` is a sidecar runtime console, not a second chart.
- `services/clinical-mcp/` is the agent-facing context boundary.
- Epic is the workflow north star.
- OpenEMR is a pattern quarry, not a product template.
- Agent-native UI work must stay draft/review/provenance-first. No silent writeback.

## Current P0 build order

Use this as the near-term sequence unless doctrine changes:

1. Persistent patient header
2. Stronger chart shell and navigation
3. Overview page
4. Assignment/worklist
5. Review vs acknowledge state model
6. Provenance plus draft/final review surface

## What was promoted from hidden surfaces

The following previously scattered planning work is now intentionally surfaced here:

- `.hermes/plans/2026-04-13_071112-clinician-ui-resource-gathering-plan.md`
  - now represented by `docs/analysis/ui-resource-ledger.md`, `docs/analysis/clinician-ui-feature-matrix.md`, and `docs/analysis/epic-source-triage.md`
- `.hermes/plans/2026-04-13_091500-caveman-ui-foundations-synthesis-plan.md`
  - now represented by `docs/analysis/ui-ux-foundations-caveman.md`
- `.hermes/plans/2026-04-13_093000-ui-foundations-future-dev-plan.md`
  - now promoted into `docs/analysis/clinician-ui-phased-roadmap.md`
- `.hermes/plans/2026-04-13_093600-patient-header-implementation-plan.md`
  - key implementation steps summarized in `docs/analysis/clinician-ui-phased-roadmap.md`
- `.omx/context/medplum-hybrid-entry-surface-20260412T170433Z.md`
  - durable boundary decisions already live in `docs/foundations/medplum-primary-workspace-note.md` and `docs/foundations/medplum-draft-review-lifecycle.md`
- `.omx/plans/prd-medplum-hybrid-entry-surface.md`
  - execution-side Medplum request/review pattern lives in `docs/foundations/medplum-shift-report-contract.md`

For a fuller mapping, see `docs/analysis/ehr-ui-ux-hidden-surface-map.md`.

## Recent external source refresh

This is the current external grounding pass used for consolidation on 2026-04-13.

### Medplum

- React docs: https://www.medplum.com/docs/react
  - reinforces Medplum Provider plus Mantine provider setup, reusable React primitives, and lockstep component usage
- Charting docs: https://www.medplum.com/docs/charting
  - reinforces FHIR-native chart structure and resource-model discipline
- Care plans / tasks docs: https://www.medplum.com/docs/careplans/tasks
  - reinforces `Task` as the substrate for explicit work ownership and reviewable workflow state

### Epic public training

- Epic resource index: https://epicsupport.sites.uiowa.edu/epic-resources
- Review Flowsheets: https://epicsupport.sites.uiowa.edu/epic-resources/review-flowsheets
  - reinforces read-optimized trend review across encounters
- MAR: https://epicsupport.sites.uiowa.edu/epic-resources/medication-administration-record-mar
  - reinforces barcode medication administration, overdue/held workflows, rover/mobile parity, override pulls, and infusion-specific administration logic

### OpenEMR official surfaces

- Dashboard Context Manager: https://www.open-emr.org/wiki/index.php/OpenEMR_7_The_Dashboard_Context_Manager
  - reinforces role/context-specific widget sets
- Nation Notes: https://www.open-emr.org/wiki/index.php/Nation_Notes
  - reinforces macro-driven structured narrative entry
- Clinical Decision Rules: https://www.open-emr.org/wiki/index.php/Clinical_Decision_Rules
  - reinforces rule-driven reminders and reminder visibility near workflow surfaces

### Recent workflow research

- AHRQ PSNet summary of 2024 EHR-based I-PASS implementation:
  - https://psnet.ahrq.gov/issue/enhancing-implementation-i-pass-handoff-tool-using-provider-handoff-task-force-comprehensive
  - reinforces that structured handoff embedded in the EHR improves adherence and perceived safety
- Workflow interruption and nurses' mental workload in EHR tasks:
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC9996908/
  - reinforces interruption pressure, multitasking cost, and why low-click, high-signal review surfaces matter
- ICU team extraction from EHR metadata:
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC11833494/
  - reinforces that assignment/team state is extractable from event logs and should not depend only on manual board updates

## Immediate implementation posture

If you want to start building now, do this:

1. Treat `docs/analysis/clinician-ui-feature-matrix.md` as the planning authority.
2. Start with the patient header in `apps/nursing-station/`.
3. Keep Medplum-native reads and lightweight targeted queries. Do not widen into full-shell redesign on the first task.
4. Keep every UI change tied to a Playwright verification story.
5. Do not add clinician-facing functionality to `apps/clinician-dashboard/` unless doctrine changes explicitly.

## Open questions still worth tracking

- How far standard Medplum UI surfaces preliminary artifacts outside the intended review flow
- Whether the first assignment/worklist should be SearchControl-driven or more custom-composed
- How much of Epic-style results review should land before MAR-lite
- Whether role/context presets should be route-based, profile-based, or patient-task-driven

## Bottom line

The repo already has the right doctrinal spine. The main cleanup was discoverability, not missing thought. Start from the visible docs above, treat the hidden plan files as historical inputs, and use the phased roadmap for next execution order.
