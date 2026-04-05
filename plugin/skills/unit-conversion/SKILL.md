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

Deterministic unit conversion and clinical dose/rate calculation. No estimation -- if it can be computed, this skill computes it.

> **Conventions**: This skill follows `plugin/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Modes

| Mode | When to use | Key inputs |
|------|-------------|------------|
| **dose** | Weight-based dosing (mg/kg, mcg/kg) | weight, dose/kg, unit |
| **drip** | IV infusion rate from dose + concentration | dose, concentration, optional weight |
| **unit** | Direct unit conversion (kg<->lbs, F<->C, etc.) | value, from-unit, to-unit |

## Workflow

### Step 1: Detect Mode

From the nurse's input, identify which mode applies:
- "What's the dose for my 82 kg patient at 0.5 mcg/kg?" -> **dose**
- "My dopamine is 400 mg/250 mL and I need 5 mcg/kg/min for a 70 kg patient" -> **drip**
- "How many lbs is 95 kg?" or "What's 38.9 C in Fahrenheit?" -> **unit**

If ambiguous, present the three modes and ask. Do not guess.

### Step 2: Collect Inputs

**dose mode** -- ask for (if not provided):
- Patient weight in kg (specify: "in kg, not lbs")
- Dose per kg (and unit: mg/kg, mcg/kg, units/kg, etc.)

**drip mode** -- ask for (if not provided):
- Dose (amount and unit, e.g., "5 mcg/kg/min" or "100 mcg/min")
- Drug concentration (amount per mL, e.g., "400 mg in 250 mL" = 1.6 mg/mL = 1600 mcg/mL)
- Patient weight (optional -- only needed for mcg/kg/min output)

**unit mode** -- ask for (if not provided):
- The value to convert
- From-unit and to-unit (from supported list below)

Supported unit conversions:
- Weight: kg<->lbs (x2.20462), g<->mg (x1000), mg<->mcg (x1000)
- Volume: L<->mL (x1000), mL<->cc (1:1)
- Temperature: F<->C ((F-32)x5/9), C<->F (Cx9/5+32)
- Length: in<->cm (x2.54)

If unsupported: "That conversion isn't supported. Supported pairs: kg<->lbs, g<->mg, mg<->mcg, L<->mL, mL<->cc, F<->C, in<->cm."

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

If the tool returns an error, relay the error message exactly. Help the nurse correct the input.

### Step 4: Format Output

#### dose mode
```
## Dose Calculation

Weight:     <weight_kg> kg
Dose/kg:    <dose_per_kg> <unit>/kg
Total dose: <total_dose> <unit>

(Source: weight-based dosing -- calculated, not estimated)

> Why we care: Getting the weight wrong means getting the dose wrong.
  Verify kg vs lbs before every calculation.
```

If a warning field is present:
```
[!] <warning text> (Tier 2 -- bedside guidance: verify weight source and order)
```

#### drip mode
```
## Drip Rate

Dose:          <dose> <dose_unit>
Concentration: <concentration> <conc_unit>
Rate:          <rate_ml_hr> mL/hr
```

If weight was provided: `mcg/kg/min:    <mcg_kg_min>`

```
(Source: rate = dose / concentration x 60, calculated)

> Why we care: Rate errors are medication errors. Double-check concentration,
  verify pump programming matches calculated rate.
```

#### unit mode
```
## Unit Conversion

<value> <from_unit>  =  <result> <to_unit>

(Source: standard conversion factor -- exact)

> Why we care: mg vs mcg is a 1000x difference. The decimal point is a
  patient safety issue.
```

## Evidence & Confidence

- All calculations are Tier 1 (deterministic math -- exact conversion factors and arithmetic)
- The "why we care" lines are Tier 2 (bedside guidance -- labeled as such)
- Facility-specific dosing protocols, titration targets, and pump limits are Tier 3 -- defer to "per facility protocol"
- Flag uncertain inputs: "[Check] Confirm weight is in kg -- lbs would change this result significantly."

## Important Rules

- All calculations are deterministic -- always call the tool. Do not do arithmetic yourself.
- Do not fabricate inputs. If weight is missing for a weight-based dose, ask for it.
- Do not guess units. If the nurse says "dose is 5" without a unit, ask: "5 what -- mg/kg, mcg/kg?"
- For drip rates: always echo back the concentration you used. A mis-stated concentration is the most common source of rate errors.
- Output is copy-paste ready. No conversational preamble.
