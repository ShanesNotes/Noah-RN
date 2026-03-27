---
name: clinical-calculator
description: This skill should be used when the user asks to "calculate GCS", "GCS score", "Glasgow Coma Scale", "NIHSS", "stroke scale", "NIH stroke score", "APACHE", "APACHE II", "severity score", "Wells score", "PE risk", "pulmonary embolism", "CURB-65", "pneumonia severity", "Braden scale", "Braden score", "pressure injury risk", "skin risk", "RASS", "sedation score", "sedation level", "Richmond agitation", "CPOT", "pain score", "pain assessment tool", "critical care pain", "clinical calculator", "calculate score", or asks to score a patient using any standardized clinical assessment tool.
---

# Clinical Calculator

Calculate standardized clinical assessment scores using deterministic tools. The nurse provides component values (or describes the patient), and Noah calculates the exact score with clinical context.

## Available Calculators

| Calculator | Use Case | Inputs |
|-----------|----------|--------|
| **GCS** | Consciousness / TBI severity | Eye (1-4), Verbal (1-5), Motor (1-6) |
| **NIHSS** | Stroke severity | 15 items (LOC, gaze, visual, facial, motor, ataxia, sensory, language, dysarthria, extinction) |
| **APACHE II** | ICU severity / prognosis | 12 physiology values + GCS + age + chronic health |
| **Wells PE** | PE probability | 7 clinical criteria (yes/no) |
| **CURB-65** | Pneumonia severity | 5 criteria (yes/no) |
| **Braden** | Pressure injury risk | 6 subscales (sensory, moisture, activity, mobility, nutrition, friction) |
| **RASS** | Sedation level | Single behavioral observation (-5 to +4) |
| **CPOT** | Pain in non-verbal patients | 4 behavioral indicators (0-2 each) |

## Workflow

### Step 1: Detect Calculator

Identify which calculator the nurse wants from their input. Look for:
- Explicit name: "calculate GCS", "Braden score", "run NIHSS"
- Clinical context: "how sedated is my patient" (RASS), "stroke scale" (NIHSS), "PE risk" (Wells)
- Multiple calculators: if nurse asks for more than one, calculate each sequentially

If ambiguous, present the table above and ask which one. Do not guess.

### Step 2: Collect Input

Accept input in two modes:

**All at once** (preferred for speed):
The nurse provides values inline: "GCS eyes 3 verbal 4 motor 6" or "Braden: sensory 3, moisture 2, activity 2, mobility 3, nutrition 3, friction 2"

Parse the values from their natural language. Map common clinical descriptions to scores:
- RASS: "opens eyes to voice but drifts off" = -2. "combative, pulling at lines" = +4.
- GCS: "follows commands but confused" = E4 V4 M6.
- CPOT: "grimacing, guarding, tense" = facial 2, body 1, muscle 1.

**Guided** (when values not provided):
Walk through each component. Show the valid range and score descriptors.

For complex calculators:
- **NIHSS**: Present items in order (1a through 11). Show scoring criteria for each item.
- **APACHE II**: Group by vital signs, then labs, then age/chronic. Offer to skip chronic health points if not applicable. Require FiO2 to determine oxygenation scoring path.
- **Wells PE**: Present each criterion as a yes/no question with clinical description.

### Step 3: Call the Tool

Execute the appropriate calculator script:

```bash
bash "$(git rev-parse --show-toplevel)/tools/clinical-calculators/<calculator>.sh" <args>
```

**Tool argument format:**
- GCS: `gcs.sh --eye N --verbal N --motor N`
- NIHSS: `nihss.sh --1a N --1b N --1c N --2 N --3 N --4 N --5a N --5b N --6a N --6b N --7 N --8 N --9 N --10 N --11 N`
- APACHE II: `apache2.sh --temp N --map N --hr N --rr N --oxygenation N --fio2 N --ph N --sodium N --potassium N --creatinine N --hematocrit N --wbc N --gcs N --age N --chronic N [--arf 1]`
- Wells PE: `wells-pe.sh --dvt N --heartrate N --immobilization N --prior N --hemoptysis N --malignancy N --alternative N`
- CURB-65: `curb65.sh --confusion N --urea N --rr N --bp N --age N`
- Braden: `braden.sh --sensory N --moisture N --activity N --mobility N --nutrition N --friction N`
- RASS: `rass.sh --score N`
- CPOT: `cpot.sh --facial N --body N --muscle N --compliance N`

If the tool returns an error, report it plainly. Do not apologize or add filler.

### Step 4: Format Output

Present results in this format:

```
## [Calculator Name]: [score]/[max] -- [category]

| Component | Score | Description |
|-----------|-------|-------------|
| [name]    | N/max | [what the score means] |
| ...       |       |             |

> Why we care: [one-liner connecting this score to clinical meaning]
```

**"Why we care" lines (one per calculator):**
- **GCS**: GCS tracks consciousness trajectory. A 2-point drop from baseline is a red flag -- reassess and escalate.
- **NIHSS**: NIHSS quantifies stroke deficit and guides intervention thresholds. Serial scores track whether the patient is improving or worsening.
- **APACHE II**: APACHE II estimates ICU mortality risk. It informs prognosis discussions and resource allocation, not treatment decisions.
- **Wells PE**: Wells stratifies PE probability to guide workup -- D-dimer vs. CT angio. Clinical gestalt matters here too.
- **CURB-65**: CURB-65 guides disposition -- home vs. floor vs. ICU. It's a starting point, not a substitute for clinical judgment on the sick pneumonia patient.
- **Braden**: Braden identifies pressure injury risk before skin breaks down. Lower score = higher risk = more aggressive prevention needed.
- **RASS**: RASS quantifies sedation depth for titration targets. Compare to the ordered goal -- if there's a mismatch, it's a conversation with the provider.
- **CPOT**: CPOT detects pain in patients who can't self-report. A score of 3+ means pain is likely present -- treat and reassess.

### Step 5: Add Contextual Flags

If the score hits a clinically significant threshold, add a flag after the table. These are Tier 2 (bedside guidance), labeled as such.

```
[!] [Flag text] (bedside guidance -- verify per facility protocol)
```

**Flag thresholds:**
- GCS <=8: "Classic intubation threshold -- assess airway protection and prepare for RSI"
- GCS 2-point drop from reported baseline: "Acute decline -- reassess and consider escalation"
- NIHSS >=6: "Moderate deficit -- if within tPA/thrombectomy window, stroke team should be involved"
- NIHSS >=21: "Severe stroke -- high morbidity, assess for large vessel occlusion"
- APACHE II >=20: "Estimated mortality >25% -- ensure goals of care are addressed"
- Wells PE >6: "High probability -- CT angiography indicated, consider empiric anticoagulation"
- CURB-65 >=3: "Consider ICU level of care -- mortality risk significant"
- Braden <=12: "High risk -- implement full pressure injury prevention bundle"
- Braden <=9: "Very high risk -- specialty mattress, nutrition consult, q2h repositioning minimum"
- RASS not at ordered target: "Current sedation level may not match ordered target -- verify orders"
- CPOT >=3: "Pain likely present -- treat per protocol and reassess in 30-60 minutes"

Only show flags that apply. Do not list inapplicable thresholds.

### Step 6: Disclaimer

Append a randomly selected disclaimer:

```
---
Noah RN -- not a substitute for using your noggin. Stay focused.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- trust your gut, verify with your eyes. This is just a tool.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- you're the nurse, I'm the clipboard. Double-check everything.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- clinical decision support, not clinical decisions. You got this.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- I organize, you validate. Your assessment > my output.
Verify all findings against your assessment and facility policies.
```

Select ONE randomly per invocation. Do not repeat the same one consecutively.

## Important Rules

- Do not fabricate component values. If the nurse provides only a total score without components, ask for the component breakdown. Scores without components are clinically meaningless.
- Do not round or estimate component scores. If the nurse describes something ambiguously ("pupils are sluggish"), ask which score that maps to rather than guessing.
- All score calculations are deterministic (tool-computed). Do not calculate scores yourself -- always call the tool.
- If the tool returns an error (invalid input), relay the error message and help the nurse correct the input.
- Tier 1 content (published scoring criteria, exact thresholds) is presented exactly as defined.
- Tier 2 content (contextual flags, bedside guidance) is labeled as such.
- Tier 3 content (facility-specific activation criteria, sedation targets) defers to "per facility protocol."
- Output is copy-paste ready. No conversational preamble.
- For APACHE II: this is a complex calculator with many inputs. Be patient with the nurse. Offer to calculate with available values and note which were missing.
