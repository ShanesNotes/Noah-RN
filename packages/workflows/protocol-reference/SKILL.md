---
name: protocol-reference
skill_version: "1.2.0"
description: >-
  "ACLS", "code blue", "cardiac arrest", "bradycardia", "tachycardia", "v-fib",
  "PEA", "asystole", "sepsis bundle", "qSOFA", "hour-1 bundle", "SEP-1",
  "stroke protocol", "tPA criteria", "stroke window", "rapid response", "MEWS",
  "early warning", "when to call RRT", "RSI", "intubation meds", "intubation doses",
  "rapid sequence", or any clinical practice guideline, protocol, or algorithm
  used in acute/critical care.
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
  - "clinical-resources/protocols/acls.md"
  - "clinical-resources/protocols/sepsis-bundle.md"
  - "clinical-resources/protocols/acute-stroke.md"
  - "clinical-resources/protocols/rapid-response.md"
  - "clinical-resources/protocols/rsi.md"
limitations:
  - adult_patients_only
  - five_protocols_only
  - national_guidelines_not_facility_specific
  - does_not_replace_clinical_judgment
contract:
  you_will_get:
    - protocol reference with exact steps, doses, and timing from source material
    - four-layer output with provenance footer
  you_will_not_get:
    - facility-specific protocol substitutions
    - autonomous protocol execution
    - pediatric guidance
  controllable_fields:
    - protocol_family: acls | sepsis | stroke | rapid_response | rsi
    - depth: brief | standard | full_algorithm
  use_when:
    - a bedside protocol or guideline lookup is needed
  do_not_use_when:
    - workflow-specific documentation output is needed instead of protocol reference
completeness_checklist:
  - protocol_identification
  - full_algorithm_presentation
  - exact_doses_and_timings
  - knowledge_source_citation
hitl_category: "II"
---

# Protocol Reference

Quick-recall of standardized clinical algorithms. Full steps with exact doses and timeframes by default. Code language — precise, direct, actionable.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Available Protocols

| Trigger | File | Source |
|---------|------|--------|
| ACLS, code blue, cardiac arrest, v-fib, VF, pVT, PEA, asystole, bradycardia, tachycardia, post-ROSC | `clinical-resources/protocols/acls.md` | AHA ACLS 2020/2025 |
| Sepsis, sepsis bundle, qSOFA, hour-1 bundle, SEP-1, septic shock | `clinical-resources/protocols/sepsis-bundle.md` | SSC 2021, CMS SEP-1 |
| Stroke, tPA, alteplase, stroke window, LKW, thrombectomy | `clinical-resources/protocols/acute-stroke.md` | AHA/ASA 2019, updated 2024 |
| Rapid response, RRT, MEWS, early warning, escalation | `clinical-resources/protocols/rapid-response.md` | IHI, MEWS literature |
| RSI, intubation, rapid sequence, intubation meds/doses, airway | `clinical-resources/protocols/rsi.md` | Walls & Murphy, EMCRIT |

No match → "Protocol not available. Currently loaded: ACLS, Sepsis Bundle, Acute Stroke, Rapid Response, RSI."

## Output Rules

**Default — full algorithm.** Present the entire algorithm from the knowledge file. Do not summarize — they're in it, they need the steps.

For ACLS with no rhythm specified: present BOTH arrest algorithms (VF/pVT AND PEA/Asystole). Note other sub-sections available.

**Focused — specific data point.** Give just the answer:
- "Epi dose in a code?" → `EPINEPHRINE 1mg IV/IO q3-5min`
- "tPA window?" → `4.5 hours from last known well. Door-to-needle target: < 60 min.`
- "Roc dose for 80kg?" → `Rocuronium 1.2 mg/kg = 96mg IV push`
- "Adenosine dose?" → `6mg rapid IV push (+ 20mL NS flush) → 12mg → 12mg`

## Evidence & Confidence

- ACLS, Sepsis Bundle, Acute Stroke: Tier 1 (national evidence-based guidelines — AHA, SSC, AHA/ASA)
- Rapid Response, RSI: Tier 2 (expert consensus — IHI, MEWS, Walls & Murphy, EMCRIT). Label reflects evidence base, not clinical validity.
- Focused answers carry same tier as full algorithms
- Facility-specific variations (code termination, antibiotic choices, tPA consent, RRT activation, post-intubation sedation): Tier 3 — "per facility protocol"
- Source citation from knowledge file header: "(Source: [body] [year])"

## Important Rules

- Present algorithms in full by default. Summarize only for specific data points.
- Do not modify clinical content from knowledge files. Present as-is.
- Do not add recommendations beyond the protocol.
- No institutional/facility-specific protocols. National guidelines only.
- Scannable under pressure: numbered steps, exact doses, clear decision points.
- Copy-paste ready. No conversational preamble.
