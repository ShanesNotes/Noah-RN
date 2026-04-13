# `.pi/`

Project-level Pi configuration surface for Noah RN.

## Contents

- `SYSTEM.md` — runtime system prompt for the Pi agent
- `AGENTS.md` — agent context and canonical source map
- `skills/` — promoted workflow skill contracts
- `extensions/` — Pi extensions (router, medplum-context, clinical-tools)
- `prompts/` — reusable prompt templates

## Skills

| Skill | Complexity | Tools | Promoted |
|-------|-----------|-------|----------|
| shift-report | complex | clinical-mcp | 2026-04-12 |
| unit-conversion | moderate | convert.sh | 2026-04-13 |
| neuro-calculator | moderate | gcs.sh, nihss.sh, rass.sh, cpot.sh | 2026-04-13 |
| risk-calculator | moderate | wells-pe.sh, wells-dvt.sh, curb65.sh, braden.sh | 2026-04-13 |
| acuity-calculator | moderate | apache2.sh, news2.sh | 2026-04-13 |
| drug-reference | moderate | lookup.sh (OpenFDA) | 2026-04-13 |
| protocol-reference | moderate | knowledge files | 2026-04-13 |
| io-tracker | moderate | track.sh | 2026-04-13 |
| hello-nurse | simple | — | 2026-04-13 |

Discovery: `skills/SELECTION-BRIDGE.md`
Migration: `skills/MIGRATION-MAP.md`

## Relationship to `packages/`

- `packages/workflows/` remains authoritative for clinical content
- `.pi/skills/` is authoritative for Pi-native wiring (dependencies.yaml, pi: frontmatter)
- If clinical content changes, change it in `packages/workflows/` first, then sync to `.pi/skills/`
