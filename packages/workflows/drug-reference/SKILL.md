---
name: drug-reference
skill_version: "1.1.0"
description: >-
  This skill should be used when the user asks to "look up a drug", "drug reference",
  "what is [drug name]", "tell me about [medication]", "hold parameters", "side effects of",
  "black box warning", "high alert", or asks any question about a specific medication's
  dosing, administration, warnings, or interactions.
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
  - does_not_replace_clinical_judgment
contract:
  you_will_get:
    - bedside drug reference summary
    - administration, warning, and monitoring highlights grounded in source data
    - high-alert framing when applicable
  you_will_not_get:
    - off-label recommendations
    - compounding instructions
    - pharmacist-level substitution for complex medication decisions
  controllable_fields:
    - depth: quick_reference | full_label
    - medication_name: generic | brand | abbreviation
  use_when:
    - a specific medication needs bedside reference
    - administration, warning, or monitoring details are needed
  do_not_use_when:
    - a protocol algorithm is needed instead of a medication reference
    - exact dose math is needed instead of label guidance
completeness_checklist:
  - drug_identification
  - route_and_admin
  - key_warnings
  - monitoring_parameters
  - high_alert_check
hitl_category: "II"
---

# Drug Reference

Look up drug information via the OpenFDA Drug Label API. Returns distilled, bedside-useful output -- not a textbook. Default is a quick-reference (3-5 lines). Full label data available on request.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Workflow

### Step 1: Identify the Drug

Extract the drug name from the nurse's question. Accept generic names, brand names, or common abbreviations. If the nurse mentions multiple drugs, look up each one separately.

### Step 2: Check High-Alert Status

Before calling the tool, check if the drug matches any entry on this ISMP high-alert list. This check is independent of the API call.

**High-alert medications (common inpatient subset):**
- Anticoagulants: heparin, warfarin, enoxaparin, lovenox, coumadin
- Insulins: all forms (regular, lispro, aspart, glargine, NPH, humalog, novolog, lantus)
- Opioids (IV): morphine, hydromorphone, fentanyl, dilaudid, meperidine
- Opioids (other high-risk): methadone, transdermal fentanyl (duragesic)
- Sedation: propofol, dexmedetomidine (precedex), midazolam (versed), ketamine infusions
- Vasoactive: norepinephrine (levophed), epinephrine, vasopressin, dopamine, dobutamine, milrinone, phenylephrine (neosynephrine)
- Neuromuscular blockers: cisatracurium, rocuronium, vecuronium, pancuronium, succinylcholine
- Concentrated electrolytes: IV potassium (KCl), IV magnesium, hypertonic saline (3% NaCl), IV calcium, IV sodium phosphate
- Concentrated dextrose: D50, D10W infusions
- Thrombolytics: alteplase (tPA), tenecteplase
- Antiarrhythmics: amiodarone (cordarone, pacerone), lidocaine
- Oral hypoglycemics: sulfonylureas (glipizide, glyburide, glimepiride)
- Intrathecal medications: all agents administered via intrathecal route
- Chemotherapy: all agents
- Other: digoxin, nitroprusside (nipride)

**Why these matter (class-level bedside context):**
- **Anticoagulants**: Bleeding kills quietly. Check for signs (stool, urine, neuro changes) and know your reversal agents.
- **Insulins**: Hypoglycemia kills faster than hyperglycemia. Always verify units, concentration, and check glucose before admin.
- **Opioids (IV)**: Respiratory depression is dose-dependent and cumulative. RASS and respiratory rate are your early warnings.
- **Vasoactive drips**: Titrate to MAP target. Extravasation = tissue necrosis. Verify central line placement before infusing peripherally.
- **Neuromuscular blockers**: Patient is awake but paralyzed if sedation is inadequate. Always verify sedation (RASS, BIS) before and during paralytic infusion.
- **Concentrated electrolytes**: IV potassium > 10 mEq/hr requires cardiac monitoring. Rapid magnesium can cause flushing and hypotension.
- **Thrombolytics**: Once it's in, you can't take it back. Verify all exclusion criteria before administration. Know your bleeding protocol.

If the drug is high-alert, flag at the TOP of every response:

```
!! HIGH-ALERT MEDICATION -- independent double-check required per facility policy
```

### Step 3: Call the Lookup Tool

```bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" "<drug_name>"
```

The tool returns structured JSON with: `generic_name`, `brand_name`, `pharm_class`, `route`, `dosage_and_administration`, `warnings`, `boxed_warning`, `adverse_reactions`, `contraindications`, `drug_interactions`.

If the tool returns an error:
- `no_match`: "No FDA label found for '[drug]'. Check spelling."
- `api_error`: "OpenFDA is unreachable. Try again in a moment."
- `rate_limit`: "OpenFDA rate limit hit. Wait a few seconds and retry."

Report errors plainly.

### Step 4: Format Output Based on Context

Read the nurse's original question and select the appropriate output depth.

**Default -- distilled quick-reference (3-5 lines):**

Use for general questions like "what is [drug]?", "tell me about [drug]", or when intent is unclear.

```
[Generic] ([Brand]) -- [class]
Routes: [routes]. [Key admin notes if relevant]
[1-2 key bedside points: what to check, what to watch for]
Monitor: [key monitoring parameters]
```

**Focused -- specific field based on question:**

| Question Pattern | Show |
|-----------------|------|
| "Hold parameters for [drug]" | Warnings, contraindications, key thresholds |
| "Side effects of [drug]" | Adverse reactions, warnings |
| "Can I push [drug] IV?" | Route, admin method from dosage_and_administration |
| "Interactions with [drug]" | Drug interactions section |
| "Black box warning for [drug]" | Boxed warning text |

Keep focused responses to 3-8 lines. Distill the FDA prose -- don't dump raw label text.

**Full -- complete extraction on request:**

Triggered by: "tell me everything", "full reference", "expand", "more detail", "full monograph"

Render all available fields in structured sections:
```
[Generic] ([Brand]) -- [class]
Routes: [routes]

DOSAGE & ADMINISTRATION
[distilled from dosage_and_administration]

WARNINGS
[distilled from warnings]

BOXED WARNING (if present)
[boxed_warning text]

CONTRAINDICATIONS
[distilled from contraindications]

ADVERSE REACTIONS
[distilled from adverse_reactions]

DRUG INTERACTIONS
[distilled from drug_interactions]
```

## Evidence & Confidence

- Drug identification and FDA label data are Tier 1 (published label -- exact as printed)
- Hold parameter suggestions and monitoring guidance are Tier 2 (bedside guidance -- label as such)
- Facility-specific dosing, titration protocols, and formulary restrictions are Tier 3 -- always defer: "Per facility protocol"
- Flag data freshness: if the label data looks incomplete or outdated, note: "[Check] Verify against current facility formulary"
- Source citation: "(Source: FDA drug label via OpenFDA)"

## Important Rules

- Distill FDA label prose into bedside language. Do not dump raw label text.
- Default to quick-reference. Only go full when explicitly asked.
- Do not fabricate drug information. If the tool returns "Not available" for a field, say so.
- Do not diagnose or recommend treatments. This is a reference tool.
- Do not make up hold parameters, titration ranges, or dosing that isn't in the FDA label. If the label doesn't specify, say "per facility protocol."
- Preserve the nurse's drug name convention. If they say "levo", use "levo" alongside the formal name.
- The high-alert flag appears on EVERY response for a high-alert drug, including focused and full responses.
- Output is copy-paste ready. No conversational framing.
