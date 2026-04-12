# Memory Layer First Batch

Workspace center:
- `packages/memory/`

## Purpose

Establish the minimum memory boundaries needed before any workflow starts persisting more than immediate working state.

## Derived from

- `PLAN.md` active subproject: Memory Layer
- `TASKS.md` item 5
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/memory-layer-scaffold.md`

## This batch should establish

### 1. Four-tier boundary

Define the runtime boundary between:
- encounter canvas
- session memory
- longitudinal patient memory
- task-local agent memory

### 2. First-workflow minimum

Lock the rule:
- the first workflow should use only the minimum memory tiers it truly needs
- likely encounter canvas + limited session continuity first

### 3. Persistence safety rule

Lock the rule:
- no silent persistence
- no hidden clinical draft promotion
- provenance and approval must exist before broader persistence

## This batch should not do

- design a full persistence engine
- build broad user/provider memory products
- introduce hidden stateful behavior into workflows
- treat chat history as memory architecture

## The likely next concrete artifacts later

- memory architecture note
- persistence rules note
- first-workflow memory requirement note

Current artifact:
- `docs/foundations/memory-tier-boundary.md`

## Deep references

- `packages/memory/README.md`
- `docs/foundations/medplum-architecture-packet.md`
- `notes/noah-rn-pi-like-clinical-operating-structure.md`
