---
name: protocol-reference
skill_version: "2.0.0"
description: >-
  Quick-recall of standardized clinical algorithms with exact doses and timeframes.
  Use when the user asks about ACLS, code blue, cardiac arrest, bradycardia,
  tachycardia, sepsis bundle, qSOFA, stroke protocol, tPA, rapid response,
  RSI, intubation, or any acute/critical care protocol.
scope:
  - cardiac_arrest
  - sepsis
  - stroke
  - rapid_response
  - airway_management
complexity_tier: moderate
required_context:
  mandatory: []
  optional:
    - rhythm
    - vitals
    - patient_weight
    - time_of_onset
knowledge_sources:
  - "knowledge/protocols/acls.md"
  - "knowledge/protocols/sepsis-bundle.md"
  - "knowledge/protocols/acute-stroke.md"
  - "knowledge/protocols/rapid-response.md"
  - "knowledge/protocols/rsi.md"
tools_used: []
output_contract:
  must_contain:
    - protocol_identification
    - full_algorithm_steps
    - exact_doses_and_timings
    - knowledge_source_citation
  must_flag: time_critical_actions
limitations:
  - adult_patients_only
  - five_protocols_only
  - national_guidelines_not_facility_specific
  - does_not_replace_clinical_judgment
  - no_pediatric_protocols
hitl_category: "II"
---

# Protocol Reference

Quick-recall of standardized clinical algorithms. Full steps with exact doses
and timeframes. This is code language — precise, direct, actionable.

## Available Protocols

| Protocol | Knowledge File | Source |
|----------|---------------|--------|
| ACLS | `knowledge/protocols/acls.md` | AHA 2020 |
| Sepsis Bundle | `knowledge/protocols/sepsis-bundle.md` | SSC 2026 |
| Acute Stroke | `knowledge/protocols/acute-stroke.md` | AHA/ASA 2019 |
| Rapid Response | `knowledge/protocols/rapid-response.md` | Institutional standard |
| RSI | `knowledge/protocols/rsi.md` | Clinical practice |

## Rules

- Read the knowledge file before responding. Present its content — don't
  paraphrase from memory.
- Present exact doses, exact timings, exact sequences. This is Tier 1 content.
- Weight-based doses: if weight is provided, calculate exact doses using
  `tools/unit-conversions/convert.sh`. If no weight, present mg/kg ranges.
- Context caveats inline: "standard dose, adjust for [condition]."
- When rhythm is provided for ACLS, present the specific algorithm path.
  When not provided, present both shockable and non-shockable pathways.
- "Per facility protocol" for anything institution-specific (code termination
  criteria, specific antibiotic choices, sedation targets).
- Include "why we care" one-liners for key steps.

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

Provenance source: cited per protocol file YAML frontmatter.
