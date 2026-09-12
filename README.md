# Noah RN

Noah RN is an agent-native clinical workspace harness for critical care nursing.

The project exists to help a nurse build, test, and refine decomposable clinical workflows in a realistic EHR-like environment. The current direction is intentionally simple: start with `pi.dev` as the agent harness foundation, keep Medplum as the clinical workspace backbone, and add heavier runtime components only when they solve a concrete problem.


<img width="2740" height="2440" alt="image" src="https://github.com/user-attachments/assets/4a93b60b-acf9-4d9d-be5e-8b08683f8f2a" />

## Start Here

- [PLAN.md](PLAN.md) is the canonical project plan and architecture control plane.
- [TASKS.md](TASKS.md) is the current execution queue for coding agents.
- [AGENTS.md](AGENTS.md) is the fast repo-local agent guide.
- [CLAUDE.md](CLAUDE.md) is the session boot overlay (`@AGENTS.md` plus install/test/typecheck/lint and CI bash suites).
- [docs/NAVIGATION.md](docs/NAVIGATION.md) is the task-oriented docs map.
- [docs/](docs/) holds product/reference material plus intentional archive history.
- `research/` is a local-only source corpus and is intentionally not part of the product repo.
- `wiki/` is local Claude working memory and is intentionally outside the product repo.
- Hidden planning/tooling folders such as `.omx/`, `.hermes/`, `.omc/`, `.agents/`, `.claude/`, and `.dmux/` are not the control plane. Treat them as local planning origins or tool-specific residue unless a doc explicitly says a file was promoted.
- `.noah-pi-runtime/` is the one tracked hidden surface that matters to product work; it is the repo-hosted pi runtime bridge, not a replacement for `packages/` or the root control plane.

## Current Shape

Noah RN is structured as **one core product, two subordinate products, and three subordinate lanes** (see [docs/plans/three-product-alignment-2026-04-16.md](docs/plans/three-product-alignment-2026-04-16.md) for the active alignment plan).

**Core product:**

1. **Noah RN Agent Harness (Product A)** — `pi.dev` foundation, workflow orchestration, specialized agents, `SKILLS.md`, `TOOLS.md`, deterministic tool contracts. The core deliverable. Drops into any clinical-MCP-compliant EHR (Medplum, Epic, Cerner) without changes to harness or workflow code.

**Subordinate products (each standalone-shippable):**

2. **Agent-Native Nursing EHR (Product B)** — `apps/nursing-station/` + Medplum (`infrastructure/`) + the EHR-side MCP server currently inside `services/clinical-mcp/`. Houses the MAR, orders, documentation, results, vitals. Gold-standard trajectory: Epic.
3. **Agent-Native Clinical Simulation (Product C)** — `services/sim-harness/` wrapping the Pulse Physiology Engine (Apache-2.0) per Contract 9. Produces live vitals, waveforms, and scenario-directed patient state per the L0–L4 projection kernel. Code-standalone; requires any FHIR-capable EHR at runtime.

**Subordinate lanes (shared substrate, not products):**

4. **Clinical resources** — curated guidelines, protocols, Lexicomp-mirror drug reference, pocket manuals, publication feeds.
5. **Memory layer** — longitudinal patient H&P, mutable encounter canvas, provider session memory, provider persistent memory, task-local agent memory. Spec-only today.
6. **Meta-harness observability** — telemetry pipeline, eval traces, metrics, runtime console in `apps/clinician-dashboard/`.

Products communicate through the clinical-MCP contract (A↔B, A↔C) and FHIR (C→B). **No product imports code from another product.** The authoritative contract surface is `packages/agent-harness/` + `packages/workflows/*/SKILL.md`; `.noah-pi-runtime/extensions/*` is the live execution surface, subordinate to the contract surface.

## Current Clinician Workspace Status

The current `apps/nursing-station/` surface is no longer just a scaffold. The landed clinician-workspace spine now includes:

- work-first assignment entry at the root `WORKLIST` surface
- route-driven chart shell with persistent patient header
- overview page as the default chart entry
- task-driven draft review with explicit `reviewed`, `acknowledged`, and `approved-finalized` states
- draft `DocumentReference` review pane with provenance-aware framing
- results review state
- trend-first vitals and lab cues
- fixture-backed Playwright coverage for the shell, review flow, assignment flow, and trend cues

The current next sequenced bedside lane is `MAR-lite`, not a broad redesign.

## Task-Oriented Entry Points

Use these before wandering the tree:

| If you need to... | Start here |
|---|---|
| understand the project | [PLAN.md](PLAN.md) |
| pick active work | [TASKS.md](TASKS.md) |
| find the right docs fast | [docs/NAVIGATION.md](docs/NAVIGATION.md) |
| understand repo rules for agents | [AGENTS.md](AGENTS.md) |
| place a new doc or subproject | [docs/README.md](docs/README.md), [docs/topology/subproject-workspace-map.md](docs/topology/subproject-workspace-map.md) |
| work on the nursing station | [apps/nursing-station/README.md](apps/nursing-station/README.md) |
| work on the clinical MCP boundary | [services/clinical-mcp/README.md](services/clinical-mcp/README.md) |
| work on harness routing/contracts | [packages/agent-harness/README.md](packages/agent-harness/README.md), [packages/workflows/README.md](packages/workflows/README.md) |
| reconcile hidden docs | [docs/analysis/hidden-docs-reconciliation-note-2026-04-14.md](docs/analysis/hidden-docs-reconciliation-note-2026-04-14.md) |

## Repository Map

```text
apps/            Runnable applications
clinical-resources/  Curated protocols, drug ranges, templates, provenance
docs/            Reference docs plus archive
evals/           Meta-harness evaluation traces and optimization artifacts
infrastructure/  Medplum and related local environment setup
local/           Gitignored local/private/generated workspace area
memory/          Memory architecture placeholder
optimization/    Generated optimization artifacts/candidates
packages/        Shared harness, workflow, and safety contracts
scripts/         Operational/launch/playwright/tower/optimize scripts
services/        Runnable services
tests/           Verification and contract tests
tools/           Deterministic tools and operational helpers
```

Local grounding surfaces such as `wiki/`, `research/`, `notes/`, `docs/local/`, Graphify outputs, and hidden planning directories like `.omx/` / `.hermes/` are intentionally outside the deliverable topology even when they still exist at repo root during the migration.

## Design Boundaries

- Deterministic tools handle math, lookup, validation, and safety checks wherever possible.
- National guidelines and established references are knowledge inputs, not a substitute for local policy or clinical judgment.
- Facility-specific policy is deferred until explicitly configured.
- `pi.dev` is the current harness foundation. Claude/OpenClaw/NemoClaw-era material is historical unless it directly supports a current subproject.
- `packages/workflows/` remains authoritative for workflow contracts and dependency manifests.
- `.noah-pi-runtime/` is the Pi bridge surface over authoritative Noah RN runtime lanes; it is not a second source of clinical truth.
- The active Shift Report path now includes shared renderer logic in `packages/agent-harness/shift-report-renderer.mjs`, reused by the harness runner, the Medplum worker, and the Pi dry-run bridge.
- `apps/nursing-station/` is intentionally work-first now: assignment/worklist -> patient review -> chart navigation.
- `apps/clinician-dashboard/` remains sidecar-only. Do not regrow it into a second chart.

## Hidden Planning Surfaces

The repo still contains active-looking material in hidden folders. Current status:

- `.omx/plans/` and `.omx/specs/` — local planning origins; many files explicitly say the canonical copy moved into `docs/foundations/`.
- `.hermes/plans/` — local implementation plans and UI planning notes; useful source material, not canonical direction.
- `.omc/` and `.agents/` — agent/tool artifacts and prompts.
- `.claude/commands/wiki.md` — Claude-only workflow for maintaining the local wiki.
- `.dmux/` — local multiplexer/tooling surface; not part of the control plane.
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
- Shared Shift Report renderer: `packages/agent-harness/shift-report-renderer.mjs`
- Pi bridge extensions: `.noah-pi-runtime/extensions/`

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
npm run playwright:nursing-station:shell
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
