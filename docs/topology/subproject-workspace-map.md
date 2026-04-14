# Noah RN Subproject Workspace Map

This document defines where each active Noah RN subproject lives.

Use this when deciding:
- where new artifacts should go
- which directory is the canonical workspace center for a subproject
- which surfaces are supporting, adjacent, local-only, or deferred

If this file conflicts with `README.md`, `PLAN.md`, or `TASKS.md`, update the control plane first.

## Why This Exists

The repo now has a topology target and npm workspace orchestration, but the active subprojects do not always map to a single directory.

That creates two recurring problems:
- agents do not know which surface is the center of a subproject
- high-level artifact generation risks landing in the wrong place

This file resolves that by defining a **workspace center** and **supporting surfaces** for each active subproject.

## Placement Rule

Use this rule before creating a new artifact:

1. If the artifact explains **where a subproject lives in the repo**, it belongs in `docs/topology/`.
2. If the artifact explains **what a subproject is, its boundary, and minimal architecture**, it belongs in `docs/foundations/`.
3. If the artifact is **execution-oriented**, it belongs in `TASKS.md` or a narrow implementation doc referenced by `TASKS.md`.
4. If the artifact is **runtime code or contracts**, it belongs in the subproject workspace center or its immediate supporting surface.

## Canonical Workspace Centers

### 1. Clinical Workspace

The Clinical Workspace lane has **two workspace centers**. One owns context assembly, the other owns live runtime simulation. Both sit behind the same agent-facing MCP boundary and read/write the same FHIR backbone.

**Workspace center A — context boundary**
- `services/clinical-mcp/`

**Why**
- This is the agent-facing contract boundary for patient context.
- It is the narrowest runtime center for chart assembly, timeline shaping, and simulation-facing context.

**Primary supporting surfaces**
- `infrastructure/` for Medplum and environment bring-up
- `apps/nursing-station/` for the Medplum-first clinician workspace path
- `apps/clinician-dashboard/` for the runtime-console sidecar and future sim observability
- `docs/foundations/medplum-architecture-packet.md` for current lane-specific reference

**What does not belong here**
- broad workflow orchestration logic
- memory-policy ownership
- general-purpose research synthesis
- physiology modeling or waveform generation (that is Workspace center B)

**Future artifact placement**
- high-level architecture: `docs/foundations/clinical-workspace-*.md`
- narrow implementation docs: `docs/foundations/` or `services/clinical-mcp/` if code-adjacent
- runtime code: `services/clinical-mcp/`

**Workspace center B — clinical simulation harness**
- `services/sim-harness/`

**Why**
- Owns the L0–L4 projection model per the invariant kernel: L0 hidden truth → L1 monitor → L2 events → L3 chart (via clinical-mcp) → L4 obligations.
- Enforces monitor-as-avatar: rhythm and hemodynamic claims validate against raw waveform samples + rendered image, not labels.
- L0 is an adapter over a validated external physiology engine. Engine choice is gated on Contract 9 (Research-Hook); no engine is bound today.
- L2 events follow a two-stage release authority (L0 eligibility + scenario-controller release per amendment D2).
- L3 write-back flows through `services/clinical-mcp/` into Medplum so the agent and clinician see the same chart regardless of whether the patient is static MIMIC or live simulated.

**Primary supporting surfaces**
- `services/clinical-mcp/` — single agent-facing MCP boundary. Sim tools register through `registerSimTools()` there (no-op today; wired in Lane F). Agents never talk to `services/sim-harness/` directly.
- `infrastructure/` — Medplum FHIR backbone that receives sim-harness write-back via clinical-mcp.
- `apps/clinician-dashboard/` — intended observability surface for future waveform viewer and live-vitals panels once the runtime lanes land.
- `docs/foundations/invariant-kernel-simulation-architecture.md` + `docs/foundations/foundational-contracts-simulation-architecture.md` — canonical authority.
- `docs/foundations/execution-packet-simulation-architecture.md` — implementation lanes A–F.
- `evals/` — downstream eval consumer (Contract 8); Gym-compatible wrapper deferred until golden tests mature.

**What does not belong here**
- custom in-house physiology modeling (L0 is always an adapter over a wrapped external engine)
- duplicate patient-context assembly logic (that belongs in `services/clinical-mcp/`)
- direct agent-facing MCP tool registration (tools register through the clinical-mcp boundary)
- waveform rendering that bypasses the agent vision contract (see `sim-harness-waveform-vision-contract.md`)
- L0 configuration parameters inside `services/clinical-mcp/` (relocated 2026-04-13)

**Current artifact placement**
- canonical architecture docs: `docs/foundations/invariant-kernel-simulation-architecture.md`, `docs/foundations/foundational-contracts-simulation-architecture.md`
- type contracts: `services/sim-harness/src/index.ts` (with L0–L4 layer annotations)
- reference pharmacokinetics: `services/sim-harness/src/reference/pharmacokinetics.ts`
- scenario controller + types: `services/sim-harness/src/scenario/`
- scenario seed data: `services/sim-harness/scenarios/` (pressor-titration, fluid-responsive, hyporesponsive)
- sim-harness config (PK + scenarios): `services/sim-harness/src/config.ts`
- tests: `services/sim-harness/__tests__/`

**Future artifact placement**
- clock + engine adapter code: `services/sim-harness/src/clock/` + `services/sim-harness/src/engine/` (execution-packet Lane A)
- projection code: `services/sim-harness/src/projections/` (Lane B)
- waveform template assets: `services/sim-harness/waveforms/rhythms/` (Lane C)
- alarm + signal-quality: `services/sim-harness/src/monitor/` (Lane C)
- charting policy + provenance: `services/clinical-mcp/src/charting/` (Lane D)
- obligation engine: placement decision pending amendment D1 (Lane E)
- eval recorder hooks: `evals/sim-trace/` (Lane F)
- runtime code gating: runtime work is gated on the first bedside workflow needing live vitals — see `TASKS.md` item 9

### 2. Agent Harness

**Workspace center**
- `packages/agent-harness/`

**Why**
- This is the harness/routing substrate inside the active workspace layout.
- It is the correct home for selection, registry consumption, and bridge logic.

**Primary supporting surfaces**
- `packages/workflows/` for authoritative workflow contracts
- `.noah-pi-runtime/` for repo-hosted bridge/scaffold surfaces (mounted in runtime as `/runtime/.pi`)
- `docs/foundations/metadata-registry-spec.md`
- `docs/foundations/skill-contract-schema.md`

**What does not belong here**
- direct ownership of clinician chart state
- broad resource corpus ownership
- hidden memory persistence

**Future artifact placement**
- topology/placement docs: `docs/topology/`
- high-level harness boundary notes: `docs/foundations/agent-harness-*.md`
- runtime routing code and selection logic: `packages/agent-harness/`

### 3. Clinical Resources

**Workspace center**
- `clinical-resources/`

**Why**
- Clinical resources are not primarily an npm workspace package.
- They are a first-class root deliverable surface and should stay so until a concrete runtime split is needed.

**Primary supporting surfaces**
- `packages/workflows/protocol-reference/`
- `packages/workflows/drug-reference/`
- `docs/foundations/metadata-registry-spec.md`

**What does not belong here**
- raw research corpus
- broad local-only source distillations
- runtime orchestration logic

**Future artifact placement**
- resource-class and provenance docs: `docs/foundations/clinical-resources-*.md`
- runtime-access contracts: workflow package docs or focused `docs/foundations/` notes
- actual curated content and registries: `clinical-resources/`

### 4. Memory Layer

**Workspace center**
- `docs/foundations/memory-layer-scaffold.md`

**Why**
- Memory is still boundary-first at this phase.
- The reserved package lane was removed until real runtime code exists again, so the foundation docs are the active center for now.

**Primary supporting surfaces**
- `services/clinical-mcp/` for encounter-context assembly touchpoints
- `packages/workflows/` for required-context declarations
- `docs/foundations/` for boundary and persistence policy notes

**What does not belong here**
- silent clinical record write-back
- unrestricted conversation history
- cross-project local state

**Future artifact placement**
- memory boundary notes: `docs/foundations/memory-*.md`
- runtime memory code: a future `packages/` lane once implementation actually exists
- policy and persistence rules: `docs/foundations/` first, then package-local docs if runtime code is reintroduced

### 5. Meta-Harness Optimization

**Workspace center**
- `evals/`

**Why**
- This lane is about traces, scoring, and improvement loops, not runtime product execution.
- It should stay clearly separated from ordinary tests and runtime code.

**Primary supporting surfaces**
- `tools/trace/`
- `docs/foundations/observability-context-addendum.md`
- selected workflow/package docs when an eval target needs contract clarification

**What does not belong here**
- canonical product control-plane docs
- broad runtime logic
- local-only scratch analysis that should stay outside deliverable topology

**Future artifact placement**
- evaluation architecture notes: `docs/foundations/`
- traces, candidates, and loop artifacts: `evals/`

## Important Clarification: A Subproject May Span Multiple Surfaces

The active subprojects are not always one folder each.

Use this model:

- **workspace center** = the canonical place to start work
- **supporting surfaces** = adjacent directories needed by that subproject
- **local grounding** = non-deliverable materials that inform the work but do not define the workspace

Examples:

- Clinical workspace spans `services/clinical-mcp/`, `infrastructure/`, `apps/nursing-station/`, and `apps/clinician-dashboard/`, but the center is `services/clinical-mcp/`.
- Agent harness spans `packages/agent-harness/`, `packages/workflows/`, and `.noah-pi-runtime/`, but the center is `packages/agent-harness/`.
- Clinical resources span `clinical-resources/` and selected workflow packages, but the center is `clinical-resources/`.

## Where The Next Artifacts Should Live

For the current high-level pass:

- broad organization / “where does this subproject live?” artifacts:
  - `docs/topology/`
- subproject boundary / concise architecture / deferred-work artifacts:
  - `docs/foundations/`

That means the scaffold notes already created under `docs/foundations/` are the right class of artifact.

The missing canonical artifact was this one:
- `docs/topology/subproject-workspace-map.md`

## Summary Table

| Subproject | Workspace center | Primary supporting surfaces |
|---|---|---|
| Clinical workspace | `services/clinical-mcp/` | `infrastructure/`, `apps/nursing-station/`, `apps/clinician-dashboard/`, `docs/foundations/medplum-architecture-packet.md` |
| Agent harness | `packages/agent-harness/` | `packages/workflows/`, `.noah-pi-runtime/`, metadata/contract foundation docs |
| Clinical resources | `clinical-resources/` | workflow reference packages, metadata-registry foundation docs |
| Memory layer | `docs/foundations/memory-layer-scaffold.md` | `services/clinical-mcp/`, `packages/workflows/`, memory foundation docs |
| Meta-harness optimization | `evals/` | `tools/trace/`, observability foundation docs |

## Current Rule

When a new artifact is proposed and its home is unclear, decide the class first:
- topology
- foundation
- execution
- runtime code

Then place it in the workspace center or the matching doc surface.
