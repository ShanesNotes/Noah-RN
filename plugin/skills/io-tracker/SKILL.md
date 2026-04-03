---
name: io-tracker
skill_version: "2.0.0"
description: >-
  Organize fluid intake and output data into categorized, totaled format.
  Use when the user says "track I&O", "intake and output", "fluid balance",
  "urine output", "net balance", "document fluids", or provides fluid entries.
scope:
  - fluid_balance
  - intake_output
  - volume_status
complexity_tier: moderate
required_context:
  mandatory:
    - fluid_entries
  optional:
    - patient_weight
    - diagnosis
    - fluid_restriction
knowledge_sources: []
tools_used: []
output_contract:
  must_contain:
    - intake_categorization
    - output_categorization
    - volume_totals
    - net_balance
  must_label: estimates_as_tier_2
limitations:
  - does_not_replace_clinical_judgment
  - estimates_labeled_as_tier_2
  - dietary_volumes_are_approximations
  - no_insensible_losses
hitl_category: "II"
---

# Intake & Output Tracker

Organize free-text fluid data into categorized, totaled, documentation-ready
format. Supports single dump (all I&O at once) and incremental (add entries
throughout the conversation).

## Intake Categories

- **IV fluids**: NS, LR, D5, boluses, blood products, TPN, albumin
- **PO liquids**: water, juice, coffee, ice chips (30% volume rule)
- **Dietary**: meal percentages (50% lunch = ~200mL estimate)
- **Tube feeds**: NG/PEG/J-tube, continuous or bolus with rate/duration
- **Irrigation**: bladder irrigation — counts as intake if retained

## Output Categories

- **Urine**: foley, void, straight cath
- **Drains**: JP, chest tube, hemovac, wound vac, EVD
- **GI**: emesis, NG/OG output, ostomy, stool (liquid = volume estimate)
- **Blood loss**: surgical, procedural, estimated
- **Dialysis**: net UF, CRRT effluent

## Rules

- Parse natural language. "Gave a liter of normal saline" = NS 1000mL intake.
- Label estimates as Tier 2. Exact measured volumes are Tier 1.
- Ice chips: 30% volume rule (100mL ice chips ≈ 30mL intake).
- Meal percentages: use standard tray volume estimates, label Tier 2.
- Running totals: shift total, 24h running balance, net balance.
- Incremental mode: add to running totals across turns.
- Flag significant imbalances (net > +3L or < -1L in context).

## Shared Contracts

- Output format: `plugin/skills/_shared/output-contract.md`
- Confidence model: `plugin/skills/_shared/confidence.md`
- Trace logging: `plugin/skills/_shared/trace-contract.md`

Provenance source: "nurse-provided fluid data (current)"
