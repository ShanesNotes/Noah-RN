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
- `apps/clinician-dashboard/` for sidecar observability and clinician-facing prototyping
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
- This is the live-runtime center for tickable patient state, waveform generation, and scenario direction.
- It exists so the agent has a realistic environment to operate in, with live vitals and waveforms the agent can see and validate against.
- It wraps validated open-source engines (Pulse, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS) rather than rebuilding physiology in-house.
- It writes Observation / Encounter / MedicationAdministration resources into the same Medplum FHIR backbone the context boundary reads from, so the agent and clinician see the same chart regardless of whether the patient is static MIMIC or live simulated.

**Primary supporting surfaces**
- `services/clinical-mcp/` registers the sim-harness agent-facing MCP tools (live vitals, waveform vision, administer medication, order intervention). Agents never talk to `services/sim-harness/` directly.
- `infrastructure/` provides the Medplum FHIR backbone that receives sim-harness write-back.
- `apps/clinician-dashboard/` renders the waveform viewer and live-vitals panel consuming sim-harness output.
- `docs/foundations/sim-harness-*.md` holds the canonical specs.
- `evals/` is the eventual downstream consumer via a Gym-compatible interface for meta-harness work.

**What does not belong here**
- custom in-house physiology modeling (explicitly superseded by the engine-wrapping strategy)
- duplicate patient-context assembly logic (that belongs in `services/clinical-mcp/`)
- direct agent-facing MCP tool registration (tools register through the clinical-mcp boundary)
- waveform rendering that bypasses the agent vision contract (see `sim-harness-waveform-vision-contract.md`)

**Future artifact placement**
- high-level scaffold and boundary docs: `docs/foundations/sim-harness-*.md`
- engine wrapping adapter code: `services/sim-harness/` (when runtime work starts)
- scenario timeline authoring: `services/sim-harness/scenarios/` (when runtime work starts)
- waveform template assets: `services/sim-harness/waveforms/rhythms/` (when runtime work starts)
- runtime code gating: runtime work is gated on the first bedside workflow needing live vitals — see `TASKS.md` item 4

### 2. Agent Harness

**Workspace center**
- `packages/agent-harness/`

**Why**
- This is the harness/routing substrate inside the active workspace layout.
- It is the correct home for selection, registry consumption, and bridge logic.

**Primary supporting surfaces**
- `packages/workflows/` for authoritative workflow contracts
- `.pi/` for project-level bridge/scaffold surfaces
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
- `packages/memory/`

**Why**
- Memory is an internal subsystem, not a user-facing app or standalone service at this phase.
- The package lane already exists and is explicitly reserved for future memory work.

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
- runtime memory code: `packages/memory/`
- policy and persistence rules: `docs/foundations/` first, then package-local docs if implemented

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

- Clinical workspace spans `services/clinical-mcp/`, `infrastructure/`, and `apps/clinician-dashboard/`, but the center is `services/clinical-mcp/`.
- Agent harness spans `packages/agent-harness/`, `packages/workflows/`, and `.pi/`, but the center is `packages/agent-harness/`.
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
| Clinical workspace | `services/clinical-mcp/` | `infrastructure/`, `apps/clinician-dashboard/`, `docs/foundations/medplum-architecture-packet.md` |
| Agent harness | `packages/agent-harness/` | `packages/workflows/`, `.pi/`, metadata/contract foundation docs |
| Clinical resources | `clinical-resources/` | workflow reference packages, metadata-registry foundation docs |
| Memory layer | `packages/memory/` | `services/clinical-mcp/`, `packages/workflows/`, memory foundation docs |
| Meta-harness optimization | `evals/` | `tools/trace/`, observability foundation docs |

## Current Rule

When a new artifact is proposed and its home is unclear, decide the class first:
- topology
- foundation
- execution
- runtime code

Then place it in the workspace center or the matching doc surface.
