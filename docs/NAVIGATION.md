# Noah RN Navigation Guide

This is the fastest repo-wide map for coding agents and humans who need to find the right starting surface.

It is a navigation layer, not a second control plane.

## Canonical order

When multiple docs seem relevant, use this order:

1. `../README.md`
2. `../PLAN.md`
3. `../TASKS.md`
4. this file
5. the specific surface README and the smallest relevant foundation/plan doc

## Fast entrypoints by question

| Question | Start here | Why |
|---|---|---|
| What is Noah RN and what matters right now? | `../README.md` | quickest orientation and repo map |
| What is the actual direction of the project? | `../PLAN.md` | canonical architecture and decisions |
| What should be worked on next? | `../TASKS.md` | ordered execution queue |
| Where should a new file or subproject live? | `topology/subproject-workspace-map.md` | canonical placement map |
| Where should a new doc live? | `README.md` | docs classification and placement rules |
| Which docs are active vs historical? | `README.md` | maps active roots, plans, analysis, archive |
| Which hidden docs are safe to ignore? | `analysis/hidden-docs-reconciliation-note-2026-04-14.md` | current reconciliation guidance |
| What are the high-level runtime boundaries? | `ARCHITECTURE.md` | short boundary map |
| What is the active patient/workflow forcing path? | `../TASKS.md` item 3 | current implementation focus |
| What is the current clinician workspace planning entrypoint? | `analysis/ehr-ui-ux-start-here.md` | active UI planning handoff |
| What is the canonical simulation authority? | `foundations/invariant-kernel-simulation-architecture.md` | kernel authority |
| Which sim contracts are binding? | `foundations/foundational-contracts-simulation-architecture.md` | contract authority |

## Read before editing by surface

### Root control plane

Read in this order:
- `../README.md`
- `../PLAN.md`
- `../TASKS.md`
- `../AGENTS.md`

Use for:
- any substantial repo work
- reconciling conflicting docs
- deciding whether a change is active, planned, or historical

### `apps/`

Use when changing runnable user-facing applications.

Read in this order:
- `../apps/README.md`
- the app-local README:
  - `../apps/nursing-station/README.md`
  - `../apps/clinician-dashboard/README.md`
- if the work changes product boundaries: `ARCHITECTURE.md`
- if the work changes clinician-workspace sequencing: `analysis/ehr-ui-ux-start-here.md`

Rules to remember:
- `apps/nursing-station/` is the main clinician-facing surface
- `apps/clinician-dashboard/` is runtime-console sidecar scope only

### `services/`

Use when changing runnable services and process boundaries.

Read in this order:
- `../services/README.md`
- service-local README:
  - `../services/clinical-mcp/README.md`
  - `../services/sim-harness/README.md`
- then the relevant contract doc:
  - `foundations/shift-report-canonical-patient-path.md`
  - `foundations/invariant-kernel-simulation-architecture.md`
  - `foundations/foundational-contracts-simulation-architecture.md`

Rules to remember:
- `services/clinical-mcp/` is the only agent-facing clinical boundary
- `services/sim-harness/` is the live-runtime boundary, not a direct agent surface

### `packages/`

Use when changing harness internals or workflow contracts.

Read in this order:
- `../packages/README.md`
- `../packages/agent-harness/README.md` for routing/harness work
- `../packages/workflows/README.md` for workflow contract work
- workflow-local `SKILL.md` when changing a specific workflow

Rules to remember:
- `packages/agent-harness/` is authoritative for harness/routing
- `packages/workflows/` is authoritative for workflow contracts
- `.noah-pi-runtime/` is a bridge surface, not the source of product truth

### `clinical-resources/`

Read in this order:
- `../clinical-resources/README.md`
- `foundations/clinical-resources-runtime-access-contract.md`
- `foundations/metadata-registry-spec.md`

Use for curated runtime-facing clinical content only.

### `infrastructure/`

Read in this order:
- `../infrastructure/README.md`
- `ARCHITECTURE.md`
- the relevant Medplum or Pi runtime doc in `foundations/`

Use for platform bring-up and operator-path changes, not for redefining runtime boundaries silently.

### `memory/`

Read in this order:
- `../memory/README.md`
- `foundations/memory-tier-boundary.md`
- `foundations/memory-layer-scaffold.md`

### `tests/` and `evals/`

Read:
- `../tests/README.md` or `../evals/README.md`
- then the local README inside the target subfolder

Use `tests/` for executable verification and `evals/` for harness-quality/observability artifacts.

## Which docs are authoritative by class?

| Class | Authoritative location |
|---|---|
| project orientation | `../README.md` |
| project direction / architecture decisions | `../PLAN.md` |
| current execution queue | `../TASKS.md` |
| workspace placement / topology | `topology/` |
| architecture boundaries / contracts | `foundations/` and `ARCHITECTURE.md` |
| implementation-ready execution plans | `plans/` |
| repo analysis / reconciliation work | `analysis/` |
| stable reference material | root docs and `reference/` |
| historical material | `archive/` |
| local-only docs | `local/` |

## Hidden surfaces: how to treat them

These often look important, but they are not authoritative by default:

- `../notes/`
- `../research/`
- `../wiki/`
- `../.hermes/`
- `../.omx/`
- `../.omc/`
- `../.agents/`

Use them to mine ideas, context, or history.
Do **not** treat them as active instructions unless a tracked doc explicitly promotes them.

## Practical workflow

Before changing code:
1. read the relevant root/control doc
2. read the local surface README
3. read the smallest contract/plan doc that governs the change
4. only then edit

If you are unsure where to start, default to:
- `../README.md`
- `../PLAN.md`
- `../TASKS.md`
- this file
