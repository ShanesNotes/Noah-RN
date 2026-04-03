---
name: shift-assessment
skill_version: "2.0.0"
description: >-
  Organize clinical narrative into structured nursing assessment by body system.
  Use when the user says "assess my patient", "head to toe", "systems assessment",
  "organize my assessment", or provides free-text clinical findings needing structure.
scope:
  - nursing_assessment
  - head_to_toe
  - systems_assessment
  - clinical_documentation
complexity_tier: complex
required_context:
  mandatory:
    - clinical_narrative
  optional:
    - acuity_level
    - patient_weight
    - diagnosis
knowledge_sources: []
tools_used: []
output_contract:
  must_contain:
    - systems_organized_by_15_system_format
  must_preserve: nurse_clinical_language
  must_flag: critical_findings_with_bang
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - does_not_diagnose
  - does_not_fabricate_findings
  - assessment_is_snapshot_not_trend
hitl_category: "II"
---

# Shift Assessment

Transform free-text clinical narrative into a structured, systems-organized
nursing assessment. The nurse provides what they have — however they naturally
talk about their patient — and this skill organizes it into documentation-ready
format.

## 15 Assessment Systems (always in this order)

1. CODE STATUS
2. NEUROLOGICAL — LOC, orientation, pupils, motor/sensory, GCS
3. PAIN — score, location, intervention, reassessment. CPOT if non-verbal
4. PULMONARY — breath sounds, O2/device, RR, SpO2, chest tubes
5. CARDIOVASCULAR — rhythm, HR, BP/MAP, pulses, edema, hemodynamics
6. GASTROINTESTINAL — abdomen, diet/NPO, bowel function, tubes
7. GENITOURINARY — UOP, foley/void, characteristics, dialysis
8. SKIN — integrity, wounds, Braden, dressings
9. MOBILITY — activity level, assist devices, PT/OT
10. FALL RISK — score, precautions in place
11. INFUSIONS — all active drips with rates, carrier fluids
12. IV/ACCESS SITES — all lines, type, location, site condition
13. DRAINS — type, location, output characteristics and volume
14. LABORATORY/TEST RESULTS — recent/pending labs, trending values
15. SCHEDULED PROCEDURES — upcoming with times if known

## Rules

- Output is copy-paste ready. No preamble.
- Only include systems with reported data. Omit empty systems.
- Infer acuity from content. ICU indicators: vent settings, vasoactive drips,
  art line/CVP/PA values, sedation scores, paralytics, multiple invasive access.
  Don't ask — determine from what's provided.
- Flag critical findings with `[!]` prefix. Documentation marker only —
  do not ask "did you notify the provider?"
- After organizing, identify missing systems. Prompt once:
  `Missing: [list] — add info or skip? [s]`
  Adjust gap expectations by acuity — outpatient doesn't need Infusions/Drains.
- Do not add findings the nurse did not report.
- Do not diagnose, recommend interventions, or suggest orders.
- Preserve clinical shorthand. Don't expand abbreviations unless ambiguous.

## Critical Flag Thresholds

- MAP < 65, SBP < 90, new arrhythmias, HR > 150 or < 40
- GCS drop, new focal deficit, unequal/fixed pupils
- SpO2 < 90, RR > 30 or < 8
- Lactate > 4, K+ > 6 or < 3, troponin positive, INR > 5, pH < 7.2
- Active hemorrhage, acute change from baseline

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

## Tier Assignments

- Nurse-reported objective findings: Tier 1 (data as provided)
- Clinical interpretations and critical flags: Tier 2 (bedside guidance)
- Assessment framework: Tier 1 (standard nursing practice)
- Facility-specific thresholds: Tier 3 (per facility protocol)

Provenance source: "nurse-provided assessment data (current)"
