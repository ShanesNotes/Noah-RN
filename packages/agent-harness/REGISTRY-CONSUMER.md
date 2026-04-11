# Agent Harness Registry Consumer Note

This note explains how future router/harness work should consume the new readiness artifacts.

## Current source-of-truth inputs

- `packages/workflows/registry.json`
- `packages/workflows/*/SKILL.md`
- `tools/registry.json`
- `knowledge/registry.json`

## Consumption posture

Future router work should prefer:

1. **registry-first discovery**
   - enumerate available workflow/tool/knowledge surfaces from registry files
2. **contract-aware routing**
   - inspect workflow `contract:` blocks before selecting a workflow
3. **current-source authority**
   - treat `packages/workflows/*/SKILL.md` as canonical until an explicit promotion to `.pi/skills/` is recorded

## Non-goal

Do not let `.pi/` scaffolds silently become authoritative just because they are closer to a future runtime shape.
