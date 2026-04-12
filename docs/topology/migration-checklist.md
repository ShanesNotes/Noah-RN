# Noah RN Topology Migration Checklist

Use this checklist for execution batches. Do not skip forward to bulk moves.

## Phase 0 — Map First

- [ ] capture `git status --short` baseline and exclude unrelated pre-existing changes from the batch
- [ ] `docs/topology/repo-topology-target.md` exists and matches the approved PRD
- [ ] `docs/topology/root-classification.md` classifies every current root item
- [ ] `docs/topology/workspace-orchestration.md` documents root npm workspaces before moving runnable packages
- [ ] root `package.json` defines npm workspaces for `apps/*`, `services/*`, and `packages/*`
- [ ] `PLAN.md` and `TASKS.md` reference the approved topology program
- [ ] `.gitignore` policy for `local/` and generated artifacts is decided before creating new local paths

## Phase 1 — Root Categories

- [ ] create target root categories when execution begins:
  - [ ] `apps/`
  - [ ] `services/`
  - [ ] `packages/`
  - [ ] `evals/`
  - [ ] `local/`
- [ ] keep `clinical-resources/`, `infrastructure/`, `tests/`, `tools/`, and `docs/` root-level
- [ ] keep `.omx/`, `.omc/`, `.obsidian/`, and `graphify-out*` as explicit exceptions until their tooling is addressed

## Phase 2 — Runnable Surfaces

- [x] migrate `dashboard/` → `apps/clinician-dashboard/`
- [x] update dashboard build/test/docs references
- [x] migrate `mcp-server/` → `services/clinical-mcp/`
- [x] update MCP service build/test/docs references

## Phase 3 — Plugin Decomposition

- [x] migrate `plugin/skills/` → `packages/workflows/`
- [x] migrate `plugin/agents/` → `packages/agent-harness/`
- [x] classify `plugin/hooks/` into `tools/safety-hooks/`
- [x] archive pure Claude-plugin runtime artifacts
- [x] demote remaining `plugin/` contents to ignored local-only leftovers / archive targets

## Phase 4 — Meta-Harness

- [x] migrate `optimization/` → `evals/`
- [x] document `tests/` vs `evals/` boundary

## Phase 5 — Local Grounding Boundary

- [x] document target homes for:
  - [x] `wiki/`
  - [x] `research/`
  - [x] `notes/`
  - [x] `docs/local/`
- [ ] move only when link/path audits say it is safe
- [x] keep Graphify outputs local-only throughout

## Verification Commands

### Root inventory

```bash
git status --short
find . -maxdepth 1 -mindepth 1 | sort
```

### Stale path audit

```bash
rg -n "dashboard/|mcp-server/|plugin/|optimization/|docs/local/|research/|wiki/" README.md PLAN.md TASKS.md docs tests tools -g '*.md' -g '*.ts' -g '*.tsx'
```

### Ignore boundary audit

```bash
git check-ignore -v local/** wiki/** research/** notes/** graphify-out*/** .obsidian/** .omx/** .omc/**
```

### Workflow continuity spot check

```bash
rg -n "shift-report|get_patient_context|SkillPanel|clinical-router" apps services packages tests docs -g '*.{md,ts,tsx}'
```

## Done Criteria

- [ ] control plane reflects the new topology
- [ ] root is classifiable at a glance
- [ ] runnable surfaces still build/test
- [ ] workflow contracts and test paths remain discoverable
- [ ] local/private/generated surfaces remain non-deliverable
