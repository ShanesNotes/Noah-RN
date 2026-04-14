# Clinician UI Phased Roadmap

Purpose: visible execution roadmap for Noah-RN clinician workspace work. This promotes the previously hidden future-dev plan into `docs/analysis/` so the next implementation lane can start from normal project folders.

Primary doctrine files:

- `docs/analysis/ui-ux-foundations-caveman.md`
- `docs/analysis/clinician-ui-feature-matrix.md`
- `docs/analysis/ui-resource-ledger.md`
- `docs/analysis/epic-source-triage.md`
- `docs/foundations/medplum-primary-workspace-note.md`
- `research/medplum-react-workspace-research.md`
- `research/epic-ehr-ux-workflow-patterns-for-clinicians.md`
- `research/openemr-workflow-prior-art-analysis.md`

## Phase A: doctrine hardening

### A1. Treat the feature matrix as the planning authority

- New UI ideas must first land in `docs/analysis/clinician-ui-feature-matrix.md`.
- Every row should keep:
  - owner
  - priority
  - build strategy
  - agent-native status
  - Playwright verification path

### A2. Tighten the Epic report

- Patch `research/epic-ehr-ux-workflow-patterns-for-clinicians.md`.
- Keep the report centered on workflow primitives, not enterprise mythology.
- Use `docs/analysis/epic-source-triage.md` as the citation filter.
- Strongest public-focus areas:
  - Brain timeline
  - header and chart shell
  - flowsheet speed patterns
  - MAR patterns
  - review vs acknowledge states

### A3. Keep the resource ledger current

- New external source material should be normalized into `docs/analysis/ui-resource-ledger.md`.
- Avoid new free-floating UI research notes unless they are immediately promoted.

## Phase B: first code-facing implementation wave

### B1. P0.1 persistent patient header

Goal: first real professional clinician-workspace primitive in `apps/nursing-station/`.

Scope:

- dedicated `PatientHeader` component
- sticky behavior
- high-signal patient context
- stable `data-testid` instrumentation
- Playwright acceptance path

Likely files:

- `apps/nursing-station/src/components/PatientHeader.tsx`
- `apps/nursing-station/src/pages/PatientChartPage.tsx`
- optional helper if data shaping gets noisy

Minimum content:

- patient name
- MRN or patient id
- age / sex / DOB
- location fallback
- code status fallback
- allergies summary
- attending/service fallback
- latest vitals timestamp

Rules:

- keep data fetches Medplum-native and lightweight
- no inline editing
- no agent actions
- no widening into Overview or shell redesign during this task

Acceptance checks:

- sticky on scroll
- persists across chart tab changes
- empty-state fields never render blank
- stable test ids for Playwright

### B2. P0.2 stronger chart shell and nav

Goal: replace the demo-like top-tab feel with a stable clinician shell.

Plan shape:

- left rail or stronger chart nav
- Overview as the default landing view
- stable patient route model
- patient header persists through route changes

### B3. P0.3 Overview page

Goal: default chart entry answers what matters now.

Target content:

- active problems
- latest and abnormal vitals snapshot
- critical labs and deltas
- current meds and due meds summary
- pending tasks
- handoff or watch items
- missing-data warnings
- review affordance placeholder

## Phase C: Playwright maturity

### C1. Make Playwright doctrine operational

Targets:

- auth state setup
- screenshot, trace, and HAR conventions
- 1920x1080 default viewport
- stable waits for skeleton/data resolution
- basic a11y checks for clinician-facing surfaces

### C2. Create canonical acceptance tests for P0 surfaces

Minimum target set:

- patient header sticky and persistent
- chart nav stability
- overview render
- worklist render
- review/acknowledge visibility
- draft/final review states

### C3. Standardize artifact paths

Recommended examples:

- `artifacts/patient-header/`
- `artifacts/overview/`
- `artifacts/worklist/`
- `artifacts/results-review/`
- `artifacts/draft-review/`

## Phase D: agent-native frontend incubation

Do not start here before the P0 shell is stable.

### D1. First inline agent-native surfaces

Recommended order:

1. handoff editor
2. notes editor
3. task/action drafting
4. results rationale helper

### D2. Shared UI state vocabulary

Keep one small reusable state set:

- draft
- ai-draft
- human-edited
- approved
- finalized
- source-backed
- missing-data

### D3. First safe inline action

Best candidates:

- transform handoff text into structured I-PASS draft
- rewrite note paragraph into tighter clinical wording

Avoid first:

- omnibox agent shell
- open-ended chat replacing workflow surfaces
- autonomous chart writing

## Phase E: later P1 and P2 work

After P0 is stable:

- results review depth
- trend-first labs and vitals
- MAR-lite
- handoff review workspace
- notes macros plus agent aids
- role/context-specific workspace presets
- keyboard layer
- flowsheet grid
- titration/block-charting
- dual sign-off workflows

## Execution rules

- `apps/nursing-station` changes should reference matrix rows.
- `apps/clinician-dashboard` remains sidecar-only unless doctrine changes explicitly.
- Every meaningful UI change needs a Playwright verification story.
- Every agent-native affordance must expose provenance plus approval semantics.
- No one-shot redesign branch without updating doctrine files first.

## Recommended next tasks

1. Tighten the Epic report using the existing triage doc.
2. Implement the persistent patient header.
3. Implement the stronger chart shell.
4. Make Playwright workflow verification operational.
5. Build the Overview page after the shell is stable.
