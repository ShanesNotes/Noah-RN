---
name: unit-conversion
skill_version: "2.0.0"
description: >-
  Bedside dosing math: weight-based doses, drip rates, unit conversions.
  Use when the user says "convert", "mg to mcg", "kg to lbs", "drip rate",
  "dose per kg", "mL per hour", "mcg/kg/min", or any weight-based dosing question.
scope:
  - unit_conversion
  - weight_based_dosing
  - drip_rate_calculation
complexity_tier: simple
required_context:
  mandatory:
    - numeric_value
    - conversion_type
  optional:
    - patient_weight
knowledge_sources: []
tools_used:
  - "tools/unit-conversions/convert.sh"
output_contract:
  must_contain:
    - input_value
    - converted_result
    - formula_shown
  must_use: deterministic_tools_only
limitations:
  - does_not_replace_clinical_judgment
  - does_not_replace_pharmacy_verification
  - standard_conversions_only
hitl_category: "II"
---

# Unit Conversion

Bedside dosing math using deterministic tools. Three modes:

## Modes

- **dose**: Weight-based dosing (mg/kg, mcg/kg, units/kg)
- **drip**: Drip rate calculations (mcg/kg/min → mL/hr, mg/hr → mL/hr)
- **unit**: Simple unit conversion (mg↔mcg, kg↔lbs, °F↔°C, mL↔L)

## Tool

```bash
bash "$(git rev-parse --show-toplevel)/tools/unit-conversions/convert.sh" <mode> [args]
```

## Rules

- **Always use the tool.** Never do dosing math in your head.
- Show the formula and work. Nurses verify math before administering.
- For drip rates: require concentration (mg in bag, total volume).
- Flag high-alert medication calculations prominently.
- If weight is needed but not provided, ask once.

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

Provenance source: "deterministic calculation (tool-computed)"
