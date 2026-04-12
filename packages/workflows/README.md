# Workflows

This lane holds the authoritative workflow contracts for Noah RN.

Current workflows:
- `clinical-calculator`
- `drug-reference`
- `hello-nurse`
- `io-tracker`
- `protocol-reference`
- `shift-assessment`
- `shift-report`
- `unit-conversion`

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
