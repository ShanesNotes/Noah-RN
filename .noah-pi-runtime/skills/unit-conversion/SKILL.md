---
name: unit-conversion
skill_version: "1.1.0"
pi:
  promoted: "2026-04-13"
  source: packages/workflows/unit-conversion/SKILL.md
description: >-
  "convert units", "convert mg to mcg", "kg to lbs", "lbs to kg", "Fahrenheit to Celsius",
  "Celsius to Fahrenheit", "mL to cc", "L to mL", "inches to cm",
  "weight-based dose", "dose per kg", "mg/kg", "mcg/kg", "units per kg",
  "drip rate", "IV drip rate", "infusion rate", "mL per hour", "mcg/kg/min",
  "drug concentration", "titrate drip", or any clinical unit, weight-based dose,
  or IV infusion rate calculation.
scope:
  - unit_conversion
  - weight_based_dosing
  - drip_rate_calculation
complexity_tier: moderate
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
  - no_pharmacokinetic_modeling
  - adult_dose_reference_only
contract:
  you_will_get:
    - deterministic conversion or dose/rate calculation
    - explicit unit labels
    - bounded safety context
  you_will_not_get:
    - pharmacokinetic modeling
    - guessed missing numeric inputs
    - prescribing decisions
  controllable_fields:
    - mode: dose | drip | unit
  use_when:
    - exact unit conversion is needed
    - weight-based dose or infusion-rate math is needed
  do_not_use_when:
    - drug-label reference is needed instead of math
completeness_checklist:
  - numeric_result
  - unit_labels
  - safety_context
hitl_category: "II"
---

# Unit Conversion

Deterministic unit conversion and clinical dose/rate calculation. If it can be computed, this skill computes it.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Modes

| Mode | Use case | Required inputs |
|------|----------|----------------|
| **dose** | Weight-based dosing (mg/kg, mcg/kg) | weight (kg), dose/kg, unit |
| **drip** | IV rate from dose + concentration | dose, concentration; weight optional (for mcg/kg/min) |
| **unit** | Direct conversion | value, from-unit, to-unit |

Supported unit conversions: kg↔lbs, g↔mg, mg↔mcg, L↔mL, mL↔cc, F↔C, in↔cm.
Unsupported pair → say so and list supported pairs.

If mode ambiguous, present the three modes and ask.

## Tool Invocation

```bash
REPO=$(git rev-parse --show-toplevel)
```

**dose:** `bash "$REPO/tools/unit-conversions/convert.sh" dose --weight-kg N --dose-per-kg N --unit STR`

**drip:** `bash "$REPO/tools/unit-conversions/convert.sh" drip --dose N --dose-unit STR --concentration N --conc-unit STR [--weight-kg N]`

**unit:** `bash "$REPO/tools/unit-conversions/convert.sh" unit --value N --from STR --to STR`

## Output Format

**dose:**
```
## Dose Calculation
Weight:     <weight_kg> kg
Dose/kg:    <dose_per_kg> <unit>/kg
Total dose: <total_dose> <unit>
(Source: weight-based dosing -- calculated, not estimated)
> Why we care: Getting the weight wrong means getting the dose wrong. Verify kg vs lbs before every calculation.
```

**drip:**
```
## Drip Rate
Dose:          <dose> <dose_unit>
Concentration: <concentration> <conc_unit>
Rate:          <rate_ml_hr> mL/hr
(Source: rate = dose / concentration x 60, calculated)
> Why we care: Rate errors are medication errors. Double-check concentration, verify pump programming matches calculated rate.
```

**unit:**
```
## Unit Conversion
<value> <from_unit>  =  <result> <to_unit>
(Source: standard conversion factor -- exact)
> Why we care: mg vs mcg is a 1000x difference. The decimal point is a patient safety issue.
```

Warnings: `[!] <text> (Tier 2 -- bedside guidance: verify weight source and order)`
Uncertain inputs: `[Check] Confirm weight is in kg -- lbs would change this result significantly.`

## Evidence & Confidence

- All calculations: Tier 1 (deterministic math -- exact conversion factors)
- "Why we care" lines: Tier 2 (bedside guidance)
- Facility-specific dosing/titration/pump limits: Tier 3 -- "per facility protocol"

## Important Rules

- All calculations are tool-computed. Never do arithmetic yourself.
- Do not fabricate inputs. Missing weight → ask for it.
- Do not guess units. "dose is 5" → ask "5 what -- mg/kg, mcg/kg?"
- For drip rates: always echo back the concentration used. Mis-stated concentration = most common rate error source.
- Copy-paste ready. No conversational preamble.
