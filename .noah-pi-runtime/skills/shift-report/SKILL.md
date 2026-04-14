---
name: shift-report
skill_version: "1.1.0"
description: >-
  This skill should be used when the user asks to "organize my report", "shift report",
  "handoff report", "give report", "SBAR", "nurse report", "end of shift report", or provides
  a free-text nursing handoff that needs to be organized into a structured shift report format.
scope:
  - shift_handoff
  - nursing_report
  - sbar
  - clinical_documentation
complexity_tier: complex
required_context:
  mandatory_one_of:
    - clinical_narrative
    - patient_id
  optional:
    - acuity_level
    - patient_history
    - active_orders
knowledge_sources: []
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - does_not_fabricate_findings
  - does_not_replace_verbal_handoff_for_critical_items
contract:
  you_will_get:
    - structured seven-section shift handoff
    - four-layer output with provenance footer
    - critical finding flags and bounded cross-skill suggestions when supported by input
  you_will_not_get:
    - medication orders
    - facility-specific policy beyond explicit references
    - fabricated clinical findings
  controllable_fields:
    - acuity_level: icu | med-surg | outpatient
    - input_mode: clinical_narrative | patient_id
  use_when:
    - full shift handoff is needed
    - SBAR-style organization is needed from chart data or narrative
  do_not_use_when:
    - rapid-response protocol execution is needed
    - full head-to-toe assessment output is needed instead of handoff structure
completeness_checklist:
  - patient_identification
  - clinical_story
  - systems_assessment
  - lines_and_access
  - active_issues_and_plan
  - housekeeping
  - family
hitl_category: "II"

pi:
  status: promoted
  authoritative_source: packages/workflows/shift-report/SKILL.md
  dependencies: ./dependencies.yaml
  prompts:
    - .pi/prompts/shift-handoff.md
  input_modes:
    patient_id:
      extension: medplum-context
      tool: get_patient_context
      then: invoke_skill_with_timeline
    clinical_narrative:
      extension: none
      then: invoke_skill_directly
    missing:
      action: request_required_context
  router_scope: shift_handoff
---

# Shift Report Generator

Organize a nurse's verbal handoff into a structured, copy-paste-ready shift report. This skill is a clipboard -- it organizes, it doesn't rewrite. The nurse's clinical voice, emphasis, and judgment are preserved.

This is not an assessment (that's shift-assessment). This is the full handoff package -- the story, the context, the "pay attention here" for the oncoming nurse's next 12 hours.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, acuity convention, and universal rules.

> **Pi dependencies**: See `./dependencies.yaml` for the full declarative dependency manifest — extensions, knowledge assets, services, and router integration metadata.

> **Framework**: 7-section structured handoff combining elements of SBAR with systems-based
> assessment and operational logistics. Designed for acute/critical care nursing handoff where
> clinical narrative, active issues, and anticipatory guidance are essential for safe care continuity.

## Workflow

### Step 1: Receive Input

**Option A -- Clinical narrative (traditional):**
Accept the nurse's free-text report dump -- dense ICU handoff, quick med-surg handoff, partial, abbreviation-heavy. Do not ask the nurse to restructure their input. Parse what is provided.

**Option B -- Patient ID (MCP context assembly):**
If the nurse provides a `patient_id`, call the `get_patient_context` MCP tool with that patient_id. Use the returned timeline as the input data.

### Step 2: Infer Acuity

Determine care setting from content using the acuity convention in `packages/workflows/CONVENTIONS.md`. Do not ask.

**Effect on output:**
- ICU: All 7 sections with full depth. Lines & Access fully detailed. Active Issues & Plan is critical.
- Med-surg: Core sections. Lines & Access simplified. Active Issues focused on discharge trajectory.

### Step 3: Organize Into 7 Sections

Map the nurse's input to the report structure below. **Preserve the nurse's language** -- do not sanitize abbreviations, shop talk, or clinical shorthand. Standardize structure only.

#### 1. PATIENT
```
PATIENT
- [Name/initials], [Room]
- [Age][Sex], [Code status], [Isolation status]
- Hx: [PMH -- quick list]
- Admit: [date], [diagnosis]
- Team: [covering providers]
- Consults: [active consults]
- Allergies: [drug allergies]
```

#### 2. STORY
The clinical narrative timeline. Chronological, cause-and-effect. What happened, why they're here now, notable events during stay. Preserve the nurse's narrative voice -- "ABG was trash" stays. "Maps haven't been an issue" stays.

#### 3. ASSESSMENT
Systems breakdown -- same 15-system format as the shift-assessment skill (CODE STATUS through SCHEDULED PROCEDURES). Only include systems with reported data. Flag critical findings with `[!]` prefix. The assessment in a report includes the nurse's clinical judgment and emphasis -- "checking fem pulses on his left", "its been positional".

#### 4. LINES & ACCESS
All lines with location, gauge, and what's running through each. This is the detailed line map -- ASSESSMENT system 12 lists lines briefly; this section details what's running through each port. Do not duplicate.

```
LINES & ACCESS
- [Line type] [location] -- [what's running through it]
- [Line type] [location] -- [status]
```

#### 5. ACTIVE ISSUES & PLAN
What to watch, what's trending, pending consults/results, clinical trajectory. The "pay attention here" section. Flag concerning trends with `[!]`:

```
ACTIVE ISSUES & PLAN
- [!] K climbing 5.7 -- watch trend
- [!] Lactic trending back up
- Possible CRRT today -- pending neph consult
```

Critical handoff items that get missed during shift change are the #1 source of preventable adverse events in hospitals.

#### 6. HOUSEKEEPING
```
HOUSEKEEPING
- All lines and bags labeled
- Catheter emptied
- Turn q2, night shift bath
- Weight for calcs: 59kg
```

#### 7. FAMILY
```
FAMILY
- Sister Phyllis at bedside
```

### Step 4: Detect Gaps

After organizing, identify missing sections and prompt once:

```
Missing: Family, Housekeeping -- add info or skip? [s]
```

One prompt, one chance. Adjust expectations by acuity: med-surg doesn't need detailed Lines & Access.

## Evidence & Confidence

- Patient identification, history, and objective data are Tier 1 (facts as reported)
- Clinical narrative and nurse's interpretive emphasis are Tier 2 (clinical judgment -- preserved as reported)
- Active issues and anticipatory guidance are Tier 2 (bedside guidance)
- Facility-specific items (team names, pending consults, unit practices) are Tier 3
- Critical findings flagged with [!] in both ASSESSMENT and ACTIVE ISSUES sections
- Handoff is a legal document. Verify oncoming nurse received critical information.

## Important Rules

- Preserve the nurse's clinical voice. "ABG was trash" stays. "Should be a good shift" stays. Do not sanitize shop talk.
- Do not add clinical findings the nurse did not report. You organize -- you do not fabricate.
- Do not rewrite the clinical narrative into formal language. The story carries meaning in how it's told.
- History goes in the PATIENT section, right after code status. Not a separate section.
- The STORY section is chronological -- organize by date/event, not by topic.
- Output must be copy-paste ready. No conversational framing.
- If the input is too vague to organize (e.g., "patient is stable"), ask for more detail. This is the ONLY case where you ask questions before rendering.
- Critical findings flagged with `[!]` in both ASSESSMENT and ACTIVE ISSUES sections.
