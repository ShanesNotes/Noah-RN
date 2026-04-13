---
name: io-tracker
skill_version: "1.2.0"
description: >-
  "track I&O", "intake and output", "fluid balance", "how much in and out",
  "I and O totals", "urine output", "fluid totals", "net balance",
  "document fluids", "organize my I&O", or free-text describing patient fluid
  intake and output that needs categorization and totaling.
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
limitations:
  - does_not_replace_clinical_judgment
  - estimates_labeled_as_tier_2
  - dietary_volumes_are_approximations
  - no_insensible_losses
contract:
  you_will_get:
    - categorized intake and output summary
    - volume totals and net balance
    - explicit labeling of estimated values
  you_will_not_get:
    - insensible loss calculations
    - fabricated missing volumes
    - fluid-management orders
  controllable_fields:
    - mode: single_dump | incremental
    - include_estimates: yes | no
  use_when:
    - intake and output data needs categorization and totaling
  do_not_use_when:
    - medication or protocol reference is needed instead of fluid accounting
completeness_checklist:
  - intake_categorization
  - output_categorization
  - volume_totals
  - net_balance
  - tier_labels_on_estimates
hitl_category: "II"
---

# Intake & Output Tracker

Categorize, total, and present documentation-ready I&O from free-text. Single dump or incremental mode.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Recognized Categories

**Intake:** IV fluids (NS, LR, D5, boluses, blood products, TPN, albumin) · PO liquids · Dietary (meal %) · Tube feeds (NG, PEG/J) · Irrigation (CBI — counts as intake if retained)

**Output:** Urine (foley, void, straight cath) · Drains (JP, chest tube, wound vac, NG suction, hemovac) · Emesis · Stool (liquid/measurable only) · Blood loss (EBL)

## Special Cases

| Case | Rule | Tier |
|------|------|------|
| Meal % | ~300 mL standard tray: 100%=~300, 75%=~225, 50%=~150, 25%=~75 | Tier 2 est. |
| IV rate×time | volume = rate × hours (ask for duration if not given) | Tier 1 math |
| Ice chips | volume × 0.3 = fluid equivalent | Tier 2 est. |
| CBI | Net UOP = urine bag volume − irrigation intake | Tier 1 math |
| PRBCs | ~350 mL/unit | Tier 2 est. |
| FFP | ~250 mL/unit | Tier 2 est. |
| Platelets | ~50 mL (pooled ~300 mL) | Tier 2 est. |
| Cryo | ~15 mL/unit | Tier 2 est. |

Use actual volume when provided. All estimates labeled as Tier 2.

## Tool Invocation

All arithmetic goes through the tool:

```bash
bash "$(git rev-parse --show-toplevel)/tools/io-tracker/track.sh" <<'EOF'
{"entries":[...],"prior_state":{"entries":[...]}}
EOF
```

## Output Format

```
## I&O Summary

### Intake
| Category              | Volume  | Details                            |
|-----------------------|---------|------------------------------------|
| IV -- NS @ 125 mL/hr | 500 mL  | 4 hrs running                      |
| IV -- NS bolus        | 500 mL  |                                    |
| PO -- liquids         | 500 mL  | "drank 500ml"                      |
| Dietary -- dinner     | ~150 mL | 50% tray (~300mL est.)             |
| **Total Intake**      | **1,650 mL** |                               |

### Output
| Category              | Volume  | Details                            |
|-----------------------|---------|------------------------------------|
| Foley                 | 250 mL  |                                    |
| JP drain              | 45 mL   | sanguineous                        |
| **Total Output**      | **295 mL** |                                |

### Net Balance: +1,355 mL

> Dietary estimate uses ~300mL standard tray. Adjust per your facility.
```

**Incremental mode:** Keep prior state, add new entries, re-run tool, re-render full summary. Mark new entries with `+` prefix in Details.

## Clinical Flags

`[!] [Flag text] (bedside guidance -- verify per orders and facility protocol)`

| Condition | Flag | Why we care |
|-----------|------|-------------|
| UOP <0.5 mL/kg/hr (or <30 mL/hr) | Low urine output | Early sign of renal hypoperfusion. AKI prevention window. |
| Net >+2L with CHF/ESRD/restriction | Large positive balance | Fluid overload → pulmonary edema → respiratory failure. |
| Intake documented, no UOP | No urine documented | Gap in output tracking — assess. |
| Single drain/emesis/EBL >500 mL | Significant output | Evaluate source and hemodynamic impact. |
| Negative balance without diuretics | Unexpected deficit | Assess for third-spacing, bleeding, inadequate resuscitation. |

## Evidence & Confidence

- Rate×time calculations: Tier 1 (deterministic math)
- Dietary/blood product/ice chip estimates: Tier 2 — always labeled
- Clinical flags: Tier 2 (bedside guidance)
- Facility-specific thresholds: Tier 3 — "per facility protocol"

## Important Rules

- Do not invent volumes. "some output" without a number → ask once.
- Do not estimate urine output. Urine must have a measured volume.
- All arithmetic goes through the tool. Never total volumes yourself.
- Net balance always calculated and displayed.
- Preserve nurse shorthand in Details column.
- Copy-paste ready. No conversational preamble.
