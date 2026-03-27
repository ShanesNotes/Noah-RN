# Shift Assessment Workflow — Design Spec

## Purpose

Transform natural language clinical input into a structured, systems-organized nursing assessment ready to paste into documentation. This is the atomic unit of clinical documentation — a point-in-time snapshot of the patient, not a full shift report.

## Interaction Model

**Hybrid**. Nurse provides what they have in plain text — however they naturally describe their patient. Skill structures it into systems format, identifies gaps, and prompts once for missing systems with a quick skip option.

No sequential walkthrough. No mandatory fields. Meet the nurse where they are.

## Input

Free-text narrative. Examples:

- Dense ICU handoff: "72M intubated on AC 16/500/5/40, levo at 12mcg, sedated on prop and fent, RASS -2, pupils 3mm sluggish, art line R radial, triple lumen R IJ, foley draining dark amber 30cc/hr, ABG pending, lactate trending down from 6 to 3.2"
- Quick med-surg: "A&Ox4, ambulatory with steady gait, eating well, pain 3/10 controlled with PO tylenol, voiding without difficulty, IV saline lock L forearm, waiting on AM labs"
- Partial: "neuro intact, lungs clear, heart regular"

## Output Format

Structured bullets organized by body system. Only systems with reported data are populated. Critical findings flagged inline with `[!]` prefix.

```
CODE STATUS
- Full code

NEUROLOGICAL
- A&Ox4, GCS 15
- PERRL 3mm bilat
- MAE spontaneously, no focal deficits

PAIN
- 3/10, controlled with PO acetaminophen
- No non-verbal pain indicators

PULMONARY
- Vent: AC 16/500/5/40%, SpO2 94%
- Bilateral coarse crackles, diminished at bases
- ABG pending

CARDIOVASCULAR
- [!] New onset A-fib with RVR, rate 140s
- BP 90/60, MAP 70
- Pulses 2+ bilat

GASTROINTESTINAL
- Abd soft, non-tender, BS active x4
- Tolerating regular diet
- BM x1 today, formed

GENITOURINARY
- Foley draining dark amber, 30cc/hr
- UOP adequate

SKIN
- Intact, no breakdown
- Braden 16

MOBILITY
- Bedrest, HOB 30
- PT consulted

FALL RISK
- Morse score 45 (moderate)
- Bed alarm on

INFUSIONS
- Levophed 12 mcg/min via CVC
- Propofol 30 mcg/kg/min
- Fentanyl 75 mcg/hr
- NS @ 75 mL/hr

IV/ACCESS SITES
- Triple lumen R IJ — clean, dry, intact, no redness
- Art line R radial — waveform correlating
- PIV 20g L forearm — patent, no infiltration

DRAINS
- JP x1 R abdomen — 50cc serosanguinous this shift

LABORATORY/TEST RESULTS
- Lactate trending 6.0 → 3.2
- ABG pending
- AM BMP pending

SCHEDULED PROCEDURES
- CT abdomen/pelvis @ 1400
- IR drain placement tentatively tomorrow AM
```

## Systems List

| # | System | Notes |
|---|--------|-------|
| 1 | Code Status | Full code, DNR, DNI, comfort care, POLST. Always first — gets missed often |
| 2 | Neurological | LOC, orientation, pupils, motor/sensory, GCS, NIHSS if applicable |
| 3 | Pain | Score, location, intervention, reassessment. CPOT if non-verbal |
| 4 | Pulmonary | Breath sounds, O2/device, rate (RR), SpO2, cough/secretions, chest tubes |
| 5 | Cardiovascular | Rhythm, rate(HR), BP/MAP, pulses, edema, hemodynamics if applicable |
| 6 | Gastrointestinal | Abdomen exam, diet/NPO, bowel function, tubes (NGT/OGT/PEG) |
| 7 | Genitourinary | UOP, foley/void, color/characteristics, dialysis if applicable |
| 8 | Skin | Integrity, wounds, pressure injury risk (Braden), dressings |
| 9 | Mobility | Activity level, assist devices, PT/OT status |
| 10 | Fall Risk | Score (Morse/Hendrich/Hester-Davis), precautions in place |
| 11 | Infusions | All active drips with rates, carrier fluids |
| 12 | IV/Access Sites | All lines — type, location, site condition |
| 13 | Drains | Type, location, output characteristics and volume |
| 14 | Laboratory/Test Results | Recent and pending labs, trending values |
| 15 | Scheduled Procedures | Upcoming procedures, tests, consults with times if known |

## Acuity Inference

No explicit selection. Inferred from input content.

**ICU indicators**: Vent settings, vasoactive drips, art line/CVP/PA pressures, sedation scores (RASS), paralytic agents, continuous monitoring granularity, multiple access devices.

**Med-surg indicators**: Ambulatory status, diet tolerance, PO meds, discharge planning language

**Outpatient indicators**: Chief complaint focus, no continuous monitoring, no lines/devices, focused assessment on relevant systems only.

**Effect on output**:
- ICU depth: All 15 systems potentially active. Expects granular hemodynamics, vent parameters, drip rates, line inventory.
- Med-surg depth: Core systems active. Simplifies to basic vitals, functional status, discharge readiness. Lines/Drains sections often minimal or absent.
- Outpatient depth: Focuses to relevant systems only based on chief complaint. Most systems omitted.

## Gap Detection

After structuring provided input, the skill identifies systems with no data and prompts once:

```
Missing: GU, Skin, Fall Risk — add info or skip? [s]
```

- Nurse types info → skill incorporates and re-renders the full assessment
- Nurse types `s` or just presses enter → skipped systems omitted from output
- One prompt, one chance. No re-prompting for remaining gaps after the nurse responds.

## Critical Findings Flagging

Inline `[!]` prefix on any finding that warrants immediate attention. Documentation marker only — no follow-through prompting, no "did you call the doctor?" nagging.

Examples of flagged findings:
- Hemodynamic instability (MAP < 65, SBP < 90, new arrhythmias)
- Neurological changes (GCS drop, new focal deficit, pupil changes)
- Respiratory compromise (SpO2 < 90, acute desaturation, ventilator alarms)
- Significant lab values (lactate > 4, K+ > 6, troponin positive)
- Active bleeding, new skin breakdown over large area

The skill flags based on clinical significance of the reported value. It does not diagnose or recommend interventions.

## Clinical Safety Disclaimer

Appended to every output. Rotates randomly from a pool to stay human and avoid banner blindness. Tone: light, respectful of clinical judgment, never corporate. The nurse is the authority — the tool knows its place.

**Seed pool** (expand over time):

```
Noah RN — not a substitute for using your noggin. Stay focused.
Noah RN — trust your gut, verify with your eyes. This is just a tool.
Noah RN — you're the nurse, I'm the clipboard. Double-check everything.
Noah RN — clinical decision support, not clinical decisions. You got this.
Noah RN — I organize, you validate. Your assessment > my output.
```

Each is followed by: `Verify all findings against your assessment and facility policies.`

**Implementation note**: v0.1 ships with the static pool above, selected randomly per invocation. Future versions may add context-aware rotation or user-contributed lines.

## Scope Boundaries

**In scope**:
- Structuring free-text into systems assessment
- Inferring acuity from content
- Flagging critical findings
- Prompting for missing systems with skip option

**Out of scope** (belongs to other skills/phases):
- Clinical narrative / admit story (Skill 4: Shift Report)
- Code status, allergies, providers, diagnosis header (Skill 4: Shift Report)
- Patient history / PMH (Skill 4: Shift Report)
- Drug interaction checking (Skill 2: Drug Reference)
- Protocol triggering from findings (Phase 2: cross-skill intelligence)
- Cron reminders for scheduled procedures (Phase 2: tools)
- EHR integration (never — hard constraint)

## Future Hooks

- Skill 4 (Shift Report) will consume this skill's output as its systems section
- Phase 2 cross-skill awareness may trigger protocol suggestions from flagged findings
- Scheduled Procedures section is a natural integration point for cron-based reminders (Phase 2)
- Laboratory/Test Results can integrate with trending/alerting tools when built
