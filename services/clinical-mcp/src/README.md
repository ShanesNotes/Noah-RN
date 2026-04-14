# Clinical MCP Source Map

This folder contains the source-of-truth implementation for the clinical MCP service.

## Subareas

### `context/`

Owns:
- patient-context assembly
- context shaping and filters
- temporal ordering and bundle types

Start here when work is about:
- what the agent sees
- timeline assembly
- bundle shape
- gap reporting

### `fhir/`

Owns:
- FHIR client calls
- response typing
- mapping support

Start here when work is about:
- Medplum/FHIR reads
- query surfaces
- response normalization

### `events/`

Owns:
- event-surface shaping at the L3 boundary
- historical event helpers retained until the Lane F sim-tool seam lights up

Does not own:
- L0 physiology, reference pharmacokinetics, or scenario direction — those live in `services/sim-harness/` as of 2026-04-13 (brownfield relocation)

Start here when work is about:
- how events surface to the agent at the L3 boundary

Go to `services/sim-harness/` when work is about:
- simulated patient-state changes, scenario progression, or intervention effects on L0 truth

### `tools/`

Owns:
- service-local tool helpers like context inspection

### `__tests__/`

Owns:
- service-level unit and behavior tests for the source tree

### top-level files

- `index.ts` — service entry
- `server.ts` — MCP tool registration (sim tools attach through the `registerSimTools()` seam — no-op until Lane F)
- `config.ts` — config and path resolution

## Current rule

If a change affects:
- bundle shape → `context/`
- FHIR querying → `fhir/`
- event surfacing at the L3 boundary → `events/`
- simulation progression / L0 physiology / scenario direction → `services/sim-harness/` (not here)
- MCP tool surface → `server.ts` and the relevant subarea

## Read this next

- `../README.md`
- `../../../docs/foundations/patient-context-bundle-contract.md`
- `../../../docs/foundations/shift-report-runtime-path.md`
