---
name: shift-report
skill_version: "2.0.0"
description: >-
  Organize nurse-provided handoff into structured shift report. Use when the user
  says "organize my report", "shift report", "handoff", "give report", "SBAR",
  "end of shift", or provides free-text nursing handoff needing structure.
scope:
  - shift_handoff
  - nursing_report
  - sbar
  - clinical_documentation
complexity_tier: complex
required_context:
  mandatory:
    - clinical_narrative
  optional:
    - acuity_level
    - patient_history
    - active_orders
knowledge_sources: []
tools_used: []
output_contract:
  must_contain:
    - patient_identification
    - clinical_story
    - systems_assessment
    - lines_and_access
    - active_issues_and_plan
    - housekeeping
    - family
  must_preserve: nurse_clinical_voice
  must_flag: critical_findings_with_bang
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - does_not_fabricate_findings
  - does_not_replace_verbal_handoff_for_critical_items
hitl_category: "II"
---

# Shift Report

Organize a nurse's verbal handoff into a 7-section structured report.
This is a clipboard — it organizes, it doesn't rewrite. The nurse's clinical
voice, emphasis, and judgment are preserved.

## Sections (always in this order)

1. **PATIENT** — Name/initials, room, age/sex, code status, isolation, Hx (PMH),
   admit date/diagnosis, team, consults, allergies
2. **STORY** — Chronological clinical narrative timeline. Cause-and-effect.
   Preserve the nurse's narrative voice — "ABG was trash" stays.
3. **ASSESSMENT** — 15-system breakdown (only systems with reported data):
   Code Status, Neuro, Pain, Pulmonary, Cardiovascular, GI, GU, Skin,
   Mobility, Fall Risk, Infusions, IV/Access Sites, Drains, Labs, Procedures
4. **LINES & ACCESS** — All lines with location, gauge, and what's running.
   Detail beyond what ASSESSMENT system 12 lists.
5. **ACTIVE ISSUES & PLAN** — Trending concerns, pending items, clinical
   trajectory. The "pay attention here" section.
6. **HOUSEKEEPING** — What's done, what's due.
7. **FAMILY** — Who's present, dynamics.

## Rules

- Output is copy-paste ready. No preamble, no "here's your report."
- Infer acuity from content (ICU indicators: vents, pressors, art lines).
  Don't ask.
- Flag critical findings with `[!]` in both ASSESSMENT and ACTIVE ISSUES.
- After organizing, identify missing sections. Prompt once:
  `Missing: [list] — add info or skip? [s]`
  One prompt, one chance. If skipped, omit those sections.
- Do not add findings the nurse did not report.
- Do not sanitize clinical shorthand or shop talk.
- History goes in PATIENT section after code status.
- STORY is chronological by date/event, not by topic.

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

## Tier Assignments

- PATIENT, LINES & ACCESS, HOUSEKEEPING, FAMILY: Tier 1 (facts as reported)
- STORY: Tier 2 (nurse's interpretive emphasis preserved)
- ASSESSMENT: Tier 1 for objective data, Tier 2 for nurse's judgment
- ACTIVE ISSUES & PLAN: Tier 2 (bedside guidance, anticipatory cues)

Provenance source: "nurse-provided handoff data (current)"
