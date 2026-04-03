# Candidate 2 — Shift-Report Completeness

**Proposer:** Forge (Product Harness Proposer)
**Date:** 2026-04-01
**Target:** `plugin/skills/shift-report/SKILL.md`

---

## Diagnosed Failure Modes

### 1. Missing four-layer format elements (completeness checklist gap)

The completeness checklist had 7 items covering structural sections (patient_identification, clinical_story, etc.) but zero items for the four-layer output format requirements. A skill can pass all 7 structural checks while completely omitting evidence citations, confidence tiers, cross-skill triggers, and provenance.

**Trace evidence:** `tests/clinical/cases/shift-report-001.yaml` requires `provenance.must_cite_source: true` and `confidence.minimum_overall: 0.7` — neither can be validated without explicit instructions in the skill prompt.

### 2. SBAR test incompatibility (shift-report-002)

Test case `shift-report-002` expects SBAR sections (situation, background, assessment, recommendation) but the skill uses a 7-section format with no SBAR mapping. The skill description mentions SBAR as a trigger keyword but never explains how the 7 sections map to SBAR components.

### 3. Evidence section vague on citation format

The existing Evidence & Confidence section describes tier concepts but doesn't provide the concrete inline citation format `(Source: [body] [year])` required by `four-layer-output.md`. Without examples, models will post-rationalize or omit citations.

### 4. Cross-skill triggers underspecified

The skill references `cross-skill-triggers.md` but gives no format guidance, no maximum suggestion count, and no common trigger examples relevant to shift-report (rising lactate, GCS changes, NEWS2 elevation).

### 5. Confidence tier assignments missing

The skill defines three tiers but doesn't assign tiers to specific sections. Without section-level tier guidance, models will either over-label (every line) or under-label (no labels).

---

## Prior Candidate Comparison

**Candidate-1** focused on eval harness infrastructure (dynamic validation, multi-provider model support). It did not modify any skill prompts. This candidate addresses the primary mandate: skill prompt optimization.

---

## Proposed Modifications

| File | Change | Why |
|------|--------|-----|
| `plugin/skills/shift-report/SKILL.md` | Add 4 completeness checklist items: `evidence_citations`, `confidence_tier_labels`, `cross_skill_triggers`, `provenance_footer` | Checklist must cover all output format requirements |
| `plugin/skills/shift-report/SKILL.md` | Add SBAR mapping in framework description | Resolves shift-report-002 test expectation |
| `plugin/skills/shift-report/SKILL.md` | Expand Evidence & Confidence with concrete citation format, section-level tier assignments, cross-skill trigger guidance with format and common examples | Addresses gaps 3-5 above |
| `plugin/skills/shift-report/SKILL.md` | Update `skill_version` to 1.2.0 | Version bump for format compliance changes |
| `plugin/skills/shift-report/SKILL.md` | Move "Handoff is a legal document" rule to Important Rules | Was buried in Evidence section, should be in rules |

### What was NOT changed
- All 7 existing sections and their formats preserved exactly
- All existing disclaimer pool unchanged
- Gap detection logic (Step 4) unchanged
- Trace logging unchanged
- Acuity inference unchanged
- No checklist items removed (only added)
- No safety disclaimers removed
- HITL Category II maintained

---

## Expected Impact

| Test Case | Expected Change | Why |
|-----------|----------------|-----|
| `shift-report-001` | Improved provenance and confidence scores | Explicit citation format and tier assignments |
| `shift-report-002` | SBAR section detection should now pass | SBAR mapping in framework description |
| All shift-report cases | Cross-skill trigger suggestions appear when relevant | Concrete trigger guidance added |

---

## Risk Assessment

**Low risk:** All changes are additive — new checklist items, expanded guidance sections, SBAR mapping. No existing behavior removed or weakened.

**Potential regression:** None expected. The SBAR mapping is purely informational (helps the model understand how sections relate to SBAR). Citation format and tier assignments are clarifications of existing four-layer requirements, not new constraints.

**Mitigation:** If citation format proves too prescriptive for certain handoff types, the examples can be made optional rather than required in a future candidate.
