# `.pi/skills/` Selection Bridge

Repo note: this surface is stored at `.noah-pi-runtime/skills/` and mounts as `/runtime/.pi/skills/`.

This note explains how future pi-native skill discovery should bridge from current canonical workflow contracts.

## Current discovery order

1. `packages/workflows/registry.json`
2. `packages/workflows/*/SKILL.md`
3. `packages/agent-harness/SELECTION-POLICY.md`
4. `.pi/skills/*` — scaffold paths for unpromoted skills, full contract for promoted skills (repo-hosted under `.noah-pi-runtime/skills/*`)

## Promoted skills

- **shift-report** — promoted 2026-04-12
  - `.pi/skills/shift-report/SKILL.md` — full contract with `pi:` metadata
  - `.pi/skills/shift-report/dependencies.yaml` — declarative dependency manifest
  - Clinical content stays in sync with `packages/workflows/shift-report/SKILL.md`

- **unit-conversion** — promoted 2026-04-13
  - `.pi/skills/unit-conversion/SKILL.md` — full contract with `pi:` metadata
  - `.pi/skills/unit-conversion/dependencies.yaml` — declarative dependency manifest
  - Simplest skill: pure deterministic computation via `tools/unit-conversions/convert.sh`
  - Clinical content stays in sync with `packages/workflows/unit-conversion/SKILL.md`

- **neuro-calculator** — promoted 2026-04-13
  - `.pi/skills/neuro-calculator/SKILL.md` — GCS, NIHSS, RASS, CPOT
  - `.pi/skills/neuro-calculator/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/neuro-calculator/SKILL.md`

- **risk-calculator** — promoted 2026-04-13
  - `.pi/skills/risk-calculator/SKILL.md` — Wells PE, Wells DVT, CURB-65, Braden
  - `.pi/skills/risk-calculator/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/risk-calculator/SKILL.md`

- **acuity-calculator** — promoted 2026-04-13
  - `.pi/skills/acuity-calculator/SKILL.md` — APACHE II, NEWS2
  - `.pi/skills/acuity-calculator/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/acuity-calculator/SKILL.md`

- **drug-reference** — promoted 2026-04-13
  - `.pi/skills/drug-reference/SKILL.md` — OpenFDA lookup, high-alert list
  - `.pi/skills/drug-reference/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/drug-reference/SKILL.md`

- **protocol-reference** — promoted 2026-04-13
  - `.pi/skills/protocol-reference/SKILL.md` — ACLS, Sepsis, Stroke, RRT, RSI
  - `.pi/skills/protocol-reference/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/protocol-reference/SKILL.md`

- **io-tracker** — promoted 2026-04-13
  - `.pi/skills/io-tracker/SKILL.md` — I&O categorization, net balance
  - `.pi/skills/io-tracker/dependencies.yaml`
  - Clinical content stays in sync with `packages/workflows/io-tracker/SKILL.md`

## Rule

- `packages/workflows/` remains authoritative for clinical content
- repo-side Pi wiring changes belong in `.noah-pi-runtime/skills/`
- `.pi/skills/shift-report/` is the Pi-native discovery surface (clinical content + Pi wiring)
- remaining `.pi/skills/*` paths are scaffold only until explicitly promoted
- future pi-native discovery should consume promoted skills directly and fall back to `packages/workflows/` for the rest

- **hello-nurse** — promoted 2026-04-13
  - `.pi/skills/hello-nurse/SKILL.md` — the one skill that gets to have a personality
  - `.pi/skills/hello-nurse/dependencies.yaml`

## Next promotion candidates

- `shift-assessment` (complex — narrative synthesis, similar to shift-report)
