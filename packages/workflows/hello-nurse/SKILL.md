---
name: hello-nurse
skill_version: "0.2.0"
description: >-
  This skill should be used when the user asks to "test noah", "hello nurse",
  "verify plugin", or wants to confirm that the noah-rn plugin is installed
  and working correctly.
scope:
  - plugin_verification
complexity_tier: simple
required_context:
  mandatory: []
  optional: []
knowledge_sources: []
limitations:
  - "verification_only"
contract:
  you_will_get:
    - plugin/workspace availability status
    - current skill catalog summary
    - no-clinical-claim verification output
  you_will_not_get:
    - clinical guidance
    - patient-specific recommendations
    - workflow execution beyond verification
  controllable_fields:
    - check_type: status | inventory
  use_when:
    - verifying Noah RN is available and loaded
    - checking current skill inventory
  do_not_use_when:
    - clinical workflow output is needed
completeness_checklist:
  - version_display
  - skill_catalog
hitl_category: "II"
---

# Hello Nurse

Verification skill that confirms the noah-rn plugin is installed and operational.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, disclaimers, provenance footer, and universal rules.

## When This Skill Applies

- Testing or verifying the noah-rn plugin installation
- Running a "hello nurse" or "hello noah" check
- Confirming the plugin scaffold is functional

## Response

When triggered, respond with:

```
Noah RN v0.2.0 — Online

Plugin: loaded
Skills: 8 clinical skills active
  - clinical-calculator (GCS, NIHSS, APACHE II, Wells PE/DVT, CURB-65, Braden, RASS, CPOT)
  - drug-reference (OpenFDA lookup)
  - io-tracker (intake & output)
  - protocol-reference (ACLS, sepsis, stroke, rapid response, RSI)
  - shift-assessment (15-system structured assessment)
  - shift-report (7-section handoff)
  - unit-conversion (weight-based dosing, drip rates)
Tools: 9 deterministic calculators, drug lookup, unit converter
Hooks: Tier 1 safety checks active
Status: Phase 2 — clinical decision support

---
noah-rn v0.2 | hello-nurse v0.2.0
Clinical decision support — verify against facility protocols and current patient data.
```

## Evidence & Confidence

- Plugin status and version information are Tier 1 (deterministic — system metadata)
- Skill catalog listing is Tier 1 (system inventory)
- No clinical claims are made in this output — no source citations needed
