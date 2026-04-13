---
name: risk-calculator
skill_version: "1.0.0"
description: >-
  "Wells score", "PE risk", "pulmonary embolism", "Wells DVT", "DVT risk",
  "DVT score", "deep vein thrombosis", "CURB-65", "pneumonia severity",
  "Braden scale", "Braden score", "pressure injury risk", "skin risk",
  "risk score", "risk stratification", or any PE, DVT, pneumonia, or
  pressure injury risk scoring tool.
scope:
  - clinical_scoring
  - pe_risk
  - dvt_risk
  - pneumonia
  - pressure_injury
complexity_tier: moderate
required_context:
  mandatory:
    - component_values
  optional:
    - clinical_context
knowledge_sources: []
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - standard_scoring_only
contract:
  you_will_get:
    - deterministic score calculation
    - component breakdown and interpretation
    - bedside flags when thresholds met
  you_will_not_get:
    - guessed component values
    - diagnosis or treatment orders
  controllable_fields:
    - calculator: wells-pe | wells-dvt | curb65 | braden
  use_when:
    - risk stratification score needs exact calculation
  do_not_use_when:
    - neuro/sedation/pain score needed (use neuro-calculator)
    - acuity/deterioration score needed (use acuity-calculator)
completeness_checklist:
  - score_calculation
  - component_breakdown
  - clinical_interpretation
  - contextual_flags
hitl_category: "II"
---

# Risk Stratification Calculator

Deterministic risk stratification scoring. PE probability, DVT probability, pneumonia severity, pressure injury risk.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Calculators

| Calc | Use Case | Inputs |
|------|----------|--------|
| Wells PE | PE probability | 7 yes/no criteria |
| Wells DVT | DVT probability | 9 criteria + alt dx (yes/no) |
| CURB-65 | Pneumonia severity | 5 yes/no criteria |
| Braden | Pressure injury risk | 6 subscales (sensory, moisture, activity, mobility, nutrition, friction) |

If ambiguous, present table and ask. Multiple scores → calculate sequentially.

## Tool Invocation

```bash
bash "$(git rev-parse --show-toplevel)/tools/clinical-calculators/<calc>.sh" <args>
```

- `wells-pe.sh --dvt N --heartrate N --immobilization N --prior N --hemoptysis N --malignancy N --alternative N`
- `wells-dvt.sh --cancer N --paralysis N --bedridden N --tenderness N --leg-swollen N --calf-swelling N --pitting-edema N --collateral-veins N --previous-dvt N --alternative-dx N`
- `curb65.sh --confusion N --urea N --rr N --bp N --age N`
- `braden.sh --sensory N --moisture N --activity N --mobility N --nutrition N --friction N`

## Output Format

```
## [Calculator Name]: [score]/[max] -- [category]

| Component | Score | Description |
|-----------|-------|-------------|
| [name]    | N/max | [what the score means] |

> Why we care: [one-liner from table below]
```

| Calc | Why we care |
|------|-------------|
| Wells PE | Stratifies PE probability — D-dimer vs CT angio. Clinical gestalt matters too. |
| Wells DVT | Stratifies DVT probability — duplex ultrasound vs D-dimer. |
| CURB-65 | Guides disposition — home vs floor vs ICU. Starting point, not substitute for judgment. |
| Braden | Identifies pressure injury risk before skin breaks down. Lower = higher risk = more aggressive prevention. |

## Contextual Flags

`[!] [Flag text] (bedside guidance -- verify per facility protocol)`

| Threshold | Flag |
|-----------|------|
| Wells PE >6 | High probability — CT angiography, consider empiric anticoagulation |
| Wells DVT ≥3 | Moderate-high — duplex ultrasound indicated |
| CURB-65 ≥3 | Consider ICU level of care — significant mortality risk |
| Braden ≤12 | High risk — full pressure injury prevention bundle |
| Braden ≤9 | Very high risk — specialty mattress, nutrition consult, q2h repositioning min |

## Evidence & Confidence

- Score calculations: Tier 1 (deterministic math — exact published criteria)
- Contextual flags: Tier 2 (bedside guidance)
- Facility-specific activation criteria: Tier 3 — "per facility protocol"
- Sources: Wells PE (Wells 2001), Wells DVT (Wells 2003), CURB-65 (Lim 2003), Braden (Bergstrom 1987)

## Important Rules

- Do not fabricate component values. Total without components → ask for breakdown.
- Do not round or estimate. Ambiguous → ask which score it maps to.
- All calculations are tool-computed. Never calculate scores yourself.
- Copy-paste ready. No conversational preamble.
