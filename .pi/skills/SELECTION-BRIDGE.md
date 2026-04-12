# `.pi/skills/` Selection Bridge

This note explains how future pi-native skill discovery should bridge from current canonical workflow contracts.

## Current discovery order

1. `packages/workflows/registry.json`
2. `packages/workflows/*/SKILL.md`
3. `packages/agent-harness/SELECTION-POLICY.md`
4. `.pi/skills/*` scaffold paths

## Rule

- `.pi/skills/` is not yet authoritative
- future pi-native discovery should consume the canonical workflow surface first
- scaffold paths in `.pi/skills/` mainly mark future destination and migration intent

## First promotion target

If one workflow is promoted first, it should be:
- `shift-report`
