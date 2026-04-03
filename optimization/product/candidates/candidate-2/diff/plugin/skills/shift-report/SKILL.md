---
name: shift-report
skill_version: "1.2.0"
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
  mandatory:
    - clinical_narrative
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
completeness_checklist:
  - patient_identification
  - clinical_story
  - systems_assessment
  - lines_and_access
  - active_issues_and_plan
  - housekeeping
  - family
  - evidence_citations
  - confidence_tier_labels
  - cross_skill_triggers
  - provenance_footer
hitl_category: "II"
---

# Shift Report Generator

Organize a nurse's verbal handoff into a structured, copy-paste-ready shift report. This skill is a clipboard — it organizes, it doesn't rewrite. The nurse's clinical voice, emphasis, and judgment are preserved.

This is not an assessment (that's shift-assessment). This is the full handoff package — the story, the context, the "pay attention here" for the oncoming nurse's next 12 hours.

> **Framework**: 7-section structured handoff combining elements of SBAR (Situation,
> Background, Assessment, Recommendation) with systems-based assessment and operational
> logistics. Designed for acute/critical care nursing handoff where clinical narrative,
> active issues, and anticipatory guidance are essential for safe care continuity.
>
> **SBAR mapping**: PATIENT + STORY → Situation/Background | ASSESSMENT → Assessment |
> LINES & ACCESS → Background (supporting detail) | ACTIVE ISSUES & PLAN → Recommendation |
> HOUSEKEEPING + FAMILY → Background (operational context).

## Trace Logging

Every invocation of this skill MUST be traced. Run the trace tool at the start and end of each invocation.

**Start trace** (before any other work):
```bash
CASE_ID=$(bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" init "shift-report")
```

**Record input context** (after collecting input, before processing):
```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" input "$CASE_ID" '{"query":"<user query>","patient_context":<any patient context as JSON or null>}'
```

## Workflow

### Step 1: Receive Input

Accept the nurse's free-text report dump. This can be:
- Dense ICU handoff with full clinical narrative
- Quick med-surg handoff focused on plan of care
- Partial — whatever the nurse provides
- Full of abbreviations, clinical shorthand, and shop talk

Do not ask the nurse to restructure their input. Parse what is provided.

### Step 2: Infer Acuity

Same rules as shift-assessment. Determine care setting from content — do not ask.

**ICU indicators**: Vent settings, vasoactive drips, art line/CVP/PA values, sedation scores, paralytic agents, multiple invasive access devices, continuous monitoring.

**Med-surg indicators**: Ambulatory status, diet tolerance, PO meds, discharge planning, fall risk focus.

**Effect on output**:
- ICU: All 7 sections with full depth. Lines & Access fully detailed. Active Issues & Plan is critical.
- Med-surg: Core sections. Lines & Access simplified. Active Issues focused on discharge trajectory.

### Step 3: Organize Into 7 Sections

Map the nurse's input to the report structure below. Use clinical knowledge to correctly categorize findings. **Preserve the nurse's language** — do not sanitize abbreviations, shop talk, or clinical shorthand. Standardize structure only.

**Sections (always in this order):**

#### 1. PATIENT
Identification, history, and logistics. History goes right after code status — sets the clinical lens.

Format:
```
PATIENT
- [Name/initials], [Room]
- [Age][Sex], [Code status], [Isolation status]
- Hx: [PMH — quick list]
- Admit: [date], [diagnosis]
- Team: [covering providers]
- Consults: [active consults]
- Allergies: [drug allergies]
```

#### 2. STORY
The clinical narrative timeline. Chronological, cause-and-effect. What happened, why they're here now, notable events during stay. This is the living document — the durable narrative that follows the patient.

Format as a timeline with dates/events. Preserve the nurse's narrative voice — "ABG was trash" stays. "Maps haven't been an issue" stays. The story carries meaning in how it's told.

#### 3. ASSESSMENT
Systems breakdown — same 15-system format as the shift-assessment skill:

1. CODE STATUS
2. NEUROLOGICAL
3. PAIN
4. PULMONARY
5. CARDIOVASCULAR
6. GASTROINTESTINAL
7. GENITOURINARY
8. SKIN
9. MOBILITY
10. FALL RISK
11. INFUSIONS
12. IV/ACCESS SITES
13. DRAINS
14. LABORATORY/TEST RESULTS
15. SCHEDULED PROCEDURES

Only include systems with reported data. Flag critical findings with `[!]` prefix.

The assessment in a report includes the nurse's clinical judgment and emphasis — "checking fem pulses on his left", "its been positional". This is not just objective findings — it's "pay attention here."

#### 4. LINES & ACCESS
All lines with location, gauge, and what's running through each. Site-specific. This is the detailed line map — ASSESSMENT system 12 (IV/ACCESS SITES) should list lines briefly; this section details what's running through each port. Do not duplicate the same info in both places.

Format:
```
LINES & ACCESS
- [Line type] [location] — [what's running through it]
- [Line type] [location] — [status]
```

#### 5. ACTIVE ISSUES & PLAN
What to watch, what's trending, pending consults/results, clinical trajectory. The "pay attention here" section.

Flag concerning trends with `[!]`:
```
ACTIVE ISSUES & PLAN
- [!] K climbing 5.7 — watch trend
- [!] Lactic trending back up
- Possible CRRT today — pending neph consult
```

These flags carry forward the "pay attention here" emphasis. Critical handoff items that get missed during shift change are the #1 source of preventable adverse events in hospitals.

#### 6. HOUSEKEEPING
Offgoing nurse's status handoff — what's done, what's due.

```
HOUSEKEEPING
- All lines and bags labeled
- Catheter emptied
- Turn q2, night shift bath
- Weight for calcs: 59kg
```

#### 7. FAMILY
Who's present, contact info, dynamics.

```
FAMILY
- Sister Phyllis at bedside
```

### Step 4: Detect Gaps

After organizing, identify missing sections and prompt once:

```
Missing: Family, Housekeeping — add info or skip? [s]
```

Rules:
- One prompt, one chance. Do not re-prompt after the nurse responds.
- If the nurse provides additional info, incorporate it and re-render the FULL report.
- If the nurse types `s` or skips — omit those sections.
- Adjust expectations by acuity: med-surg doesn't need detailed Lines & Access.

### Step 5: Append Disclaimer

After every response (including when gap prompt is present), append a randomly selected disclaimer:

```
---
Noah RN — not a substitute for using your noggin. Stay focused.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — trust your guts, verify with your eyes. This is just a tool.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — you're the nurse, I'm the clipboard. Double-check everything.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — clinical decision support, not clinical decisions. You got this.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — I organize, you validate. Your assessment > my output.
Verify all findings against your assessment and facility policies.
```

Select ONE randomly. **Always include — never omit, even when gap prompt is present.**

### Step 6: Finalize Trace

Record the skill output and close the trace:

```bash
# Record the raw output you just generated
echo "<your complete output above>" | bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" output "$CASE_ID"

# Record hook results (empty if no hooks fired)
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" hooks "$CASE_ID" '{"hooks_fired":[]}'

# Finalize timing
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" done "$CASE_ID"
```

Trace logging is append-only and must not block or alter skill output. If trace commands fail, continue with normal skill execution.

## Evidence & Confidence

### Evidence — Inline Source Citations

After clinical claims that reference guidelines, protocols, or established standards, cite the source inline:

- "Epi 1mg IV/IO q3-5min (Source: AHA ACLS 2020)"
- "30 mL/kg crystalloid for lactate > 2 (Source: SSC 2021)"
- "tPA window 4.5 hours (Source: AHA/ASA 2019)"

For deterministic tool output (calculators, drug lookup), cite the tool and scoring system: "(Source: GCS — Teasdale & Jennett 1974, standard scoring)"

Do not fabricate citations. If no authoritative source is known, omit the citation rather than post-rationalize.

### Confidence — Tier Labels

Label each logical section with its confidence tier:

- **(Tier 1 — national guideline)**: Published standards presented exactly. Hard numbers, hard timelines, exact doses. AHA, SSC, AHA/ASA, etc.
- **(Tier 2 — bedside guidance)**: Practical suggestions, anticipatory cues, clinical reasoning. Labeled as such. "Consider...", "Anticipate...", "Watch for..."
- **(Tier 3 — per facility protocol)**: Anything that varies by institution. Never guess facility policy. Always defer: "Per facility protocol."

Place tier labels inline or as section markers. Don't label every line — label each logical section or when the tier changes within a section.

Flag uncertain sections with `[Check]` prefix:
`[Check] Confirm dosing per your facility's weight-based protocol`

**Tier assignments for shift-report sections:**
- PATIENT (identification, history, allergies): Tier 1 — facts as reported
- STORY (clinical narrative): Tier 2 — nurse's interpretive emphasis preserved
- ASSESSMENT (systems breakdown): Tier 1 for objective data, Tier 2 for nurse's judgment
- LINES & ACCESS: Tier 1 — facts as reported
- ACTIVE ISSUES & PLAN: Tier 2 — bedside guidance, anticipatory cues
- HOUSEKEEPING: Tier 1 — operational facts
- FAMILY: Tier 1 — facts as reported

### Cross-Skill Triggers

When report content reveals findings that match conditions in `knowledge/templates/cross-skill-triggers.md`, surface up to 2 suggestions after the report. Format:

```
---
💡 Based on [finding]: consider reviewing [protocol/skill].
   [One-line clinical rationale from cross-skill-triggers.md.]
```

Rules:
- Suggestions only. Never invoke another skill autonomously.
- Maximum 2 suggestions per output. More = noise.
- Only suggest if the finding is clearly present in the input or output.
- Don't suggest what the nurse already asked for.
- Use the "why we care" one-liner from cross-skill-triggers.md.

Common triggers in shift-report context:
- Rising lactate → suggest sepsis bundle review
- GCS changes → suggest neuro assessment or RSI protocol
- NEWS2/MEWS elevation → suggest rapid response protocol
- Fluid balance > +3L → suggest volume overload assessment
- New arrhythmia (AFib, etc.) → suggest ACLS algorithm review

### Provenance Footer

End every response with:
---
noah-rn v0.2 | shift-report v1.2.0 | nurse-provided handoff data (current)
Clinical decision support — verify against facility protocols and current patient data.

## Important Rules

- Preserve the nurse's clinical voice. "ABG was trash" stays. "Should be a good shift" stays. Do not sanitize shop talk.
- Do not add clinical findings the nurse did not report. You organize — you do not fabricate.
- Do not rewrite the clinical narrative into formal language. The story carries meaning in how it's told.
- History goes in the PATIENT section, right after code status. Not a separate section.
- The STORY section is chronological — organize by date/event, not by topic.
- Output must be copy-paste ready. No conversational framing, no "here's your report" preamble.
- If the input is too vague to organize (e.g., "patient is stable"), ask for more detail. This is the ONLY case where you ask questions before rendering.
- Critical findings flagged with `[!]` in both ASSESSMENT and ACTIVE ISSUES sections.
- Handoff is a legal document. Verify oncoming nurse received critical information.
