# Candidate-2 Briefing: Shift-Report Completeness Optimization

**From:** Rex (Chief of Research)
**To:** Forge (Product Harness Proposer)
**Date:** 2026-04-01
**Task:** NOA-90

---

## Objective

Optimize the shift-report and shift-assessment skill prompts for completeness, four-layer format compliance, and clinical priority ordering. This is your primary mandate — skill prompt improvement.

**Do NOT modify eval infrastructure.** Candidate-1 covered that. Focus on SKILL.md files only.

## Target Files

1. `plugin/skills/shift-report/SKILL.md` (273 lines)
2. `plugin/skills/shift-assessment/SKILL.md` (261 lines)

## Specific Gaps to Address (Priority Order)

### 1. Four-Layer Output Format (HIGHEST PRIORITY)

Both skills lack explicit four-layer output instructions. The Phase 2 PRD and `docs/REGULATORY.md` require: **summary / evidence / confidence / provenance**.

**What to add:**
- After the skill's output structure, add a "Output Format Compliance" section
- Summary: one-line clinical summary of the patient
- Evidence: map each finding to its source input data
- Confidence: calibrated confidence indicator (the tests expect `confidence_minimum` values)
- Provenance: cite which knowledge files were used

**Constraint:** Do NOT remove or restructure existing output sections. Add the four-layer wrapper around them.

### 2. SBAR Mapping (HIGH PRIORITY)

`shift-report/SKILL.md` line 41 says "combining elements of SBAR" but never maps the 7 sections to SBAR.

**What to add:** An explicit mapping table:
```
| SBAR Component | Mapped Sections |
|----------------|----------------|
| Situation | PATIENT |
| Background | STORY |
| Assessment | ASSESSMENT, LINES & ACCESS |
| Recommendation | ACTIVE ISSUES & PLAN, HOUSEKEEPING, FAMILY |
```

### 3. Critical Findings Criteria (HIGH PRIORITY)

`shift-report/SKILL.md` references `[!]` flagging but defines no criteria. Shift-assessment has explicit criteria (lines 139-154).

**What to add to shift-report:** Inherit or replicate the critical flag criteria:
- Hemodynamic: MAP < 65, SBP < 90, HR > 150 or < 40, new arrhythmias
- Neurological: GCS drop, new focal deficit, unequal/fixed pupils, acute AMS
- Respiratory: SpO2 < 90, RR > 30 or < 8, acute desaturation
- Labs: lactate > 4, K+ > 6 or < 3, troponin positive, INR > 5, pH < 7.2
- Skin/Perfusion: new breakdown, mottling, acute change from baseline

### 4. Duplication Resolution (MEDIUM)

ASSESSMENT system 12 (IV/ACCESS SITES) says "list lines briefly" but LINES & ACCESS section details everything through each port.

**What to clarify:** In ASSESSMENT, reference LINES & ACCESS for detail. E.g., "List access sites only — see LINES & ACCESS for infusion details."

### 5. Copy-Paste vs Interactive Tension (MEDIUM)

Line 270 says output must be "copy-paste ready" but lines 178-189 introduce a gap prompt mid-output.

**What to clarify:** Gap prompt should be presented as a separate section AFTER the copy-paste-ready report, not interleaved.

## Hard Constraints (Violations = Automatic Rejection)

- NEVER modify files in `knowledge/` — optimize presentation, not content
- NEVER remove items from completeness checklists — only add or reorder
- NEVER lower confidence thresholds — only raise or restructure
- NEVER produce skill prompts that bypass HITL Category II review
- Every output must maintain four-layer format (summary/evidence/confidence/provenance)
- Include `RATIONALE.md` explaining diagnosis and proposed fix

## Output Format

Write to `optimization/product/candidates/candidate-2/`:
- `diff/shift-report-SKILL.md` — modified shift-report skill
- `diff/shift-assessment-SKILL.md` — modified shift-assessment skill (if changed)
- `RATIONALE.md` — counterfactual diagnosis and proposed fix

## References

- `optimization/product/analysis/failure-modes.md` — full gap analysis
- `optimization/product/candidates/candidate-1/RATIONALE.md` — prior candidate
- `optimization/product/reviews/candidate-1-review.md` — review feedback
- `tests/clinical/cases/shift-report-001.yaml` — test expectations
- `tests/clinical/cases/shift-report-002.yaml` — SBAR expectations
- `tests/clinical-scenarios/shift-assessment/assess-001.yaml` through `assess-003.yaml`
- `docs/noah-rn-phase2-prd.md` — architectural invariants
- `docs/REGULATORY.md` — four-layer format as FDA exemption basis
