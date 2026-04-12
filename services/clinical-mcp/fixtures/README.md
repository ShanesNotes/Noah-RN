# Clinical MCP Fixtures

This folder holds fixture-backed patient-context snapshots for bounded local testing.

## What this folder owns

- canonical fixture data for the current first patient path
- deterministic test support for context assembly
- fixture-backed fallback behavior for local validation

## Current canonical path

- `patient-123`

That path is the first bounded end-to-end patient-context proof path for `Shift Report`.

## What this folder does not own

- the canonical product data model
- live-data integration strategy
- production persistence

## Current rule

Use fixtures to prove bounded behavior and acceptance criteria.

Do not treat fixture coverage as proof that live-data architecture is complete.

## Read this next

- `../../docs/foundations/shift-report-canonical-patient-path.md`
- `../../docs/foundations/shift-report-patient-123-acceptance-criteria.md`
