# Memory Layer Scaffold

## Purpose

Define memory as clinical operating context, not generic chat history.

## Governing alignment

- `PLAN.md`: memory is one of the active subprojects.
- `TASKS.md`: memory architecture spec is already in the queue.
- `docs/topology/subproject-workspace-map.md`: the foundation docs are the active memory center until runtime code exists again.

## Canonical boundary

Memory means:

- what clinical/workflow context persists across steps or sessions
- what remains mutable during an encounter
- what is safe to persist
- what must stay task-local

It does not mean:

- unrestricted conversation logs
- silent persistence of clinical drafts
- hidden state that changes workflow behavior without clear boundaries

## Minimal architecture

### Tier 1: encounter canvas

Mutable, current, bedside-facing working state for one active encounter.

### Tier 2: session memory

Short-horizon provider/session context that helps maintain continuity during one working session.

### Tier 3: longitudinal patient boundary

Persistent patient-level memory with explicit safety rules and write controls.

### Tier 4: task-local agent memory

Narrow, disposable memory for a single workflow or sub-agent execution.

## Persistence rule posture

Scaffold stance:
- define boundaries before persistence
- define explicit approval and provenance rules before clinical write-back
- preserve the distinction between draft working memory and canonical clinical record

The first implementation should likely need only:
- encounter canvas
- limited session continuity

The rest should stay specified but deferred until a workflow requires them.

## Canonical surfaces now

- `docs/foundations/memory-layer-scaffold.md`
- `services/clinical-mcp/` for patient-context assembly
- workflow contracts that declare required context

## Deferred work

- longitudinal persistence engine
- workflow-state engines beyond the first workflow need
- broad user/provider memory products before the first bedside loop proves the boundary

## References

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/foundations/memory-tier-boundary.md`
- `notes/noah-rn-pi-like-clinical-operating-structure.md`
- `docs/foundations/medplum-architecture-packet.md`
