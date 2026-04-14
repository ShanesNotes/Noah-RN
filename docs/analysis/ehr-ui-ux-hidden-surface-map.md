# EHR UI/UX Hidden Surface Map

Purpose: make previously scattered planning artifacts easy to find and show their canonical visible home inside the repo.

## Hidden-to-visible promotion map

| Hidden or scattered artifact | Role | Canonical visible home | Status |
|---|---|---|---|
| `.hermes/plans/2026-04-13_071112-clinician-ui-resource-gathering-plan.md` | original UI research acquisition plan | `docs/analysis/ui-resource-ledger.md`, `docs/analysis/clinician-ui-feature-matrix.md`, `docs/analysis/epic-source-triage.md` | promoted |
| `.hermes/plans/2026-04-13_090057-epic-doc-refinement-and-screenshot-plan.md` | Epic citation cleanup and screenshot plan | `docs/analysis/epic-source-triage.md`, `docs/analysis/clinician-ui-phased-roadmap.md` | summarized |
| `.hermes/plans/2026-04-13_091500-caveman-ui-foundations-synthesis-plan.md` | compression plan for agent-facing doctrine | `docs/analysis/ui-ux-foundations-caveman.md` | promoted |
| `.hermes/plans/2026-04-13_093000-ui-foundations-future-dev-plan.md` | future execution order | `docs/analysis/clinician-ui-phased-roadmap.md` | promoted |
| `.hermes/plans/2026-04-13_093600-patient-header-implementation-plan.md` | first P0 feature plan | `docs/analysis/clinician-ui-phased-roadmap.md` | summarized |
| `.omx/context/medplum-hybrid-entry-surface-20260412T170433Z.md` | Medplum request/review boundary snapshot | `docs/foundations/medplum-primary-workspace-note.md` | distilled |
| `.omx/plans/prd-medplum-hybrid-entry-surface.md` | Task -> DocumentReference request/review loop | `docs/foundations/medplum-shift-report-contract.md` | distilled |
| `.omx/plans/prd-medplum-draft-review-lifecycle.md` | draft review lifecycle decision | `docs/foundations/medplum-draft-review-lifecycle.md` | already canonical |
| `wiki/sources/2026-04-13-medplum-react-workspace-substrate.md` | compressed Medplum substrate findings | `research/medplum-react-workspace-research.md`, `docs/analysis/ui-resource-ledger.md` | supporting corpus |
| `wiki/sources/2026-04-13-ehr-workflow-prior-art.md` | compressed Epic/OpenEMR prior art findings | `research/epic-ehr-ux-workflow-patterns-for-clinicians.md`, `research/openemr-workflow-prior-art-analysis.md`, `docs/analysis/ui-ux-foundations-caveman.md` | supporting corpus |
| `wiki/questions/medplum-preliminary-visibility-in-ui.md` | unresolved draft-artifact visibility question | `docs/foundations/medplum-draft-review-lifecycle.md` | still open |
| `notes/Noah RN Architecture v0.2.0.md` | older broad architecture packet | `README.md`, `PLAN.md`, `docs/ARCHITECTURE.md`, `docs/foundations/medplum-primary-workspace-note.md` | partially superseded |
| `notes/Noah RN North Star v0.2.0.md` | older north-star framing | `README.md`, `PLAN.md` | partially superseded |
| `notes/clinical intelligence pipeline.md` | adjacent workflow/cognitive-load research | `research/clinical-workflow-and-adoption/`, `wiki/sources/2026-04-08-clinical-intelligence-pipeline.md` | adjacent context |

## Visible files that now act as the canonical UI/UX spine

These are the files to use instead of re-opening hidden plan folders first:

- `docs/analysis/ehr-ui-ux-start-here.md`
- `docs/analysis/ui-ux-foundations-caveman.md`
- `docs/analysis/clinician-ui-feature-matrix.md`
- `docs/analysis/clinician-ui-phased-roadmap.md`
- `docs/analysis/ui-resource-ledger.md`
- `docs/analysis/epic-source-triage.md`
- `docs/foundations/medplum-primary-workspace-note.md`

## Files still intentionally hidden

These remain useful as provenance or session history, but should not be treated as the first place to restart work:

- `.hermes/plans/`
- `.omx/context/`
- `.omx/plans/`
- `wiki/sources/`
- `notes/`

Rule: if a hidden artifact changes implementation or prioritization, promote the durable part into `docs/analysis/` or `docs/foundations/` before treating it as current doctrine.
