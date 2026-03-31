# Noah RN Demo Walkthrough

Purpose: run a concise, reproducible Claude Code demo of Noah RN as one continuous ICU sepsis shift-change scenario.

This walkthrough is a synthetic composite derived from the repo's current encounter fixtures plus deterministic tool inputs. It uses the manual scenario-testing pattern documented in [tests/clinical-scenarios/README.md](../tests/clinical-scenarios/README.md) and the deterministic-first architecture described in [docs/ARCHITECTURE.md](./ARCHITECTURE.md): structured skills for bedside workflow, exact tools for math and scoring, explicit trust boundaries, and safety disclaimers.

NOA-28 acceptance checklist covered by this walkthrough:
- shift assessment workflow
- vasopressor drug-reference interaction lookup
- sepsis bundle protocol reference
- clinical calculator for GCS and APACHE II
- I&O tracking
- weight-based unit conversion
- end-of-scenario shift report
- cross-skill awareness from calculator output

Source material to keep open while you run the demo:
- [encounter-001-urosepsis.yaml](../tests/clinical-scenarios/encounters/encounter-001-urosepsis.yaml): base septic ICU handoff voice and sepsis details
- [encounter-009-rapid-response.yaml](../tests/clinical-scenarios/encounters/encounter-009-rapid-response.yaml): deterioration/escalation phrasing for the mid-scenario update
- [encounter-010-drip-calc.yaml](../tests/clinical-scenarios/encounters/encounter-010-drip-calc.yaml): deterministic drip-math and I&O walkthrough pattern
- [calc-003.yaml](../tests/clinical-scenarios/clinical-calculator/calc-003.yaml): APACHE II prompt shape; exact numeric inputs in this demo are synthetic and validated against the local calculator

## Setup

1. Validate the plugin from the repo root:

```bash
claude plugin validate ./plugin
```

2. Launch Claude Code with the plugin:

```bash
claude --plugin-dir ./plugin
```

3. Start one fresh thread for the whole walkthrough.

4. In the first message, paste this opening handoff block exactly:

```text
Hey. Good morning. I'm giving you a 62-year-old male, MICU, full code, room 10.
Allergies: simvastatin and sulfa drugs.
Team: MICU residents. Consults: urology and diabetes.

He was admitted overnight with urosepsis. In the ER his blood pressure was 80/40.
He got 2 liters of NS, they drew blood cultures before zosyn, and his lactate
went from 4.2 down to 2.8.

He's confused but redirectable. He's on 4 liters nasal cannula. Foley urine is
cloudy and amber, and output was only 85 mL over the last 4 hours.

He doesn't look like he's in pain. He's NPO, on q4 blood sugar checks, and his
wife doesn't know when his last bowel movement was.

Skin is intact. We've been turning him q2h.

Access-wise he's got a left IJ triple lumen, right radial art line, and a right
AC 20 gauge that is leaky and I don't trust.

Wife Marsha is at bedside.

Weight is 82 kg.

Active infusions now are norepinephrine 0.08 mcg/kg/min via the left IJ, NS at
100 mL/hr, and linezolid just got started for broader coverage while cultures
are pending.

For later math, the norepinephrine concentration is 4 mg in 250 mL, which is
16 mcg/mL.

Repeat lactate is due at 0800. If urine output stays marginal, flushing the
Foley is still on the to-do list.
```

5. Internet access is required for `drug-reference` because it uses OpenFDA.

Invoke skills directly as `/hello-nurse`, `/shift-assessment`, `/drug-reference`, and the other skill names used below. `plugin/commands/` is currently empty.

For every clinical step, check for the repo's expected output contract:
- copy-paste-ready structure
- inline evidence citations where applicable
- confidence/tier labeling where applicable
- provenance footer
- disclaimer

## Continuous Scenario

### Step 1: Verify the plugin

Prompt to type:

```text
/hello-nurse
```

What Noah should produce:
- A short loaded/online check for `noah-rn v0.2.0`
- Confirmation that the plugin is loaded and exposing the declared skills, tools, and hooks
- Provenance footer and disclaimer

Why it matters clinically:
- If the plugin surface is not loaded, nothing else in the workflow is trustworthy.

### Step 2: Structured bedside assessment

Prompt to type:

```text
/shift-assessment Walking into the room now. Let me give you what I see.
```

What Noah should produce:
- A system-by-system assessment, not freeform prose
- Code status first
- Neuro findings centered on confusion
- Pulmonary, cardiovascular, GI/GU, skin, lines, and infusion sections
- Hemodynamic instability and pressor dependence flagged clearly, with multiple drips surfaced in the infusion/access sections
- The active drips at this stage should be clear: norepinephrine, NS, and linezolid; if you re-run after the update, vasopressin should surface as the second pressor
- Tier/citation signals where applicable, plus provenance footer and disclaimer
- If `shift-assessment` asks for missing sections, reply `s`

Why it matters clinically:
- This is the first bedside organization pass. It should surface instability before you start deeper scoring and protocol checks.

### Step 3: Vasopressor interaction flags

Prompt to type:

```text
/drug-reference Linezolid just got added and norepinephrine is already running. What FDA-label interaction flags and bedside watch items matter with norepinephrine right now?
```

What Noah should produce:
- Recognition that norepinephrine is a high-alert vasopressor
- FDA-label interaction flags rather than a generic med summary
- Practical watch items such as severe hypertension risk with MAOI-like agents such as linezolid, arrhythmia/extravasation monitoring, and abrupt-discontinuation caution
- FDA/OpenFDA-backed framing plus disclaimer

Why it matters clinically:
- In shock, bedside questions are often about what can go wrong around the drip, not just what the drug is.

### Step 4: Sepsis bundle check

Prompt to type:

```text
/protocol-reference Sepsis bundle — run me through what's been done and what I need to verify
```

What Noah should produce:
- A separate sepsis protocol answer grounded in the loaded sepsis knowledge
- Recognition of fluids, cultures before antibiotics, antibiotics, lactate trending, and vasopressors for refractory hypotension
- Clear verify-next items without inventing local policy
- Evidence citations and tier signals where applicable, plus provenance footer and disclaimer

Why it matters clinically:
- This step ties the bedside picture back to the formal sepsis workflow and shows Noah's protocol-reference boundary.

### Step 5: Norepinephrine drip math

Prompt to type:

```text
/unit-conversion Norepinephrine ordered at 0.08 mcg/kg/min. Patient weighs 82kg. Concentration is 4mg in 250mL, which is 16 mcg/mL. What rate do I set on the pump?
```

What Noah should produce:
- Deterministic drip-rate output with the dose, concentration, and final rate clearly echoed
- Exact checkpoint: `24.6 mL/hr`
- Safety wording about concentration and pump verification plus provenance/disclaimer footer

Why it matters clinically:
- Pressor rate math is exactly the kind of calculation Noah should never hand-wave.

### Step 6: Fluid balance

Prompt to type:

```text
/io-tracker 2L NS bolus plus NS at 100 mL/hr for 4 hours. Foley output 85 mL over 4 hours. What's my balance and what do I flag?
```

What Noah should produce:
- Intake and output categorized separately
- Expected net checkpoint: `+2315 mL` if Noah parses the narrative as `2L bolus + 4 hours of maintenance NS + 85 mL urine output`
- Low urine output flagged
- Septic shock context retained, without pretending to make treatment decisions
- Copy-paste-ready output with provenance/disclaimer footer

Why it matters clinically:
- This combines resuscitation volume with poor output, which is the real bedside question: how much is in, how much is out, and what needs attention.

### Scenario Update: Deterioration

Before the next two calculator steps, paste this deterioration update into the same thread exactly:

```text
Two hours later he is worse.

His oxygen need is rising and now he's on high-flow with a high FiO2 requirement.
MAP is now 58. HR 118. RR 28. Temp 38.8.

Vasopressin 0.03 units/min was started as a second pressor.

GCS is now E2 V2 M4.

For APACHE inputs use FiO2 0.60, PaO2 72, pH 7.28, Na 132, K 5.1, Cr 2.8,
Hct 28, WBC 22, age 62, chronic 0.
```

### Step 7: GCS

Prompt to type:

```text
/clinical-calculator GCS — E2 V2 M4
```

What Noah should produce:
- Component scoring for eye, verbal, and motor
- Exact checkpoint: `GCS 8`
- A note that this is a severe impairment score, not a diagnosis
- Cross-skill awareness in the expected output shape: a suggestion to review airway/intubation or related protocol support because `GCS <= 8`
- Tier/citation signals where applicable, plus provenance footer and disclaimer

Why it matters clinically:
- A low GCS changes urgency. The value is deterministic, and the follow-on protocol suggestion tests the repo's cross-skill awareness pattern.

### Step 8: APACHE II

Prompt to type:

```text
/clinical-calculator APACHE II with Temp 38.8C, MAP 58, HR 118, RR 28, FiO2 0.60, PaO2 72, pH 7.28, Na 132, K 5.1, Cr 2.8, Hct 28, WBC 22, GCS 8, age 62, chronic 0
```

What Noah should produce:
- A deterministic APACHE II calculation using the provided physiologic inputs
- Exact checkpoint: `25`
- Output shaped as score plus interpretation/supporting components, not a wall of prose
- Tier/citation signals where applicable, plus provenance footer and disclaimer

Why it matters clinically:
- APACHE II is useful here as an acuity framing tool. The important part for the demo is exact reproducible scoring from explicit inputs.

### Step 9: End-of-scenario shift report

Prompt to type:

```text
/shift-report Organize this handoff into structured report
```

What Noah should produce:
- A 7-section end-of-scenario structured handoff
- It should use the full same-thread context: the opening handoff plus the deterioration update already pasted above
- Patient identification, code status, allergies, team, and consults at the top
- Chronological ICU story: septic admission, fluids, cultures, antibiotics, lactate trend, worsening mentation, pressor support
- Systems assessment including confusion, poor urine output, rising oxygen requirement, lines, Foley, and infusion details
- Multiple drips reflected clearly, including later vasopressin escalation as a second pressor
- Inclusion of the deterministic bedside numbers used in this scenario where relevant
- Pending labs/to-do/family sections
- Disclaimer footer; if `shift-report` asks for missing sections, reply `s`

Why it matters clinically:
- The demo should end with the bedside nurse's final deliverable: a structured handoff that packages the whole shift safely.

## Operator Notes

- Keep this as one continuous thread after the opening handoff is pasted.
- Use the exact opening handoff and deterioration update blocks above when running it.
- Judge outputs by structure and required facts, not by exact transcript wording.
- Deterministic checkpoints for this walkthrough are: `GCS 8`, `APACHE II 25`, and `24.6 mL/hr`. The I&O step should land at net `+2315 mL` if the narrative is parsed as written.
- Expect disclaimer wording to vary because several skills randomly choose from a fixed disclaimer pool.
- If `shift-report` asks for missing sections, reply `s`.
