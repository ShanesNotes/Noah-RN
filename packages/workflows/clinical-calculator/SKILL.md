---
name: clinical-calculator
status: split
split_into:
  - neuro-calculator
  - risk-calculator
  - acuity-calculator
split_date: "2026-04-12"
---

# Clinical Calculator — Split Notice

This skill has been split into three focused skills:

| New skill | Calculators | Path |
|-----------|------------|------|
| **neuro-calculator** | GCS, NIHSS, RASS, CPOT | `packages/workflows/neuro-calculator/SKILL.md` |
| **risk-calculator** | Wells PE, Wells DVT, CURB-65, Braden | `packages/workflows/risk-calculator/SKILL.md` |
| **acuity-calculator** | APACHE II, NEWS2 | `packages/workflows/acuity-calculator/SKILL.md` |

## Why

The monolithic clinical-calculator carried reference data for 10 calculators at 310% of the
`simple` tier byte budget. Each sub-skill is now a focused, budget-compliant unit that matches
how nurses actually use these tools at the bedside:

- **Neuro check** → GCS + NIHSS + RASS + CPOT (consciousness, stroke, sedation, pain)
- **Risk screening** → Wells PE/DVT + CURB-65 + Braden (thrombosis, pneumonia, skin)
- **Severity tracking** → APACHE II + NEWS2 (ICU prognosis, deterioration)

## Routing

The router should match calculator-related intents to the appropriate sub-skill.
All three share the `clinical_scoring` scope. Cross-references in `do_not_use_when`
point nurses to the correct sibling skill.
