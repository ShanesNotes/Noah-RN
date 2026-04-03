---
name: drug-reference
skill_version: "2.0.0"
description: >-
  Look up drug information via OpenFDA. Use when the user says "look up a drug",
  "what is [medication]", "interactions", "hold parameters", "side effects",
  "black box warning", "high alert", or asks about dosing, administration, or warnings.
scope:
  - medication_reference
  - drug_interactions
  - high_alert_medications
  - dosing
  - administration
complexity_tier: moderate
required_context:
  mandatory:
    - medication_name
  optional:
    - clinical_context
    - patient_weight
    - renal_function
knowledge_sources: []
tools_used:
  - "tools/drug-lookup/lookup.sh <drug_name>"
output_contract:
  must_contain:
    - drug_identification
    - route_and_administration
    - key_warnings
    - monitoring_parameters
    - high_alert_check
  must_flag: high_alert_medications
limitations:
  - fda_labels_only
  - no_off_label_guidance
  - no_compounding
  - single_source_interactions
  - does_not_replace_pharmacist_consult
  - does_not_replace_clinical_judgment
hitl_category: "II"
---

# Drug Reference

Look up drug information via OpenFDA Drug Label API. Returns distilled,
bedside-useful output — not a textbook. Default is quick-reference (3-5 lines).
Full label data available on request.

## Tool

```bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" <drug_name>
```

Always call the tool. Do not answer drug questions from memory.

## Output Modes

- **Quick reference** (default): Class, route, key nursing considerations,
  hold parameters, high-alert status. 3-5 lines.
- **Full label**: Complete FDA label data organized for bedside use.
  Triggered by "full", "everything", "complete", or "details."

## Rules

- High-alert medications (ISMP list): flag prominently. Cross-reference
  against `knowledge/drug-ranges.json` for dosage validation.
- Nursing focus: administration routes, timing, monitoring parameters,
  hold parameters, common titration ranges. Not pharmacokinetics lectures.
- Include "why we care" for critical warnings (e.g., "Heparin — narrow
  therapeutic index, small dose errors cause major bleeds").
- If the tool returns no results, say so. Don't fabricate drug information.
- Weight-based dosing: calculate exact doses using
  `tools/unit-conversions/convert.sh` if weight is provided.

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

Provenance source: "OpenFDA Drug Label API (current query)"
