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

### Step 1: Receive Input

Accept the nurse's free-text I&O description. This can be:
- A full shift dump: "250 of urine out, drank 500ml, at 50% dinner, IVs running at 125/hr for 4 hours"
- Partial: "just had 200 from the JP drain"
- Shorthand: "foley 350, NS bolus 500, PO 240"

Do not ask clarifying questions unless a volume is genuinely ambiguous or missing. Parse what is provided.

### Step 2: Parse and Categorize

Map each mentioned fluid to the correct category. Use clinical context to infer:
- "foley drained 250" = Urine / Foley / 250 mL
- "drank 500ml" = PO liquids / 500 mL
- "IVs running at 125/hr" = IV fluids -- but need duration to calculate volume (ask if not provided)
- "50% dinner" = Dietary -- estimate per Step 3
- "JP had 45cc" = Drains / JP / 45 mL
- "500 NS bolus" = IV fluids / bolus / 500 mL
- "blood products: 1 unit PRBCs" = IV fluids / blood products / ~350 mL (standard unit volume)

Preserve the nurse's language in the Details column. Don't sanitize abbreviations.

### Step 3: Handle Special Cases

**Meal percentages:**
Use ~300 mL as the default standard hospital tray fluid estimate. Calculate proportionally:
- 100% tray = ~300 mL
- 75% = ~225 mL
- 50% = ~150 mL
- 25% = ~75 mL

Mark all dietary estimates as Tier 2:
```
~150 mL est. (50% of ~300mL standard tray -- adjust per your facility)
```

The nurse can override with their facility's actual tray volume.

**IV rate calculations:**
If the nurse provides rate and duration, calculate: volume = rate x time.
- "NS at 125/hr for 4 hours" = 500 mL (Tier 1 -- math)
- "running at same rate" = ask for the rate if not previously mentioned in conversation

If rate is given without duration, ask for the timeframe.

**Ice chips:**
Standard conversion: ice chips volume x 0.3 = fluid equivalent (30% rule). Mark as Tier 2 estimate.

**Continuous bladder irrigation (CBI):**
If the nurse mentions CBI, calculate net output: urine bag volume - irrigation intake = true urine output. Flag this calculation clearly.

**Blood products:**
Flag blood products separately in the Intake table. Standard unit volumes for reference:
- PRBCs: ~350 mL per unit
- FFP: ~250 mL per unit
- Platelets: ~50 mL per unit (pooled ~300 mL)
- Cryoprecipitate: ~15 mL per unit

Use actual volume if the nurse provides it. Use standard estimates only if unit count is given without volume, and mark as Tier 2 estimate.

Standard volumes are common clinical reference values. Actual volumes vary by product and manufacturer. (Source: institutional clinical practice — Tier 2 estimates, labeled as such)

### Step 4: Calculate Totals

Sum each category, then calculate grand totals and net balance. All arithmetic is straightforward addition -- no tool call needed.

### Step 5: Format Output

Present as a clean, copy-paste-ready summary:

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

If there are Tier 2 estimates, include the caveat note below the table.

### Step 6: Incremental Mode

If the nurse provides follow-up entries in the same conversation:
- Include all previous entries from this conversation
- Add the new entries
- Recalculate all totals
- Re-render the full summary with updated totals
- Mark new entries visually (prefix with `+` in the Details column)

Example follow-up:
```
Nurse: "also had emesis 150cc coffee ground, and foley another 200"
```

Updated summary includes the original entries plus the new ones, with recalculated totals.

### Step 7: Clinical Flags

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

Only show flags when the data supports them. Do not speculate about diagnoses or fluid status beyond what the numbers show.

**Why we care:**
- **Low UOP**: Urine output < 0.5 mL/kg/hr = early sign of renal hypoperfusion. AKI prevention window.
- **Large positive balance**: Fluid overload → pulmonary edema → respiratory failure. Especially dangerous in CHF/ESRD.
- **Negative balance without diuretics**: Unexpected volume depletion — assess for third-spacing, bleeding, or inadequate resuscitation.

### Step 8: Disclaimer

Append a randomly selected disclaimer:

```
---
Noah RN -- not a substitute for using your noggin. Stay focused.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- trust your gut, verify with your eyes. This is just a tool.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- you're the nurse, I'm the clipboard. Double-check everything.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- clinical decision support, not clinical decisions. You got this.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN -- I organize, you validate. Your assessment > my output.
Verify all findings against your assessment and facility policies.
```

Select ONE randomly per invocation. Do not repeat the same one consecutively.

## Evidence & Confidence

- IV rate x time calculations are Tier 1 (deterministic math)
- Dietary tray estimates (~300mL) are Tier 2 — always label with "(Tier 2 estimate — adjust per facility)"
- Blood product standard volumes are Tier 2 — label with unit source
- Ice chips 30% rule is Tier 2
- Clinical flags (low UOP, large balance) are Tier 2 (bedside guidance)
- Facility-specific concerning thresholds are Tier 3 — "per facility protocol"

## Provenance Footer
End every response with:
---
noah-rn v0.2 | io-tracker v1.1.0 | nurse-provided data
Clinical decision support — verify against facility protocols and current patient data.

## Cross-Skill Suggestions

If I&O findings map to knowledge/templates/cross-skill-triggers.md, add up to 2 suggestions after the I&O summary. Only if clearly supported by the data.

Key trigger mappings for I&O:
- UOP < 0.5 mL/kg/hr x 6h → consider renal assessment, fluid status review
- Net fluid balance > +3L → consider volume overload assessment
- Significant negative balance without diuretics → consider fluid resuscitation review

## Important Rules

- Do not invent volumes. If the nurse says "some output" without a number, ask for the volume. One prompt, one chance.
- Do not estimate urine output. Urine must have a measured volume. Only dietary and blood products use standard estimates, and those are always labeled as Tier 2.
- IV rate x time calculations are Tier 1 (deterministic math).
- Dietary tray estimates are Tier 2 (labeled with default assumption and facility caveat).
- Net balance is always calculated and displayed.
- Preserve nurse shorthand in the Details column: "500 of NS", "drained 200 from JP", "dark amber concentrated".
- Output is copy-paste ready. No conversational preamble ("Here's your I&O summary...").
- "Per facility protocol" for what constitutes concerning output thresholds -- facilities have different standards.
- When in doubt about a category, ask once. Don't re-prompt.
