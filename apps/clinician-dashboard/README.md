# Clinician Dashboard

This folder holds the Noah RN runtime-console dashboard sidecar.

It is a supporting application surface, not the canonical clinical workspace.

## What this app owns

- clinician-facing sidecar views
- eval and trace observability
- context inspection
- skill/runtime visibility
- terminal/operator support
- future sim observability

## What this app does not own

- canonical chart state
- patient-context assembly
- workflow contract truth
- routing authority

Those live in:
- `services/clinical-mcp/`
- `packages/workflows/`
- `packages/agent-harness/`
- Medplum as the clinical workspace backbone

## Current role

Treat this app as:
- sidecar observability
- runtime-console prototyping
- workflow-support surface

Current panel set:
- eval dashboard
- trace viewer
- context inspector
- skill panel
- terminal panel

Do not treat it as the source of truth for clinical workspace architecture.

## Current stack

- Vite
- React
- TypeScript
- Mantine
- Recharts

## Current data posture

The app reads patient-facing clinical data through the current FHIR/clinical workspace path.

It should be understood as a consumer of the clinical workspace, not the owner of that workspace.

## Where to look first

- `src/App.tsx` — overall shell and panel switching
- `src/components/` — patient-facing panels and workflow support surfaces
- `src/fhir/` — app-side FHIR client helpers
- `src/hooks/` — app-side data hooks

## What to ignore first

- `dist/` — build output
- `node_modules/` — dependency install state
- local `.omc/` state — tooling/runtime residue

## Current rule

If a change affects:
- chart-context truth or bundle shape → start in `services/clinical-mcp/`
- workflow contract or routing behavior → start in `packages/workflows/` or `packages/agent-harness/`
- runtime-console display or interaction → start here

## Read this next

- `src/README.md`
- `../../docs/ARCHITECTURE.md`
- `../../docs/foundations/clinical-workspace-scaffold.md`
- `../../docs/foundations/shift-report-runtime-path.md`
