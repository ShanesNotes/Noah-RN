# Shift Assessment Workflow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shift-assessment skill — a SKILL.md that transforms free-text clinical narrative into a structured 15-system nursing assessment.

**Architecture:** Single SKILL.md file that instructs Claude on the complete workflow: parse input, organize by body system, infer acuity, flag critical findings, detect gaps, prompt once with skip option, render structured output with rotating disclaimer. All logic lives in the prompt — no external code or tools.

**Tech Stack:** Claude Code plugin skill (SKILL.md with YAML frontmatter). Tested via `claude --plugin-dir ./plugin`.

**Spec:** `docs/superpowers/specs/2026-03-26-shift-assessment-design.md`

---

### Task 1: Write the SKILL.md

**Files:**
- Create: `plugin/skills/shift-assessment/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p plugin/skills/shift-assessment
```

- [ ] **Step 2: Write the complete SKILL.md**

Create `plugin/skills/shift-assessment/SKILL.md` with the following content:

````markdown
---
name: shift-assessment
description: This skill should be used when the user asks to "assess my patient", "organize my assessment", "shift assessment", "head to toe", "systems assessment", "structure my notes", or provides free-text clinical narrative that needs to be organized into a structured nursing assessment by body system.
---

# Shift Assessment Workflow

Transform free-text clinical narrative into a structured, systems-organized nursing assessment. The nurse provides what they have — however they naturally talk about their patient — and this skill organizes it into documentation-ready format.

## Workflow

### Step 1: Receive Input

Accept the nurse's free-text clinical narrative. This can be:
- Dense ICU-style with abbreviations and clinical shorthand
- Casual med-surg description
- Partial — just a few systems mentioned
- Any combination of the above

Do not ask clarifying questions about the input. Parse what is provided.

### Step 2: Infer Acuity

Determine the care setting from input content. Do not ask the nurse to specify.

**ICU indicators** (any of these → ICU depth):
- Ventilator settings (AC, SIMV, PS, CPAP with specific parameters)
- Vasoactive drips (levophed, vasopressin, epinephrine, dobutamine, milrinone)
- Arterial line, CVP, PA catheter values
- Sedation scores (RASS, SAS) or sedation drips (propofol, precedex, fentanyl/midazolam gtts)
- Paralytic agents (cisatracurium, rocuronium, vecuronium)
- Multiple invasive access devices
- Continuous hemodynamic monitoring parameters

**Med-surg indicators** (absent ICU indicators + any of these):
- Ambulatory status, gait description
- Diet tolerance, PO medication use
- Discharge planning language
- PRN medication usage patterns
- Fall risk as a primary concern

**Outpatient indicators** (absent inpatient indicators + any of these):
- Chief complaint focus without continuous monitoring
- No lines, drains, or devices
- Clinic or office visit language

**Effect on output depth:**
- ICU: All 15 systems potentially active. Expect granular hemodynamics, vent parameters, drip rates, full line inventory.
- Med-surg: Core systems active. Simplify to basic vitals, functional status, discharge readiness. Infusions/Lines/Drains often minimal or absent.
- Outpatient: Focus to relevant systems only based on chief complaint. Omit systems with no clinical relevance to the visit.

### Step 3: Organize Into Systems

Map the nurse's input to the 15 assessment systems below. Use clinical knowledge to correctly categorize findings. Preserve the nurse's clinical language — do not sanitize abbreviations or rewrite their phrasing. Standardize formatting only (bullets, system headers).

**Systems (always in this order):**

1. **CODE STATUS** — Full code, DNR, DNI, comfort care, POLST. Always first.
2. **NEUROLOGICAL** — LOC, orientation, pupils, motor/sensory, GCS, NIHSS if applicable.
3. **PAIN** — Score, location, intervention, reassessment. CPOT if non-verbal.
4. **PULMONARY** — Breath sounds, O2/device, RR, SpO2, cough/secretions, chest tubes.
5. **CARDIOVASCULAR** — Rhythm, HR, BP/MAP, pulses, edema, hemodynamics if applicable.
6. **GASTROINTESTINAL** — Abdomen exam, diet/NPO, bowel function, tubes (NGT/OGT/PEG).
7. **GENITOURINARY** — UOP, foley/void, color/characteristics, dialysis if applicable.
8. **SKIN** — Integrity, wounds, pressure injury risk (Braden), dressings.
9. **MOBILITY** — Activity level, assist devices, PT/OT status.
10. **FALL RISK** — Score (Morse/Hendrich/Hester-Davis), precautions in place.
11. **INFUSIONS** — All active drips with rates, carrier fluids.
12. **IV/ACCESS SITES** — All lines — type, location, site condition.
13. **DRAINS** — Type, location, output characteristics and volume.
14. **LABORATORY/TEST RESULTS** — Recent and pending labs, trending values.
15. **SCHEDULED PROCEDURES** — Upcoming procedures, tests, consults with times if known.

### Step 4: Flag Critical Findings

Prefix any finding that warrants immediate clinical attention with `[!]`. This is a documentation marker only. Do NOT prompt the nurse about whether they've taken action — no "did you notify the provider?" questions.

**Flag when you see:**
- Hemodynamic instability: MAP < 65, SBP < 90, new arrhythmias, HR > 150 or < 40
- Neurological changes: GCS drop, new focal deficit, unequal or fixed pupils, acute AMS
- Respiratory compromise: SpO2 < 90, RR > 30 or < 8, acute desaturation, vent alarming
- Significant lab values: lactate > 4, K+ > 6 or < 3, troponin positive, INR > 5, pH < 7.2
- Active hemorrhage, hemodynamic instability requiring escalation
- New skin breakdown over large area, suspected deep tissue injury
- Acute change from baseline in any system

### Step 5: Detect Gaps

Identify which of the 15 systems have no data from the nurse's input. Present the missing systems in a single prompt with a skip option:

```
Missing: [list of missing systems] — add info or skip? [s]
```

Rules:
- One prompt, one chance. Do not re-prompt after the nurse responds.
- If the nurse provides additional info, incorporate it and re-render the FULL assessment.
- If the nurse types `s`, presses enter, or says skip — omit those systems from the output.
- Adjust gap expectations by acuity: outpatient assessments should NOT flag missing ICU-specific systems (Infusions, IV/Access, Drains) as gaps.

### Step 6: Render Output

Produce the final structured assessment. Format:

```
[SYSTEM NAME]
- Finding 1
- [!] Critical finding with flag
- Finding 3
```

Only include systems that have data. Omit skipped/empty systems entirely.

After the assessment, append a randomly selected disclaimer from this pool:

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

Select ONE disclaimer randomly per invocation. Do not repeat the same one consecutively.

## Important Rules

- Preserve the nurse's clinical shorthand. Do not expand abbreviations unless ambiguous.
- Do not add clinical findings the nurse did not report. You organize — you do not fabricate.
- Do not diagnose, recommend interventions, or suggest orders.
- Do not ask "did you notify the provider?" or any follow-through questions for critical findings.
- Output must be copy-paste ready. No conversational framing, no "here's your assessment" preamble.
- If the input is too vague to organize (e.g., "patient is fine"), ask for more detail. This is the ONLY case where you ask questions before rendering.
````

- [ ] **Step 3: Commit the skill**

```bash
git add plugin/skills/shift-assessment/SKILL.md
git commit -m "feat: add shift-assessment skill (Phase 1, Skill 1)"
```

---

### Task 2: Validate Plugin Structure

- [ ] **Step 1: Validate the plugin still loads with the new skill**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

- [ ] **Step 2: Verify skill is discovered**

```bash
claude --plugin-dir ./plugin --print 'skills' 2>/dev/null || echo "Check manually: launch claude --plugin-dir ./plugin and verify noah-rn:shift-assessment appears in skill list"
```

If `--print` is not a valid flag, verify manually by launching an interactive session with `claude --plugin-dir ./plugin` and confirming the skill appears.

---

### Task 3: Test — Dense ICU Scenario

**Purpose:** Verify the skill handles complex ICU-level input with abbreviations, multiple systems, critical findings, and high acuity.

- [ ] **Step 1: Launch plugin session and invoke skill with this input:**

```
72 year old male, full code. Intubated on AC 16/500/5/40%, FiO2 weaning from 60%.
RASS -2 on propofol 30mcg/kg/min and fentanyl 75mcg/hr. Pupils 3mm sluggish bilat.
MAE to command but weak on L side. BP 85/50, MAP 62 on levo 15mcg/min and vaso 0.04u/min.
NSR 90s on tele. Art line R radial, triple lumen R IJ, PIV 20g L forearm.
Foley draining dark amber 15cc/hr. Abd distended, firm, no BS. NGT to LIS draining
bilious. Skin intact, Braden 12. Bedrest. Morse 75.
Labs: lactate 5.2, K 5.8, Hgb 7.1, plt 45. CT abd at 1400.
JP R flank draining 200cc serosang. LR at 125, albumin infusing.
```

- [ ] **Step 2: Verify output against these criteria:**

| Criterion | Expected |
|-----------|----------|
| Code Status first | `CODE STATUS` section with "Full code" |
| All 15 systems populated | All systems present (this input covers all of them) |
| Acuity inferred as ICU | Granular vent params, drip rates, line inventory |
| Critical findings flagged | `[!]` on: MAP 62 (< 65), UOP 15cc/hr (low), lactate 5.2 (> 4), K 5.8 (borderline), Hgb 7.1, plt 45, absent bowel sounds with distension, L-sided weakness |
| Abbreviations preserved | "levo", "vaso", "NSR", "LIS", "serosang" kept as-is |
| Disclaimer present | One of the 5 rotating disclaimers appended |
| Copy-paste ready | No conversational preamble, just structured output |
| No gap prompt | All systems have data — no "Missing:" prompt |

- [ ] **Step 3: Note any issues for iteration in Task 6**

---

### Task 4: Test — Med-Surg Scenario

**Purpose:** Verify acuity inference for lower acuity and appropriate system depth.

- [ ] **Step 1: In the same or new plugin session, invoke with:**

```
68F, DNR/DNI. A&Ox4, pleasant and cooperative. Pain 2/10 L hip, controlled with
PO tylenol q6h. Lungs CTA bilat, RR 18, SpO2 97% on RA. HR 78 reg, BP 132/74.
Eating well, regular diet, BM x1 formed. Voiding without difficulty.
Skin intact, small bruise L forearm from prior IV. OOB to chair with 1 assist,
steady gait with walker. Morse 55, bed alarm on. Saline lock L hand, patent.
AM BMP and CBC pending. PT eval at 1000.
```

- [ ] **Step 2: Verify output against these criteria:**

| Criterion | Expected |
|-----------|----------|
| Code Status first | `CODE STATUS` with "DNR/DNI" |
| Acuity inferred as med-surg | No ICU-depth systems, simplified vitals |
| Infusions section minimal | Only saline lock mentioned (may appear under IV/Access instead) |
| Drains section absent | No drains mentioned — should be omitted or listed as gap |
| No critical findings flagged | All values are within normal range |
| Gap prompt appears | Missing systems (likely Infusions, Drains) listed with skip option |
| Disclaimer present | One of the 5 rotating disclaimers |

- [ ] **Step 3: Note any issues for iteration in Task 6**

---

### Task 5: Test — Partial/Minimal Input

**Purpose:** Verify the skill handles sparse input gracefully and prompts for gaps.

- [ ] **Step 1: Invoke with minimal input:**

```
neuro intact, lungs clear, heart regular, full code
```

- [ ] **Step 2: Verify output against these criteria:**

| Criterion | Expected |
|-----------|----------|
| Code Status present | "Full code" |
| 3 systems populated | Neurological, Pulmonary, Cardiovascular with brief entries |
| Gap prompt lists ~12 systems | All unreported systems listed with skip option |
| No fabricated findings | Skill does NOT invent details beyond what was stated |
| Acuity unclear | Should default to general/unspecified depth, not assume ICU |
| Disclaimer present | One of the 5 rotating disclaimers |

- [ ] **Step 3: Note any issues for iteration in Task 6**

---

### Task 6: Iterate on Issues

- [ ] **Step 1: Review notes from Tasks 3-5**

Collect all observed issues: incorrect system mapping, missing flags, wrong acuity inference, formatting problems, disclaimer not appearing, etc.

- [ ] **Step 2: Edit SKILL.md to address issues**

Modify `plugin/skills/shift-assessment/SKILL.md` with targeted fixes. Each fix should address a specific observed issue — no speculative improvements.

- [ ] **Step 3: Re-run the failing scenario(s) to verify the fix**

Only re-test scenarios that had issues. Don't re-run passing scenarios.

- [ ] **Step 4: Commit fixes**

```bash
git add plugin/skills/shift-assessment/SKILL.md
git commit -m "fix: address shift-assessment test feedback"
```

---

### Task 7: Final Commit and Verification

- [ ] **Step 1: Validate plugin one final time**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

- [ ] **Step 2: Verify clean git state**

```bash
git status
git log --oneline -5
```

Expected: Clean working tree, commits for skill creation and any fixes.

---

## Verification Summary

The skill is complete when:
1. `claude plugin validate ./plugin` passes
2. Dense ICU scenario produces correct 15-system output with critical findings flagged
3. Med-surg scenario infers lower acuity and adjusts depth appropriately
4. Partial input triggers gap detection with skip option
5. No fabricated clinical findings in any scenario
6. Rotating disclaimer appears on every output
7. Output is copy-paste ready (no conversational framing)
