# Noah RN

Noah RN is an agent-native clinical workspace harness for critical care nursing.

The project exists to help a nurse build, test, and refine decomposable clinical workflows in a realistic EHR-like environment. The current direction is intentionally simple: start with `pi.dev` as the agent harness foundation, keep Medplum as the clinical workspace backbone, and add heavier runtime components only when they solve a concrete problem.


<img width="2740" height="2440" alt="image" src="https://github.com/user-attachments/assets/4a93b60b-acf9-4d9d-be5e-8b08683f8f2a" />

## Start Here

- [PLAN.md](PLAN.md) is the canonical project plan and architecture control plane.
- [TASKS.md](TASKS.md) is the current execution queue for coding agents.
- [docs/](docs/) holds product/reference material plus intentional archive history.
- `research/` is a local-only source corpus and is intentionally not part of the product repo.
- `wiki/` is local Claude working memory and is intentionally outside the product repo.
- Hidden planning/tooling folders such as `.omx/`, `.hermes/`, `.omc/`, `.agents/`, `.claude/`, and `.dmux-hooks/` are not the control plane. Treat them as local planning origins or tool-specific residue unless a doc explicitly says a file was promoted.
- `.noah-pi-runtime/` is the one tracked hidden surface that matters to product work; it is the repo-hosted pi runtime bridge, not a replacement for `packages/` or the root control plane.

## Current Shape

Noah RN has five active subprojects:

1. **Agent harness** - `pi.dev` foundation, workflow orchestration, specialized agents, `SKILLS.md`, `TOOLS.md`, and deterministic tool contracts.
2. **Clinical workspace** - Medplum-backed EHR development environment with Medplum-first clinician workflows, a nursing-station app at `apps/nursing-station/`, a runtime-console sidecar at `apps/clinician-dashboard/`, and a **Clinical Simulation Harness** named scope at `services/sim-harness/` that wraps open-source physiology engines (Pulse, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS) to produce live vitals, waveforms, and scenario-directed patient state for the agent to operate in.
3. **Memory layer** - longitudinal patient H&P, mutable present encounter canvas, provider session memory, provider persistent memory, and task-local agent memory.
4. **Clinical resources** - guidelines, protocols, pocket manuals, publication feeds, and an agent-centric Lexicomp-like drug reference.
5. **Meta-harness optimization** - observability, eval traces, metrics, and continuous improvement loops for the harness itself.

## Repository Map

```text
apps/            Runnable applications
services/        Runnable services
clinical-resources/  Curated protocols, drug ranges, templates, provenance
infrastructure/  Medplum and related local environment setup
packages/        Shared harness, workflow, and safety contracts
evals/           Meta-harness evaluation traces and optimization artifacts
docs/            Reference docs plus archive
local/           Gitignored local/private/generated workspace area
```

Local grounding surfaces such as `wiki/`, `research/`, `notes/`, `docs/local/`, Graphify outputs, and hidden planning directories like `.omx/` / `.hermes/` are intentionally outside the deliverable topology even when they still exist at repo root during the migration.

## Design Boundaries

- Deterministic tools handle math, lookup, validation, and safety checks wherever possible.
- National guidelines and established references are knowledge inputs, not a substitute for local policy or clinical judgment.
- Facility-specific policy is deferred until explicitly configured.
- `pi.dev` is the current harness foundation. Claude/OpenClaw/NemoClaw-era material is historical unless it directly supports a current subproject.

## Hidden Planning Surfaces

The repo still contains active-looking material in hidden folders. Current status:

- `.omx/plans/` and `.omx/specs/` — local planning origins; many files explicitly say the canonical copy moved into `docs/foundations/`.
- `.hermes/plans/` — local implementation plans and UI planning notes; useful source material, not canonical direction.
- `.omc/` and `.agents/` — agent/tool artifacts and prompts.
- `.claude/commands/wiki.md` — Claude-only workflow for maintaining the local wiki.
- `.dmux-hooks/` — dmux hook tooling surface, currently local/untracked here.
- `.noah-pi-runtime/` — tracked pi bridge surface; real, but subordinate to `packages/agent-harness/` and `packages/workflows/`.

Rule: if a hidden plan conflicts with `README.md`, `PLAN.md`, `TASKS.md`, or a git-tracked doc under `docs/`, the tracked control-plane doc wins.

## Running The Existing Pieces

The repo currently contains working or partially working pieces from earlier phases. Before changing runtime behavior, read [PLAN.md](PLAN.md) and pick from [TASKS.md](TASKS.md).

Workspace/package-manager posture:
- root uses **npm workspaces** (`package-lock.json` is the lockfile)
- prefer the root scripts when they exist
- use workspace-local scripts only when working on a single surface

Common areas:

- Nursing station: `apps/nursing-station/`
- Runtime console dashboard: `apps/clinician-dashboard/`
- MCP server: `services/clinical-mcp/`
- Clinical simulation harness: `services/sim-harness/` (scaffold + contracts; canonical authority is `docs/foundations/invariant-kernel-simulation-architecture.md` and `docs/foundations/foundational-contracts-simulation-architecture.md`)
- Medplum infrastructure: `infrastructure/`
- Clinical resources: `clinical-resources/`

Useful root commands:

```bash
npm run dev:dashboard
npm run dev:nursing-station
npm run build
npm run test
npm run build:clinical-mcp
npm run test:clinical-mcp
npm run playwright:install
npm run playwright:dashboard
npm run playwright:nursing-station:signin
```

Workspace-local examples:

```bash
npm run dev --workspace apps/nursing-station
npm run build --workspace apps/clinician-dashboard
npm run test --workspace services/clinical-mcp
npm run check --workspace services/sim-harness
```

## Disclaimer

Noah RN is a clinical knowledge and workflow tool, not medical advice. Verify all outputs against the current patient state, provider orders, and applicable facility policy before acting.
