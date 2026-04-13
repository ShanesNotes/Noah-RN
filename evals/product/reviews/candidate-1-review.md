# Candidate 1 Review — Dynamic Validation Harness

**Reviewer:** Rex (Chief of Research)
**Date:** 2026-04-01

> **Note (2026-04-12)**: `clinical-calculator` references below reflect pre-split state. Now split into `neuro-calculator`, `risk-calculator`, `acuity-calculator`.
**Proposer:** Forge
**Decision:** CONDITIONAL ACCEPT — fix required before application

---

## Validator Checklist

### Architectural Invariants

| Check | Result | Notes |
|-------|--------|-------|
| HITL Category II maintained | PASS | No clinical decision automation |
| Model-agnosticism | PASS | Supports OpenAI, Anthropic, Ollama |
| Four-layer output format | PASS | Not affected |
| A2A readiness | PASS | Not affected |

### Safety Analysis

| Check | Result | Notes |
|-------|--------|-------|
| Prompt injection risk | **ISSUE** | Ollama invocation (line 272-278) uses bare string interpolation instead of `json.dumps()`. Context and prompt content could break JSON or inject content |
| Checklist modification | PASS | No checklist changes |
| Routing changes | PASS | No routing changes |
| Safety veto tracking | PASS | Enhanced with separate `safety_veto` counter |

### Clinical Plausibility

N/A — infrastructure change, not clinical content.

### Drift Detection

| Check | Result | Notes |
|-------|--------|-------|
| Scope | **NOTE** | Forge modified eval infrastructure rather than skill prompts. This is outside its primary mandate (proposer-prompt.md targets skill prompts, checklists, routing, output format). Accepted as reasonable bootstrap since dynamic eval is prerequisite for meaningful optimization. |
| Architectural drift | PASS | No accumulated changes toward unintended architecture |

---

## Issues Found

### Issue 1: Ollama JSON injection vulnerability (MUST FIX)

**Location:** `diff/eval-harness.sh:272-278` (invoke_skill function, Ollama branch)

```bash
# CURRENT (vulnerable)
"prompt\": \"${skill_prompt}\\n\\nUser: ${context}\"

# FIX NEEDED — use python3 json.dumps() like OpenAI/Anthropic branches
```

The OpenAI and Anthropic code paths correctly escape content via `python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"`. The Ollama path does not, creating a JSON injection vector.

**Severity:** Medium — only affects local Ollama endpoint, but a skill prompt containing quotes or backslashes would break the JSON body.

### Issue 2: Hallucinated case counts in RATIONALE.md (cosmetic)

RATIONALE claims: 34 protocol-reference, 22 clinical-calculator, 9 drug-reference, 6 unit-conversion, 4 shift-report, 3 io-tracker, 2 hello-nurse.

Actual distribution per failure-modes.md: 25/7/5/4/2/2/2. Forge hallucinated the numbers.

**Severity:** Low — does not affect code, but indicates Forge is not reading data accurately.

### Issue 3: Hardcoded model names (minor)

- OpenAI: hardcoded `gpt-4o-mini`
- Anthropic: hardcoded `claude-3-haiku-20240307`
- Ollama: hardcoded `llama3`

These should be configurable via environment variables (e.g., `EVAL_MODEL`) for flexibility.

**Severity:** Low — functional but inflexible.

---

## Quality Assessment

**Strengths:**
- Well-structured RATIONALE.md following the required format
- Correct graceful fallback to static validation when no model is configured
- Proper per-case trace directory creation with input-context.json and hook-results.json
- Enhanced scoring with schema_v2_cases, dynamic_skip, and safety_veto tracking
- Model-agnostic design supporting 3 providers

**Weaknesses:**
- Scope creep — should have targeted skill prompts, not infrastructure
- Data hallucination in RATIONALE case counts
- Ollama JSON escaping bug

---

## Decision: CONDITIONAL ACCEPT

**Conditions for application:**
1. Fix Ollama JSON escaping to use `json.dumps()` like other providers
2. Make model names configurable via env vars (e.g., `OPENAI_EVAL_MODEL`, `ANTHROPIC_EVAL_MODEL`, `OLLAMA_EVAL_MODEL`)

**After these fixes:** Engineering (Wiz/Dev) may apply the modified eval-harness.sh to production.

**Direction for Forge candidate-2:** Focus on skill prompt optimization per proposer-prompt.md. Suggested targets:
- Analyze shift-report and shift-assessment skills for completeness gaps
- Review protocol-reference skill for clinical priority ordering
- Look for confidence calibration improvements across all skills
