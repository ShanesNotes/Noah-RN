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

## Current Shape

Noah RN has five active subprojects:

1. **Agent harness** - `pi.dev` foundation, workflow orchestration, specialized agents, `SKILLS.md`, `TOOLS.md`, and deterministic tool contracts.
2. **Clinical workspace** - Medplum-backed EHR development environment with patient chart context, vitals, labs, meds, and clinician UI. Includes a **Clinical Simulation Harness** named scope at `services/sim-harness/` that wraps open-source physiology engines (Pulse, BioGears, Infirmary Integrated, rohySimulator, Auto-ALS) to produce live vitals, waveforms, and scenario-directed patient state for the agent to operate in.
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

Local grounding surfaces such as `wiki/`, `research/`, `notes/`, `docs/local/`, and Graphify outputs are intentionally outside the deliverable topology even when they still exist at repo root during the migration.

## Design Boundaries

- Deterministic tools handle math, lookup, validation, and safety checks wherever possible.
- National guidelines and established references are knowledge inputs, not a substitute for local policy or clinical judgment.
- Facility-specific policy is deferred until explicitly configured.
- `pi.dev` is the current harness foundation. Claude/OpenClaw/NemoClaw-era material is historical unless it directly supports a current subproject.

## Running The Existing Pieces

The repo currently contains working or partially working pieces from earlier phases. Before changing runtime behavior, read [PLAN.md](PLAN.md) and pick from [TASKS.md](TASKS.md).

Common areas:

- Dashboard: `apps/clinician-dashboard/`
- MCP server: `services/clinical-mcp/`
- Clinical simulation harness: `services/sim-harness/` (scaffold only; canonical spec in `docs/foundations/sim-harness-scaffold.md`)
- Medplum infrastructure: `infrastructure/`
- Clinical resources: `clinical-resources/`

## Disclaimer

Noah RN is a clinical knowledge and workflow tool, not medical advice. Verify all outputs against the current patient state, provider orders, and applicable facility policy before acting.
