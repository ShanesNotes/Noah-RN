# First Scaffold Batch

This document defines the next artifact layer after the high-level scaffold notes.

Use it when the question is:
"what should the first bounded scaffold batch establish in each workspace center?"

This is still a high-level artifact set.
It is not an implementation plan and it does not replace `TASKS.md`.

## Governing alignment

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/topology/subproject-workspace-map.md`

## Batch rule

For each workspace center, the first scaffold batch should do only three things:

1. establish the runtime boundary
2. establish the minimum contract surface
3. establish the first deferred/not-now boundary

If a batch tries to design the whole subsystem, it is too large.

## Workspace-centered batch set

### 1. Clinical workspace

Workspace center:
- `services/clinical-mcp/`

Goal of the first batch:
- define the patient-context bundle
- define the simulation-to-context position
- define the write-back boundary to Medplum

Artifact:
- `docs/foundations/clinical-workspace-first-batch.md`

### 2. Agent harness

Workspace center:
- `packages/agent-harness/`

Goal of the first batch:
- define the minimum routing boundary
- define the first selection contract
- define how `.pi/` consumes rather than replaces current contracts

Artifact:
- `docs/foundations/agent-harness-first-batch.md`

### 3. Clinical resources

Workspace center:
- `clinical-resources/`

Goal of the first batch:
- define resource classes
- define runtime access posture
- define the first Lexicomp-like contract boundary

Artifact:
- `docs/foundations/clinical-resources-first-batch.md`

### 4. Memory layer

Workspace center:
- `packages/memory/`

Goal of the first batch:
- define the four memory tiers as runtime boundaries
- define what the first workflow actually needs now
- define what must not persist silently

Artifact:
- `docs/foundations/memory-layer-first-batch.md`

## What comes after this

Only after these batch docs exist should narrower implementation notes be created.

Those narrower notes should map back to:
- `TASKS.md` for sequencing
- the workspace center for code placement
- the first workflow as the forcing function
