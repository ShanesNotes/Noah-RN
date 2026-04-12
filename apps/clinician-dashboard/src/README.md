# Clinician Dashboard Source Map

This folder contains the source-of-truth implementation for the dashboard sidecar.

## Subareas

### `components/`

Owns:
- patient-facing panels
- assignment overview
- workflow-support panels
- context inspection surfaces

Start here when work is about:
- what the clinician sees
- panel structure
- sidecar interaction flow

### `fhir/`

Owns:
- app-side FHIR fetch helpers
- app-specific response shaping

Start here when work is about:
- how the dashboard fetches data
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
- sidecar UI or workflow-support display → start in `components/`
- app fetch behavior → start in `fhir/` or `hooks/`
- source-of-truth patient-context contract → do not start here; go to `services/clinical-mcp/`

## Read this next

- `../README.md`
- `../../../docs/ARCHITECTURE.md`
