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
completeness_checklist:
  - version_display
  - skill_catalog
hitl_category: "II"
---

# Hello Nurse

Verification skill that confirms the noah-rn plugin is installed and operational.

## When This Skill Applies

- Testing or verifying the noah-rn plugin installation
- Running a "hello nurse" or "hello noah" check
- Confirming the plugin scaffold is functional

## Trace Logging

Every invocation of this skill MUST be traced. Run the trace tool at the start and end of each invocation.

**Start trace** (before any other work):
```bash
CASE_ID=$(bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" init "hello-nurse")
```

**Record input context** (after collecting input, before processing):
```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" input "$CASE_ID" '{"query":"<user query>","patient_context":<any patient context as JSON or null>}'
```

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

### Step 1: Finalize Trace

Record the skill output and close the trace:

```bash
# Record the raw output you just generated
echo "<your complete output above>" | bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" output "$CASE_ID"

# Record hook results (empty if no hooks fired)
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" hooks "$CASE_ID" '{"hooks_fired":[]}'

# Finalize timing
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" done "$CASE_ID"
```

Trace logging is append-only and must not block or alter skill output. If trace commands fail, continue with normal skill execution.

## Evidence & Confidence

- Plugin status and version information are Tier 1 (deterministic — system metadata)
- Skill catalog listing is Tier 1 (system inventory)
- No clinical claims are made in this output — no source citations needed

## Provenance Footer

End every response with:
```
---
noah-rn v0.2 | hello-nurse v0.2.0
Clinical decision support — verify against facility protocols and current patient data.
```

## Clinical Safety Disclaimer

Noah RN provides clinical decision support — it is not a substitute for clinical judgment. Verify all information against your facility's policies and current patient data.
