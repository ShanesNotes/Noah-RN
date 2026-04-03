# Candidate 2 Review — Shift-Report Completeness

**Reviewer:** Rex (Chief of Research)
**Date:** 2026-04-02
**Proposer:** Forge
**Decision:** ACCEPT

---

## Validator Checklist

### Architectural Invariants

| Check | Result | Notes |
|-------|--------|-------|
| HITL Category II maintained | PASS | `hitl_category: "II"` unchanged |
| Model-agnosticism | PASS | No provider-specific calls |
| Four-layer output format | PASS | **Improved** — added evidence citations, confidence tiers, provenance footer |
| A2A readiness | PASS | Not affected |

### Safety Analysis

| Check | Result | Notes |
|-------|--------|-------|
| Prompt injection risk | PASS | Citation format is instructional, not accepting user input as citations |
| Checklist modification | PASS | 4 items added, none removed: `evidence_citations`, `confidence_tier_labels`, `cross_skill_triggers`, `provenance_footer` |
| Routing changes | PASS | No routing changes |
| Safety veto tracking | PASS | Not affected |

### Clinical Plausibility

| Check | Result | Notes |
|-------|--------|-------|
| Tier assignments | PASS | Clinically correct — PATIENT/LINES/HOUSEKEEPING/FAMILY as Tier 1 (facts), STORY/ACTIVE ISSUES as Tier 2 (interpretive), ASSESSMENT mixed |
| Cross-skill triggers | PASS | All 5 trigger examples are clinically valid (lactate→sepsis, GCS→neuro, NEWS2→rapid response, fluid balance→overload, arrhythmia→ACLS) |
| Citation examples | PASS | AHA ACLS 2020, SSC 2021, AHA/ASA 2019 — correct bodies and years |
| Max 2 suggestions limit | PASS | Reasonable constraint — not overwhelming for clinical workflow |

### Drift Detection

| Check | Result | Notes |
|-------|--------|-------|
| Scope | PASS | On-mandate — skill prompt optimization, not infrastructure |
| Architectural drift | PASS | Additive changes only, no accumulated drift |
| Candidate progression | PASS | Correct sequence: candidate-1 (infrastructure) → candidate-2 (skill prompts) |

---

## Changes Summary

| Change | Lines | Assessment |
|--------|-------|-----------|
| Version bump 1.1.0 → 1.2.0 | Frontmatter | Correct |
| +4 completeness checklist items | Frontmatter | Correct — additive only |
| SBAR↔7-section mapping added | Lines 53-55 | Good — resolves shift-report-002 test expectation |
| Inline citation format with examples | Lines 255-265 | Good — concrete, not over-prescriptive |
| Confidence tier labels + section assignments | Lines 267-287 | Good — clinically correct tier mapping |
| Cross-skill trigger format + rules + examples | Lines 289-311 | Good — well-bounded (max 2, suggestion-only) |
| Provenance footer | Lines 313-318 | Good — includes version info |
| "Handoff is legal document" moved to Important Rules | Line 330 | Good — better visibility |

---

## Issues Found

### Issue 1: Output section ordering ambiguous (MINOR)

Step 5 appends a disclaimer. Cross-skill triggers say "surface after the report." Provenance footer says "End every response." The relative ordering of these three end-of-output elements is not specified:
- Report → Cross-skill suggestions → Disclaimer → Provenance footer? Or:
- Report → Disclaimer → Cross-skill suggestions → Provenance footer?

**Recommendation:** Clarify in a future candidate. Not blocking — models will generally handle this reasonably.

### Issue 2: Critical flag criteria still undefined (GAP — not addressed)

Gap 4 from failure-modes.md: shift-report says "Flag critical findings with `[!]` prefix" but provides no criteria for what constitutes critical. Shift-assessment has explicit thresholds (MAP < 65, GCS drop, SpO2 < 90, etc.).

**Recommendation:** Address in candidate-3 or candidate-4. Add cross-reference to shift-assessment criteria or replicate them.

### Issue 3: ASSESSMENT/LINES & ACCESS duplication still vague (GAP — not addressed)

Gap 5 from failure-modes.md: "list lines briefly" in ASSESSMENT vs full detail in LINES & ACCESS is still ambiguous.

**Recommendation:** Address in a future candidate. Clarify the boundary.

---

## Quality Assessment

**Strengths:**
- Well-structured RATIONALE with counterfactual diagnosis
- All 5 addressed gaps match the briefing priorities
- Clinically sound tier assignments
- Proper "additive only" approach — no existing behavior removed
- Cross-skill trigger format is well-bounded and practical
- Version bump tracks the change

**Weaknesses:**
- Missed 2 of 7 briefed gaps (critical flag criteria, duplication resolution)
- Output section ordering could be more explicit

---

## Decision: ACCEPT

Candidate-2 is accepted for application. It addresses the highest-priority gaps (four-layer format, SBAR mapping, citations, confidence tiers, cross-skill triggers) with clinically sound, additive changes.

**Remaining gaps for future candidates:**
1. Critical flag criteria (shift-report `[!]` thresholds) — carry to candidate-3/4
2. ASSESSMENT/LINES & ACCESS duplication clarification
3. Output section ordering (disclaimer vs triggers vs provenance)

**Next step:** Engineering (Wiz/Dev/Sol) may apply `candidate-2/diff/plugin/skills/shift-report/SKILL.md` to `plugin/skills/shift-report/SKILL.md`.
