# `.pi/skills/` Registry Consumer Note

Repo note: this surface is stored at `.noah-pi-runtime/skills/` and mounts as `/runtime/.pi/skills/`.

Future pi-native skill discovery should consume the current readiness artifacts in this order:

1. `packages/workflows/registry.json`
2. `packages/workflows/*/SKILL.md`
3. `.pi/skills/*` scaffold paths (repo-hosted under `.noah-pi-runtime/skills/*`)

## Rule

- `packages/workflows/` is still canonical
- `.pi/skills/` is still scaffold-first
- any promotion of `.pi/skills/` to runtime truth must be recorded explicitly before discovery logic depends on it
- repo-side edits should happen in `.noah-pi-runtime/skills/`, not a root `.pi/` directory

## First workflow target

The first skill path to promote, if and when that happens, should be:

- `shift-report`
