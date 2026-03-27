# Shift Report Generator — Design Spec

## Purpose

Organize a nurse's verbal handoff into a structured, copy-paste-ready shift report. The skill is a clipboard — it organizes, it doesn't rewrite. The nurse's clinical voice, emphasis, and judgment are preserved.

This is not an assessment (that's Skill 1). This is the full handoff package — the story, the context, the "pay attention here" for the oncoming nurse's next 12 hours.

## Architecture

Single SKILL.md. No tools, no knowledge files. Pure prompt-driven organization — same pattern as Skill 1 (shift-assessment).

## Input

Free-text report dump. However the nurse naturally gives handoff — dense, fast, abbreviations, clinical shorthand, shop talk. Example:

> "This is John Doe in room 16, he is a 52 year old male, Full code, no isolation, being covered by the micu residents, with consults to podiatry, vascular surgery, DGMS, and palliative. Allergic to simvastatin and sulfa drugs. He was admitted on 5/2 for sepsis. So back on 4/14 he had a LLE endarterectomy and angioplasty. On 5/1 went into United ED for increased L foot pain. Got abx. Foot xray was (-). 1L bolus for hypotension. Transferred down to Butterworth for vasc sx consult. UA (+). CT a/p (+) cystitis — post procedure went into SVT then VT, RAP was called. Adenosine, then amio bolus and gtt. Increased SOB and WOB, ABG was trash. Transfer to the Med critical care. 5/2 aline placed, intubated, cvc, bicarb gtt, then went to OR for BKA. Started on Endotool. On CRRT watch and issues with his woundvac leaking — bedside cauterization x2. Hgb 6 — 2u PRBCs. Febrile, bcx pending..."

The skill accepts all of this and organizes it. It does not ask the nurse to restructure their input.

## Output Structure

Fixed 7-section format. Only populated sections are included.

### 1. PATIENT

Identification, history, and logistics. History goes right after code status — sets the clinical lens before anything else. "52M, full code, hx of asthma, colon CA, CAD, DM2, HTN, PVD" — now the oncoming nurse has context to hear everything else through.

```
PATIENT
- John Doe, Room 16
- 52M, Full code, no isolation
- Hx: asthma, colon CA, CAD, DM type 2, HTN, PVD
- Admit: 5/2, sepsis
- Team: MICU residents
- Consults: podiatry, vascular surgery, DGMS, palliative
- Allergies: simvastatin, sulfa drugs
```

### 2. STORY

The clinical narrative timeline. Chronological, cause-and-effect. This is the living document — what happened, why they're here now, notable events during stay.

```
STORY
4/14 — LLE endarterectomy and angioplasty
5/1 — United ED for increased L foot pain. Abx started. Foot xray (-). 1L bolus for hypotension.
     Transferred to Butterworth for vasc sx consult. UA (+). CT a/p (+) cystitis.
     Post-procedure → SVT → VT. RAP called. Adenosine → amio bolus and gtt.
     Increased SOB/WOB, ABG was trash. Transferred to med critical care.
5/2 — Aline placed, intubated, CVC, bicarb gtt. OR for BKA. Started on Endotool.
     CRRT watch. Woundvac leaking — bedside cauterization x2.
     Hgb 6 → 2u PRBCs. Febrile, bcx pending.
```

Preserve the nurse's clinical narrative voice. Do not rewrite into formal language. "ABG was trash" stays. The story carries meaning in how it's told.

### 3. ASSESSMENT

Systems breakdown — same 15-system format as Skill 1 (shift-assessment). Organized with the nurse's clinical judgment preserved, including emphasis and "pay attention here" language.

```
NEUROLOGICAL
- Sedated, responds to stim, RASS -3
- PERRL
- Restrained bilateral uppers
- CPOT negative on fent gtt

PULMONARY
- #8 ETT taped at 22 at the lips
- ASV, PEEP 8, 40%, breathing 22

CARDIOVASCULAR
- Sinus rhythm, rate controlled
- 1/doppler pulses, checking fem pulses on L
- Target MAP > 65

GASTROINTESTINAL
- NPO, OG to LIS
- Last BM 5/1

GENITOURINARY
- Suprapubic catheter, changed 4/15

SKIN
- Coccyx red but blanchable
- R AKA
- L BKA with woundvac, minimal output
- Turning q2, night shift bath
```

Critical findings flagged with `[!]` per Skill 1 convention.

### 4. LINES & ACCESS

All lines with location, gauge, what's running through each.

```
LINES & ACCESS
- L IJ CVC — levo 0.04 mcg/kg, insulin per Endotool (y'd with D10 at 62), maintenance line
- L FA 22g — open
- R AC 18g — open
- R wrist 20g — open
- L radial a-line (positional)
```

### 5. ACTIVE ISSUES & PLAN

The "pay attention here" section. What's trending, what to watch, pending results/consults, clinical trajectory.

```
ACTIVE ISSUES & PLAN
- [!] K climbing 5.7 — watch trend
- [!] Lactic trending back up
- [!] Last gas pO2 61
- Hgb back to 8 (was 6, got 2u PRBCs)
- Febrile, bcx pending
- Possible CRRT today — pending neph consult
- Levo parked at 0.04 mcg/kg — MAPs haven't been an issue
- Next glucose check top of the hour
- Weight for calcs: 59kg
```

### 6. HOUSEKEEPING

Offgoing nurse's status handoff — what's done, what's due.

```
HOUSEKEEPING
- All lines and bags labeled
- Catheter emptied
- Turn q2
- Night shift bath
- Weight for calcs: 59kg
```

### 7. FAMILY

Who's present, contact info, dynamics.

```
FAMILY
- Sister Phyllis at bedside
```

## Acuity Inference

Same rules as Skill 1. Inferred from input content, not asked.

- **ICU**: All 7 sections with full depth. Lines & Access fully detailed. Active Issues & Plan is critical.
- **Med-surg**: Core sections. Lines & Access simplified. Active Issues focused on discharge trajectory.
- **Outpatient**: Not applicable for shift reports.

## Gap Detection

After organizing, identify missing sections and prompt once:

```
Missing: Family, Housekeeping — add info or skip? [s]
```

Same rules as Skill 1:
- One prompt, one chance
- Nurse provides info → re-render full report
- Nurse skips → omit sections
- Adjust expectations by acuity (med-surg doesn't need detailed Lines & Access)

## Clinical Voice Preservation

This is the most important rule. The nurse's language carries clinical meaning:

- "ABG was trash" → keep it. The oncoming nurse knows what that means.
- "MAPs haven't been an issue" → keep it. That's a clinical judgment, not just a number.
- "Should be a good shift" → keep it. That's the outgoing nurse's assessment of trajectory.
- "Checking fem pulses on his left" → keep it. That's a specific instruction.
- Abbreviations stay: SVT, VT, RAP, SOB, WOB, BKA, OG, LIS, bcx, abx, sx.

The skill standardizes structure, not voice. If the output reads like a textbook instead of a nurse, the skill failed.

## Clinical Safety Disclaimer

Same rotating pool as Skills 1-3. Appended after the report.

**IMPORTANT:** Always include the disclaimer, even when gap prompt is present.

## Scope Boundaries

**In scope (v1):**
- Free-text report → organized 7-section handoff
- Clinical voice preservation
- Acuity inference
- Gap detection with skip
- Critical findings flagging
- Copy-paste-ready output

**Out of scope — future iterations:**
- Persistent patient story / sticky note (accretes across shifts)
- Guided walkthrough mode for newer nurses
- Skill 1 composition (pull in prior assessment output)
- Template parsing (uploaded report sheet PDFs)
- Cross-shift comparison (what changed since last report)

## Testing

### Skill tests (interactive via `claude --plugin-dir ./plugin`)
- Dense ICU report (the John Doe example above) → all 7 sections populated, voice preserved, critical findings flagged
- Med-surg report → simplified, appropriate depth
- Partial report (just patient ID + assessment) → gaps detected, skip option
- Verify "ABG was trash" and similar shop talk is preserved, not sanitized
- Disclaimer on every response

## Future Hooks

- Sticky note: the STORY section is designed to be the persistent element. When cross-session memory exists, this section accretes — each nurse adds notable events, the core narrative persists.
- Skill 1 composition: the ASSESSMENT section uses the same 15-system format. When skills can reference each other, Skill 4 can pull Skill 1's output directly.
- Template adaptation: the fixed 7-section structure can eventually flex to match uploaded facility report sheets while keeping the same data.
