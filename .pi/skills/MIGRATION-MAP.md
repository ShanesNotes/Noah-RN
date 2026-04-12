# `.pi/skills/` Migration Map

These are the current workflow contracts that would eventually become pi-discovered skills.

| Current workflow contract | Future pi skill path |
|---|---|
| `packages/workflows/clinical-calculator/SKILL.md` | `.pi/skills/clinical-calculator/SKILL.md` |
| `packages/workflows/drug-reference/SKILL.md` | `.pi/skills/drug-reference/SKILL.md` |
| `packages/workflows/hello-nurse/SKILL.md` | `.pi/skills/hello-nurse/SKILL.md` |
| `packages/workflows/io-tracker/SKILL.md` | `.pi/skills/io-tracker/SKILL.md` |
| `packages/workflows/protocol-reference/SKILL.md` | `.pi/skills/protocol-reference/SKILL.md` |
| `packages/workflows/shift-assessment/SKILL.md` | `.pi/skills/shift-assessment/SKILL.md` |
| `packages/workflows/shift-report/SKILL.md` | `.pi/skills/shift-report/SKILL.md` |
| `packages/workflows/unit-conversion/SKILL.md` | `.pi/skills/unit-conversion/SKILL.md` |

## Current rule

Do not copy these contracts yet.

Use `packages/workflows/` as the source of truth until the pi.dev runtime layer is actually being implemented.

Exception:
- `.pi/skills/shift-report/SKILL.md` now exists only as a scaffold stub pointing back to the authoritative workflow contract.
