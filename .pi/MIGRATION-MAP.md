# `.pi/` Migration Map

How the repo maps into the Pi-native project surface.

## Current State

| Source | Pi Surface | Status |
|---|---|---|
| `packages/workflows/*/SKILL.md` | `.pi/skills/<name>/SKILL.md` | 9 promoted, 1 remaining |
| `packages/agent-harness/router/clinical-router.md` | `.pi/extensions/noah-router/` | extension stubs exist |
| `tools/safety-hooks/` | `.pi/extensions/noah-clinical-tools/` | extension stubs exist |
| `services/clinical-mcp/` | `.pi/extensions/medplum-context/` | extension stubs exist |
| `clinical-resources/` | referenced by skill dependencies.yaml | direct reference, no migration needed |

## Content Sync Rule

- `packages/workflows/` is authoritative for clinical content
- `.pi/skills/` is authoritative for Pi-native wiring
- Change clinical content in `packages/workflows/` first, then sync to `.pi/skills/`

## Promoted Skills

See `skills/MIGRATION-MAP.md` for the full promotion log.

## Remaining

| Skill | Notes |
|---|---|
| shift-assessment | complex narrative synthesis |

## Exceptions

- **hello-nurse**: `.pi/skills/hello-nurse/SKILL.md` is a behavioral fork of `packages/workflows/hello-nurse/SKILL.md`, not a verbatim copy. The Pi-native version was intentionally rewritten. The content sync rule does not apply to this skill.
