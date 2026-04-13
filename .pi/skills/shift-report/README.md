# Shift Report — Pi-Native Skill

First workflow promoted to the Pi-native skill surface.

## Status: `promoted`

This skill directory now contains the full workflow contract with Pi-native metadata, not just a scaffold stub.

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Full skill contract — clinical content from `packages/workflows/shift-report/SKILL.md` plus Pi-native `pi:` frontmatter block |
| `dependencies.yaml` | Declarative dependency manifest — extensions, knowledge assets, services, conventions, router metadata |
| `README.md` | This file |

## Authority Model

The clinical content in `SKILL.md` was promoted from `packages/workflows/shift-report/SKILL.md`. Both files should stay in sync until one is explicitly retired.

| Surface | Role |
|---------|------|
| `packages/workflows/shift-report/SKILL.md` | Authoritative clinical contract (unchanged) |
| `.pi/skills/shift-report/SKILL.md` | Pi-native discovery surface (clinical content + `pi:` metadata) |
| `.pi/skills/shift-report/dependencies.yaml` | Pi-native dependency manifest (new — no equivalent in packages/workflows/) |

**Rule**: If the clinical content changes, change it in `packages/workflows/shift-report/SKILL.md` first, then sync here. The `pi:` block and `dependencies.yaml` are Pi-native additions that live only here.

## Dependency Summary

### Extensions
- **medplum-context** — patient context fetch (conditional: `patient_id` input mode only)
- **noah-clinical-tools** — trace logging, safety hooks (always required)

### Knowledge Assets
- `cross-skill-triggers` — post-output clinical suggestions
- `drug-ranges` — out-of-range medication flagging
- `four-layer-output` — output structure template
- `disclaimers` — random disclaimer footer

### Services
- **clinical-mcp** — MCP server at `services/clinical-mcp/` (conditional: `patient_id` input mode)

### Conventions
- `packages/workflows/CONVENTIONS.md` — trace logging, confidence tiers, universal rules, disclaimers, provenance, cross-skill suggestions, acuity convention

## Related Prompt

- `.pi/prompts/shift-handoff.md` — reusable prompt template for invoking this skill

## Execution Flow

```
Nurse input
    ↓
noah-router reads dependencies.yaml → matches shift_handoff scope
    ↓
Detects input mode: patient_id | clinical_narrative | missing
    ↓
[if patient_id] → medplum-context.get_patient_context() → timeline
[if narrative]  → pass through directly
[if missing]    → prompt: "Give me the rundown on your patient"
    ↓
SKILL.md executes: infer acuity → organize 7 sections → detect gaps
    ↓
noah-clinical-tools: trace logging + safety hooks
    ↓
cross-skill-triggers: check findings → suggest (max 2)
    ↓
Output: 7-section handoff + evidence + confidence + provenance + disclaimer
```
