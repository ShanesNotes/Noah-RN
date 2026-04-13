---
name: neuro-calculator
skill_version: "1.0.0"
description: >-
  "calculate GCS", "GCS score", "Glasgow Coma Scale", "NIHSS", "stroke scale",
  "NIH stroke score", "RASS", "sedation score", "sedation level",
  "Richmond agitation", "CPOT", "pain score", "pain assessment tool",
  "critical care pain", "neuro check", "sedation assessment",
  or any neuro, sedation, or pain scoring tool.
scope:
  - clinical_scoring
  - consciousness
  - stroke
  - sedation
  - pain_assessment
complexity_tier: moderate
required_context:
  mandatory:
    - component_values
  optional:
    - baseline_scores
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
    - calculator: gcs | nihss | rass | cpot
  use_when:
    - neuro, sedation, or pain score needs exact calculation
  do_not_use_when:
    - risk stratification score needed (use risk-calculator)
    - acuity/deterioration score needed (use acuity-calculator)
completeness_checklist:
  - score_calculation
  - component_breakdown
  - clinical_interpretation
  - contextual_flags
hitl_category: "II"
---

# Neuro / Sedation / Pain Calculator

Deterministic neuro, sedation, and pain score calculation. Nurse provides components, Noah calls the tool.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Calculators

| Calc | Use Case | Inputs |
|------|----------|--------|
| GCS | Consciousness/TBI | Eye(1-4), Verbal(1-5), Motor(1-6) |
| NIHSS | Stroke severity | 15 items (1a–11) |
| RASS | Sedation level | Single observation (-5 to +4) |
| CPOT | Non-verbal pain | 4 indicators (0-2 each) |

If ambiguous, present table and ask. Multiple scores → calculate sequentially.

Clinical-description-to-score mapping: RASS "opens eyes to voice but drifts off"=-2, "combative"=+4. GCS "follows commands but confused"=E4V4M6. CPOT "grimacing, guarding, tense"=facial 2, body 1, muscle 1.

## Tool Invocation

```bash
bash "$(git rev-parse --show-toplevel)/tools/clinical-calculators/<calc>.sh" <args>
```

- `gcs.sh --eye N --verbal N --motor N`
- `nihss.sh --1a N --1b N --1c N --2 N --3 N --4 N --5a N --5b N --6a N --6b N --7 N --8 N --9 N --10 N --11 N`
- `rass.sh --score N`
- `cpot.sh --facial N --body N --muscle N --compliance N`

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
| GCS | Tracks consciousness trajectory. 2-point drop from baseline = red flag — reassess and escalate. |
| NIHSS | Quantifies stroke deficit, guides intervention thresholds. Serial scores track improvement/worsening. |
| RASS | Quantifies sedation depth for titration. Mismatch with ordered goal = conversation with provider. |
| CPOT | Detects pain in patients who can't self-report. 3+ = pain likely — treat and reassess. |

## Contextual Flags

`[!] [Flag text] (bedside guidance -- verify per facility protocol)`

| Threshold | Flag |
|-----------|------|
| GCS ≤8 | Classic intubation threshold — assess airway protection, prepare for RSI |
| GCS 2pt drop | Acute decline — reassess and consider escalation |
| NIHSS ≥6 | Moderate deficit — if within tPA/thrombectomy window, involve stroke team |
| NIHSS ≥21 | Severe stroke — assess for large vessel occlusion |
| RASS ≠ target | Sedation may not match ordered target — verify orders |
| CPOT ≥3 | Pain likely — treat per protocol, reassess in 30-60 min |

## Evidence & Confidence

- Score calculations: Tier 1 (deterministic math — exact published criteria)
- Contextual flags: Tier 2 (bedside guidance)
- Facility-specific activation criteria: Tier 3 — "per facility protocol"
- Sources: GCS (Teasdale & Jennett 1974), NIHSS (NIH 1989), RASS (Sessler 2002), CPOT (Gelinas 2006)

## Important Rules

- Do not fabricate component values. Total without components → ask for breakdown.
- Do not round or estimate. Ambiguous → ask which score it maps to.
- All calculations are tool-computed. Never calculate scores yourself.
- Copy-paste ready. No conversational preamble.
