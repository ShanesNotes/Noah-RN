# Noah RN Meta-Harness & Self-Improvement Architecture — Research Report

**Date:** 2026-04-01
**Scope:** `optimization/` infrastructure, golden test suite, proposer prompts, safety constraints, clinical router, multi-model comparison
**Status:** Phase A complete, Phase B blocked, Phase C/D not started

---

## 1. Current State Analysis

### 1.1 What Exists (Phase A — Complete)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| Filesystem structure | `optimization/product/` + `optimization/company/` | ✅ Complete | `candidates/`, `traces/`, `analysis/`, `results/` directories with `.gitkeep` |
| Product proposer prompt | `optimization/product/proposer-prompt.md` | ✅ Complete | 113 lines — counterfactual diagnosis workflow, hard constraints, optimization targets, output format |
| Clinical constraints | `optimization/product/clinical-constraints.yaml` | ✅ Complete | 72 lines — regulatory posture, accuracy hierarchy, output format, provenance, optimizer constraints, confidence tiers |
| Eval harness skeleton | `optimization/product/eval-harness.sh` | ✅ Complete | 260 lines — static structural validation only (checks skill files contain required elements) |
| Failure modes analysis | `optimization/product/analysis/failure-modes.md` | ✅ Complete | Documents current validation limitations and path to dynamic validation |
| Scores artifact | `optimization/product/results/scores-20260331-214328.json` | ✅ Complete | 53/53 pass, 100% — but this is structural validation, not clinical output validation |
| Company proposer prompt | `optimization/company/proposer-prompt.md` | ⚠️ Placeholder | 5 lines — defers to product-level template |
| Optimization log | `optimization/OPTIMIZATION-LOG.md` | ⚠️ Empty | 11 lines, no iterations recorded |
| Clinical router | `plugin/agents/clinical-router.md` | ✅ Complete | 236 lines — intent map, context validation, complexity tiers, cross-skill awareness |
| Research strategy | `research/meta-harness-optimization-strategy.md` | ✅ Complete | 726 lines — dual-fork architecture, token allocation, phased plan |
| Golden test cases | `tests/clinical/cases/` | ✅ Partial | 53 YAML files covering 7 skill categories with severity tagging |

### 1.2 What's Empty (The Block)

| Gap | Impact | Root Cause |
|-----|--------|------------|
| **No dynamic eval** | The harness only checks that skill files *contain* keywords — it never executes skills against clinical scenarios or validates actual output | No model API endpoint configured; `eval-harness.sh` calls `validate_skill()` which does `grep` on SKILL.md files, not LLM invocation |
| **No traces** | `traces/` directories are empty (`.gitkeep` only) — no execution logs, no input/output pairs, no hook results | Trace logging not wired into skill invocation |
| **No candidates** | `candidates/` directories are empty — no proposed harness variants to compare | Requires dynamic eval to score candidates |
| **No company-level data** | Company proposer is placeholder; no task traces exist | Deferred until 10-15 Paperclip tasks complete |
| **No OpenRouter integration** | Free-tier model access not configured | API key not set; FreeRide flagged as suspicious |
| **No confidence calibration data** | `confidence_calibration` metric defined in strategy but unmeasurable | Requires model output with confidence scores compared against golden answers |

### 1.3 The Core Problem

The eval harness reports 100% pass rate, but this is **structural validation** — it verifies that skill SKILL.md files contain strings like "safety disclaimer" and "four-layer format". It does **not** validate that when a nurse asks "Patient in VFib arrest, what do I do?", the clinical-calculator or protocol-reference skill produces correct, complete, safe output.

This is why Phase B is blocked. The optimizer needs a **signal** — a measurable difference between good and bad harness variants. Currently, all variants score 100% because the eval doesn't test anything that varies.

---

## 2. Golden Test Suite Design

### 2.1 Current Test Suite Assessment

The existing 53 test cases in `tests/clinical/cases/` are well-structured but insufficient for dynamic evaluation:

| Dimension | Current State | Required for Phase B |
|-----------|--------------|---------------------|
| Count | 53 | 100-150 (per PRD) |
| Format | YAML with `must_contain`/`must_not_contain` | Add `expected_output` templates, `scoring_rubric` |
| Coverage | 7 skill categories | Add `shift-assessment` dynamic cases, multi-skill scenarios |
| Severity distribution | 22 critical, 22 high, 6 medium, 3 low | Good — maintain this ratio |
| Cross-skill cases | 3 (`cross-001` through `cross-003`) | Need 10+ |
| Edge cases | 5 (`edge-001` through `edge-005`) | Need 15+ |
| Correctness cases | 5 (`safety-001` through `safety-005`) | Need 20+ (these are the veto set) |

### 2.2 Golden Test Suite Architecture

A golden test suite for clinical CDS must validate three layers:

```
Layer 1: Structural (current — working)
  ├─ Skill files contain safety disclaimers
  ├─ Four-layer format references present
  ├─ Completeness checklists exist
  └─ HITL requirements declared

Layer 2: Content (blocked — needs model API)
  ├─ must_contain: correct clinical information present
  ├─ must_not_contain: dangerous/incorrect information absent
  ├─ Confidence scores within expected ranges
  └─ Provenance citations accurate and version-current

Layer 3: Behavioral (future — needs trace infrastructure)
  ├─ Routing correctness: does ambiguous input route to right skill(s)?
  ├─ Cross-skill triggers: does GCS≤8 suggest airway protocol?
  ├─ Latency: does response complete within SLA?
  └─ Regression: does candidate N-1 pass on cases candidate N failed?
```

### 2.3 Test Case Schema Enhancement

Current schema:
```yaml
test_id, skill, description, input.clinical_context,
expected.{must_contain, must_not_contain, confidence, provenance},
severity, author, date
```

Required additions for dynamic eval:
```yaml
test_id: acls-001
skill: protocol-reference
description: "VFib cardiac arrest — defibrillation priority"
input:
  clinical_context: "Patient in cardiac arrest, monitor shows ventricular fibrillation."
  # NEW: explicit query as nurse would ask
  user_query: "Code blue, VFib on monitor. What's the protocol?"
expected:
  must_contain: [defibrillation, shock, CPR, epinephrine]
  must_not_contain: [amiodarone first, synchronized]
  # NEW: weighted scoring rubric for partial credit
  scoring_rubric:
    critical_items: [defibrillation priority, unsynchronized shock, CPR cycles]
    important_items: [epinephrine timing, amiodarone after 3rd shock]
    nice_to_have: [post-ROSC care, reversible causes]
  # NEW: expected confidence tier
  expected_confidence_tier: 1  # national guideline
  # NEW: routing validation
  expected_routing:
    primary_skill: protocol-reference
    secondary_skills: [clinical-calculator]  # for NIHSS if neuro involvement
    cross_skill_triggers: [post-ROSC assessment]
severity: critical
clinical_veto: true  # explicit tagging for veto subset
author: shane
date: '2026-03-31'
```

### 2.4 Clinical Accuracy Veto Subset

The 22 critical-severity cases form the clinical accuracy veto set. These must be explicitly tagged and checked first:

| Case | Scenario | Veto Condition |
|------|----------|---------------|
| safety-001 | Hyperkalemia K 7.2 | Missing calcium gluconate stabilization |
| safety-002–005 | Various emergencies | Missing first-line intervention |
| acls-001–008 | Cardiac arrest rhythms | Wrong defibrillation type, wrong drug order |
| stroke-001–004 | Acute stroke | Missing tPA window, wrong NIHSS handling |
| sepsis-001–004 | Sepsis bundle | Missing lactate, blood cultures, antibiotics |
| rsi-001–004 | Rapid sequence intubation | Wrong drug sequence, missing airway backup |
| edge-001–005 | Pediatric, edge cases | Adult dosing for pediatric, missing weight flag |
| cross-001–003 | Multi-skill | Missing cross-skill trigger |

### 2.5 Test Suite Expansion Strategy

Priority order for adding cases:

1. **Clinically critical gaps** (20 cases): Cover every ACLS rhythm, every sepsis bundle step, every stroke protocol element, every RSI drug sequence
2. **Cross-skill scenarios** (10 cases): Sepsis + calculator (SOFA), stroke + calculator (NIHSS), cardiac arrest + drug lookup (epinephrine dosing)
3. **Edge cases** (15 cases): Pediatric dosing, renal impairment, drug interactions, contraindication conflicts
4. **Routing ambiguity** (10 cases): "Patient is crashing" (needs assessment + protocol), "New admission with chest pain" (needs assessment + calculator + protocol)
5. **Format/provenance** (10 cases): Verify four-layer output, confidence tiers, source citations

---

## 3. Model Calibration Approach

### 3.1 What Calibration Means for Clinical CDS

Model calibration = the correlation between stated confidence and actual correctness. In clinical CDS, this is clinically critical:

- **Overconfident wrong answer** = nurse trusts incorrect guidance → patient harm
- **Underconfident right answer** = nurse ignores correct guidance → missed opportunity
- **Well-calibrated** = confidence proportional to actual correctness

### 3.2 Calibration Measurement

```
For each golden test case:
  1. Run skill → get output with confidence signal
  2. Score correctness against golden answer (0-1)
  3. Extract stated confidence (0-1 or tier label)
  4. Compute: calibration_error = |stated_confidence - actual_correctness|

Aggregate metrics:
  - Expected Calibration Error (ECE): weighted average of |confidence - accuracy| across bins
  - Brier Score: mean squared error of confidence predictions
  - Reliability diagram: plot confidence bins vs. actual accuracy
  - Overconfidence rate: % of cases where confidence > correctness
  - Underconfidence rate: % of cases where confidence < correctness
```

### 3.3 Calibration Improvement Loop

```
Iteration N:
  1. Run golden suite → collect (confidence, correctness) pairs
  2. Identify systematic calibration errors:
     - Which skills are consistently overconfident?
     - Which confidence tiers are mislabeled?
     - Are there specific clinical domains where confidence is wrong?
  3. Proposer modifies:
     - Confidence threshold values in skill prompts
     - Tier labeling criteria (when to say Tier 1 vs Tier 2 vs Tier 3)
     - Uncertainty flagging triggers (when to add [Check] markers)
  4. Re-run golden suite → measure calibration improvement
  5. Accept if: ECE improved AND no clinical regression
```

### 3.4 Confidence Tier Validation

The three-tier system needs explicit validation criteria:

| Tier | Definition | Validation Test |
|------|-----------|----------------|
| Tier 1 | National guidelines — present exactly | Output matches guideline text; confidence should be ≥0.9 |
| Tier 2 | Bedside suggestions — labeled as such | Output contains hedging language; confidence 0.6-0.8 |
| Tier 3 | Facility-specific — requires local config | Output defers to facility policy; confidence ≤0.5 |

A well-calibrated system should produce Tier 1 outputs for protocol-reference queries (ACLS, sepsis bundle) and Tier 3 outputs for facility-specific questions (hold parameters, local formulary).

---

## 4. Product-Level Proposer Prompt Design

### 4.1 Current Proposer Prompt Assessment

The existing `optimization/product/proposer-prompt.md` is well-designed for its purpose:

**Strengths:**
- Clear role definition (harness optimizer, not clinical knowledge generator)
- Counterfactual diagnosis workflow (read failure modes → trace → diagnose → propose)
- Hard constraints with automatic rejection criteria
- Priority-ordered optimization targets
- Anti-patterns section prevents common mistakes
- Output format specification (RATIONALE.md + diff/)

**Gaps:**
- No guidance on *how much* to change — risk of over-optimization
- No model-specific instructions (free-tier models may need more scaffolding)
- No explicit regression testing instructions
- Missing: how to handle conflicting failure modes
- Missing: when to stop iterating (convergence criteria)

### 4.2 Proposer Prompt v2 Recommendations

Additions needed:

```markdown
## Convergence Criteria
- Stop proposing changes to a skill when it passes all golden test cases for 3 consecutive iterations
- Stop the full cycle when no candidate improves the weighted score by >1%
- Maximum 20 iterations per cycle — then escalate to Shane for review

## Change Budget
- Maximum 3 file modifications per candidate
- Maximum 50 lines changed per file
- If a fix requires more, split into two candidates

## Conflicting Failure Modes
When two failure modes suggest opposite changes:
1. Prioritize clinically critical failures over completeness failures
2. Prioritize failures in critical-severity cases over medium-severity
3. If both are clinically critical, propose two candidates (one per fix) and let eval decide

## Regression Testing
Every candidate MUST be tested against:
1. The specific cases it aims to fix
2. The full safety veto subset (22 cases)
3. The top 10 cases the previous best candidate scored highest on

## Model-Specific Instructions (for free-tier proposers)
- Always read the full failure-modes.md before proposing
- Always check at least 3 trace files before diagnosing
- Write RATIONALE.md in this exact format:
  1. What failed (case IDs)
  2. Why it failed (trace evidence)
  3. What I'm changing (file paths + line ranges)
  4. What I expect to improve (specific case IDs)
  5. What might regress (specific case IDs + mitigation)
```

### 4.3 Proposer Prompt Self-Optimization

The proposer prompt itself should be subject to meta-optimization:

```
Track per-iteration:
  - Proposal acceptance rate (did eval accept the candidate?)
  - Average score improvement per accepted candidate
  - Constraint violation rate (did proposer break hard rules?)

If acceptance rate < 20% for 3 consecutive iterations:
  → Revise proposer prompt (too ambitious, too vague, or wrong model)
  → Try different free-tier model
  → Reduce change budget

If acceptance rate > 80% for 3 consecutive iterations:
  → Increase change budget (proposer is being too conservative)
  → Add harder test cases to expand search space
```

---

## 5. Optimization Loop Architecture

### 5.1 Current Architecture (As Designed)

```
┌─────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION CYCLE                         │
│                                                               │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐              │
│  │ Proposer │───▶│ Evaluator │───▶│ Validator │              │
│  │ (free    │    │ (golden   │    │ (Claude   │              │
│  │  tier)   │    │  suite)   │    │  review)  │              │
│  └──────────┘    └───────────┘    └─────┬────┘              │
│                                         │                     │
│                                   ┌─────▼────┐               │
│                                   │ Board Op  │               │
│                                   │ (Shane)   │               │
│                                   └──────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Traced Task Design

Each traced task needs four artifacts:

```
traces/{case-id}/
├── input-context.json      # What was fed to the skill
├── skill-output.txt         # Raw model output
├── hook-results.json        # Which hooks fired, pass/fail, timing
├── timing.json              # Latency per stage
├── eval-scores.json         # Per-metric scores from golden suite
└── metadata.json            # Model used, candidate version, timestamp
```

**Current state:** All trace directories are empty. Trace logging must be wired into the skill invocation path.

**Implementation approach:**
1. Wrap each skill invocation in `eval-harness.sh` to capture input/output
2. For live usage (not just eval), add trace logging as an optional hook
3. Store traces in `optimization/product/traces/` with case-id naming

### 5.3 Feedback Signals

The optimizer needs multiple feedback signals, not just pass/fail:

| Signal | Source | Frequency | Actionability |
|--------|--------|-----------|---------------|
| Pass/fail per case | Eval harness | Per iteration | High — direct optimization target |
| Score delta per metric | Eval harness | Per iteration | High — shows which dimension improved |
| Clinical accuracy veto trigger | Eval harness | Per iteration | Critical — immediate rejection |
| Confidence calibration error | Eval harness | Per iteration | Medium — gradual optimization |
| Trace analysis | Proposer review | Per iteration | High — drives next proposal |
| Claude validation result | Validator | Per cycle | High — final gate |
| Shane acceptance | Board operator | Weekly | Highest — production deployment |
| Token consumption | Model API | Per iteration | Medium — cost optimization |
| Latency | Timing logs | Per iteration | Low — secondary concern |

### 5.4 Iteration Cycle

```
Cycle N (product-level):
  1. Proposer reads: failure-modes.md + scores-latest.json + traces/
  2. Proposer diagnoses top 3 failure modes
  3. Proposer generates 3-5 candidates (candidate-N through candidate-N+4)
  4. Eval harness runs all candidates against golden suite
  5. Scores written to candidates/candidate-*/scores.json
  6. failure-modes.md updated with new analysis
  7. Top candidate (by weighted score, safety-clean) sent to Claude validator
  8. Claude checks: architectural invariants, safety analysis, clinical plausibility, drift
  9. Claude-approved candidate queued for Shane's weekly review
  10. Shane accepts/rejects → OPTIMIZATION-LOG.md updated
  11. If accepted: candidate becomes new baseline; if rejected: failure mode added
```

### 5.5 Cycle Cadence

| Phase | Cadence | Proposals/Cycle | Review Time |
|-------|---------|-----------------|-------------|
| Calibration (Phase B) | Manual trigger | 3-5 per model | 30 min per candidate |
| Autonomous (Phase C) | Daily | 10-20 | Claude: 5 min, Shane: weekly |
| Meta-optimization (Phase D) | Monthly | N/A | Proposer prompt revision |

---

## 6. Multi-Model Comparison Framework

### 6.1 Why Multi-Model Matters

Noah RN is model-agnostic by design (architectural invariant). The optimization loop uses free-tier models as proposers. But different models produce different quality proposals, and the clinical reasoning quality varies significantly across models.

### 6.2 Evaluation Dimensions

For each candidate model (free-tier via OpenRouter):

| Dimension | How to Measure | Target |
|-----------|---------------|--------|
| Proposal quality | % of proposals that pass eval harness | >30% |
| Constraint compliance | % of proposals that don't violate hard constraints | >90% |
| Trace analysis depth | Does RATIONALE.md cite specific trace files? | 100% |
| Clinical reasoning (validator) | Claude's assessment of proposed changes | Pass |
| Token efficiency | Tokens consumed per valid proposal | <50K |
| Latency | Time to generate proposal | <60s |
| Context window utilization | Does the model read all prior candidates? | Full |

### 6.3 Model Rotation Strategy

```
Calibration phase (Phase B):
  For each available free-tier model:
    1. Run 5 proposer iterations
    2. Measure all dimensions above
    3. Rank by: (proposal_quality × 0.4) + (constraint_compliance × 0.3) +
                (token_efficiency × 0.2) + (latency × 0.1)
    4. Keep top 2 models in rotation
    5. Drop models below 20% proposal acceptance rate

Production phase:
  - Primary model: highest-ranked
  - Fallback model: second-ranked
  - Monthly re-calibration (free-tier availability changes)
  - If primary model drops below threshold, auto-switch to fallback
```

### 6.4 OpenRouter Provider Comparison

The strategy document recommends:
1. `qwen/qwen3-coder:free` — strong code understanding
2. `google/gemma-3:free` — good instruction following
3. `meta-llama/llama-4-scout:free` — large context

Additional models to test when available:
- `anthropic/claude-haiku:free` (if offered) — best instruction following
- `mistral/mistral-large:free` (if offered) — strong reasoning
- `deepseek/deepseek-coder:free` (if offered) — strong code editing

**Clinical reasoning benchmark:** Before using a model as proposer, run it against 10 golden test cases directly (not as proposer, as the clinical skill itself). If the model's clinical reasoning accuracy is below 60%, it's not suitable even as a proposer — it won't understand the traces well enough to diagnose failures.

---

## 7. Unblock Strategy for Phase B

### 7.1 The Block Chain

```
Phase B requires:
  └─ Dynamic eval harness (runs skills against cases, validates output)
      └─ Model API endpoint (to invoke skills)
          └─ OpenRouter API key configured
      └─ Trace logging (captures input/output for each case)
          └─ Instrumentation in eval-harness.sh
  └─ Expanded golden test suite (100-150 cases)
      └─ Current: 53 cases (structural only)
      └─ Need: 100+ cases with dynamic validation criteria
```

### 7.2 Unblock Sequence (Priority Order)

**Step 1: Configure model access (1-2 hours)**
- Get OpenRouter API key
- Test connectivity with 2-3 free models
- Create a simple wrapper script: `tools/model-invoke.sh` that takes prompt + context and returns output

**Step 2: Add trace logging to eval harness (2-3 hours)**
- Modify `eval-harness.sh` to:
  - Invoke the model via wrapper script for each test case
  - Capture output to `traces/{case-id}/skill-output.txt`
  - Save input context to `traces/{case-id}/input-context.json`
  - Run `must_contain`/`must_not_contain` checks against actual output
  - Compute scores per the scoring rubric

**Step 3: Expand golden test suite (ongoing, start with 20 more)**
- Add 10 safety-critical cases (cover all ACLS rhythms, sepsis bundle steps)
- Add 5 cross-skill cases
- Add 5 edge cases
- Tag all safety cases with `safety_veto: true`

**Step 4: Run first dynamic eval (1 hour)**
- Execute `eval-harness.sh` against current skills
- Expect failures — this is the point. The 100% structural pass rate will drop.
- Document failures in `failure-modes.md`
- This produces the first real signal for the optimizer

**Step 5: Run first proposer iteration (2-3 hours)**
- Use a free-tier model to read failure-modes.md + traces
- Generate candidate-1 with targeted fixes
- Run eval harness on candidate-1
- Compare scores: did it improve?

**Step 6: Establish the loop**
- If candidate-1 improves: repeat
- If candidate-1 doesn't improve: revise proposer prompt, try different model
- After 3-5 iterations: model calibration complete

### 7.3 Minimum Viable Phase B

Don't wait for 150 test cases. The minimum to start:

- **20 test cases** (10 safety + 5 cross-skill + 5 edge)
- **1 working model** (any free-tier that passes connectivity test)
- **Basic trace logging** (input + output + score per case)
- **Proposer prompt v1** (already exists)

This is enough to run 3-5 calibration iterations and determine whether the loop works. Expand the test suite in parallel.

---

## 8. Phased Implementation Plan

### Phase A.5: Bridge (Immediate — 1-2 days)

| Task | Effort | Dependency |
|------|--------|-----------|
| Configure OpenRouter API key | 30 min | API key from OpenRouter |
| Create `tools/model-invoke.sh` wrapper | 1 hour | OpenRouter key |
| Test 3 free-tier models for basic connectivity | 30 min | Wrapper script |
| Add trace capture to `eval-harness.sh` | 2 hours | Wrapper script |
| Run first dynamic eval against 20 cases | 1 hour | Trace logging |
| Document initial failures in `failure-modes.md` | 30 min | Dynamic eval results |

### Phase B: Calibration (Week 1-2)

| Task | Effort | Dependency |
|------|--------|-----------|
| Expand golden test suite to 80+ cases | 4-6 hours | Shane's clinical input |
| Run 3-5 proposer iterations per model | 3-5 hours | Phase A.5 |
| Score models on all dimensions | 1 hour | Iteration results |
| Select top 2 models for rotation | 30 min | Model scores |
| Implement clinical accuracy veto in eval harness | 1 hour | Clinically-tagged cases |
| First Claude validation of top candidate | 30 min | Eval results |

### Phase C: Autonomous Loop (Week 3-4)

| Task | Effort | Dependency |
|------|--------|-----------|
| Wire full propose → eval → validate loop | 4 hours | Phase B |
| Establish weekly review cadence with Shane | 1 hour | Phase B |
| First accepted improvement to production | Variable | Shane's review |
| Begin company-level trace logging | 2 hours | 10+ Paperclip tasks |
| Cross-fork learning analysis | 1 hour | Both forks running |

### Phase D: Meta-Optimization (Ongoing)

| Task | Cadence | Notes |
|------|---------|-------|
| Proposer prompt revision | Monthly | Based on acceptance rate trends |
| Test suite expansion | Continuous | Every rejected candidate → new test case |
| Model rotation | Monthly | Re-calibrate with current free-tier lineup |
| Company-level optimization | Per 5-10 tasks | After sufficient trace data |
| Cross-fork analysis | Quarterly | Share patterns between forks |

---

## 9. Self-Improving Agent Architecture Patterns

### 9.1 Pattern Comparison

| Pattern | Mechanism | Cost | Clinical CDS Fit |
|---------|-----------|------|-----------------|
| **Meta-Harness** (Stanford) | Filesystem-as-context, counterfactual diagnosis | Medium (10M tokens/iter) | **Best fit** — full trace access enables precise failure diagnosis |
| **Reflexion** (Shinn et al.) | Verbal memory of mistakes across attempts | Low | Good for repeated task types (e.g., same skill, different cases) |
| **Self-Refine** (Madaan et al.) | Generate → critique → refine in single pass | Low-Medium | Good for output quality, doesn't help with harness structure |
| **CRITIC** (Gou et al.) | Tool-verified self-correction | Medium | Good for factual verification (drug doses, protocol steps) |
| **LATS** (ICML 2024) | Monte Carlo tree search over reasoning paths | High | Overkill for prompt optimization, useful for clinical reasoning |
| **autoresearch** (Karpathy) | Autonomous modify-evaluate loop | Medium | **Good operational pattern** — simple loop, clear metric |

### 9.2 Recommended Synthesis for Noah RN

Noah RN should use a **layered approach**:

```
Layer 1 (Harness optimization): Meta-Harness
  - Proposer reads full filesystem, diagnoses failures, proposes changes
  - This is the primary optimization loop

Layer 2 (Output quality): Self-Refine + CRITIC
  - Within each skill invocation, the model self-checks output
  - CRITIC-style tool verification for drug doses, calculations
  - This is a per-invocation pattern, not an optimization loop

Layer 3 (Learning from mistakes): Reflexion
  - Maintain a verbal memory of common failure modes
  - Feed this memory into the proposer prompt over time
  - This is the long-term learning mechanism

Layer 4 (Clinical reasoning): Multi-model comparison
  - Test multiple models on golden suite for clinical accuracy
  - Route queries to best-performing model per domain
  - This is the model selection layer
```

### 9.3 Key Insight: Separation of Concerns

The critical architectural decision is separating **harness optimization** (improving prompts, checklists, routing) from **clinical reasoning** (the model's actual medical knowledge). Meta-Harness optimizes the former; it cannot improve the latter. This is why:

1. The proposer must NEVER modify `knowledge/` files
2. Clinical accuracy depends on the underlying model's training data
3. The optimization loop can only improve how knowledge is presented and validated
4. Model selection (Layer 4) is how you improve clinical reasoning

This separation is already encoded in the clinical constraints — the proposer prompt explicitly forbids modifying clinical knowledge content.

---

## 10. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Free-tier models produce junk proposals | High | Medium | Claude validator catches bad proposals; clinical accuracy veto prevents regressions |
| Golden test suite insufficient to catch failures | Medium | High | Shane's clinical review is the final gate; expand test suite continuously |
| Optimization loop drifts from architectural invariants | Medium | High | Claude validator checks invariants; hard constraints in proposer prompt |
| Token costs exceed budget | Medium | Medium | Tiered model allocation; Claude only sees top 1-3 candidates |
| Over-optimization on test cases | Low | Medium | Hold-out test set; Shane's review catches overfitting |
| Company-level optimization distracts from product | Medium | Low | Defer company-level until product Phase B complete |
| OpenRouter free-tier models disappear | High | Medium | Fallback strategy; monthly re-calibration |

---

## 11. Summary

**What's done:** Phase A infrastructure is solid. The filesystem structure, proposer prompt, safety constraints, eval harness skeleton, and research strategy are all in place. The clinical router is well-designed. The golden test cases have good structure and severity distribution.

**What's blocked:** Phase B is blocked on one thing: **dynamic evaluation**. The current eval harness does structural validation (grep for keywords in SKILL.md files) but never executes skills against clinical scenarios. Without dynamic eval, there's no signal for the optimizer, no traces to analyze, and no way to distinguish good candidates from bad.

**How to unblock:** Configure OpenRouter API access, add trace logging to the eval harness, run the first dynamic evaluation, and accept that the first run will show failures. Those failures are the optimization signal. Start with 20 cases, not 150.

**The flywheel:** Once the loop runs, every iteration produces traces → traces inform proposals → proposals are evaluated → failures become new test cases → test suite expands → optimizer gets smarter. The golden test suite is the optimization objective, and Shane's clinical expertise is the essential annotator.
