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

Goal: create a realistic EHR-like development environment where workflows can be built and tested against patient context.

Current direction:

- Medplum remains the open-source EHR foundation.
- MIMIC/Synthea provide simulated patient data.
- Medplum is the canonical clinician-facing workspace for now.
- `apps/clinician-dashboard/` is a sidecar observability/prototyping surface until a stronger product need is proven.
- MCP/server code is useful if it helps assemble patient context cleanly.

Immediate questions:

- What is the smallest end-to-end patient chart path?
- Which one patient/workflow should prove the loop first?
- What should the nurse see before invoking an agent?

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
- keep `knowledge/`, `infrastructure/`, `tests/`, `tools/`, and `docs/` as first-class root surfaces
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
