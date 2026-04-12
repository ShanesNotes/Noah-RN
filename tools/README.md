# Tools

This folder holds deterministic tools and operational helpers used by Noah RN.

## What this folder owns

- exact clinical calculators
- deterministic lookup helpers
- FHIR support scripts
- I&O deterministic tooling
- safety hooks
- trace tooling
- utility converters

Current subareas:
- `clinical-calculators/`
- `drug-lookup/`
- `fhir/`
- `graphify/`
- `io-tracker/`
- `safety-hooks/`
- `trace/`
- `unit-conversions/`
- `youtube-poll/`
- `registry.json`

## What this folder does not own

- workflow contracts
- routing policy
- curated clinical resources
- evaluation traces

Those live in:
- `packages/workflows/`
- `packages/agent-harness/`
- `clinical-resources/`
- `evals/`

## Current rule

If something can be computed, validated, fetched, or checked exactly, prefer putting it here rather than in a prompt contract.

If a helper is exploratory, environment-specific, or not part of the active runtime/tool layer, it should not become a first-class tool without an explicit reason.

## Read this next

- `registry.json`
- `safety-hooks/README.md`
- `../docs/ARCHITECTURE.md`
