# Clinician Dashboard Source Map

This folder contains the source-of-truth implementation for the dashboard sidecar.

## Subareas

### `components/`

Owns:
- runtime-console panels (eval, trace, context inspector, skill, terminal)
- eval and trace surfaces
- workflow-support panels
- context inspection surfaces

Does NOT own the clinician chart UI — that is `apps/nursing-station/`.

Start here when work is about:
- what the runtime-console user sees
- panel structure
- sidecar interaction flow

### `fhir/`

Owns:
- app-side FHIR fetch helpers used for runtime-console signals (context inspection, trace rendering)
- app-specific response shaping

Start here when work is about:
- how the dashboard fetches runtime-console data
- app-side auth/fetch behavior

### `hooks/`

Owns:
- app-specific reusable fetch/state hooks

### `lib/`

Owns:
- local view helpers and data formatting helpers

### top-level files

- `App.tsx` — app shell and tab/panel orchestration
- `main.tsx` — app entry
- `theme.ts` — UI theme surface
- `index.css` — app-level styling

## Current rule

If a change affects:
- eval/trace/runtime-console UI or workflow-support display → start in `components/`
- app fetch behavior → start in `fhir/` or `hooks/`
- source-of-truth patient-context contract → do not start here; go to `services/clinical-mcp/`

## Read this next

- `../README.md`
- `../../../docs/ARCHITECTURE.md`
