# Candidate-3 Briefing: Protocol-Reference Four-Layer Format + Citations

**From:** Rex (Chief of Research)
**To:** Forge (Product Harness Proposer)
**Date:** 2026-04-01
**Prerequisite:** Candidate-2 (shift-report) completed or in parallel

---

## Objective

Bring the protocol-reference skill into four-layer output format compliance and add inline source citations. This is the largest skill category (29 test cases) and the same format gap exists across all 8 skills — fixing it here creates a template for the rest.

## Target File

`plugin/skills/protocol-reference/SKILL.md` (179 lines)

## Specific Gaps to Address (Priority Order)

### 1. Four-Layer Output Format (HIGHEST PRIORITY)

Current output structure: Algorithm → Disclaimer → Provenance Footer (mixed order).
Required structure: Summary → Evidence → Confidence → Provenance → Disclaimer.

Template reference: `knowledge/templates/four-layer-output.md` (88 lines).

**What to add:**
- Restructure the output section to follow the four-layer template
- Summary: one-line protocol identification and applicability
- Evidence: inline citations "(Source: [body] [year])" after each clinical statement
- Confidence: tier labels "(Tier 1 — national guideline)" etc.
- Provenance: knowledge file reference footer

### 2. Inline Source Citations (HIGH — pairs with #1)

**Location:** Lines 78-90

Currently only a disclaimer is appended. Add instruction for inline citations after each clinical statement, referencing the knowledge file source.

### 3. Confidence Tier Labels (HIGH — automation bias mitigation)

**Location:** Lines 145-159

SKILL.md describes three tiers but doesn't instruct the model to label them. Add:
- "(Tier 1 — national guideline)" for ACLS, sepsis (AHA/SSC backed)
- "(Tier 2 — bedside consensus)" for RSI, rapid response
- "(Tier 3 — per facility)" for code termination, antibiotic selection, tPA consent

### 4. Cross-Skill Trigger Integration (MEDIUM)

**Location:** Line 162

Wire in `knowledge/templates/cross-skill-triggers.md`. Add instruction to:
- Check output against trigger conditions
- Surface max 1 cross-skill suggestion at end of response
- Format: "[Cross-skill] Consider [skill name]: [trigger condition met]"

### 5. Scope Validation (MEDIUM)

Add instruction for out-of-protocol queries:
- If query doesn't match any of the 5 protocols, state scope limitation clearly
- If pediatric: flag "adult protocols only — pediatric protocols not available"
- If facility-specific: flag "facility-specific — verify local policy"
- If code status: respect and incorporate into recommendations

## Hard Constraints

Same as candidate-2 briefing — see `optimization/product/analysis/candidate-2-briefing.md`.

## Output Format

Write to `optimization/product/candidates/candidate-3/`:
- `diff/protocol-reference-SKILL.md` — modified protocol-reference skill
- `RATIONALE.md` — counterfactual diagnosis and proposed fix

## Key References

- `knowledge/templates/four-layer-output.md` — required output format template
- `knowledge/templates/cross-skill-triggers.md` — 23 trigger mappings
- `knowledge/protocols/acls.md` — ACLS knowledge (93 lines)
- `knowledge/protocols/sepsis-bundle.md` — Sepsis knowledge (50 lines)
- `knowledge/protocols/acute-stroke.md` — Stroke knowledge (74 lines)
- `knowledge/protocols/rsi.md` — RSI knowledge (59 lines)
- `knowledge/protocols/rapid-response.md` — Rapid response knowledge (51 lines)
- Test cases: `tests/clinical/cases/acls-*.yaml`, `sepsis-*.yaml`, `stroke-*.yaml`, `rsi-*.yaml`, `safety-*.yaml`, `edge-*.yaml`
