# Meta-Harness Optimization Strategy: Dual-Fork Continuous Self-Improvement

```
version: 1.0.0-draft
status: active
repo: github.com/ShanesNotes/Noah-RN
scope: company-level + product-level harness optimization
audience: Paperclip CEO agent (orchestration), Board Operator (governance), SOTA coding agents (implementation)
dependencies:
  - noah-rn-research-distillation.md (cross-report patterns #1, #4, #5, #6, #13, #15)
  - docs/archive/noah-rn-phase2-prd.md (architectural invariants, golden test suite requirement)
provenance:
  source: "Meta-Harness (Lee et al., Stanford IRIS Lab, 2026) + autoresearch (Karpathy, 2026)"
  paper: "https://arxiv.org/abs/2603.28052"
  repos:
    - "https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact"
    - "https://github.com/karpathy/autoresearch"
  token_efficiency: "https://clawhub.ai/shaivpidadi/free-ride"
  date: 2026-03-31
  author: "Shane (Board Operator) + Claude (research/validation)"
```

---

## 0. Executive Summary

Harness optimization — improving everything *around* the model rather than the model itself — is a core operating philosophy of noah-rn (cross-report pattern #1: "the harness > the model"). This document operationalizes that philosophy as a continuous, automated self-improvement loop by adapting two complementary approaches:

- **Meta-Harness** (Lee et al., 2026): filesystem-as-context optimization where a proposer agent reads full execution traces, source code, and scores from all prior candidates to perform counterfactual diagnosis and propose targeted harness modifications. Achieved #2 on TerminalBench-2 (Opus) and #1 (Haiku) by optimizing scaffolding alone.
- **autoresearch** (Karpathy, 2026): autonomous experiment loops where an agent modifies code, evaluates, keeps-or-discards, and repeats. The human programs the `program.md` (research org instructions), not the code.

The synthesis: **Meta-Harness is the optimization algorithm; autoresearch is the operational pattern; Paperclip is the orchestration layer; free-tier models are the compute substrate; Claude is the quality validator.**

Two distinct forks of this work exist:

| Fork | Scope | What's being optimized | Eval signal |
|------|-------|----------------------|-------------|
| **Company-level** | Paperclip org itself | Agent prompts, task routing, delegation patterns, SKILL.md files, CEO/Dev/QA coordination | Task completion quality, token efficiency, rework rate |
| **Product-level** | noah-rn clinical harness | Skill prompts, completeness checklists, output format, routing logic, confidence calibration, hook thresholds | Golden test suite scores (clinical correctness, completeness, safety) |

Both forks share the same optimization loop structure but differ in eval criteria, safety constraints, and human review requirements.

---

## 1. Core Concepts: What We're Adapting and Why

### 1.1 Meta-Harness: Filesystem-as-Context Optimization

The key innovation is *how much the optimizer gets to see*. Prior methods compress history into summaries, scores, or sliding windows (≤26K tokens/iteration). Meta-Harness gives the proposer the **full filesystem** — all prior candidates' source code, execution traces, and scores — up to **10M tokens per iteration**. The proposer is a coding agent that reads what it needs via `grep`, `cat`, and standard tools.

Why this matters for noah-rn: clinical skill failures are hard to diagnose without the full trace. A sepsis skill that misses lactate might fail because of prompt ordering, because the completeness checklist doesn't include it, because the routing agent classified the query as simple, or because the confidence calibration threshold suppressed it. A summary-based optimizer would see "sepsis skill scored 72%." A filesystem-based optimizer can `grep` the traces and find the specific decision that caused the failure.

**The Meta-Harness loop:**
```
iteration N:
  1. Proposer agent reads filesystem:
     - All prior candidates' source code
     - All execution traces (input → output → hook results → scores)
     - All scores and comparison metrics
  2. Proposer performs counterfactual diagnosis:
     - "Candidate 3 scored higher on completeness but lower on confidence calibration"
     - "The failure on Case 47 traces to missing lactate in the checklist — added in Candidate 5 but regressed in Candidate 6"
  3. Proposer generates a new harness variant
  4. Evaluate variant on held-out tasks
  5. Store all code + traces + scores to filesystem
  6. Repeat
```

### 1.2 Autoresearch: Autonomous Experiment Loops

Karpathy's autoresearch pattern is simpler: one file to modify (`train.py`), one metric (`val_bpb`), one time budget (5 minutes), autonomous looping. The human writes `program.md` — the research org's instructions — not the code. The insight: **you program the program that programs the code.**

For noah-rn, the adaptation is:
- The "code" = skill prompts, hook logic, routing rules, output format templates
- The "metric" = golden test suite scores
- The "program.md" = the optimization agent's instructions (what to try, what constraints to respect, what tradeoffs to explore)
- The "human" = Shane reviewing proposed changes with Board Operator authority

### 1.3 The Token Efficiency Problem

Constraint: Wiz and Dev (Claude Code and Codex agents) are approaching subscription usage limits. Running a Meta-Harness-style loop that consumes 10M tokens per iteration on frontier models is economically infeasible for a solo-founder operation.

**Solution architecture: tiered model allocation.**

```
┌─────────────────────────────────────────────────────────┐
│                    OPTIMIZATION LOOP                     │
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │  Free-tier    │────▶│  Proposer     │                 │
│  │  models via   │     │  (generates   │                 │
│  │  OpenRouter   │     │  candidates)  │                 │
│  └──────────────┘     └──────┬───────┘                  │
│                              │                           │
│                    ┌─────────▼─────────┐                │
│                    │  Evaluator         │                │
│                    │  (runs golden test │                │
│                    │  suite, scores)    │                │
│                    └─────────┬─────────┘                │
│                              │                           │
│         ┌────────────────────▼────────────────────┐     │
│         │  Validator (Claude — this conversation)  │     │
│         │  - Reviews top candidates only           │     │
│         │  - Checks clinical safety constraints    │     │
│         │  - Validates architectural invariants     │     │
│         │  - Approves/rejects for Shane's review   │     │
│         └────────────────────┬────────────────────┘     │
│                              │                           │
│              ┌───────────────▼───────────────┐          │
│              │  Board Operator (Shane)        │          │
│              │  - Clinical review authority   │          │
│              │  - Final accept/reject         │          │
│              │  - New golden test cases        │          │
│              └───────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

**Token allocation strategy:**
- **Free-tier models (OpenRouter via FreeRide):** Bulk proposal generation, initial candidate exploration, trace analysis. These models do the high-volume, lower-stakes work — generating 10-20 candidate harness variants per cycle.
- **Claude (validator role):** Reviews only the top-performing candidates that pass automated eval. This is high-stakes, low-volume work — maybe 2-3 candidates per cycle. Claude's role is to catch what the golden test suite can't: architectural invariant violations, subtle clinical safety issues, drift from the four-layer output format, prompt injection vulnerabilities introduced by "optimized" prompts.
- **Shane (Board Operator):** Reviews Claude-approved candidates with clinical authority. The Jethro principle in action: the free models propose, the golden test suite filters, Claude validates, Shane decides.

### 1.4 Quality Hypothesis and Risk

**Hypothesis:** Free-tier models (Qwen3-Coder, Llama variants, etc.) can serve as adequate *proposers* for harness optimization because the task is structural — rearranging prompt sections, adding checklist items, adjusting routing thresholds — not clinical reasoning. The clinical reasoning happens at evaluation time (does the output match the golden test case?) and validation time (does Claude catch safety issues?).

**Risk:** Free-tier model proposals may be low-quality enough that 90% of iterations produce junk, making the loop inefficient. Mitigation: the first few cycles are explicitly calibration runs where we measure proposal acceptance rate and adjust the proposer prompt or swap models based on results.

**Hard constraint:** No free-tier model output ever touches production without passing through both automated eval AND Claude validation AND Shane's clinical review. This is non-negotiable.

---

## 2. Fork 1: Company-Level Optimization (Paperclip)

### 2.1 What's Being Optimized

The Paperclip company itself — the meta-layer that orchestrates noah-rn development.

| Artifact | Current state | Optimization target |
|----------|--------------|-------------------|
| CEO prompt / orchestration instructions | Manual, iterated by Shane | Automated proposal → eval → refine loop |
| Task delegation patterns | CEO → Dev/QA with manual routing | Data-driven routing based on task outcome history |
| Agent SKILL.md files | Static | Evolved based on task performance traces |
| Inter-agent communication | Ad hoc | Structured handoff protocols optimized for completion rate |
| Token budget allocation | Implicit | Explicit allocation strategy based on task ROI |

### 2.2 Eval Signal

Company-level optimization needs different metrics than product-level:

```yaml
company_eval_metrics:
  task_completion:
    metric: "Did the delegated task achieve acceptance criteria?"
    weight: 0.4
  token_efficiency:
    metric: "Tokens consumed per completed task (lower = better)"
    weight: 0.2
  rework_rate:
    metric: "How often does a task come back for revision?"
    weight: 0.2
  delegation_accuracy:
    metric: "Was the task routed to the right agent?"
    weight: 0.1
  time_to_completion:
    metric: "Wall clock from task assignment to acceptance"
    weight: 0.1
```

### 2.3 Implementation Sketch

```
paperclip-optimizer/
├── filesystem/                    # Meta-Harness filesystem
│   ├── candidates/               # All prior org configurations
│   │   ├── candidate-001/
│   │   │   ├── ceo-prompt.md
│   │   │   ├── dev-prompt.md
│   │   │   ├── qa-prompt.md
│   │   │   ├── delegation-rules.yaml
│   │   │   └── scores.json
│   │   └── candidate-N/
│   ├── traces/                   # Execution traces per task
│   │   ├── task-001/
│   │   │   ├── delegation-log.json
│   │   │   ├── agent-outputs/
│   │   │   ├── revision-history/
│   │   │   └── eval-scores.json
│   │   └── task-N/
│   └── analysis/                 # Cross-candidate comparisons
│       ├── metrics-summary.json
│       └── failure-modes.md
├── proposer-prompt.md            # Instructions for the free-tier proposer
├── eval-rubric.yaml              # Scoring criteria
└── OPTIMIZATION-LOG.md           # Human-readable iteration history
```

### 2.4 Bootstrapping Problem

Company-level optimization requires historical task data to analyze. **Cold start strategy:** run the current Paperclip configuration for 10-15 tasks with structured trace logging enabled. This produces the initial filesystem that the optimizer can read. Don't optimize before you have data.

---

## 3. Fork 2: Product-Level Optimization (noah-rn Clinical Harness)

### 3.1 What's Being Optimized

noah-rn's clinical skills, hooks, routing logic, and output format — everything between the model and the nurse.

| Artifact | Current state | Optimization target |
|----------|--------------|-------------------|
| Skill prompts (ACLS, sepsis, RSI, etc.) | Hand-crafted shell scripts | Structurally optimized prompt ordering, section emphasis, few-shot examples |
| Completeness checklists | Implicit in prompts | Explicitly enumerated, coverage-verified against golden test cases |
| Output format templates | Four-layer spec in PRD | Concrete formatting optimized for nurse readability + machine parseability |
| Routing agent rules | Phase 2 queued | Complexity classification thresholds tuned against misrouting rate |
| Confidence calibration | Phase 2 queued | Threshold values tuned against over/under-confidence rates in golden suite |
| Hook trigger conditions | Tier 1 deterministic | Threshold values for Tier 2-3 hooks tuned against false positive/negative rates |

### 3.2 Eval Signal: The Golden Test Suite

**The golden test suite IS the optimization objective.** This is the critical bottleneck — the optimizer can only get as good as the eval allows. Every scenario Shane adds expands the optimization search space.

```yaml
product_eval_metrics:
  clinical_correctness:
    metric: "Does the output contain the correct clinical information?"
    weight: 0.30
    judge: "automated rubric + Claude validation on ambiguous cases"
  completeness:
    metric: "Does the output address all required assessment domains?"
    weight: 0.25
    judge: "checklist verification against expected elements"
  safety_non_regression:
    metric: "Does the candidate regress on ANY safety-critical test case?"
    weight: VETO  # any regression = automatic rejection, regardless of other scores
    judge: "binary pass/fail on safety subset"
  confidence_calibration:
    metric: "Are confidence signals proportional to actual correctness?"
    weight: 0.15
    judge: "correlation between stated confidence and golden-suite agreement"
  format_compliance:
    metric: "Does output conform to four-layer explanation spec?"
    weight: 0.10
    judge: "structural parser — summary/evidence/confidence/provenance all present"
  provenance_accuracy:
    metric: "Are cited sources correct and version-current?"
    weight: 0.10
    judge: "cross-reference against knowledge/ file headers"
  omission_detection:
    metric: "Does the output fail to mention critical information present in context?"
    weight: 0.10
    judge: "known-omission test cases where context contains critical items the output must surface"
```

**Safety veto is absolute.** A candidate that improves average correctness by 5% but misses a contraindication in one test case is rejected. This is "omission > commission" (cross-report pattern #11) encoded as an optimization constraint.

### 3.3 Implementation Sketch

```
noah-optimizer/
├── filesystem/                    # Meta-Harness filesystem
│   ├── candidates/               # All prior skill/hook/routing variants
│   │   ├── candidate-001/
│   │   │   ├── skills/           # Modified skill prompts
│   │   │   ├── hooks/            # Modified hook logic
│   │   │   ├── routing/          # Modified routing rules
│   │   │   ├── output-format/    # Modified output templates
│   │   │   └── scores.json       # Golden test suite results
│   │   └── candidate-N/
│   ├── traces/                   # Full execution traces per test case
│   │   ├── case-001/
│   │   │   ├── input-context.json
│   │   │   ├── skill-output.txt
│   │   │   ├── hook-results.json
│   │   │   ├── confidence-scores.json
│   │   │   └── eval-scores.json
│   │   └── case-N/
│   └── analysis/                 # Cross-candidate failure mode analysis
│       ├── regression-matrix.json
│       ├── improvement-map.json
│       └── failure-modes.md
├── proposer-prompt.md            # Instructions for the free-tier proposer
├── clinical-constraints.yaml      # Non-negotiable clinical accuracy rules
├── eval-harness.sh               # Automated golden test suite runner
└── OPTIMIZATION-LOG.md           # Human-readable iteration history
```

### 3.4 The Proposer Prompt (Product-Level)

This is the `program.md` equivalent — the instructions that govern how the free-tier proposer agent operates. This prompt is itself subject to meta-optimization over time.

```markdown
# noah-rn Harness Optimizer — Proposer Instructions

## Your Role
You are a harness optimization agent. You modify clinical skill prompts,
completeness checklists, routing rules, and output format templates to
improve performance on the golden test suite. You NEVER modify clinical
knowledge content — only how that knowledge is assembled, presented,
and validated.

## Filesystem Structure
You have access to:
- `candidates/` — all prior harness variants with their scores
- `traces/` — full execution traces for every test case on every candidate
- `analysis/` — cross-candidate metrics and failure mode summaries

## Your Process
1. Read `analysis/failure-modes.md` to understand current weaknesses
2. Identify the highest-scoring candidate as your starting point
3. Use `grep` and `cat` to examine specific traces where that candidate failed
4. Perform counterfactual diagnosis:
   - What specific harness decision caused this failure?
   - Did a prior candidate handle this case better? If so, what was different?
   - Is this a prompt ordering issue, a missing checklist item, a routing
     misclassification, or a confidence calibration error?
5. Propose a targeted modification that addresses the diagnosed failure
   WITHOUT regressing on cases the current best already handles
6. Write the new candidate to `candidates/candidate-{N+1}/`
7. Document your reasoning in `candidates/candidate-{N+1}/RATIONALE.md`

## Hard Constraints (violations = automatic rejection)
- NEVER modify files in `knowledge/` — you optimize presentation, not content
- NEVER remove items from completeness checklists — only add or reorder
- NEVER lower confidence thresholds — only raise or restructure
- NEVER produce skill prompts that could bypass HITL review
- NEVER introduce provider-specific API calls (model-agnosticism invariant)
- Every output must maintain four-layer format (summary/evidence/confidence/provenance)

## Optimization Targets (in priority order)
1. Eliminate safety-critical failures (veto-weight)
2. Improve completeness scores (highest weighted metric)
3. Improve clinical correctness scores
4. Improve confidence calibration
5. Improve format compliance and provenance accuracy
```

### 3.5 Interaction with Phase 2

Product-level optimization is **gated by Phase 2 deliverables:**

| Phase 2 deliverable | Why the optimizer needs it |
|---------------------|--------------------------|
| Golden test suite (phase 2c, item 11) | Without eval tasks, nothing to optimize against |
| Skill metadata blocks (phase 2a, item 1) | Optimizer needs structured skill descriptions to know what to modify |
| Output composer (phase 2a, item 5) | Optimizer tunes parameters of a standardized output pipeline, not ad hoc formats |
| Agent router (phase 2a, item 3) | Routing rule optimization requires the router to exist |
| Hook tiers 1-2 (phase 2b, items 6-8) | Hook threshold tuning requires hooks to exist |

**Sequencing:** The optimization loop cannot run meaningfully until at least the golden test suite (50 initial scenarios) and the output composer exist. The proposer prompt and filesystem structure can be designed now. Trace logging infrastructure can be added to existing skills now.

---

## 4. Tiered Agent Allocation

### 4.1 Free-Tier Model Selection Strategy

OpenRouter's free tier rotates models. Quality varies. The FreeRide skill handles automatic ranking and fallback, but the optimization loop needs more deliberate selection.

**Selection criteria for the proposer role:**

```yaml
proposer_model_requirements:
  code_editing: "Must be able to read, understand, and modify shell scripts and markdown"
  grep_usage: "Must be able to formulate targeted grep/cat commands to read trace files"
  structured_reasoning: "Must be able to perform multi-step diagnosis across traces"
  instruction_following: "Must respect hard constraints in proposer prompt"
  context_window: "Larger is better — more prior candidates visible per iteration"

preferred_models:  # subject to free-tier availability, ranked by expected quality
  - "qwen/qwen3-coder:free"       # strong code understanding
  - "google/gemma-3:free"          # good instruction following
  - "meta-llama/llama-4-scout:free"  # large context, decent reasoning

fallback_strategy:
  - "Use FreeRide's ranked list as starting point"
  - "Run 3-5 calibration iterations per model"
  - "Measure: proposal acceptance rate, trace analysis quality, constraint compliance"
  - "Drop models below 20% acceptance rate from rotation"
```

### 4.2 Claude's Validator Role

Claude (this conversation and future sessions) serves as the quality gate between automated optimization and Shane's review queue. Token-efficient by design: Claude only sees the top 1-3 candidates per cycle, not the full exploration history.

**Validator checklist:**

```yaml
claude_validation_checks:
  architectural_invariants:
    - "Does the candidate maintain HITL Category II classification?"
    - "Does the candidate maintain model-agnosticism?"
    - "Does the candidate maintain four-layer output format?"
    - "Does the candidate maintain A2A readiness?"
  safety_analysis:
    - "Could any proposed prompt modification enable prompt injection?"
    - "Does the proposed checklist modification risk omission of critical items?"
    - "Does the routing change risk misclassifying a complex case as simple?"
  clinical_plausibility:
    - "Does the proposed prompt restructuring preserve clinical priority ordering?"
    - "Do confidence calibration changes align with clinical risk stratification?"
  drift_detection:
    - "Is the candidate drifting from the architectural constitution?"
    - "Are multiple small changes accumulating into an unintended architectural shift?"
```

### 4.3 Shane's Board Operator Role

Shane reviews Claude-approved candidates. The key authority only Shane holds:

- **Golden test case creation:** Every error Shane catches becomes a new test case. This is the flywheel: optimization reveals gaps → Shane annotates → test suite expands → optimizer gets smarter.
- **Clinical priority weighting:** Should the sepsis skill prioritize lactate mention over blood culture mention? Only ICU experience can answer this.
- **Antrhodiscernment encoding:** When the optimizer proposes a contradiction handling strategy, Shane validates whether the evidence weighting reflects actual clinical practice.

---

## 5. Implementation Roadmap

### Phase A: Infrastructure (can start now)

```yaml
phase_a:
  trace_logging:
    description: "Add structured trace logging to existing skills"
    deliverable: "JSON logs per skill invocation: input context, raw output, hook results, timing"
    effort: "Low — wrap existing skill invocations with logging"
    dependency: "None — works on current Phase 0+1 skills"

  filesystem_structure:
    description: "Create the Meta-Harness filesystem layout in repo"
    deliverable: "optimization/ directory with candidates/, traces/, analysis/ structure"
    effort: "Trivial"
    dependency: "None"

  proposer_prompt_v1:
    description: "Write initial proposer prompt for product-level optimization"
    deliverable: "optimization/proposer-prompt.md"
    effort: "Medium — requires encoding safety constraints and optimization targets"
    dependency: "None — can draft against current skills"

  openrouter_setup:
    description: "Configure OpenRouter free-tier access via FreeRide or direct API"
    deliverable: "Working free-tier model access for proposer agent"
    effort: "Low"
    dependency: "OpenRouter API key"
```

### Phase B: Calibration (requires Phase 2c golden test suite — minimum 50 cases)

```yaml
phase_b:
  model_calibration:
    description: "Run 3-5 proposer iterations per candidate free-tier model"
    deliverable: "Model quality rankings: acceptance rate, constraint compliance, trace analysis depth"
    effort: "Medium — manual review of initial outputs"
    dependency: "Phase A complete + golden test suite exists"

  eval_harness:
    description: "Automated golden test suite runner that scores candidates"
    deliverable: "optimization/eval-harness.sh — runs skills against test cases, produces scores.json"
    effort: "Medium"
    dependency: "Golden test suite + trace logging"

  safety_veto_implementation:
    description: "Implement automatic rejection of candidates that regress on safety-critical cases"
    deliverable: "Safety subset of golden test suite tagged, veto logic in eval harness"
    effort: "Low once eval harness exists"
    dependency: "Eval harness + safety-tagged test cases"
```

### Phase C: Autonomous Loop (requires Phase B calibration data)

```yaml
phase_c:
  loop_orchestration:
    description: "Wire the full propose → eval → validate → review loop"
    deliverable: "Runnable optimization cycle: free-tier proposes → eval scores → Claude validates top-N → Shane reviews"
    effort: "High — integration work"
    dependency: "Phases A + B"

  company_level_bootstrap:
    description: "Begin company-level optimization with Paperclip task trace data"
    deliverable: "Initial company-level filesystem populated from 10-15 historical tasks"
    effort: "Medium"
    dependency: "Structured task logging in Paperclip"

  iteration_cadence:
    description: "Establish rhythm — how often does the loop run?"
    strategy: |
      Product-level: batch of 10-20 proposals per cycle, Claude validates top 3,
      Shane reviews weekly. Cadence limited by golden test suite execution time
      and Claude token budget.
      Company-level: lower frequency — after every 5-10 completed Paperclip tasks,
      run one optimization cycle on the org configuration.
```

### Phase D: Meta-Optimization (ongoing)

```yaml
phase_d:
  proposer_prompt_evolution:
    description: "The proposer prompt itself is subject to optimization"
    strategy: "Track which proposer prompt versions produce higher acceptance rates. Periodically revise."

  test_suite_expansion:
    description: "Shane adds golden test cases from errors caught during review"
    strategy: "Every rejected candidate that fails for a novel reason = new test case"

  model_rotation:
    description: "Free-tier model availability changes. Re-calibrate periodically."
    strategy: "Monthly re-run of model calibration (Phase B) with current free-tier lineup"

  cross_fork_learning:
    description: "Insights from company-level optimization inform product-level and vice versa"
    strategy: "If company-level discovers that structured handoff protocols improve Dev task completion, check whether similar structuring improves skill-to-skill handoffs in the product."
```

---

## 6. CEO Issue Prompt (Optimized)

The following is the refined prompt for Paperclip CEO orchestration. It is structured for agent consumption — clear objective, explicit constraints, phased execution, and defined success criteria.

```markdown
# Issue: Meta-Harness Optimization Loop — Dual-Fork Implementation

## Objective

Implement a continuous harness optimization system at two levels:
1. **Product-level:** Automatically propose, evaluate, and refine noah-rn clinical
   skill prompts, hooks, routing rules, and output format templates against the
   golden test suite.
2. **Company-level:** Automatically propose, evaluate, and refine Paperclip agent
   prompts, delegation patterns, and inter-agent protocols against task completion
   metrics.

This is a long-running, iterative experiment — not a one-shot deliverable. The system
improves itself over time. Initial phases focus on infrastructure and calibration;
autonomous operation follows.

## Background

Two research projects inform this work:
- **Meta-Harness** (Lee et al., Stanford, 2026): Optimization via filesystem-as-context.
  The proposer agent gets the FULL history — all prior candidates' source code,
  execution traces, and scores. It uses grep/cat to diagnose failures and propose
  targeted fixes. 10M tokens of context per iteration vs ≤26K for prior methods.
  Paper: https://arxiv.org/abs/2603.28052
  Repo: https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact
- **autoresearch** (Karpathy, 2026): Autonomous experiment loops. Agent modifies code,
  evaluates, keeps/discards, repeats. Human programs the program.md, not the code.
  Repo: https://github.com/karpathy/autoresearch

## Token Efficiency Constraint

Wiz and Dev are near subscription usage limits. The optimization loop MUST be
token-efficient. Architecture:
- **Proposer (bulk work):** Free-tier models via OpenRouter. Use FreeRide
  (https://clawhub.ai/shaivpidadi/free-ride) or direct OpenRouter API for
  ranked free models (Qwen3-Coder, Gemma-3, Llama-4-Scout, etc.)
- **Evaluator:** Automated — runs golden test suite, produces scores. No LLM tokens.
- **Validator:** Claude (via claude.ai project chat) reviews top 1-3 candidates per
  cycle only. Catches safety issues, architectural drift, clinical plausibility
  problems that automated eval cannot.
- **Board Operator:** Shane — final clinical review authority. Weekly review cadence.

No free-tier model output reaches production without passing: automated eval →
Claude validation → Shane approval.

## Phased Execution Plan

### Phase A: Infrastructure (start immediately, no blockers)

1. **Add trace logging to existing skills.**
   Every skill invocation logs to `optimization/traces/{case-id}/`:
   - input-context.json (what the skill received)
   - skill-output.txt (raw output)
   - hook-results.json (which hooks fired, pass/fail)
   - timing.json (latency per stage)
   Format: structured JSON. Keep it simple — append-only log files.

2. **Create filesystem structure.**
   ```
   optimization/
   ├── product/
   │   ├── candidates/
   │   ├── traces/
   │   ├── analysis/
   │   ├── proposer-prompt.md
   │   ├── clinical-constraints.yaml
   │   └── eval-harness.sh
   ├── company/
   │   ├── candidates/
   │   ├── traces/
   │   ├── analysis/
   │   └── proposer-prompt.md
   └── OPTIMIZATION-LOG.md
   ```

3. **Draft proposer-prompt.md (product-level).**
   Reference: research/meta-harness-optimization-strategy.md Section 3.4.
   Hard constraints from the noah-rn architectural invariants MUST be embedded.

4. **Set up OpenRouter free-tier access.**
   Get API key. Test connectivity. Verify at least 2-3 usable free models.
   Do NOT install FreeRide's pip package blindly — ClawHub flagged it as
   suspicious. Use OpenRouter API directly or review FreeRide source first.

### Phase B: Calibration (requires golden test suite — Phase 2c dependency)

5. **Build eval harness.**
   Shell script that runs each skill against golden test cases, captures traces,
   scores output against rubric. Produces candidates/{id}/scores.json.
   Scoring: see research/meta-harness-optimization-strategy.md Section 3.2.

6. **Run model calibration.**
   3-5 proposer iterations per free-tier model. Measure:
   - Proposal acceptance rate (does it produce valid harness modifications?)
   - Constraint compliance (does it respect hard constraints?)
   - Trace analysis quality (does it actually read and diagnose from traces?)
   Drop models below 20% acceptance rate.

7. **Implement safety veto.**
   Tag safety-critical subset of golden test cases. Any candidate that regresses
   on ANY safety case is automatically rejected — no exceptions.

### Phase C: Loop (requires Phase B data)

8. **Wire the full loop.**
   Free-tier proposes → eval scores → top N → Claude validates → Shane reviews.
   Start with product-level only. Company-level bootstraps after 10-15 traced tasks.

9. **Establish cadence.**
   Product: batch of 10-20 proposals, Claude validates top 3, Shane reviews weekly.
   Company: one cycle per 5-10 completed tasks.

## Success Criteria

Phase A: Trace logging produces structured JSON for existing skills. Filesystem exists.
Phase B: At least 1 free-tier model achieves >30% proposal acceptance rate.
         Eval harness runs golden suite and produces scores without manual intervention.
Phase C: One full optimization cycle completes: proposal → eval → validation → review.
         At least one proposed improvement is accepted by Shane.

## Constraints

- Architectural invariants from docs/archive/noah-rn-phase2-prd.md Section 0 are absolute.
  The optimizer NEVER proposes changes that violate them.
- This is harness optimization, not clinical knowledge generation.
  The optimizer modifies prompts, not medical facts.
- Safety veto is non-negotiable. One regression on a safety case = rejection.
- Board Operator (Shane) holds final authority on all clinical decisions.
- Token budget: minimize frontier model usage. Free-tier does bulk work.

## Reference Documents

- research/meta-harness-optimization-strategy.md (this issue's companion research)
- noah-rn-research-distillation.md (cross-report patterns, especially #1, #4, #15)
- docs/archive/noah-rn-phase2-prd.md (architectural invariants, Phase 2c golden test suite)
```

---

## 7. Open Questions for Board Review

These require Shane's direction before implementation:

1. **FreeRide vs. direct OpenRouter API.** ClawHub's security scan flagged FreeRide as suspicious (metadata inconsistencies, not clear malicious behavior). Should we use FreeRide for convenience, use OpenRouter API directly, or review FreeRide's source code first? Recommendation: start with direct OpenRouter API. Simpler, no third-party dependency, full control.

2. **Which clinical skills to optimize first?** The sepsis skill has the most complex completeness requirements and likely the most room for improvement. But the shift-report skill touches the most assessment domains and would produce the broadest eval signal. Recommendation: start with shift-report (broadest coverage), add sepsis second (deepest clinical complexity).

3. **What's the minimum viable golden test suite size for the first optimization cycle?** The PRD targets 50 initial scenarios. Should we wait for all 50, or start calibration runs with 15-20? Recommendation: 15-20 is enough for calibration (Phase B). Full 50 for autonomous loop (Phase C).

4. **Company-level optimization priority.** Is this worth pursuing now, or should all effort go to product-level? Company-level requires structured task logging that doesn't exist yet. Recommendation: defer company-level to after product-level Phase B is complete.

5. **OpenClaw vs. Claude Code for the proposer agent.** The free-tier proposer needs to be able to read filesystems and run grep/cat. OpenClaw with FreeRide is one path. Claude Code with direct OpenRouter API calls is another. Which fits the Paperclip workflow better?

---

## 8. Relationship to Existing Research Reports

| Research report | Relationship to Meta-Harness optimization |
|----------------|------------------------------------------|
| Report 3 (Streaming/Real-Time) | Meta-Harness subsumes the "autoresearch eval loop" queued in Report 3. This document IS Report 3's implementation. |
| Report 4 (Safety/Guardrails) | Safety veto constraint comes directly from Report 4's guardrail architecture. Hook threshold tuning is a product-level optimization target. |
| Report 5 (Fine-Tuning/Alignment) | "Fine-tune for format, RAG for knowledge" (cross-report pattern #15) is the philosophical foundation. Meta-Harness optimizes the format layer without touching the knowledge layer. |
| Report 6 (Knowledge Management) | Knowledge provenance headers enable the optimizer to validate provenance accuracy in output. Knowledge freshness constraints bound what the optimizer can reference. |
| Distillation pattern #1 | "The harness > the model" — Meta-Harness literally proves this by achieving SOTA through harness optimization alone. |
| Distillation pattern #13 | "Build golden test cases from lived clinical experience" — the golden test suite is the optimization objective, and Shane is the essential annotator. |

---

## 9. Provenance

```yaml
document:
  title: "Meta-Harness Optimization Strategy: Dual-Fork Continuous Self-Improvement"
  version: "1.0.0-draft"
  created: "2026-03-31"
  author: "Shane (Board Operator) + Claude (research/validation)"
  status: "pending board review"

sources:
  primary:
    - title: "Meta-Harness: End-to-End Optimization of Model Harnesses"
      authors: "Lee, Nair, Zhang, Lee, Khattab, Finn"
      institution: "Stanford IRIS Lab"
      url: "https://arxiv.org/abs/2603.28052"
      repo: "https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact"
      date: "2026-03"
    - title: "autoresearch"
      author: "Andrej Karpathy"
      url: "https://github.com/karpathy/autoresearch"
      date: "2026-03"
    - title: "FreeRide — Free AI for OpenClaw"
      author: "Shaishav Pidadi"
      url: "https://clawhub.ai/shaivpidadi/free-ride"
      version: "1.0.7"
      security_note: "ClawHub flagged as suspicious — metadata inconsistencies, not clearly malicious"

  internal:
    - "noah-rn-research-distillation.md"
    - "docs/archive/noah-rn-phase2-prd.md"

next_review: "2026-04-15"
```
