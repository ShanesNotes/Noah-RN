# Noah RN Plan

This is the canonical project control plane. If another planning doc conflicts with this file, this file wins until it is intentionally updated.

## North Star

Noah RN is an agent-native clinical workspace harness for critical care nursing. It helps a nurse build and run decomposable clinical workflows against realistic patient context, clinical knowledge, deterministic tools, and auditable agent behavior.

The product is not a pile of prompts and not a generic agent demo. It is a clinical workbench for turning bedside nursing pattern recognition into executable workflows.

## Current Foundation Decision

`pi.dev` is the foundation for the next phase.

Claude Code, OpenClaw, NemoClaw, Letta, and similar systems are no longer treated as active foundations. They may still contain useful patterns or components, but they must earn their way back in through a concrete need.

Decision rule:

```text
Start with pi.dev.
Add a component only when a current workflow has a specific unmet requirement.
Record the reason before adopting it.
```

## Active Subprojects

### 1. Agent Harness

Goal: build the minimal agent-native harness that can route clinical workflow requests to specialized agents.

Core ideas:

- `pi.dev` foundation.
- Orchestrator routes to specialized clinical agents.
- Agents expose clear `SKILLS.md` and `TOOLS.md` contracts.
- Deterministic tools handle math, lookup, validation, and data access.
- Runtime choices stay boring until the workflow requires more.

Immediate questions:

- What is the smallest useful `pi.dev` skeleton?
- What does one clinical workflow agent need to declare?
- What tool contract lets agents use Medplum context safely?

### 2. Clinical Workspace

Goal: create a realistic EHR-like development environment where workflows can be built and tested against patient context that can be **static** (MIMIC/Synthea snapshots) or **live** (a tickable simulation harness wrapping validated open-source physiology engines).

Current direction:

- Medplum remains the open-source EHR foundation and FHIR backbone.
- MIMIC/Synthea provide static simulated patient data for chart-context seeding.
- `services/clinical-mcp/` is the agent-facing context boundary.
- `services/sim-harness/` is the live-runtime workspace center for tickable patient state, waveform generation, and scenario direction. It wraps open-source clinical simulation engines (Pulse, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS) rather than reinventing physiology.
- `apps/clinician-dashboard/` is a sidecar observability/prototyping surface and the waveform viewer for sim-harness output.
- Both the agent and the clinician see the same FHIR context regardless of whether the source is a static MIMIC case or a live sim-harness encounter.

Named scope inside Clinical Workspace:

- **Clinical Simulation Harness** — live-EHR + live-vitals environment for the agentic harness to operate in. Wraps Pulse as the primary physiology engine; wraps Infirmary Integrated rhythm/waveform patterns; borrows rohySimulator's LLM virtual-patient dialogue shape; exposes an Auto-ALS-style Gym-compatible interface for the meta-harness eval loop. Canonical scaffold lives in `docs/foundations/sim-harness-scaffold.md`. Runtime center is `services/sim-harness/`.

Immediate questions:

- What is the smallest end-to-end patient chart path?
- Which one patient/workflow should prove the loop first?
- What should the nurse see before invoking an agent?
- Which open-source engine wrapping strategy lands first: Pulse Python-binding sidecar, Pulse REST sidecar, or in-process adapter?
- How does the agent validate a rhythm classification against the raw waveform surface?

### 3. Memory Layer

Goal: define memory as clinical context, not generic chat history.

Working architecture:

- Longitudinal patient H&P.
- Present encounter mutable Markdown/canvas.
- Provider session memory.
- Provider-as-LLM-user persistent memory.
- Task-local lite memory for specialized agents.

Immediate questions:

- Which memory layer is required for the first workflow?
- What stays mutable during an encounter?
- What must never be silently persisted?

### 4. Clinical Resources

Goal: build a structured, provenance-aware clinical resource layer.

Resource categories:

- National and specialty guidelines.
- Joint Commission or similar sources as institution-policy stand-ins where useful.
- AHA and other established protocols.
- Pocket manuals and medical education references.
- Publication/update feeds where legally and technically available.
- Agent-centric Lexicomp-like drug reference.

Immediate questions:

- What is the first resource set needed by the first workflow?
- What metadata must every resource carry?
- What content is reference-only versus tool-backed?

### 5. Meta-Harness Optimization

Goal: make development and clinical workflow quality measurable.

Core ideas:

- Observability for every workflow invocation.
- Metrics for context quality, tool use, latency, cost, confidence, and safety.
- Eval traces that can drive continuous improvement.
- Optimization supports the clinical harness; it is not the product boundary.

Immediate questions:

- What trace should one workflow invocation produce?
- What independent checks prove the agent did useful work?
- What should be measured before optimizing anything?

## Canonical Docs

The active docs are intentionally few:

- `README.md` - orientation and repo map.
- `PLAN.md` - project direction, architecture, and decisions.
- `TASKS.md` - current execution queue.

Reference docs may live in `docs/`, but they are not the control plane unless this file says so.

## Archive Policy

Stale docs should not keep competing with the active plan.

Classification:

- **Canonical** - belongs in `README.md`, `PLAN.md`, `TASKS.md`, or focused reference docs.
- **Distill** - contains gold mixed with stale assumptions; extract the gold, then archive the original.
- **Archive** - useful historical context, but no longer active direction.
- **Ignore/Delete later** - generated clutter, duplicates, or local-only artifacts after review.

Do not drastically rewrite `research/` in this pass. Treat it as a source corpus for later distillation.

## Safety And Product Boundaries

- Noah supports clinical judgment; it does not replace it.
- Noah does not diagnose or place orders.
- Noah does not guess facility policy.
- Deterministic tools should handle exact computation and validation.
- Outputs should preserve provenance, confidence, and limitations.
- Clinical excellence comes first; regulatory alignment follows from good boundaries.

## Current Critical Path

1. Treat the topology and readiness-prep wave as complete enough to begin the first pi-native bridge.
2. Treat the first Shift Report bridge scaffold as complete enough to force the next implementation decision.
3. Use the new registry + contract + selection structures as the implementation substrate.
4. Pick and wire the first realistic bedside workflow, starting with Shift Report.
5. Connect that workflow to Medplum patient context in the new layout.
6. Add only the memory/resource/tool pieces required by that workflow.
7. Instrument the workflow before deeper optimization or state-machine work.
8. Land the Clinical Simulation Harness scaffold so the first live-vitals workflow loop has a runtime center before any runtime code is written. See `docs/foundations/sim-harness-scaffold.md`.

## Deferred Work

- Deep research cleanup.
- GitHub issue/project/label cleanup.
- Wiki cleanup.
- Full Lexicomp clone.
- Production packaging.
- Broad runtime migration.

## Approved Topology Direction

The repo is no longer deferring topology work in the abstract. The approved next structure is documented in:

- `docs/topology/repo-topology-target.md`
- `docs/topology/migration-checklist.md`
- `docs/topology/root-classification.md`
- `docs/topology/workspace-orchestration.md`

Approved posture:

- keep `README.md`, `PLAN.md`, and `TASKS.md` as the required root anchors
- move runnable surfaces toward `apps/`, `services/`, and `packages/`
- keep `clinical-resources/`, `infrastructure/`, `tests/`, `tools/`, and `docs/` as first-class root surfaces
- use root npm workspaces as the first orchestration layer for moved runnable packages
- treat `wiki/`, `research/`, `notes/`, `docs/local/`, and Graphify outputs as local/foundational/generated rather than deliverable topology
- treat `.omx/`, `.omc/`, and `.obsidian/` as path-sensitive exceptions until tooling explicitly supports relocation

## Decision Log

### 2026-04-10: Use A Minimal Active Control Plane

Decision: replace competing planning surfaces with `README.md`, `PLAN.md`, and `TASKS.md`.

Why: the repo had too many documents acting as sources of truth. The user needs builder clarity and coding-agent usability more than external polish right now.

Consequence: older North Star, roadmap, pending-work, and task-dashboard docs move to `docs/archive/legacy-control-plane/`.

### 2026-04-10: Make pi.dev The Harness Foundation

Decision: `pi.dev` is canonical for the next phase.

Why: it is simpler and more extensible for the current build path.

Consequence: Claude/OpenClaw/NemoClaw-era docs are historical unless a specific component is later adopted for a concrete reason.

### 2026-04-10: Adopt A Surface-First Topology

Decision: restructure Noah RN around a surface-first monorepo shape with explicit deliverable vs local/foundational/generated boundaries.

Why: AI-agent discovery is the primary optimization target, and the current root mixes active product surfaces with grounding material and generated artifacts.

Consequence: runnable surfaces now live under `apps/` and `services/`, workflow/router contracts now live under `packages/`, hook scripts now live under `tools/safety-hooks/`, and `evals/` is replacing `optimization/` as the active meta-harness surface.

### 2026-04-11: Stand Up A Clinical Simulation Harness Inside Clinical Workspace

Decision: add a named `Clinical Simulation Harness` scope inside subproject #2 (Clinical Workspace), with `services/sim-harness/` as its workspace center. It wraps validated open-source engines (Pulse Physiology Engine, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS / Virtu-ALS) rather than rebuilding physiology in-house. The agent must have direct vision on the waveform surface for clinical validation, not just rhythm/label metadata.

Why:

- The first real bedside workflow needs a live-vitals substrate that the agent can operate in, not just a static MIMIC snapshot.
- Pulse is Apache-2.0, validated, multi-language bindable, and already ships the cardiovascular/respiratory/renal/nervous physiology noah-rn would otherwise spend months building. Reinventing it would violate the project's plumbing-over-AI posture.
- A nurse validates a rhythm reading by looking at the strip. The agent must do the same. Exposing only a rhythm label to the agent would bake a silent-failure surface into the harness.
- Auto-ALS already demonstrates the Gym-compatible RL interface pattern; adopting it keeps the door open for meta-harness work against a live environment.

Consequence:

- New foundation doc set under `docs/foundations/sim-harness-*.md`, starting with `sim-harness-scaffold.md`, `sim-harness-first-batch.md`, `sim-harness-runtime-access-contract.md`, `sim-harness-waveform-vision-contract.md`, and `sim-harness-engine-wrapping.md`.
- New workspace center at `services/sim-harness/` (scaffold only; no runtime code yet).
- `docs/ARCHITECTURE.md`, `docs/topology/subproject-workspace-map.md`, and `docs/foundations/clinical-workspace-scaffold.md` updated to reflect the second workspace center under Clinical Workspace.
- No in-house physiology engine will be built. Extensions stay as adapters on top of the wrapped open-source engines.
- The origin research is captured in `research/Open Source Clinical Simulation.md`, `research/Architectural integration for noah-rn clinical simulation.md`, and the wiki concept pages `wiki/concepts/clinical-simulator-as-eval-substrate.md` and `wiki/concepts/computational-physiology-engine.md`.
