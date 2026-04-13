---
name: drug-reference
skill_version: "1.2.0"
description: >-
  "look up a drug", "drug reference", "what is [drug name]", "tell me about [medication]",
  "hold parameters", "side effects of", "black box warning", "high alert",
  or any question about a specific medication's dosing, administration, warnings, or interactions.
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
limitations:
  - fda_labels_only
  - no_off_label_guidance
  - no_compounding
  - single_source_interactions
  - does_not_replace_pharmacist_consult
contract:
  you_will_get:
    - bedside drug reference summary
    - administration, warning, and monitoring highlights
    - high-alert framing when applicable
  you_will_not_get:
    - off-label recommendations
    - compounding instructions
    - pharmacist-level substitution guidance
  controllable_fields:
    - depth: quick_reference | full_label
    - medication_name: generic | brand | abbreviation
  use_when:
    - a specific medication needs bedside reference
  do_not_use_when:
    - a protocol algorithm is needed instead of medication reference
completeness_checklist:
  - drug_identification
  - route_and_admin
  - key_warnings
  - monitoring_parameters
  - high_alert_check
hitl_category: "II"
---

# Drug Reference

Bedside drug lookup via OpenFDA. Default is quick-reference (3-5 lines). Full label on request.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## High-Alert Medications

Check BEFORE the API call. If match → flag at TOP of every response:

```
!! HIGH-ALERT MEDICATION -- independent double-check required per facility policy
```

| Class | Drugs |
|-------|-------|
| Anticoagulants | heparin, warfarin, enoxaparin, lovenox, coumadin |
| Insulins | all forms (regular, lispro, aspart, glargine, NPH, humalog, novolog, lantus) |
| Opioids (IV) | morphine, hydromorphone, fentanyl, dilaudid, meperidine |
| Opioids (high-risk) | methadone, transdermal fentanyl (duragesic) |
| Sedation | propofol, dexmedetomidine (precedex), midazolam (versed), ketamine infusions |
| Vasoactive | norepinephrine (levophed), epinephrine, vasopressin, dopamine, dobutamine, milrinone, phenylephrine |
| Neuromuscular blockers | cisatracurium, rocuronium, vecuronium, pancuronium, succinylcholine |
| Concentrated electrolytes | IV KCl, IV magnesium, hypertonic saline (3% NaCl), IV calcium, IV sodium phosphate |
| Concentrated dextrose | D50, D10W infusions |
| Thrombolytics | alteplase (tPA), tenecteplase |
| Antiarrhythmics | amiodarone, lidocaine |
| Oral hypoglycemics | glipizide, glyburide, glimepiride |
| Other | digoxin, nitroprusside, all intrathecal agents, all chemotherapy |

**Class-level bedside context:**

| Class | Why it matters |
|-------|---------------|
| Anticoagulants | Bleeding kills quietly. Check stool, urine, neuro changes. Know reversal agents. |
| Insulins | Hypoglycemia kills faster than hyperglycemia. Verify units, concentration, check glucose before admin. |
| Opioids (IV) | Respiratory depression is dose-dependent and cumulative. RASS and RR are early warnings. |
| Vasoactive | Titrate to MAP target. Extravasation = tissue necrosis. Verify central line before peripheral infusion. |
| NMBs | Patient is awake but paralyzed if sedation inadequate. Verify sedation (RASS, BIS) before and during. |
| Concentrated lytes | IV K+ >10 mEq/hr requires cardiac monitoring. Rapid Mg can cause flushing and hypotension. |
| Thrombolytics | Once in, can't take it back. Verify all exclusion criteria. Know your bleeding protocol. |

## Tool Invocation

```bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" "<drug_name>"
```

Returns: `generic_name`, `brand_name`, `pharm_class`, `route`, `dosage_and_administration`, `warnings`, `boxed_warning`, `adverse_reactions`, `contraindications`, `drug_interactions`.

Errors: `no_match` → "No FDA label found. Check spelling." · `api_error` → "OpenFDA unreachable." · `rate_limit` → "Rate limit hit. Wait and retry."

## Output Depth

**Default — quick-reference (3-5 lines):**
```
[Generic] ([Brand]) -- [class]
Routes: [routes]. [Key admin notes]
[1-2 bedside points: what to check, what to watch]
Monitor: [key parameters]
```

**Focused — match question to field:**

| Question | Show |
|----------|------|
| Hold parameters | Warnings, contraindications, thresholds |
| Side effects | Adverse reactions, warnings |
| Can I push IV? | Route, admin method |
| Interactions | Drug interactions |
| Black box | Boxed warning text |

**Full — on "tell me everything", "full reference", "expand":** Render all available fields in structured sections. Distill FDA prose into bedside language — don't dump raw text.

## Evidence & Confidence

- Drug ID and FDA label data: Tier 1 (published label — exact as printed)
- Hold parameters and monitoring guidance: Tier 2 (bedside guidance)
- Facility dosing/titration/formulary: Tier 3 — "per facility protocol"
- Source: "(Source: FDA drug label via OpenFDA)"
- Incomplete/outdated label: "[Check] Verify against current facility formulary"

## Important Rules

- Distill FDA prose into bedside language. Don't dump raw text.
- Default to quick-reference. Full only when asked.
- Do not fabricate drug information. Field "Not available" → say so.
- Do not make up hold parameters or dosing not in the label → "per facility protocol."
- High-alert flag on EVERY response for high-alert drugs.
- Preserve nurse's drug name convention ("levo" stays alongside formal name).
- Copy-paste ready. No conversational preamble.
