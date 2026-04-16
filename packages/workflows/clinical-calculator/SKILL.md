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

## Output Contract

This retired alias still preserves the standard Noah RN output contract when surfaced in eval or fallback paths:

- Summary
- Evidence
- Confidence
- Provenance

## Safety / HITL

- This surface is clinical decision support, not autonomous clinical decision-making.
- Human review remains required before acting on any calculator-derived interpretation.
- If the input is ambiguous, route to the correct split skill rather than guessing.

## Completeness

- Always identify the correct split skill.
- Always preserve the four-layer output format.
- Always preserve the provenance footer and bedside verification language.
