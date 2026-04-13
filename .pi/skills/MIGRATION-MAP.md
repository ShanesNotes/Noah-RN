# `.pi/skills/` Migration Map

These are the current workflow contracts that would eventually become pi-discovered skills.

| Current workflow contract | Future pi skill path |
|---|---|
| `packages/workflows/neuro-calculator/SKILL.md` | `.pi/skills/neuro-calculator/SKILL.md` |
| `packages/workflows/risk-calculator/SKILL.md` | `.pi/skills/risk-calculator/SKILL.md` |
| `packages/workflows/acuity-calculator/SKILL.md` | `.pi/skills/acuity-calculator/SKILL.md` |
| `packages/workflows/drug-reference/SKILL.md` | `.pi/skills/drug-reference/SKILL.md` |
| `packages/workflows/hello-nurse/SKILL.md` | `.pi/skills/hello-nurse/SKILL.md` |
| `packages/workflows/io-tracker/SKILL.md` | `.pi/skills/io-tracker/SKILL.md` |
| `packages/workflows/protocol-reference/SKILL.md` | `.pi/skills/protocol-reference/SKILL.md` |
| `packages/workflows/shift-assessment/SKILL.md` | `.pi/skills/shift-assessment/SKILL.md` |
| `packages/workflows/shift-report/SKILL.md` | `.pi/skills/shift-report/SKILL.md` |
| `packages/workflows/unit-conversion/SKILL.md` | `.pi/skills/unit-conversion/SKILL.md` |

## Current rule

Use `packages/workflows/` as the source of truth for clinical content. Promoted skills in `.pi/skills/` carry the same clinical content plus Pi-native metadata.

### Promoted (2026-04-12)

- **shift-report** — `.pi/skills/shift-report/SKILL.md` now contains the full workflow contract with a `pi:` frontmatter block and a `dependencies.yaml` manifest. Clinical content stays in sync with `packages/workflows/shift-report/SKILL.md`.

### Promoted (2026-04-13)

- **unit-conversion** — Pure deterministic skill. No FHIR, no MCP. Clinical content stays in sync with `packages/workflows/unit-conversion/SKILL.md`.
- **neuro-calculator** — GCS, NIHSS, RASS, CPOT. Split from clinical-calculator. Clinical content stays in sync with `packages/workflows/neuro-calculator/SKILL.md`.
- **risk-calculator** — Wells PE, Wells DVT, CURB-65, Braden. Split from clinical-calculator. Clinical content stays in sync with `packages/workflows/risk-calculator/SKILL.md`.
- **acuity-calculator** — APACHE II, NEWS2. Split from clinical-calculator. Clinical content stays in sync with `packages/workflows/acuity-calculator/SKILL.md`.
- **drug-reference** — OpenFDA lookup with high-alert medication list. Clinical content stays in sync with `packages/workflows/drug-reference/SKILL.md`.
- **protocol-reference** — ACLS, Sepsis, Stroke, RRT, RSI. Knowledge-file based. Clinical content stays in sync with `packages/workflows/protocol-reference/SKILL.md`.
- **io-tracker** — I&O categorization and net balance. Clinical content stays in sync with `packages/workflows/io-tracker/SKILL.md`.

- **hello-nurse** — The easter egg. **Behavioral fork** — intentionally rewritten from `packages/workflows/hello-nurse/SKILL.md`. Content sync rule does not apply.

### Not yet promoted

- `shift-assessment` — complex narrative synthesis
