# `.pi/skills/` Registry Consumer Note

## Namespace rule

- **`.pi/skills/`** — Dev skills only (Pi agent discovery)
- **`packages/workflows/`** — Product skills only (Noah-RN discovery)

## Noah-RN skill discovery order

1. `packages/workflows/registry.json`
2. `packages/workflows/*/SKILL.md`
3. `packages/workflows/*/dependencies.yaml`

## Dev skill discovery order

1. `.pi/skills/*/SKILL.md`

Currently no dev skills defined. Add as needed.
