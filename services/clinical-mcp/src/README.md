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
- scenario generation
- physiology progression helpers
- scenario-specific state transitions

Start here when work is about:
- simulated patient-state changes
- progression logic
- scenario-specific interventions

### `tools/`

Owns:
- service-local tool helpers like context inspection

### `__tests__/`

Owns:
- service-level unit and behavior tests for the source tree

### top-level files

- `index.ts` — service entry
- `server.ts` — MCP tool registration
- `config.ts` — config and path resolution

## Current rule

If a change affects:
- bundle shape → `context/`
- FHIR querying → `fhir/`
- simulation progression → `events/`
- MCP tool surface → `server.ts` and the relevant subarea

## Read this next

- `../README.md`
- `../../../docs/foundations/patient-context-bundle-contract.md`
- `../../../docs/foundations/shift-report-runtime-path.md`
