# Workflows

This lane holds the authoritative workflow contracts for Noah RN.

Current workflows:
- `acuity-calculator` — APACHE II, NEWS2
- `drug-reference` — OpenFDA drug label lookup
- `hello-nurse` — plugin verification
- `io-tracker` — intake & output fluid balance
- `neuro-calculator` — GCS, NIHSS, RASS, CPOT
- `protocol-reference` — ACLS, sepsis, stroke, rapid response, RSI
- `risk-calculator` — Wells PE/DVT, CURB-65, Braden
- `shift-assessment` — 15-system structured assessment
- `shift-report` — 7-section shift handoff
- `unit-conversion` — weight-based dosing, drip rates, unit conversions

Retired:
- `clinical-calculator` — split into `neuro-calculator`, `risk-calculator`, `acuity-calculator` (2026-04-12)

Shared references:
- `CONVENTIONS.md`
- `OPTIMIZATION-STANDARD.md`
- `registry.json`

Future pi.dev mapping:
- see `.pi/skills/MIGRATION-MAP.md`

## What this folder owns

- workflow contract content
- workflow metadata and registry entries
- shared workflow conventions
- workflow-level limitations and completeness rules

## What this folder does not own

- routing/selection authority
- patient-context assembly
- curated clinical resources themselves
- project-level pi runtime scaffolding

Those live in:
- `packages/agent-harness/`
- `services/clinical-mcp/`
- `clinical-resources/`
- `.pi/`

## Current rule

Treat `packages/workflows/*/SKILL.md` as authoritative now.

If a future pi-native surface mirrors these workflows, it should consume or mirror this lane rather than silently replace it.

## Where to look first

- `registry.json` — workflow inventory
- `CONVENTIONS.md` — shared output/routing/provenance conventions
- a specific workflow folder — when changing one workflow contract

## Read this next

- `../agent-harness/README.md`
- `../../docs/foundations/agent-harness-runtime-contract.md`
- `../../docs/foundations/clinical-resources-runtime-access-contract.md`
