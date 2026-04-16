# Noah RN Agent Guide

Use this file as the fast repo-local navigation layer.
It does **not** replace the control plane.

## Control plane first

When directions conflict, use this order:

1. `README.md` — repo orientation and current shape
2. `PLAN.md` — canonical project direction and architecture decisions
3. `TASKS.md` — active execution queue
4. `docs/` — reference, topology, foundations, plans, archive
5. local or hidden surfaces (`notes/`, `research/`, `wiki/`, `.hermes/`, `.omx/`, `.omc/`) — context only unless explicitly promoted

## Start here by task

| If you are doing... | Read this first | Then read |
|---|---|---|
| any substantial repo work | `README.md` | `PLAN.md`, `TASKS.md`, `docs/NAVIGATION.md` |
| repo/file placement decisions | `docs/topology/subproject-workspace-map.md` | `docs/topology/root-classification.md` |
| implementation planning | `docs/plans/` relevant plan | `TASKS.md` |
| architecture or boundary changes | `docs/ARCHITECTURE.md` | relevant `docs/foundations/*.md` |
| harness/routing work | `packages/agent-harness/README.md` | `packages/workflows/README.md`, `.noah-pi-runtime/README.md` |
| workflow contract work | `packages/workflows/README.md` | workflow-local `SKILL.md` |
| clinician workspace UI work | `apps/nursing-station/README.md` | `docs/analysis/ehr-ui-ux-start-here.md` |
| dashboard/runtime-console work | `apps/clinician-dashboard/README.md` | `docs/ARCHITECTURE.md` |
| patient-context / MCP work | `services/clinical-mcp/README.md` | `docs/foundations/shift-report-canonical-patient-path.md` |
| simulation work | `services/sim-harness/README.md` | `docs/foundations/invariant-kernel-simulation-architecture.md`, `docs/foundations/foundational-contracts-simulation-architecture.md` |
| clinical resources work | `clinical-resources/README.md` | `docs/foundations/clinical-resources-runtime-access-contract.md` |
| infrastructure work | `infrastructure/README.md` | `docs/ARCHITECTURE.md` |
| memory work | `memory/README.md` | `docs/foundations/memory-tier-boundary.md` |
| tests/evals work | `tests/README.md` or `evals/README.md` | task-specific local README |
| hidden-doc reconciliation | `docs/analysis/hidden-docs-reconciliation-note-2026-04-14.md` | `docs/README.md` |

## Repo rules that are easy to forget

- Root uses **npm workspaces** with `package-lock.json`.
- Prefer root scripts when they exist; use workspace-local scripts when staying inside one lane.
- `apps/nursing-station/` is the main clinician-facing surface.
- `apps/clinician-dashboard/` is sidecar-only. Do not regrow it into a second chart without an explicit decision.
- `services/clinical-mcp/` is the only agent-facing clinical boundary.
- Agents do **not** talk to `services/sim-harness/` directly.
- `packages/workflows/` is authoritative for workflow contracts.
- `.noah-pi-runtime/` is the repo-hosted Pi bridge surface, not the source of product truth.
- Hidden/local surfaces are useful context but not canonical by default.

## Hidden and local surfaces

Treat these as supporting context, not the control plane:

- `notes/` — strong context, not automatic truth
- `research/` — source corpus only
- `wiki/` — local synthesis and memory
- `.hermes/`, `.omx/`, `.omc/`, `.agents/` — planning/tooling residue unless explicitly promoted

If one of those conflicts with `README.md`, `PLAN.md`, `TASKS.md`, or a tracked promoted doc in `docs/`, the tracked control-plane doc wins.

## Delegation posture

Use direct edits for quick, obvious, local changes.

For larger work, prefer isolated delegation over shared-context thrashing:
- use subagents when the runtime supports them
- otherwise use another isolated agent session/tooling path rather than mixing multiple investigations into one thread
- keep delegation focused: scout/investigate, implement, then review

## Useful root commands

```bash
npm run dev:nursing-station
npm run dev:dashboard
npm run build
npm run test
npm run build:clinical-mcp
npm run test:clinical-mcp
npm run playwright:nursing-station:shell
```

## Documentation entrypoint

Use `docs/NAVIGATION.md` for the task-oriented doc map and “read this before editing” paths.
