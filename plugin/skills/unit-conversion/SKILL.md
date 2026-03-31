---
name: unit-conversion
skill_version: "1.0.0"
description: >-
  This skill should be used when the user asks to "convert units", "convert mg to mcg",
  "convert kg to lbs", "convert lbs to kg", "convert Fahrenheit to Celsius",
  "convert Celsius to Fahrenheit", "convert mL to cc", "convert cc to mL",
  "convert L to mL", "convert mL to L", "convert inches to cm", "convert cm to inches",
  "weight-based dose", "dose per kg", "calculate dose for my patient", "mg/kg",
  "mcg/kg", "units per kg", "drip rate", "IV drip rate", "infusion rate", "mL per hour",
  "mcg/kg/min", "drug concentration", "titrate drip", or asks to calculate, convert,
  or verify any clinical unit, weight-based dose, or IV infusion rate.
scope:
  - unit_conversion
  - weight_based_dosing
  - drip_rate_calculation
complexity_tier: simple
required_context:
  mandatory:
    - conversion_type
    - numeric_value
  optional:
    - patient_weight_kg
    - from_unit
    - to_unit
    - dose_per_kg
    - concentration
    - conc_unit
    - dose_unit
knowledge_sources: []
limitations:
  - does_not_replace_clinical_judgment
  - unit_agnostic_warning_thresholds
  - no_pharmacokinetic_modeling
  - adult_dose_reference_only
completeness_checklist:
  - numeric_result
  - unit_labels
  - safety_context
hitl_category: "II"
---

# Unit Conversion

Deterministic unit conversion and clinical dose/rate calculation. No estimation —
if it can be computed, this skill computes it.

## Modes

This skill handles three distinct calculation types. Detect the mode from the
nurse's input, then collect the right inputs.

| Mode | When to use | Key inputs |
|------|-------------|------------|
| **dose** | Weight-based dosing (mg/kg, mcg/kg) | weight, dose/kg, unit |
| **drip** | IV infusion rate from dose + concentration | dose, concentration, optional weight |
| **unit** | Direct unit conversion (kg↔lbs, F↔C, etc.) | value, from-unit, to-unit |

## Trace Logging

Every invocation of this skill MUST be traced. Run the trace tool at the start and end of each invocation.

**Start trace** (before any other work):
```bash
CASE_ID=$(bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" init "unit-conversion")
```

**Record input context** (after collecting input, before processing):
```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" input "$CASE_ID" '{"query":"<user query>","patient_context":<any patient context as JSON or null>}'
```

## Workflow

### Step 1: Detect Mode

From the nurse's input, identify which mode applies:

- "What's the dose for my 82 kg patient at 0.5 mcg/kg?" → **dose**
- "My dopamine is 400 mg/250 mL and I need 5 mcg/kg/min for a 70 kg patient" → **drip**
- "How many lbs is 95 kg?" or "What's 38.9 C in Fahrenheit?" → **unit**

If ambiguous, present the three modes and ask. Do not guess.

### Step 2: Collect Inputs

**dose mode** — ask for (if not provided):
- Patient weight in kg (specify: "in kg, not lbs")
- Dose per kg (and unit: mg/kg, mcg/kg, units/kg, etc.)

**drip mode** — ask for (if not provided):
- Dose (amount and unit, e.g., "5 mcg/kg/min" or "100 mcg/min")
- Drug concentration (amount per mL, e.g., "400 mg in 250 mL" = 1.6 mg/mL = 1600 mcg/mL)
- Patient weight (optional — only needed for mcg/kg/min output)

**unit mode** — ask for (if not provided):
- The value to convert
- From-unit and to-unit (from supported list below)

Supported unit conversions:
- Weight: kg↔lbs (×2.20462), g↔mg (×1000), mg↔mcg (×1000)
- Volume: L↔mL (×1000), mL↔cc (1:1)
- Temperature: F↔C ((F−32)×5/9), C↔F (C×9/5+32)
- Length: in↔cm (×2.54)

If the nurse requests an unsupported conversion, tell them plainly: "That conversion
isn't supported. Supported pairs: kg↔lbs, g↔mg, mg↔mcg, L↔mL, mL↔cc, F↔C, in↔cm."

### Step 3: Call the Tool

```bash
REPO=$(git rev-parse --show-toplevel)
bash "$REPO/tools/unit-conversions/convert.sh" <subcommand> <args>
```

**dose:**
```bash
bash "$REPO/tools/unit-conversions/convert.sh" dose \
  --weight-kg <N> --dose-per-kg <N> --unit <str>
```

**drip:**
```bash
bash "$REPO/tools/unit-conversions/convert.sh" drip \
  --dose <N> --dose-unit <str> \
  --concentration <N> --conc-unit <str> \
  [--weight-kg <N>]
```

**unit:**
```bash
bash "$REPO/tools/unit-conversions/convert.sh" unit \
  --value <N> --from <str> --to <str>
```

If the tool returns an error, relay the error message exactly. Do not apologize or
add filler. Help the nurse correct the input.

### Step 4: Format Output

#### dose mode

```
## Dose Calculation

Weight:     <weight_kg> kg
Dose/kg:    <dose_per_kg> <unit>/kg
Total dose: <total_dose> <unit>

(Source: weight-based dosing — calculated, not estimated)

> Why we care: Getting the weight wrong means getting the dose wrong.
  Verify kg vs lbs before every calculation.
```

If a warning field is present:
```
[!] <warning text> (Tier 2 — bedside guidance: verify weight source and order)
```

#### drip mode

```
## Drip Rate

Dose:          <dose> <dose_unit>
Concentration: <concentration> <conc_unit>
Rate:          <rate_ml_hr> mL/hr
```

If weight was provided:
```
mcg/kg/min:    <mcg_kg_min>
```

```
(Source: rate = dose / concentration × 60, calculated)

> Why we care: Rate errors are medication errors. Double-check concentration,
  verify pump programming matches calculated rate.
```

#### unit mode

```
## Unit Conversion

<value> <from_unit>  =  <result> <to_unit>

(Source: standard conversion factor — exact)

> Why we care: mg vs mcg is a 1000x difference. The decimal point is a
  patient safety issue.
```

### Evidence & Confidence

- All calculations are Tier 1 (deterministic math — exact conversion factors and arithmetic)
- The "why we care" lines are Tier 2 (bedside guidance — labeled as such)
- Facility-specific dosing protocols, titration targets, and pump limits are Tier 3 — defer to "per facility protocol"

Flag uncertain inputs: "[Check] Confirm weight is in kg — lbs would change this result significantly."

### Provenance Footer

End every response with:
```
---
noah-rn v0.2 | unit-conversion v1.0.0 | standard conversion factors
Clinical decision support — verify against facility protocols and current patient data.
```

### Step 5: Disclaimer

Append a randomly selected disclaimer from the pool below. Select ONE per invocation.
Do not repeat the same one consecutively.

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

## Cross-Skill Suggestions

If a conversion result maps to knowledge/templates/cross-skill-triggers.md, add ONE suggestion after the conversion output. Maximum 1 suggestion. Only if clearly relevant.

Key trigger mappings for unit conversion:
- Weight-based dose calculation for a high-alert medication → consider reviewing drug-reference for safety context
- Drip rate calculation for vasoactive → consider reviewing relevant protocol (ACLS, sepsis)

## Important Rules

- All calculations are deterministic — always call the tool. Do not do arithmetic yourself.
- Do not fabricate inputs. If weight is missing for a weight-based dose, ask for it.
- Do not guess units. If the nurse says "dose is 5" without a unit, ask: "5 what — mg/kg, mcg/kg?"
- If the tool returns an error, relay it plainly. Help the nurse fix the input.
- Tier 1 content (exact math, published conversion factors) is presented exactly.
- Tier 2 content (bedside guidance, "why we care") is labeled as such.
- Tier 3 content (pump limits, titration protocols, facility max doses) defers to "per facility protocol."
- Output is copy-paste ready. No conversational preamble.
- For drip rates: always echo back the concentration you used. A mis-stated concentration is the most common source of rate errors.
