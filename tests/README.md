# Tests

This folder holds correctness and contract verification for deliverable Noah RN surfaces.

## What this folder owns

- deterministic tool tests
- workflow bridge/contract tests
- hook tests
- FHIR helper tests
- clinical scenario fixtures and harnesses

## What this folder does not own

- optimization traces
- candidate comparisons
- eval-loop artifacts

Those belong in:
- `evals/`

## Current subareas

- `agents/` — bridge, routing, and workflow contract tests
- `clinical-calculators/` — deterministic calculator tests
- `clinical/` — clinical golden-test harness surface
- `clinical-scenarios/` — scenario corpus and manifest
- `drug-lookup/` — OpenFDA lookup tests
- `fhir/` — FHIR helper tests
- `hooks/` — safety hook tests
- `integration/` — cross-tool integration tests
- `io-tracker/` — I&O tool tests
- `knowledge/` — clinical resource correctness tests (legacy folder name; targets `clinical-resources/`)
- `trace/` — trace tool tests
- `unit-conversions/` — conversion tests

## Current rule

Use `tests/` for correctness of active runtime surfaces.
Use `evals/` for improvement loops, candidates, traces, and scoring.

If a test is checking a bridge or contract that will later be promoted into runtime behavior, it still belongs here.

## Read this next

- `../docs/topology/evals-vs-tests.md`
- `clinical/README.md`
- `clinical-scenarios/README.md`
