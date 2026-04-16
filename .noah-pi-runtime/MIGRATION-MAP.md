# `.pi/` Migration Map

How the repo maps into the Pi-native project surface.

Repo note: the host-side source directory is `.noah-pi-runtime/`. It mounts into the isolated lane as `/runtime/.pi`. Paths shown below use the runtime-relative `.pi/...` form.

## Current State

| Source | Pi Surface | Status |
|---|---|---|
| `packages/workflows/*/SKILL.md` | runtime reads directly from `packages/workflows/` | authoritative |
| `packages/workflows/*/dependencies.yaml` | consumed by router + runtime guidance | all active workflows covered |
| `packages/agent-harness/router/clinical-router.md` | `.pi/extensions/noah-router/` | implemented bridge |
| `tools/` deterministic tools | `.pi/extensions/noah-clinical-tools/` | implemented bridge |
| `services/clinical-mcp/` | `.pi/extensions/medplum-context/` | implemented bridge |
| `clinical-resources/` | referenced by dependency manifests | direct reference, no migration needed |

## Content Sync Rule

- `packages/workflows/` is authoritative for clinical content and workflow dependency manifests
- `.noah-pi-runtime/` is authoritative for Pi bridge wiring only (extensions, system prompt, prompts, docs)
- Do not mirror clinical workflow contracts into `.noah-pi-runtime/skills/`

## Promoted Skills

See `skills/MIGRATION-MAP.md` for the full promotion log.

## Remaining

No active workflow remains without a dependency manifest.

## Exceptions

- **hello-nurse**: `.pi/skills/hello-nurse/SKILL.md` is a behavioral fork of `packages/workflows/hello-nurse/SKILL.md`, not a verbatim copy. The Pi-native version was intentionally rewritten. The content sync rule does not apply to this skill.
