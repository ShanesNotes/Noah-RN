---
name: io-tracker
skill_version: "1.1.0"
description: >-
  This skill should be used when the user asks to "track I&O", "intake and output", "fluid balance", "how much in and out", "I and O totals", "urine output", "fluid totals", "net balance", "document fluids", "organize my I&O", or provides free-text describing patient fluid intake and output that needs to be categorized and totaled.
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
    - shift fluid balance needs documentation-ready structure
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

Organize free-text fluid intake and output data into categorized, totaled, documentation-ready format. The nurse describes what went in and what came out -- however they naturally talk about it -- and this skill categorizes, calculates, and presents a clean I&O summary.

Supports two modes: single dump (all I&O at once) and incremental (add entries throughout the conversation).

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

## Recognized Categories

### Intake
| Category | Examples |
|----------|---------|
| **IV fluids** | NS, LR, D5, maintenance fluids, boluses, blood products, TPN, albumin |
| **PO (oral) liquids** | "drank 500ml", water, juice, coffee, ice chips (30% volume rule) |
| **Dietary** | Meal percentages: "50% lunch", "75% breakfast", tray estimates |
| **Tube feeds** | NG feeds, PEG/J-tube feeds, continuous or bolus with rate and duration |
| **Irrigation** | Bladder irrigation (CBI) -- counts as intake if retained |

### Output
| Category | Examples |
|----------|---------|
| **Urine** | Foley, void, straight cath, condom cath -- note color/character if provided |
| **Drains** | JP, chest tube, wound vac, NG suction, hemovac, penrose |
| **Emesis** | Volume and character (bilious, coffee-ground, bloody, clear) |
| **Stool** | Liquid/measurable only -- formed stool is not typically measured |
| **Blood loss** | Estimated blood loss (EBL), surgical, GI bleed estimates |

## Workflow

### Step 1: Receive and Parse Input

Accept the nurse's free-text I&O description. This can be:
- A full shift dump: "250 of urine out, drank 500ml, at 50% dinner, IVs running at 125/hr for 4 hours"
- Partial: "just had 200 from the JP drain"
- Shorthand: "foley 350, NS bolus 500, PO 240"

Do not ask clarifying questions unless a volume is genuinely ambiguous or missing. Parse what is provided.

Map each mentioned fluid to the correct category. Use clinical context to infer:
- "foley drained 250" = Urine / Foley / 250 mL
- "drank 500ml" = PO liquids / 500 mL
- "IVs running at 125/hr" = IV fluids -- need duration to calculate volume (ask if not provided)
- "50% dinner" = Dietary -- estimate per special cases below
- "JP had 45cc" = Drains / JP / 45 mL
- "500 NS bolus" = IV fluids / bolus / 500 mL
- "blood products: 1 unit PRBCs" = IV fluids / blood products / ~350 mL (standard unit volume)

Preserve the nurse's language in the Details column.

### Step 2: Handle Special Cases

**Meal percentages:**
Use ~300 mL as the default standard hospital tray fluid estimate. Calculate proportionally:
- 100% tray = ~300 mL, 75% = ~225 mL, 50% = ~150 mL, 25% = ~75 mL

Mark all dietary estimates as Tier 2:
```
~150 mL est. (50% of ~300mL standard tray -- adjust per your facility)
```

**IV rate calculations:**
If the nurse provides rate and duration, calculate: volume = rate x time.
- "NS at 125/hr for 4 hours" = 500 mL (Tier 1 -- math)
- If rate given without duration, ask for the timeframe.

**Ice chips:** Standard conversion: ice chips volume x 0.3 = fluid equivalent (30% rule). Tier 2 estimate.

**Continuous bladder irrigation (CBI):** Calculate net output: urine bag volume - irrigation intake = true urine output. Flag this calculation clearly.

**Blood products:**
Flag blood products separately in the Intake table. Standard unit volumes:
- PRBCs: ~350 mL, FFP: ~250 mL, Platelets: ~50 mL (pooled ~300 mL), Cryoprecipitate: ~15 mL

Use actual volume if provided. Standard estimates are Tier 2, labeled as such.

### Step 3: Calculate Totals

Call the deterministic I&O tool -- all arithmetic goes through the tool, not the model:

```bash
bash "$(git rev-parse --show-toplevel)/tools/io-tracker/track.sh" <<'EOF'
{"entries":[...],"prior_state":{"entries":[...]}}
EOF
```

### Step 4: Format Output

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

### Step 5: Incremental Mode

If the nurse provides follow-up entries in the same conversation:
- Keep the prior normalized entries from the last `track.sh` output state
- Add the new entries
- Re-run `track.sh` with the previous state plus the new entries
- Re-render the full summary with updated totals
- Mark new entries visually (prefix with `+` in the Details column)

### Step 6: Clinical Flags

When clinical context is available, flag concerning patterns. These are Tier 2 (bedside guidance):

```
[!] [Flag text] (bedside guidance -- verify per orders and facility protocol)
```

**Flag when:**
- **Low urine output**: <0.5 mL/kg/hr if weight and time are known, or <30 mL/hr as a general flag
- **Large positive balance**: Net >2L positive in a patient with known CHF, ESRD, or fluid restriction context
- **No urine documented**: If intake is documented but no urine output mentioned, note the gap
- **Significant output**: Single drain >500 mL, emesis >500 mL, or EBL >500 mL
- **Negative balance**: Flag if unexpected (e.g., not on diuretics) -- may indicate volume depletion

Only show flags when the data supports them.

**Why we care:**
- **Low UOP**: Urine output < 0.5 mL/kg/hr = early sign of renal hypoperfusion. AKI prevention window.
- **Large positive balance**: Fluid overload -> pulmonary edema -> respiratory failure. Especially dangerous in CHF/ESRD.
- **Negative balance without diuretics**: Unexpected volume depletion -- assess for third-spacing, bleeding, or inadequate resuscitation.

## Evidence & Confidence

- IV rate x time calculations are Tier 1 (deterministic math)
- Dietary tray estimates (~300mL) are Tier 2 -- always label with "(Tier 2 estimate -- adjust per facility)"
- Blood product standard volumes are Tier 2 -- label with unit source
- Ice chips 30% rule is Tier 2
- Clinical flags (low UOP, large balance) are Tier 2 (bedside guidance)
- Facility-specific concerning thresholds are Tier 3 -- "per facility protocol"

## Important Rules

- Do not invent volumes. If the nurse says "some output" without a number, ask for the volume. One prompt, one chance.
- Do not estimate urine output. Urine must have a measured volume. Only dietary and blood products use standard estimates, labeled as Tier 2.
- All arithmetic goes through the deterministic tool. Do not total volumes in the model.
- Net balance is always calculated and displayed.
- Preserve nurse shorthand in the Details column.
- Output is copy-paste ready. No conversational preamble.
- "Per facility protocol" for what constitutes concerning output thresholds.
- When in doubt about a category, ask once. Don't re-prompt.
