# Scaffolding Alignment

This note is a high-level scaffolding pass for Noah RN.

Governing docs:
- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/topology/subproject-workspace-map.md`

This note does not replace them.
It exists to make the next layer of more granular work easier to sequence.

Use `docs/topology/subproject-workspace-map.md` when the question is
"where does this subproject live?"
Use this note when the question is
"what high-level scaffold artifacts should we create next?"

## Design posture

Use the operating stance from `notes/noah-rn-pi-like-clinical-operating-structure.md`:

- minimal surface
- dense context
- explicit contracts
- deterministic support wherever exactness matters
- boring, legible runtime behavior

For scaffolding, this means:

- define boundaries before implementation
- define canonical surfaces before integrations
- define references before expansion
- keep subproject notes short and stable

## Active subproject set

The current scaffolding pass should center four product-facing lanes plus one cross-cutting lane:

1. Clinical workspace
2. Agent harness
3. Clinical resources
4. Memory layer
5. Meta-harness observability

The first four get dedicated scaffold notes in this pass.
Meta-harness remains a supporting lane because `TASKS.md` places it after the first workflow and memory/resources specs.

## Build order

### 1. Clinical workspace

Reason:
- `TASKS.md` says to stabilize the Medplum workspace path now.
- `PLAN.md` says Medplum remains the clinical workspace backbone.

Scaffold outcome:
- one concise architecture note
- one clear patient-context boundary
- one explicit simulation position

### 2. Agent harness

Reason:
- `TASKS.md` puts the first `pi.dev` bridge on the critical path.
- `PLAN.md` treats `pi.dev` as the active foundation.

Scaffold outcome:
- one concise harness architecture note
- one runtime-selection boundary
- one workflow contract boundary

### 3. Clinical resources

Reason:
- `PLAN.md` names this as an active subproject.
- `TASKS.md` already asks for a clinical resources catalog plan.

Scaffold outcome:
- one concise resource architecture note
- one runtime-access framing
- one clear split between reference-only and tool-backed resources

### 4. Memory layer

Reason:
- `PLAN.md` names memory as one of the active subprojects.
- `TASKS.md` asks for the memory architecture spec.

Scaffold outcome:
- one concise memory architecture note
- one four-tier memory boundary
- one explicit persistence policy direction

## What these scaffold notes should do

Each subproject note should contain:

1. Purpose
2. Canonical boundary
3. Minimal architecture
4. Canonical surfaces now
5. Deferred work
6. Source references for deeper reading

Each note should avoid:

- detailed implementation steps
- issue-level task lists
- broad historical synthesis
- speculative runtime expansion

## What these scaffold notes should enable later

- acceptance criteria for the first end-to-end workflow
- narrower implementation docs under `docs/foundations/`
- future ADRs when a boundary hardens
- smaller execution tasks in `TASKS.md`

## Immediate artifact set

- `docs/foundations/clinical-workspace-scaffold.md`
- `docs/foundations/agent-harness-scaffold.md`
- `docs/foundations/clinical-resources-scaffold.md`
- `docs/foundations/memory-layer-scaffold.md`

## Current rule

These notes are alignment artifacts.
They should inform granular work later, but they are not a parallel control plane.
