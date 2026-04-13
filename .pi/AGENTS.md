# Agent Context

## Canonical sources

- `.pi/SYSTEM.md` — runtime system prompt
- `.pi/skills/*/SKILL.md` — promoted skill contracts
- `services/clinical-mcp/` — patient context and FHIR access
- `clinical-resources/` — curated protocols, reference data, templates
- `memory/` — patient and session memory (placeholder)
- `docs/ARCHITECTURE.md` — system boundary map

## Skill surface

Nine skills promoted to `.pi/skills/`:

- **shift-report** (2026-04-12) — complex, FHIR context via clinical-mcp
- **unit-conversion** (2026-04-13) — moderate, pure bash tool
- **neuro-calculator** (2026-04-13) — moderate, GCS/NIHSS/RASS/CPOT
- **risk-calculator** (2026-04-13) — moderate, Wells PE/DVT, CURB-65, Braden
- **acuity-calculator** (2026-04-13) — moderate, APACHE II, NEWS2
- **drug-reference** (2026-04-13) — moderate, OpenFDA lookup + high-alert list
- **protocol-reference** (2026-04-13) — moderate, ACLS/Sepsis/Stroke/RRT/RSI knowledge files
- **io-tracker** (2026-04-13) — moderate, I&O categorization and net balance
- **hello-nurse** (2026-04-13) — simple, the easter egg

Remaining unpromoted: shift-assessment.

## Content sync rule

Clinical content in `.pi/skills/` stays in sync with `packages/workflows/`. Change clinical content in `packages/workflows/` first, then sync to `.pi/skills/`.

Pi-native wiring (dependencies.yaml, pi: frontmatter, prompt templates) is authored in `.pi/` directly.
