# Noah RN — Consolidated Work State

Generated: 2026-04-04
Branch: `claude/noa-131-safety-language-reframe`

---

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0: Scaffold | Done | |
| 1: Core Skills | Done | 4 skills, minor deferred (facility PDF, unit-specific sheets) |
| 2: Tools + Intelligence | Done | 9 calculators, hooks, router, provenance, metadata |
| 3: Polish + Portfolio | Done | Docs, demo, README, NEWS2, SSC 2026 |
| 4: Medplum Foundation | Done | NOA-134 — Medplum on tower, Synthea data loaded |
| 5: Optimization Standard | 95% | NOA-145/146 done. D3 (add optimize-skill to CLAUDE.md harness table) remaining |
| 6: 10-Workstream Execution | 2/10 | WS-1 (skill optimization) and WS-3 (Medplum) done. 8 in backlog |

---

## Immediate Actions (no blockers)

1. **Git hygiene** — organize 7 uncommitted workstreams into topic commits, push, PR
2. **NOA-144 D3** — add optimize-skill to CLAUDE.md harness table (5 min)
3. **Close stale Paperclip issues** — NOA-42, NOA-74, NOA-81, NOA-111, NOA-115, NOA-126
4. **Stale artifact cleanup** — archive `docs/superpowers/`, `docs/noah-rn-phase2-prd.md`, remove `knowledge/drug-data/.gitkeep`

## Active Backlog — Phase 6 Workstreams

Priority-ordered. These are the real work ahead.

| WS | Issue | Title | Priority | Description |
|----|-------|-------|----------|-------------|
| 2 | NOA-135 | Dynamic Eval Harness — Phase B Unblock | critical | Eval harness currently 100% on structural grep. Needs real model invocation. Without this, self-improvement loop is fake. |
| 6 | NOA-137 | Cross-Skill Intelligence Expansion | high | Only 3 cross-skill test cases. Where Noah becomes more than a lookup tool. |
| 4 | NOA-136 | Research Pipeline Improvement | high | Fix research pipeline quality (graded C+). Shallow extraction, missing videos. |
| 5 | NOA-138 | Context Architecture Enhancement | medium | Pointer-based knowledge access, context budget strategy. Prevents context pollution as skills grow. |
| 7 | NOA-139 | Knowledge Architecture Enhancement | medium | Multi-source drug data, guideline conflict handling, freshness automation. |
| 8 | NOA-140 | Workflow State Persistence | medium | Checkpoint system for multi-step protocols. Nurses get interrupted. |
| 10 | NOA-142 | Deterministic Tool Expansion | medium | Expand deterministic computation. Compute > generate. |
| 9 | NOA-141 | A2A Readiness Audit | low | Machine-readable capability descriptions for agent interop. |

## Open Issues Requiring Decision

| Issue | What's needed |
|-------|---------------|
| NOA-130 | Research review — Shane asked for fresh-eyes eval of Gemini's YouTube research + safety language bias. Unstarted. |
| NOA-104 | Massive org refactor — decide if superseded by organic evolution or still needed |
| NOA-106 | Board approval: hire Head of Delivery (Codex). Blocks outcome-spec Phase 2. |
| NOA-107 | Board approval: upgrade Scout model to Sonnet. Blocks QA reliability. |

---

## Uncommitted Git Work (7 workstreams)

### WS-A: Repo Cleanup (this session)
`.gitignore`, `.claude/CLAUDE.md`, `README.md`

### WS-B: Medplum Infrastructure (this session — NOA-134)
`infrastructure/docker-compose.yml`, `docker-compose.hapi-archive.yml`, `docs/ARCHITECTURE.md`, `docs/FHIR-INTEGRATION.md`

### WS-C: Phase 2 Dashboard (prior sessions)
Dashboard components migrated from Medplum SDK to direct FHIR fetch. New components: ContextInspector, SkillPanel, OrderSetsPanel, ErrorBoundary. FHIR client + types.
**Note:** Removed Medplum SDK but we're pivoting back to Medplum. Direct FHIR client will be replaced with @medplum/core.

### WS-D: MCP Server (prior sessions)
Entire `mcp-server/` — context assembly, 6 MCP tools, pharmacokinetic sim, 3 ICU scenarios, tests.
**Note:** Targets HAPI at :8080. Needs retargeting to Medplum at :8103 with auth.

### WS-E: Clinical Router (prior sessions)
Added MCP tool access to `plugin/agents/clinical-router.md`

### WS-F: Eval Traces (prior sessions)
80+ scenario trace directories in `optimization/product/traces/`

### WS-G: Research Artifacts (prior sessions)
`research/medplum-deep-dive.md`, YouTube research outputs, YouTube polling tool

---

## Stale Artifacts

| Artifact | Recommendation |
|----------|---------------|
| `docs/superpowers/` | Archive — planning docs completed their purpose |
| `docs/noah-rn-phase2-prd.md` | Archive — Phase 2 done |
| `docs/research/offline-first-architecture.md` | Archive — unreferenced |
| `optimization/OPTIMIZATION-LOG.md` | Empty placeholder — keep, mark stale |
| `knowledge/drug-data/.gitkeep` | Remove — drug data via OpenFDA |
| `docs/safety-compliance-report.md` | Keep for compliance ref, week-based phases outdated |
| `docs/competitive-analysis.md` | Review for currency |

## Git Stashes (3)
- `stash@{0}`: outcome-spec-refactor — stash before comms-loop-test
- `stash@{1}`: golden-test-suite — direction-cleanup north-star updates
- `stash@{2}`: WIP news2-ews-skill

## Unmerged Branches
`claude/comms-loop-test`, `claude/noa-121-prompt-scaffolding-audit`, `dev/direction-cleanup`, `jimmy/outcome-spec-refactor`, `wiz/candidate-2-shift-report`, `wiz/eval-harness-mode-flag` + worktree branches
