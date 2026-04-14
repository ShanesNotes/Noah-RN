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
- L0 physiology or scenario control

Those live in:
- `packages/agent-harness/` (pi.dev is the active harness foundation, Decision 2026-04-10)
- `services/clinical-mcp/` — agent-facing context boundary
- `services/sim-harness/` — Clinical Simulation Harness runtime center (Pulse L0 substrate, Contract 9)
- `packages/workflows/`
- `apps/clinician-dashboard/` — runtime-console sidecar (evals/traces/context/skills/terminal)

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
