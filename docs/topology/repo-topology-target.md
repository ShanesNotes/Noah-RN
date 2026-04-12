# Noah RN Target Repo Topology

This document is the canonical topology target for the current restructure program.

If a migration decision conflicts with this file, `PLAN.md`, or `TASKS.md`, update the control plane first rather than improvising a new structure mid-move.

## Purpose

The repo should optimize for:

1. AI-agent discovery
2. alignment with the five active subprojects
3. explicit separation between deliverables and local/foundational/generated context

## Root Anchors

These remain required at repo root:

- `README.md`
- `PLAN.md`
- `TASKS.md`

## Target Shape

```text
README.md
PLAN.md
TASKS.md
.github/
apps/
  clinician-dashboard/
services/
  clinical-mcp/
packages/
  agent-harness/
  workflows/
  memory/
  safety/
clinical-resources/
infrastructure/
evals/
tests/
tools/
docs/
local/
  grounding/
    wiki/
    research/
    notes/
    docs-local/
  graphify/
  scratch/
```

## Why This Shape

### `apps/`
- Holds runnable user-facing applications.
- Current migrated app: `apps/clinician-dashboard/` (moved from `dashboard/`).

### `services/`
- Holds networked or tool-serving runtime surfaces.
- Current migrated service: `services/clinical-mcp/` (moved from `mcp-server/`).

### `packages/`
- Holds reusable internal subsystems and contracts.
- Intended homes:
  - `packages/agent-harness/` for future `pi.dev`-aligned harness/routing work
  - `packages/workflows/` for migrated workflow contracts from `plugin/skills/`
  - `packages/memory/` for mutable encounter/session memory work
  - `packages/safety/` for shared safety-hook or validation contracts that stay code-level

### `clinical-resources/`
- Remains root-level because it is a first-class product surface, not merely supporting data.

### `infrastructure/`
- Remains root-level because it already names the deployment/environment lane clearly.

### `evals/`
- `evals/` is the active home for meta-harness quality artifacts.
- Distinguishes evaluation from ordinary correctness tests.

### `tests/`
- Remains root-level as the shared verification surface across apps, services, packages, and tools.

### `tools/`
- Remains root-level as the deterministic tooling layer.

### `docs/`
- Stays as the public/reference documentation surface for the deliverable repo.

### `local/`
- Conceptual home for local grounding and generated artifacts.
- This is intentionally non-deliverable and should remain gitignored.

## Path-Sensitive Exceptions

These should not be relocated casually:

- `.omx/` — OMX runtime state
- `.omc/` — OMC/runtime state
- `.obsidian/` — local vault/UI state
- `graphify-out/` — canonical generated full-project graph artifact for repo-wide navigation
- `local/graphify/legacy/graphify-out-full-project-20260411/` — archived legacy/custom merged graph artifact from an earlier workflow

## Move Policy

1. Do not move files without an explicit current → target mapping.
2. Capture `git status --short` before each migration batch and do not revert unrelated pre-existing changes.
3. Move runnable surfaces only after the workspace-orchestration approach is documented.
4. Move contracts verbatim before refactoring their internal content.
5. Treat `wiki/`, `research/`, and `notes/` as a local grounding cluster.
6. Remove redirects/shims only after repeated clean verification passes.

## Immediate Consequence For Agents

During the current migration phase:

- treat `apps/clinician-dashboard/`, `services/clinical-mcp/`, `packages/workflows/`, `packages/agent-harness/`, and `tools/safety-hooks/` as current working locations
- treat this document as the approved destination model
- prefer adding new migration docs under `docs/topology/` instead of inventing new root categories
- treat `graphify-out/` as the first graph surface for repo-wide graph navigation
