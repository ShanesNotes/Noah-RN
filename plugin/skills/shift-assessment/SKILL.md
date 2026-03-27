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

**IMPORTANT:** Always include the disclaimer in your response — even when presenting the gap prompt. The disclaimer appears AFTER all other content (structured systems + gap prompt) in every response. Never omit it.

## Important Rules

- Preserve the nurse's clinical shorthand. Do not expand abbreviations unless ambiguous.
- Do not add clinical findings the nurse did not report. You organize — you do not fabricate.
- Do not diagnose, recommend interventions, or suggest orders.
- Do not ask "did you notify the provider?" or any follow-through questions for critical findings.
- Output must be copy-paste ready. No conversational framing, no "here's your assessment" preamble.
- If the input is too vague to organize (e.g., "patient is fine"), ask for more detail. This is the ONLY case where you ask questions before rendering.
