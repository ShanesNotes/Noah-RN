# Nursing Station

This folder holds the Medplum-first clinician workspace app for Noah RN.

## What this app owns

- Medplum-native sign-in flow
- patient list and patient chart navigation
- task list / work-queue views
- the primary clinician-facing workspace path

## What this app does not own

- agent runtime orchestration
- patient-context assembly logic
- workflow contract truth
- eval/trace observability

Those live in:
- `packages/agent-harness/`
- `services/clinical-mcp/`
- `packages/workflows/`
- `apps/clinician-dashboard/`

## Useful commands

```bash
npm run dev --workspace apps/nursing-station
npm run build --workspace apps/nursing-station
npm run lint --workspace apps/nursing-station
```

## Current role

Treat this app as the main clinician workspace surface for the next phase.

The dashboard remains a sidecar runtime console. Do not duplicate that role here.

## Where to look first

- `src/App.tsx` — shell and route layout
- `src/pages/PatientListPage.tsx`
- `src/pages/PatientChartPage.tsx`
- `src/pages/TaskListPage.tsx`
- `src/pages/SignInPage.tsx`

## Read this next

- `../../docs/foundations/medplum-primary-workspace-note.md`
- `../../docs/foundations/medplum-rails-noah-runtime.md`
- `../../docs/ARCHITECTURE.md`
