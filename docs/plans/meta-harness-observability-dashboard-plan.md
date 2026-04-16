# Meta-Harness Observability, Self-Optimization & Dashboard — Implementation Plan

**Date:** 2026-04-15
**Status:** Approved for execution
**Author:** Shane + Claude (architecture/research)

## Context

Noah-RN's meta-harness architecture is designed to continuously self-improve by optimizing everything *around* the model (prompts, routing, hooks, output format) rather than the model itself. Based on Lee et al.'s Meta-Harness (Stanford, 2026) filesystem-as-context pattern and Karpathy's autoresearch operational loop.

**Current state:** Phase A infrastructure exists (filesystem layout, proposer prompt, clinical constraints, eval harness skeleton, 60+ golden YAML test cases). Some traces exist from shift-report runs (Apr 12). But the system is fragmented: traces live in `evals/product/traces/`, the eval harness does structural-only validation (grep, not LLM invocation), the clinician-dashboard has placeholder panels that fetch static files, and there's no optimization loop wired end-to-end.

**Goal:** Formalize a production-grade observability + self-optimization scaffolding, and build a dashboard that makes the meta-harness legible, useful, and actionable for the Board Operator (Shane).

**Audience:** This plan is written for an implementation agent to execute. Each phase has clear file targets, dependencies, and verification steps.

---

## Phase 1: Observability Telemetry Schema & Trace Pipeline

**Why:** The optimizer can only get as good as the signal it receives. Current traces capture basic I/O but lack token accounting, routing decisions, context assembly provenance, and safety gate outcomes. The wiki's `observability-from-day-one` concept mandates 6 category tags from inception.

### 1A. Define Unified Telemetry Schema

**Create:** `packages/agent-harness/src/telemetry-schema.ts`

Define TypeScript interfaces for the canonical trace envelope that all harness components emit:

```typescript
interface TraceEnvelope {
  trace_id: string;           // from trace.sh init
  skill: string;
  candidate_id?: string;      // which harness variant produced this
  timestamp: string;          // ISO 8601
  
  // 6 category tags (wiki: observability-from-day-one)
  tags: {
    phi_risk: 'none' | 'de-identified' | 'limited';
    token_spend: TokenSpend;
    latency: LatencyBreakdown;
    clinical_safety: SafetyOutcome;
    user_action: string | null;       // what the nurse did
    downstream_system: string | null; // e.g., 'medplum', 'pulse'
  };
  
  context_assembly: ContextAssemblyTrace;
  routing_decision: RoutingDecisionTrace;
  safety_gates: SafetyGateTrace[];
  eval_scores?: EvalScoreTrace;       // populated by eval harness
}

interface TokenSpend {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  context_ratio: number;      // must stay <= 0.40 per wiki constraint
  categories: Record<string, number>; // fhir_resource, rag_chunk, system_prompt, etc.
}

interface LatencyBreakdown {
  total_ms: number;
  stages: Record<string, number>; // context_assembly, routing, skill_execution, rendering
}

interface ContextAssemblyTrace {
  patient_bundle_tokens: number;
  knowledge_assets_selected: string[];
  compression_strategy: string;
  gap_markers: string[];            // DataAbsentReason codes
  fhir_queries_fired: number;
}

interface RoutingDecisionTrace {
  input_classification: string;     // simple | moderate | complex
  candidates_considered: string[];
  selected_workflow: string;
  confidence: number;
  rationale: string;
}

interface SafetyGateTrace {
  gate_name: string;
  result: 'pass' | 'fail' | 'warn';
  detail: string;
}

interface EvalScoreTrace {
  golden_case_id?: string;
  clinical_correctness: number;
  completeness: number;
  safety_veto: boolean;
  confidence_calibration: number;
  format_compliance: number;
  provenance_accuracy: number;
  omission_detection: number;
  weighted_score: number;
}
```

### 1B. Upgrade trace.sh to Emit Full Envelope

**Modify:** `tools/trace/trace.sh`

Add new subcommands to the existing trace lifecycle:
- `trace.sh tokens <case-id> <json>` — record token spend breakdown
- `trace.sh routing <case-id> <json>` — record routing decision trace
- `trace.sh context <case-id> <json>` — record context assembly provenance
- `trace.sh safety <case-id> <json>` — record safety gate outcome
- `trace.sh envelope <case-id>` — assemble all artifacts into a single `trace-envelope.json`

The `envelope` command reads all per-stage JSON files from `traces/{case-id}/` and merges them into the canonical schema. This is what the dashboard and optimizer consume.

### 1C. Wire Trace Emission into Harness Invocation

**Modify:** `packages/agent-harness/invoke-workflow.mjs`

Currently calls `trace.sh init` and `trace.sh input`. Add calls to:
1. `trace.sh routing` after `select-workflows.mjs` runs
2. `trace.sh context` after patient context assembly
3. `trace.sh safety` after each safety gate check
4. `trace.sh tokens` after skill execution (parse model response headers or estimate)
5. `trace.sh envelope` at end of invocation

### 1D. Build Trace Index Generator

**Create:** `scripts/build-trace-index.sh`

Scans `evals/product/traces/*/trace-envelope.json` and produces `evals/product/traces/index.json` — the manifest the dashboard consumes. Include summary stats (total traces, per-skill counts, date range, avg latency, avg token spend).

**Verification:**
- Run `npm run invoke --workspace packages/agent-harness` with a test case
- Verify `trace-envelope.json` appears in the trace directory with all fields populated
- Run `scripts/build-trace-index.sh` and verify `index.json` is well-formed

---

## Phase 2: Eval Harness Dynamic Mode

**Why:** Current eval harness (`evals/product/eval-harness.sh`) only does structural validation (grep for keywords in skill files). Phase B of the optimization loop requires dynamic evaluation: invoke skills against golden cases, score actual output against rubrics. This is THE blocker.

### 2A. Model Invocation Wrapper

**Create:** `tools/model-invoke.sh`

Shell wrapper that sends a prompt + context to a model and returns output. Must be model-agnostic:
- Accepts: `--provider openrouter|anthropic|local` `--model <id>` `--prompt <file>` `--context <file>`
- Returns: raw output to stdout, token counts to stderr as JSON
- Default provider: `openrouter` with `OPENROUTER_API_KEY` env var
- Fallback: `anthropic` with `ANTHROPIC_API_KEY`
- Supports `--dry-run` that echoes the prompt without calling API (for testing harness wiring)

### 2B. Upgrade eval-harness.sh Dynamic Path

**Modify:** `evals/product/eval-harness.sh`

The `--mode dynamic` path currently skips with `DYNAMIC_SKIP`. Replace with:

1. For each golden case YAML:
   - Extract `user_query` and `clinical_context`
   - Assemble context via `packages/agent-harness/invoke-workflow.mjs --trace`
   - Invoke model via `tools/model-invoke.sh`
   - Capture output to `traces/{case-id}/skill-output.txt`
   - Score against `must_contain` / `must_not_contain` (existing)
   - Score against `scoring_rubric` (new): critical_items (3pts each), important_items (2pts), nice_to_have (1pt)
   - Check `safety_veto` flag — any miss on a veto-tagged case = FAIL regardless of score
   - Write `eval-scores.json` per case
   - Write `trace-envelope.json` per case

2. Aggregate across all cases into `results/scores-{timestamp}.json` with the existing schema PLUS new fields:
   - `weighted_score`: composite across 7-metric rubric
   - `veto_triggered`: boolean
   - `calibration_error`: ECE across all cases
   - `per_case_scores`: array of individual case results (for drill-down in dashboard)

### 2C. Safety Veto Gate

**Modify:** `evals/product/eval-harness.sh`

Implement the absolute veto logic from `clinical-constraints.yaml`:
- Before computing aggregate scores, check all `safety_veto: true` cases
- If ANY veto case fails `must_contain` on critical_items → entire candidate FAILS
- Write `veto_details` to scores JSON: which case, which item was missing

### 2D. Expand Golden Test Suite Schema

**Modify:** Existing YAML cases in `tests/clinical/cases/` to include v2 fields where missing:
- `user_query` — natural language nurse query
- `scoring_rubric` with `critical_items` / `important_items` / `nice_to_have`
- `expected_confidence_tier` (1/2/3)
- `safety_veto: true|false` explicit flag
- `expected_routing.primary_skill` and `secondary_skills`

Start with the 22 critical-severity cases. Don't expand count yet — just upgrade schema on existing cases.

**Verification:**
- `eval-harness.sh --mode dynamic --dry-run` processes all cases without API calls
- `eval-harness.sh --mode dynamic --case acls-001` runs one case end-to-end
- Scores JSON includes `weighted_score`, `per_case_scores`, `veto_triggered`

---

## Phase 3: Self-Optimization Loop Scaffolding

**Why:** The optimization loop (propose → eval → validate → review) is the meta-harness's core value. Phase A built the filesystem and proposer prompt. This phase wires them into an executable pipeline.

### 3A. Optimization Filesystem

**Create directory structure** (some may exist as `.gitkeep`):
```
optimization/
├── product/
│   ├── candidates/
│   │   └── baseline/              # current harness state as candidate-0
│   │       ├── skills/            # symlinks to packages/agent-harness/
│   │       ├── scores.json        # from eval harness
│   │       └── RATIONALE.md       # "initial state"
│   ├── traces/                    # symlink to evals/product/traces/
│   ├── analysis/
│   │   ├── failure-modes.md       # auto-generated from eval results
│   │   ├── regression-matrix.json # candidate x case pass/fail grid
│   │   └── improvement-map.json   # which candidates improved which cases
│   ├── proposer-prompt.md         # EXISTS — upgrade per v2 recommendations
│   ├── clinical-constraints.yaml  # EXISTS
│   └── eval-harness.sh            # symlink to evals/product/eval-harness.sh
└── OPTIMIZATION-LOG.md            # iteration history for dashboard
```

### 3B. Optimization Runner

**Create:** `scripts/optimization-cycle.sh`

Orchestrates one full optimization cycle:

```
1. Snapshot current harness as candidate-N (copy modified skill files)
2. Run eval harness in dynamic mode against golden suite
3. Write scores to candidate-N/scores.json  
4. Generate failure-modes.md from eval results
5. Update regression-matrix.json (candidate x case grid)
6. Output: candidate ID, scores summary, top 3 failure modes
```

This script does NOT invoke the proposer (that requires LLM). It handles the deterministic eval-and-record loop. The proposer runs separately (manually or via scheduled agent).

### 3C. Failure Mode Analyzer

**Create:** `scripts/analyze-failures.sh`

Reads eval scores across all candidates and produces:
- `failure-modes.md`: ranked list of failing cases with trace links
- `regression-matrix.json`: NxM grid (N candidates x M cases) with pass/fail/score
- `improvement-map.json`: which candidate first solved each previously-failing case

This is what the proposer agent reads to diagnose failures.

### 3D. Proposer Prompt v2 Upgrades

**Modify:** `optimization/product/proposer-prompt.md`

Add the sections identified in the research report:
- Convergence criteria (stop after 3 consecutive all-pass iterations, or no >1% improvement)
- Change budget (max 3 files, max 50 lines per file)
- Conflicting failure mode resolution (safety > completeness > correctness)
- Regression test requirements (veto subset + top-10 cases from best candidate)
- Model-specific instructions for free-tier proposers

### 3E. Candidate Diff Tool

**Create:** `scripts/diff-candidates.sh`

Takes two candidate IDs, produces:
- File-level diff of skill prompts, hooks, routing rules
- Score comparison (side-by-side metrics)
- Cases that changed outcome (pass->fail, fail->pass)

Used by dashboard for candidate comparison view.

**Verification:**
- `scripts/optimization-cycle.sh --dry-run` creates baseline candidate with score snapshot
- `scripts/analyze-failures.sh` produces valid failure-modes.md from existing eval data
- `scripts/diff-candidates.sh baseline baseline` runs without error (identity diff)

---

## Phase 4: Dashboard UI/UX Redesign

**Why:** The current clinician-dashboard has 5 tabs (Evals, Traces, Context, Skills, Terminal) with basic static-file fetching. The meta-harness dashboard needs to make the optimization loop legible: see how the harness is performing, where it's failing, how candidates compare, and what the optimizer is doing. This is Shane's primary operational interface.

### Design Principles (from wiki + research)
- **Dashboard Context Manager pattern**: role-based dynamic rendering (from OpenEMR/Epic research)
- **Monitor-as-primary-signal-surface**: the dashboard is load-bearing, not cosmetic
- **Observability-from-day-one**: 6 category tags visible in every view
- **Dark theme, Mantine v7, Recharts** (existing stack — don't change)

### 4A. New Tab Architecture

Replace current 5-tab layout with 6 tabs organized by operational concern:

```
[overview] [traces] [golden suite] [candidates] [optimization] [context]
```

| Tab | Purpose | Data Source |
|-----|---------|-------------|
| **Overview** | System health at a glance — latest scores, safety status, token burn rate, active candidate | Latest `scores-*.json` + trace index + `OPTIMIZATION-LOG.md` |
| **Traces** | Drill into individual invocations — full trace envelope viewer | `traces/*/trace-envelope.json` |
| **Golden Suite** | Test case inventory, coverage heatmap, per-case results across candidates | `tests/clinical/cases/*.yaml` + `regression-matrix.json` |
| **Candidates** | Compare harness variants side-by-side — score diffs, case outcome changes | `optimization/product/candidates/*/scores.json` + diff output |
| **Optimization** | The loop itself — iteration history, proposer acceptance rate, convergence trends | `OPTIMIZATION-LOG.md` + per-iteration metadata |
| **Context** | Existing context inspector (FHIR patient data assembly) — keep as-is | Medplum FHIR API |

### 4B. Overview Tab (New)

**Replace:** `apps/clinician-dashboard/src/components/EvalDashboard.tsx`
**Create:** `apps/clinician-dashboard/src/components/OverviewPanel.tsx`

Layout (top-to-bottom):

```
+-------------------------------------------------------------+
| HEALTH BANNER                                                |
| [PASS *] 98.2% pass rate | 0 safety vetoes | 22/22 critical |
| Latest eval: 2026-04-12 12:08 | Candidate: baseline         |
+-------------------------------------------------------------+

+------------------+ +------------------+ +------------------+
| PASS RATE TREND  | | TOKEN BURN       | | LATENCY DIST     |
| AreaChart        | | BarChart stacked | | Histogram        |
| (last 20 runs)   | | (by category)    | | (p50/p95/p99)    |
+------------------+ +------------------+ +------------------+

+------------------------------+ +----------------------------+
| SAFETY VETO STATUS           | | CATEGORY BREAKDOWN         |
| 22 critical cases: all pass  | | Stacked bar per skill      |
| Last veto trigger: never     | | (pass/fail/skip)           |
| * acls * sepsis * rsi ...    | |                            |
+------------------------------+ +----------------------------+

+-------------------------------------------------------------+
| RECENT TRACES (last 10)                                      |
| ID | Skill | Duration | Tokens | Safety | Score              |
| clickable -> navigates to Traces tab                         |
+-------------------------------------------------------------+
```

**Key metrics cards:**
- Pass rate (with trend arrow)
- Safety veto status (green/red indicator)
- Total token spend (last 24h / 7d)
- Context ratio (must stay <= 0.40, warn if approaching)
- Avg latency (p50)
- Active candidate ID

### 4C. Traces Tab (Upgrade)

**Modify:** `apps/clinician-dashboard/src/components/TraceViewer.tsx`

Current: basic list + detail pane fetching individual files.
Upgrade to consume `trace-envelope.json`:

**Left panel (trace list):**
- Filterable by: skill, date range, safety outcome, score range
- Sortable by: timestamp, duration, token spend, score
- Color-coded rows: green (pass), red (fail), yellow (safety warning)
- Sparkline for token spend per trace

**Right panel (trace detail):**
- **Waterfall timeline**: visual breakdown of stages (context assembly -> routing -> skill execution -> rendering) with ms per stage
- **Context assembly card**: patient bundle size, knowledge assets selected, gap markers, FHIR queries fired
- **Routing decision card**: classification, candidates considered, selected workflow, confidence
- **Safety gates card**: per-gate pass/fail with detail
- **Token breakdown**: pie chart of token categories (fhir_resource, rag_chunk, system_prompt, etc.)
- **Raw I/O toggle**: collapsible panels for input-context.json, skill-output.txt, hook-results.json

### 4D. Golden Suite Tab (New)

**Create:** `apps/clinician-dashboard/src/components/GoldenSuitePanel.tsx`

**Top section: Coverage Heatmap**
```
           acls  calc  assess  safety  format  edge  cross  regression
critical    8     4      3       5       -       -      -       2
high        -     5      4       4       3       3      2       1
medium      -     2      1       1       2       -      -       -
low         -     1      -       -       2       -      -       -
```
Cells colored by pass rate across latest eval. Click cell -> filter to those cases.

**Middle section: Case Table**
- All golden test cases with columns: ID, skill, severity, safety_veto, latest_result, score, confidence_tier
- Sortable, filterable
- Click row -> expand to show: clinical_context, user_query, scoring_rubric, latest output (from traces)

**Bottom section: Regression Timeline**
- Per-case pass/fail across candidate versions
- Visual: horizontal swim lanes per case, dots colored by outcome at each candidate
- Immediately shows which candidates caused regressions

**Data loading:**
- Parse YAML cases from `tests/clinical/cases/` (need a build script to pre-compile to JSON for the dashboard)
- Cross-reference with `regression-matrix.json` for historical outcomes

**Create:** `scripts/build-golden-suite-index.sh`
Compiles all YAML cases into a single `evals/product/golden-suite-index.json` for dashboard consumption.

### 4E. Candidates Tab (New)

**Create:** `apps/clinician-dashboard/src/components/CandidatesPanel.tsx`

**Comparison View:**
- Dropdown to select two candidates
- Side-by-side metric comparison (radar chart: 7 metrics)
- Case outcome diff table: cases that changed (pass->fail highlighted red, fail->pass highlighted green)
- File diff viewer: show prompt/hook changes between candidates (consume `diff-candidates.sh` output)

**History View:**
- Timeline of all candidates with weighted score trend line
- Each candidate as a card: ID, timestamp, weighted score, safety status, RATIONALE.md summary
- Filter by: accepted/rejected, score range

**Data loading:**
- Scan `optimization/product/candidates/*/scores.json`
- Need build script: `scripts/build-candidates-index.sh` -> `optimization/product/candidates-index.json`

### 4F. Optimization Tab (New)

**Create:** `apps/clinician-dashboard/src/components/OptimizationPanel.tsx`

**Loop Status:**
```
+-------------------------------------------------------------+
| OPTIMIZATION LOOP STATUS                                     |
| Phase: B (Calibration) | Last cycle: 2026-04-12 | Cadence: manual |
| Proposer model: qwen3-coder:free | Acceptance rate: --      |
| Iterations completed: 0 | Candidates proposed: 0            |
+-------------------------------------------------------------+
```

**Convergence Chart:**
- X axis: iteration number
- Y axis: weighted score (line) + safety veto count (bar, red)
- Horizontal line at convergence threshold

**Proposer Performance:**
- Table of proposer iterations: model used, proposal accepted/rejected, score delta, constraint violations
- Acceptance rate trend line

**Failure Mode View:**
- Rendered `failure-modes.md` with syntax highlighting
- Linked to golden suite cases and traces

**OPTIMIZATION-LOG.md Viewer:**
- Rendered markdown of the iteration history
- Each entry: date, candidate ID, proposer model, score delta, Shane's review decision

### 4G. Types & Data Layer

**Modify:** `apps/clinician-dashboard/src/types.ts`

Add interfaces for new data shapes:

```typescript
// Trace envelope (mirrors telemetry schema)
interface TraceEnvelopeUI { /* from Phase 1A */ }

// Golden suite
interface GoldenCase {
  test_id: string;
  skill: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  safety_veto: boolean;
  description: string;
  user_query: string;
  clinical_context: string;
  scoring_rubric: { critical_items: string[]; important_items: string[]; nice_to_have: string[] };
  latest_result?: 'pass' | 'fail' | 'skip';
  latest_score?: number;
}

// Candidates
interface CandidateRecord {
  id: string;
  timestamp: string;
  scores: EvalScores & { weighted_score: number; veto_triggered: boolean; per_case_scores: CaseScore[] };
  rationale_summary: string;
  status: 'proposed' | 'accepted' | 'rejected';
  proposer_model?: string;
  diff_summary?: string;
}

// Optimization loop
interface OptimizationState {
  phase: 'A' | 'B' | 'C' | 'D';
  last_cycle: string;
  cadence: string;
  proposer_model: string;
  acceptance_rate: number;
  iterations_completed: number;
  convergence_trend: { iteration: number; weighted_score: number; veto_count: number }[];
}
```

### 4H. Build Pipeline for Dashboard Data

**Create:** `scripts/build-dashboard-data.sh`

Single script that runs all index builders:
1. `scripts/build-trace-index.sh` -> `evals/product/traces/index.json`
2. `scripts/build-eval-index.sh` (exists) -> `evals/product/results/index.txt`  
3. `scripts/build-golden-suite-index.sh` -> `evals/product/golden-suite-index.json`
4. `scripts/build-candidates-index.sh` -> `optimization/product/candidates-index.json`
5. Copy/symlink all output to `apps/clinician-dashboard/public/` for Vite static serving

Dashboard fetches from these static JSON files. No API server needed (yet).

### 4I. Update App.tsx Tab Navigation

**Modify:** `apps/clinician-dashboard/src/App.tsx`

Replace current tab array:
```typescript
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'traces', label: 'TRACES' },
  { key: 'golden', label: 'GOLDEN SUITE' },
  { key: 'candidates', label: 'CANDIDATES' },
  { key: 'optimization', label: 'OPTIMIZATION' },
  { key: 'context', label: 'CONTEXT' },
];
```

Remove SkillPanel and TerminalPanel (skills are now visible via golden suite; terminal is a placeholder). Keep ContextInspector as-is.

**Verification:**
- `npm run dev --workspace apps/clinician-dashboard` starts without errors
- All 6 tabs render with at least placeholder content
- Overview tab shows health banner from latest scores
- Traces tab renders existing trace data with new envelope fields
- Golden suite tab renders the case inventory from compiled JSON
- Browser devtools shows no 404s for data fetches

---

## Phase 5: Integration & Polish

### 5A. npm Script Wiring

**Modify:** `package.json` (root) and `apps/clinician-dashboard/package.json`

Add workspace scripts:
- `build:dashboard-data` -> runs `scripts/build-dashboard-data.sh`
- `dev:dashboard` -> builds data then starts Vite dev server
- `eval:dynamic` -> runs `evals/product/eval-harness.sh --mode dynamic`
- `eval:static` -> runs `evals/product/eval-harness.sh --mode static`
- `optimize:cycle` -> runs `scripts/optimization-cycle.sh`
- `optimize:analyze` -> runs `scripts/analyze-failures.sh`

### 5B. Pre-dev Hook for Dashboard Data

Ensure `scripts/build-dashboard-data.sh` runs before `vite dev` so the dashboard always has fresh data. Add as `predev` script in `apps/clinician-dashboard/package.json`.

### 5C. Documentation

**Modify:** `docs/analysis/meta-harness-research-report.md`

Update Phase A.5 status: trace pipeline operational, telemetry schema defined, dashboard redesigned. Update Phase B status based on what's implemented.

---

## Critical Files Summary

### New Files
| File | Purpose |
|------|---------|
| `packages/agent-harness/src/telemetry-schema.ts` | Canonical trace envelope TypeScript interfaces |
| `tools/model-invoke.sh` | Model-agnostic LLM invocation wrapper |
| `scripts/optimization-cycle.sh` | One full eval-and-record cycle |
| `scripts/analyze-failures.sh` | Cross-candidate failure analysis |
| `scripts/diff-candidates.sh` | Candidate comparison tool |
| `scripts/build-trace-index.sh` | Trace index for dashboard |
| `scripts/build-golden-suite-index.sh` | Golden suite JSON compiler |
| `scripts/build-candidates-index.sh` | Candidate history index |
| `scripts/build-dashboard-data.sh` | Master dashboard data builder |
| `apps/clinician-dashboard/src/components/OverviewPanel.tsx` | System health overview |
| `apps/clinician-dashboard/src/components/GoldenSuitePanel.tsx` | Test case inventory + heatmap |
| `apps/clinician-dashboard/src/components/CandidatesPanel.tsx` | Candidate comparison |
| `apps/clinician-dashboard/src/components/OptimizationPanel.tsx` | Loop status + convergence |

### Modified Files
| File | Changes |
|------|---------|
| `tools/trace/trace.sh` | Add tokens/routing/context/safety/envelope subcommands |
| `packages/agent-harness/invoke-workflow.mjs` | Wire trace emission at each stage |
| `evals/product/eval-harness.sh` | Dynamic mode with scoring rubric + safety veto |
| `optimization/product/proposer-prompt.md` | v2 upgrades (convergence, change budget, regression) |
| `apps/clinician-dashboard/src/App.tsx` | New 6-tab layout |
| `apps/clinician-dashboard/src/types.ts` | New interfaces for all data shapes |
| `apps/clinician-dashboard/src/components/TraceViewer.tsx` | Envelope-aware trace detail |
| `apps/clinician-dashboard/src/components/EvalDashboard.tsx` | Rename/refactor -> OverviewPanel |
| `tests/clinical/cases/*.yaml` | Add v2 schema fields to 22 critical cases |
| `package.json` | Workspace scripts |
| `apps/clinician-dashboard/package.json` | Dev scripts + predev hook |

### Existing Files to Reuse
| File | Reuse |
|------|-------|
| `apps/clinician-dashboard/src/theme.ts` | All color tokens, Mantine theme — use as-is |
| `apps/clinician-dashboard/src/components/ContextInspector.tsx` | Keep as-is for Context tab |
| `apps/clinician-dashboard/src/components/ErrorBoundary.tsx` | Wrap all new panels |
| `evals/product/clinical-constraints.yaml` | Safety veto rules — read by eval harness |
| `optimization/product/proposer-prompt.md` | Base for v2 upgrades |
| `tools/trace/trace.sh` | Existing lifecycle (init/input/output/hooks/done) — extend, don't replace |

---

## Execution Order

```
Phase 1 (Telemetry)     <-- can start immediately, no blockers
Phase 2 (Eval Dynamic)  <-- depends on 1B (trace emission), can overlap with 1C/1D
Phase 3 (Optimization)  <-- depends on 2B (dynamic eval), can overlap with 2C/2D
Phase 4 (Dashboard)     <-- depends on 1D (trace index) and 2B (scores schema)
                             4A-4C can start after 1D
                             4D-4F can start after 3A-3C
Phase 5 (Integration)   <-- after all above
```

Phases 1 and 4A-4C can be parallelized. Phases 2 and 3 are sequential.

---

## Verification Plan

1. **Telemetry**: Run `invoke-workflow.mjs` -> verify `trace-envelope.json` has all 6 category tags populated
2. **Eval Dynamic**: `eval-harness.sh --mode dynamic --dry-run` -> all cases processed, scores schema includes `weighted_score`
3. **Safety Veto**: Manually fail a safety case -> verify entire candidate marked FAIL
4. **Optimization Cycle**: `scripts/optimization-cycle.sh --dry-run` -> baseline candidate created with scores snapshot
5. **Dashboard**: `npm run dev:dashboard` -> all 6 tabs render, no console errors, overview shows real data from existing traces/scores
6. **Golden Suite**: Dashboard heatmap renders all 60+ cases colored by latest results
7. **End-to-end**: Change a skill prompt -> run optimization cycle -> see new candidate in dashboard -> compare with baseline
