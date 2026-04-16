# Clinical Workspace Architecture Improvement Plan

Purpose: convert Noah RN's existing clinical-workspace doctrine and research into a concrete improvement packet for the next implementation lane.

## Bottom line

The project does not need a new architecture. It needs to promote the architecture it already chose into stronger implementation structure.

The repo already settled the high-order decisions correctly:

- Medplum is the primary clinician workspace substrate.
- `apps/nursing-station/` is the primary clinician UI.
- `services/clinical-mcp/` is the agent-facing context boundary.
- `apps/clinician-dashboard/` is a sidecar runtime console.
- `Task` plus draft `DocumentReference` is the first review primitive.

The remaining work is architectural hardening and engineering discipline.

## Main gaps

### 1. Doctrine is ahead of the code

The repo has strong guidance in:

- `docs/foundations/medplum-primary-workspace-note.md`
- `docs/foundations/medplum-draft-review-lifecycle.md`
- `docs/analysis/clinician-ui-feature-matrix.md`
- `docs/analysis/clinician-ui-phased-roadmap.md`

But the current `apps/nursing-station/` code still behaves like an early scaffold:

- minimal shell
- local tab state
- no durable chart routing
- no explicit review/draft/provenance surfaces
- no app-level test suite

### 2. The workflow path is approved but not yet productized

The active forcing path is already clear:

`Task -> clinical-mcp -> agent-harness -> shift-report -> DocumentReference`

What is missing is a clear clinician-facing workspace that makes this path obvious:

- assignment/worklist view
- review queue
- draft/final distinction
- visible provenance and missing-data states

### 3. Read-model boundaries need to be explicit

The next architecture move is to define three read tiers:

1. Medplum-native raw reads for normal chart views.
2. Shared nursing-station hooks for shell and overview composition.
3. `clinical-mcp` assembled context for workflow-grade agent work.

Without that, the app will drift into ad hoc page-local fetch logic.

### 4. Verification is not at the required bar yet

The repo doctrine already calls for Playwright-backed UI verification. The nursing-station app currently has build/lint only. For a clinician-facing workspace, that is not enough.

## Recommended priorities

### Priority 1: Finish the P0 shell

Use the existing feature matrix order:

1. persistent patient header
2. stronger chart shell / navigation
3. Overview default page
4. assignment/worklist
5. review vs acknowledge model
6. provenance + draft/final review surface

### Priority 2: Make review workflow visible

Treat `Task` as the operational spine in the clinician UI, not just a backend primitive.

That means:

- task-centered queues
- explicit preliminary draft handling
- default final-only document views
- review-required surfaces for draft artifacts

### Priority 3: Create shared data hooks

Stop composing patient shell data independently in each page. Introduce shared hooks for:

- patient shell data
- overview summary
- worklist/task data
- draft review state

### Priority 4: Raise the verification bar

Add Playwright acceptance coverage for:

- patient header persistence
- route stability
- overview render
- worklist render
- draft/review visibility

## Non-negotiables

- do not regrow `apps/clinician-dashboard/` into a second chart
- do not widen writes without a contract and provenance story
- do not ship agent-native UI without explicit draft/approval/final states
- do not hide missing data; surface it

## Source packet

Start future work from this packet:

- `docs/analysis/ehr-ui-ux-start-here.md`
- `docs/analysis/clinician-ui-feature-matrix.md`
- `docs/analysis/clinician-ui-phased-roadmap.md`
- `docs/foundations/medplum-primary-workspace-note.md`
- `docs/foundations/medplum-draft-review-lifecycle.md`
- `.omx/plans/autopilot-spec.md`
- `.omx/plans/autopilot-impl.md`
