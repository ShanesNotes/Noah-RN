# Packages

Reusable internal contracts and subsystems live here.

Current package lanes:
- `agent-harness/` — router/harness material
- `workflows/` — migrated workflow contracts
- `memory/`
- `safety/`

## What `packages/` is for

Use `packages/` for internal subsystem lanes that are:
- not user-facing apps
- not standalone services
- not raw clinical resource content
- not local-only research or notes

In Noah RN, `packages/` is where stable internal boundaries should live.

## Current lane roles

### `packages/agent-harness/`

Owns:
- routing substrate
- registry consumers
- workflow selection logic

It is the current workspace center for the agent harness subproject.

### `packages/workflows/`

Owns:
- authoritative workflow contracts
- workflow metadata
- workflow-facing conventions

This is the current source of truth for workflow contract content.

### `packages/memory/`

Owns:
- future memory-layer code and boundaries

It is intentionally still boundary-first rather than implementation-heavy.

### `packages/safety/`

Owns:
- future shared safety contracts that should eventually live as code/schema rather than shell tooling

Current shell hooks still live under `tools/safety-hooks/`.

## Relationship to `.pi/`

`.pi/` is a project-level bridge/scaffold surface, not a package lane.

Current rule:
- `packages/agent-harness/` and `packages/workflows/` are authoritative now
- `.pi/` may mirror or bridge those surfaces for future pi-native runtime work
- do not treat `.pi/` as a replacement for `packages/`

## Read this next

- `agent-harness/README.md`
- `workflows/README.md`
- `memory/README.md`
- `safety/README.md`
- `../docs/topology/subproject-workspace-map.md`
