# Memory Tier Boundary

Workspace center:
- `docs/foundations/memory-layer-scaffold.md`

## Purpose

Define the four memory tiers as explicit runtime boundaries before any broader persistence work begins.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/memory-layer-first-batch.md`
- `docs/topology/subproject-workspace-map.md`

## Boundary

### Tier 1: Encounter canvas

Mutable working state for one active encounter.

### Tier 2: Session memory

Short-horizon continuity for the current provider/session.

### Tier 3: Longitudinal patient boundary

Persistent patient-level context with explicit write and review controls.

### Tier 4: Task-local agent memory

Disposable memory scoped to one workflow or one sub-agent task.

## Rules

- start with the minimum tier set the first workflow needs
- do not silently promote draft working state into persistent memory
- do not let generic chat history stand in for memory architecture
- persistence requires explicit provenance and approval rules

## First-workflow posture

The first workflow should likely depend on:
- encounter canvas
- limited session continuity

Everything else stays defined but deferred.

## Not yet in scope

- full persistence engine design
- broad provider/user memory products
- generalized workflow-state machines

## Later runtime mirror

When implementation begins, the runtime mirror of this boundary should live under:
- a future `packages/` lane once memory code exists again

## References

- `docs/foundations/memory-layer-scaffold.md`
- `docs/foundations/memory-layer-first-batch.md`
- `docs/foundations/medplum-architecture-packet.md`
