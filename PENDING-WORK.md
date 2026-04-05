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
| 5: Optimization Standard | Done | NOA-145/146 done. D3 complete (optimize-skill in CLAUDE.md + ARCHITECTURE.md harness tables) |
| 6: 10-Workstream Execution | 2/10 | WS-1 (skill optimization) and WS-3 (Medplum) done. 8 in backlog |

---

## Immediate Actions (no blockers)

1. ~~**Git hygiene** — organize 7 uncommitted workstreams into topic commits, push, PR~~ (done 2026-04-04)
2. ~~**NOA-144 D3** — add optimize-skill to CLAUDE.md harness table~~ (done 2026-04-05)
3. **Close stale Paperclip issues** — NOA-42, NOA-74, NOA-81, NOA-111, NOA-115, NOA-126 (requires Paperclip API)
4. ~~**Stale artifact cleanup** — archive `docs/superpowers/`, `docs/noah-rn-phase2-prd.md`, remove `knowledge/drug-data/.gitkeep`~~ (done 2026-04-05)
5. ~~**Product identity correction** — README + ARCHITECTURE.md reframed: agent-native workspace harness, not calculator suite~~ (done 2026-04-05)

## Dependency Chain (updated 2026-04-05)

The identity correction surfaced a critical dependency chain that reorders the backlog:

```
Medplum Data Enrichment → Context Architecture → Eval Harness → Everything else
         ↑                       ↑                     ↑
   Shane researching       Needs real clinical     Can't eval without
   data sources            encounter data           real patient context
```

**Why this order:**
- **Eval harness (NOA-135)** is deferred — needs functional Medplum with realistic data to test against. Without encounter-scoped patient context, there's nothing meaningful to evaluate.
- **Context architecture (NOA-138)** is promoted to critical — directly aligned with new Design Principle #1 ("context architecture first"), but requires clinical encounter data that Synthea doesn't fully provide.
- **Data enrichment** is the new blocker — Synthea gives us FHIR resources (Observations, MedicationRequests, Conditions) but NOT the artifacts a bedside nurse contextualizes from:
  - Physician H&P notes (DocumentReference with clinical narrative)
  - Progress notes across encounter
  - Time-series lab results with trends
  - Vitals trends (not just snapshots — trajectories across shifts)
  - Actual MAR (MedicationAdministration records, not just MedicationRequest)
  - Encounter-scoped medication history

**Data source research (resolved — see `research/Medplum-data-enrichment.txt`):**
- **MIMIC-IV on FHIR v2.1** (primary) — PhysioNet now ships native FHIR R4 NDJSON bundles. 24 profiles + 6 ED. Encounter-scoped: vitals, labs, MAR (MedicationAdministration), charted events, micro, outputs. Demo subset (100 patients, open access): https://physionet.org/content/mimic-iv-fhir-demo/2.1.0/
- **MIMIC-IV-Note** (paired) — de-identified H&Ps, progress notes, discharge summaries. Map 1:1 to DocumentReference with encounter references. Trivial in Medplum.
- **ResusMonitor** (real-time layer) — browser-based ICU monitor sim. Script vital-signs Observations into Medplum via Bot for live streaming data. Closes the loop: historical data + live vitals.
- eICU-CRD, HiRID, AmsterdamUMCdb — deferred (tabular, no FHIR, limited narratives)
- Synthea — demoted to smoke tests only

**Loading pipeline:** Medplum batch import of NDJSON + Bot for note→DocumentReference mapping. Code skeletons in the research doc. `infrastructure/load-mimic.sh` exists but predates Medplum — needs rewrite for Medplum SDK ingest.

**Research distillation insights that inform this work** (from `docs/noah-rn-research-distillation.md`):
- Pattern #4: "Retrieval quality > model scale" — the `knowledge/` dir + FHIR data are the primary levers, not model choice
- Pattern #5: "Design interfaces for the next tier, implement for the current one" — context assembly interface should abstract retrieval, implement as context stuffing for now
- Pattern #17: "Break the copy-forward cycle" — need fresh clinical context, not templates
- Report 2: Adaptive chunking by document type — discharge summaries at SOAP boundaries, progress notes preserving abbreviation context, labs per-panel
- Report 2: Context budgeting is a NOW concern — when nurse invokes skill with 80K tokens of history, eviction should be intentional
- Report 1: MCP FHIR servers already exist (WSO2, health-record-mcp, langcare-mcp-fhir) — integration accelerators
- Report 1: Memory tiers — working context (current encounter) → episodic (shift history) → institutional (protocols). Only working context needed now.

## Active Backlog — Phase 6 Workstreams

Re-prioritized based on dependency chain analysis.

| WS | Issue | Title | Priority | Description |
|----|-------|-------|----------|-------------|
| NEW | — | Medplum Data Enrichment | **blocker** | Load realistic clinical encounter data (MIMIC-IV or equivalent) into Medplum. Shane researching data sources. Blocks context architecture and eval. |
| NEW | — | Medplum Wiring (WS-C/WS-D) | **critical** | Retarget MCP server from HAPI :8080 → Medplum :8103 with auth. Swap dashboard from direct FHIR client → @medplum/core SDK. |
| 5 | NOA-138 | Context Architecture Enhancement | **critical** (promoted) | Patient context assembly from FHIR data — what a nurse contextualizes on first encounter. Pointer-based knowledge access, context budget strategy. Directly implements Design Principle #1. |
| 2 | NOA-135 | Dynamic Eval Harness — Phase B Unblock | **deferred** | Needs functional Medplum + context architecture to have something meaningful to evaluate against. |
| 6 | NOA-137 | Cross-Skill Intelligence Expansion | high | Only 3 cross-skill test cases. Where Noah becomes more than a lookup tool. |
| 4 | NOA-136 | Research Pipeline Improvement | high | Fix research pipeline quality (graded C+). Shallow extraction, missing videos. |
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

| Artifact | Status |
|----------|--------|
| ~~`docs/superpowers/`~~ | Removed (2026-04-05) |
| ~~`docs/noah-rn-phase2-prd.md`~~ | Archived to `docs/archive/` (2026-04-05) |
| ~~`docs/research/offline-first-architecture.md`~~ | Archived to `docs/archive/` (2026-04-05) |
| `optimization/OPTIMIZATION-LOG.md` | Empty placeholder — keep, mark stale |
| ~~`knowledge/drug-data/.gitkeep`~~ | Removed (2026-04-05) |
| `docs/safety-compliance-report.md` | Keep for compliance ref, week-based phases outdated |
| `docs/competitive-analysis.md` | Review for currency |

## Git Stashes (3)
- `stash@{0}`: outcome-spec-refactor — stash before comms-loop-test
- `stash@{1}`: golden-test-suite — direction-cleanup north-star updates
- `stash@{2}`: WIP news2-ews-skill

## Unmerged Branches
`claude/comms-loop-test`, `claude/noa-121-prompt-scaffolding-audit`, `dev/direction-cleanup`, `jimmy/outcome-spec-refactor`, `wiz/candidate-2-shift-report`, `wiz/eval-harness-mode-flag` + worktree branches
