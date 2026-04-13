---
name: acuity-calculator
skill_version: "1.0.0"
description: >-
  "APACHE", "APACHE II", "severity score", "ICU severity", "ICU mortality",
  "NEWS2", "early warning score", "national early warning score",
  "track and trigger", "deterioration score", "acuity score",
  or any ICU severity or early warning scoring tool.
scope:
  - clinical_scoring
  - icu_severity
  - early_warning
complexity_tier: moderate
required_context:
  mandatory:
    - component_values
  optional:
    - patient_weight
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
    - calculator: apache2 | news2
  use_when:
    - acuity or deterioration score needs exact calculation
  do_not_use_when:
    - neuro/sedation/pain score needed (use neuro-calculator)
    - risk stratification score needed (use risk-calculator)
completeness_checklist:
  - score_calculation
  - component_breakdown
  - clinical_interpretation
  - contextual_flags
hitl_category: "II"
---

# Acuity / Deterioration Calculator

Deterministic ICU severity and early warning scoring. APACHE II for ICU prognosis, NEWS2 for acute deterioration tracking.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Calculators

| Calc | Use Case | Inputs |
|------|----------|--------|
| APACHE II | ICU severity/prognosis | 15 inputs (vitals, labs, age, chronic). Require ALL + FiO2 before calculation. |
| NEWS2 | Acute illness/track-and-trigger | RR, SpO2, O2, Temp, SBP, HR, AVPU. Clarify SpO2 scale (1=std, 2=COPD). |

## Tool Invocation

```bash
bash "$(git rev-parse --show-toplevel)/tools/clinical-calculators/<calc>.sh" <args>
```

- `apache2.sh --temp N --map N --hr N --rr N --oxygenation N --fio2 N --ph N --sodium N --potassium N --creatinine N --hematocrit N --wbc N --gcs N --age N --chronic N [--arf 1]`
- `news2.sh --rr N --spo2 N --o2 <yes|no> --temp N --sbp N --hr N --avpu <A|V|P|U> [--spo2-scale <1|2>]`

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
| APACHE II | Estimates ICU mortality risk. Informs prognosis discussions, not treatment decisions. |
| NEWS2 | Standard track-and-trigger for deterioration. Rising NEWS2 often earliest sign of decline. |

## Contextual Flags

`[!] [Flag text] (bedside guidance -- verify per facility protocol)`

| Threshold | Flag |
|-----------|------|
| APACHE II ≥20 | Estimated mortality >25% — ensure goals of care addressed |
| NEWS2 ≥5 | Urgent clinical review within 1 hour, escalate per facility protocol |
| NEWS2 ≥7 | Emergency response — immediate review, consider rapid response team |
| NEWS2 single param = 3 | Single parameter extreme — emergency response even if total low |

## Evidence & Confidence

- Score calculations: Tier 1 (deterministic math — exact published criteria)
- Contextual flags: Tier 2 (bedside guidance)
- Facility-specific activation criteria: Tier 3 — "per facility protocol"
- Sources: APACHE II (Knaus 1985), NEWS2 (RCP 2017)

## Important Rules

- Do not fabricate component values. Total without components → ask for breakdown.
- Do not round or estimate. Ambiguous → ask which score it maps to.
- All calculations are tool-computed. Never calculate scores yourself.
- APACHE II: require all 15 inputs before calling the tool.
- Copy-paste ready. No conversational preamble.
