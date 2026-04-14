# Packages

Reusable internal contracts and subsystems live here.

Current package lanes:
- `agent-harness/` — router/harness material
- `workflows/` — migrated workflow contracts

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

## Relationship to the Pi runtime surface

Repo-hosted Pi assets now live under `.noah-pi-runtime/` and mount into the isolated runtime as `/runtime/.pi`.

Current rule:
- `packages/agent-harness/` and `packages/workflows/` are authoritative now
- `.noah-pi-runtime/` may mirror or bridge those surfaces for future pi-native runtime work
- do not treat the Pi runtime surface as a replacement for `packages/`

## Useful commands

```bash
npm run check --workspace packages/agent-harness
npm run describe-routing --workspace packages/agent-harness
npm run select-workflows --workspace packages/agent-harness

# use workspace-local docs and scripts inside packages/workflows/ for contract work
```

## Read this next

- `agent-harness/README.md`
- `workflows/README.md`
- `../docs/topology/subproject-workspace-map.md`
