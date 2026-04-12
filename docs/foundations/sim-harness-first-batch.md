# Clinical Simulation Harness First Batch

Workspace center:
- `services/sim-harness/`

## Purpose

Establish the minimum Clinical Simulation Harness boundary needed so the first live-vitals bedside workflow has a runtime center before any runtime code is written.

This batch is deliberately scaffolding-only. No runtime code, no engine binaries, no sidecar processes. The batch lands the directory surface, the canonical spec docs, and the placement inside the canonical doc chain.

## Derived from

- `PLAN.md` active subproject: Clinical Workspace, named scope "Clinical Simulation Harness"
- `PLAN.md` Decision Log 2026-04-11 — wrap open-source engines, agent must have waveform vision
- `TASKS.md` item 4
- `docs/ARCHITECTURE.md` — two workspace centers under Clinical Workspace
- `docs/topology/subproject-workspace-map.md` — Workspace center B under Clinical Workspace
- `docs/foundations/sim-harness-scaffold.md` — canonical boundary and layer map
- Research: `research/Open Source Clinical Simulation.md`, `research/Architectural integration for noah-rn clinical simulation.md`
- Wiki: `wiki/concepts/clinical-simulator-as-eval-substrate.md`, `wiki/concepts/computational-physiology-engine.md`

## This batch should establish

### 1. Workspace center existence

Create the workspace center directory and its placeholder README so the rest of the canonical doc chain can point at it without dangling references.

- `services/sim-harness/README.md` — scaffold placeholder only; no runtime code
- `services/README.md` updated to list the new service

### 2. Canonical doc set

Land the foundation docs that define the boundary, the contracts, and the engine wrapping strategy.

- `docs/foundations/sim-harness-scaffold.md` — canonical boundary, layer map, non-negotiables
- `docs/foundations/sim-harness-first-batch.md` — this file
- `docs/foundations/sim-harness-runtime-access-contract.md` — agent-facing MCP tool surface
- `docs/foundations/sim-harness-waveform-vision-contract.md` — the agent-sees-the-strip requirement
- `docs/foundations/sim-harness-engine-wrapping.md` — Pulse / BioGears / Infirmary Integrated / rohySimulator / Auto-ALS wrapping decisions

### 3. Control-plane integration

Make sure the root control plane and the Clinical Workspace lane recognize the new workspace center.

- `PLAN.md` subproject #2 amended to name the Clinical Simulation Harness named scope
- `PLAN.md` Decision Log entry 2026-04-11 recorded
- `README.md` Current Shape item #2 amended; Repository Map / Common areas updated
- `docs/ARCHITECTURE.md` Clinical workspace center split into A (context boundary) and B (live runtime); runtime relationship map updated; active subsystems summary updated; next-detail-surfaces list updated
- `TASKS.md` item 4 added for the scaffolding pass
- `docs/topology/subproject-workspace-map.md` updated with Workspace center B under Clinical Workspace
- `docs/foundations/clinical-workspace-scaffold.md` simulation section upgraded to defer to `sim-harness-scaffold.md`
- `docs/foundations/clinical-workspace-first-batch.md` simulation rule updated

### 4. Origin research and wiki wiring

Every sim-harness foundation doc links back to:

- the original research docs under `research/`
- the wiki concept pages under `wiki/concepts/` that captured the durable synthesis (`clinical-simulator-as-eval-substrate.md`, `computational-physiology-engine.md`, `emergent-vitals-from-physics.md`, `medical-digital-twin.md`, `synthetic-physiological-data-generation.md`)
- the wiki entity pages under `wiki/entities/` for the wrapped open-source projects (`pulse-physiology-engine.md`, `biogears.md`, `infirmary-integrated.md`, `rohysimulator.md`, `auto-als.md`)

## This batch should not do

- write runtime code of any kind
- run a Pulse sidecar, install Pulse Python bindings, or touch any of the wrapped engines
- define the authoring UX for scenario timelines
- commit waveform template data
- write an encounter write-back implementation
- register any MCP tool on the live `services/clinical-mcp/` boundary
- define the Gym-compatible eval interface
- touch `apps/clinician-dashboard/` runtime code (the waveform viewer is a deferred future batch)

## The likely next concrete artifacts later

- `services/sim-harness/src/` directory tree following the layer map in `sim-harness-scaffold.md`
- a first engine-wrapping adapter (likely a Pulse REST sidecar, pending the engine wrapping decision record)
- a first scenario timeline file (likely tension pneumothorax or septic shock bundle)
- a first rhythm template (likely NSR + v-tach as the minimum viable pair)
- a first MCP tool registration through `services/clinical-mcp/`
- a first waveform viewer component in `apps/clinician-dashboard/`
- a first golden test case consuming the sim-driven FHIR stream

Current artifact:
- `docs/foundations/sim-harness-scaffold.md`

## Deep references

- `research/Open Source Clinical Simulation.md`
- `research/Open Source Clinical Simulation.original.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
- `wiki/concepts/computational-physiology-engine.md`
- `wiki/sources/2026-04-10-open-source-clinical-simulation.md`
