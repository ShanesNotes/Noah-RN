# `.pi/skills/` Registry Consumer Note

Future pi-native skill discovery should consume the current readiness artifacts in this order:

1. `packages/workflows/registry.json`
2. `packages/workflows/*/SKILL.md`
3. `.pi/skills/*` scaffold paths

## Rule

- `packages/workflows/` is still canonical
- `.pi/skills/` is still scaffold-first
- any promotion of `.pi/skills/` to runtime truth must be recorded explicitly before discovery logic depends on it

## First workflow target

The first skill path to promote, if and when that happens, should be:

- `shift-report`
