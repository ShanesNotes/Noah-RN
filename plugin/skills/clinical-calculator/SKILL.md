---
name: clinical-calculator
skill_version: "2.0.0"
description: >-
  Calculate standardized clinical assessment scores using deterministic tools.
  Use when the user asks to "calculate GCS", "NIHSS", "APACHE", "Wells",
  "CURB-65", "Braden", "RASS", "CPOT", "NEWS2", "score", "scale",
  or asks to score a patient using any clinical assessment tool.
scope:
  - clinical_scoring
  - consciousness
  - stroke
  - icu_severity
  - pe_risk
  - dvt_risk
  - pneumonia
  - pressure_injury
  - sedation
  - pain_assessment
  - early_warning
complexity_tier: simple
required_context:
  mandatory:
    - component_values
  optional:
    - patient_weight
    - baseline_scores
knowledge_sources: []
tools_used:
  - "tools/clinical-calculators/gcs.sh"
  - "tools/clinical-calculators/nihss.sh"
  - "tools/clinical-calculators/apache2.sh"
  - "tools/clinical-calculators/wells-pe.sh"
  - "tools/clinical-calculators/wells-dvt.sh"
  - "tools/clinical-calculators/curb65.sh"
  - "tools/clinical-calculators/braden.sh"
  - "tools/clinical-calculators/rass.sh"
  - "tools/clinical-calculators/cpot.sh"
  - "tools/clinical-calculators/news2.sh"
output_contract:
  must_contain:
    - score_calculation
    - component_breakdown
    - clinical_interpretation
    - contextual_flags
  must_use: deterministic_tools_only
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - standard_scoring_only
  - no_facility_modified_scores
hitl_category: "II"
---

# Clinical Calculator

Calculate standardized clinical assessment scores using deterministic tools.
The nurse provides component values. Noah calculates the exact score with
clinical context.

## Available Calculators

| Calculator | Tool | Use Case |
|-----------|------|----------|
| GCS | `gcs.sh` | Consciousness / TBI severity |
| NIHSS | `nihss.sh` | Stroke severity |
| APACHE II | `apache2.sh` | ICU severity / prognosis |
| Wells PE | `wells-pe.sh` | PE probability |
| Wells DVT | `wells-dvt.sh` | DVT probability |
| CURB-65 | `curb65.sh` | Pneumonia severity |
| Braden | `braden.sh` | Pressure injury risk |
| RASS | `rass.sh` | Sedation level |
| CPOT | `cpot.sh` | Pain (non-verbal) |
| NEWS2 | `news2.sh` | Early warning score |

All tools at `$(git rev-parse --show-toplevel)/tools/clinical-calculators/`.

## Rules

- **Always use the tool.** Never compute scores in your head.
- Extract component values from the nurse's input. If values are embedded
  in clinical narrative ("eyes open to voice, confused, localizing pain"),
  map to the correct component scores, then call the tool.
- If required components are missing, ask once. List what's needed.
- Present: total score, component breakdown, severity interpretation,
  clinical context ("why we care" for the score range).
- Tool outputs include severity banding — present it.

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

Provenance source: cited per calculator (e.g., "GCS — Teasdale & Jennett 1974")
