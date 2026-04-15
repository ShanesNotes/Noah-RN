# `.noah-pi-runtime/skills/` Selection Bridge

## Namespace boundary

- **`.noah-pi-runtime/skills/`** — Dev-facing skills (Pi agent persona: build, test, deploy)
- **`packages/workflows/`** — Product-facing skills (Noah-RN persona: clinical decision support)

These namespaces must not overlap. Pi agents discover `.noah-pi-runtime/skills/` automatically;
Noah-RN discovers `packages/workflows/registry.json` at runtime.

## Dev skill discovery

1. `.noah-pi-runtime/skills/*/SKILL.md`

Active dev skills:

- **ui-generation** — React/CSS component generation following Pi Minimalism
  design language. Delegated to `gemini-3.1-pro-preview` via `google-gemini-cli`.

## Product skill discovery

Noah-RN resolves skills from:

1. `packages/workflows/registry.json` — canonical skill registry
2. `packages/workflows/*/SKILL.md` — full contracts
3. `packages/workflows/*/dependencies.yaml` — dependency manifests
4. `packages/workflows/CONVENTIONS.md` — shared conventions

## History

Previously, clinical skills were promoted (copied) from `packages/workflows/`
into `.noah-pi-runtime/skills/` with added `pi:` metadata. This created a sync obligation
and polluted the dev namespace. Consolidated 2026-04-13.
