# Shift Report Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shift report skill that organizes a nurse's free-text handoff into a structured 7-section report, preserving clinical voice and judgment.

**Architecture:** Single SKILL.md that accepts free-text report dump, organizes into 7 sections (Patient with hx, Story, Assessment, Lines & Access, Active Issues & Plan, Housekeeping, Family), infers acuity, detects gaps, and preserves the nurse's clinical language. No tools or knowledge files.

**Tech Stack:** SKILL.md with YAML frontmatter. Tested via `claude --plugin-dir ./plugin`.

**Spec:** `docs/superpowers/specs/2026-03-26-shift-report-design.md`

---

### Task 1: Write the shift-report SKILL.md

**Files:**
- Create: `plugin/skills/shift-report/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p plugin/skills/shift-report
```

- [ ] **Step 2: Write the SKILL.md**

Create `plugin/skills/shift-report/SKILL.md`:

````markdown
---
name: shift-report
description: This skill should be used when the user asks to "organize my report", "shift report", "handoff report", "give report", "SBAR", "nurse report", "end of shift report", or provides a free-text nursing handoff that needs to be organized into a structured shift report format.
---

# Shift Report Generator

Organize a nurse's verbal handoff into a structured, copy-paste-ready shift report. This skill is a clipboard — it organizes, it doesn't rewrite. The nurse's clinical voice, emphasis, and judgment are preserved.

This is not an assessment (that's shift-assessment). This is the full handoff package — the story, the context, the "pay attention here" for the oncoming nurse's next 12 hours.

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
All lines with location, gauge, and what's running through each. Site-specific.

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
Noah RN — trust your gut, verify with your eyes. This is just a tool.
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

## Important Rules

- Preserve the nurse's clinical voice. "ABG was trash" stays. "Should be a good shift" stays. Do not sanitize shop talk.
- Do not add clinical findings the nurse did not report. You organize — you do not fabricate.
- Do not rewrite the clinical narrative into formal language. The story carries meaning in how it's told.
- History goes in the PATIENT section, right after code status. Not a separate section.
- The STORY section is chronological — organize by date/event, not by topic.
- Output must be copy-paste ready. No conversational framing, no "here's your report" preamble.
- If the input is too vague to organize (e.g., "patient is stable"), ask for more detail. This is the ONLY case where you ask questions before rendering.
- Critical findings flagged with `[!]` in both ASSESSMENT and ACTIVE ISSUES sections.
````

- [ ] **Step 3: Commit**

```bash
git add plugin/skills/shift-report/SKILL.md
git commit -m "feat: add shift-report skill (Phase 1, Skill 4)"
```

---

### Task 2: Validate plugin

- [ ] **Step 1: Validate plugin structure**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

---

### Task 3: Test — Dense ICU report

**Purpose:** Verify the skill handles a complex ICU handoff with all 7 sections, clinical narrative, and shop talk preservation.

- [ ] **Step 1: Test with the John Doe ICU report**

```bash
claude -p "Organize my report: This is John Doe in room 16, he is a 52 year old male, Full code, no isolation, being covered by the micu residents, with consults to podiatry, vascular surgery, DGMS, and palliative. Allergic to simvastatin and sulfa drugs. he was admitted on 5/2 for sepsis. So back on 4/14 he had a LLE endarterectomy and angioplasty. on 5/1 went into United ED for increased L foot pain. Got abx. foot xray was (-). 1L bolus for hypotension. transferred down to butterworth for vasc sx consult. UA (+). CT a/p (+) cystitis - post procedure went into SVT -- then VT, RAP was called. adenosine, then amio bolus and gtt. Increased SOB and WOB, ABG was trash. transfer to the Med critical care. 5/2 aline placed, intubated, cvc, bicarb gtt, then went to OR for BKA. started on Endotool. On CRRT watch and issues with his woundvac leaking - bedside cauterization x2. Hgb 6 - 2 u prbcs. febrile, bcx pending. He has a history of asthma, colon CA, CAD, DM type 2, HTN, and PVD. Neurologically sedated, responds to stim RASS -3. PERRL. Restrained bilateral uppers. CPOT negative on fent gtt. He has a #8 ETT taped at 22 at the lips, on ASV peep of 8, 40% breathing 22. He is now in sinus rhythm, rates controlled, 1/doppler pulses, checking fem pulses on his left. They want maps >65. He is NPO, OG to lis. Last bm was 5/1. He has a suprapubic catheter, changed on 4/15. Coccyx is red but blanchable, Right AKA, and now Left BKA with a woundvac, minimal output. He is being turned q2, night shift bath, his weight for calcs is 59kg. Levo is running at 0.04 mcg/kg, parked there his maps havent been an issue, he has insulin running per endotool next glucose check is at the top of the hour, and that is yd in with the d10 running at 62. then a maintenance line. Those are all running through his left IJ cvc, he also has open left FA 22, right ac 18, right wrist 20, and a left radial a line its been positional. His labs we are watching close, hgb back to 8, k is climbing 5.7, lactic is trending back up, last gas his po2 was 61. Plans for possible crrt today, pending neph consult. All your lines and bags are labeled, catheter is emptied. O and his sister is phyllis, shes at bedside" --plugin-dir ./plugin --output-format text
```

- [ ] **Step 2: Verify output against these criteria**

| Criterion | Expected |
|-----------|----------|
| PATIENT section first | Name, room, age/sex, code status, Hx inline, admit info, team, consults, allergies |
| STORY section | Chronological timeline with dates (4/14, 5/1, 5/2) |
| Voice preserved | "ABG was trash", "maps havent been an issue", "its been positional" kept |
| ASSESSMENT section | Systems format matching Skill 1 |
| LINES & ACCESS | CVC with all drips, FA, AC, wrist, a-line — site-specific |
| ACTIVE ISSUES | K 5.7, lactic trending up, pO2 61, CRRT pending flagged with [!] |
| HOUSEKEEPING | Lines labeled, catheter emptied, turn q2, bath, weight |
| FAMILY | Sister Phyllis at bedside |
| Disclaimer | Present |
| No fabrication | Nothing added beyond what nurse reported |

- [ ] **Step 3: Note any issues for Task 5**

---

### Task 4: Test — Partial report

**Purpose:** Verify gap detection and skip option.

- [ ] **Step 1: Test with minimal input**

```bash
claude -p "Organize my report: Mary Smith room 4, 72F, DNR, hx of CHF and COPD. Admitted yesterday for CHF exacerbation. She is on 2L NC, lungs with bibasilar crackles, HR 88 regular, BP 140/82. Eating well. Waiting on echo results." --plugin-dir ./plugin --output-format text
```

- [ ] **Step 2: Verify output**

| Criterion | Expected |
|-----------|----------|
| PATIENT with Hx inline | 72F, DNR, Hx: CHF, COPD |
| STORY | Brief admit narrative |
| ASSESSMENT | Pulmonary, CV, GI populated. Others missing. |
| Gap prompt | Missing sections listed with skip option |
| Acuity inferred as med-surg | Simplified depth |
| Disclaimer | Present |

- [ ] **Step 3: Note any issues for Task 5**

---

### Task 5: Iterate on issues

- [ ] **Step 1: Review notes from Tasks 3-4**

- [ ] **Step 2: Fix any issues in SKILL.md**

Edit `plugin/skills/shift-report/SKILL.md` with targeted fixes.

- [ ] **Step 3: Re-test failing scenarios**

- [ ] **Step 4: Commit fixes**

```bash
git add plugin/skills/shift-report/SKILL.md
git commit -m "fix: address shift-report test feedback"
```

---

### Task 6: Final verification and push

- [ ] **Step 1: Validate plugin**

```bash
claude plugin validate ./plugin
```

- [ ] **Step 2: Clean git state**

```bash
git status
git log --oneline -5
```

- [ ] **Step 3: Push**

```bash
git push
```

---

## Verification Summary

The skill is complete when:
1. `claude plugin validate ./plugin` passes
2. Dense ICU report produces all 7 sections with clinical voice preserved
3. Shop talk preserved ("ABG was trash", "maps havent been an issue")
4. History appears in PATIENT section after code status
5. STORY is chronological timeline
6. Partial report triggers gap detection with skip
7. Critical findings flagged with [!] in ASSESSMENT and ACTIVE ISSUES
8. Disclaimer present on every response
9. No fabricated findings
