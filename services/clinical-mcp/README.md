# Clinical MCP

This folder is the clinical workspace center for Noah RN.

It is the agent-facing boundary between workflow/harness code and chart/simulation-derived patient context.

## What this folder owns

- MCP server surface for clinical tools
- patient-context assembly
- FHIR client and mapping logic
- draft write-boundary scaffolds for Shift Report and related clinical actions
- simulation/state progression helpers used by the current clinical workspace lane
- fixture-backed canonical patient path support

## What this folder does not own

- workflow contracts
- harness selection policy
- curated clinical resources
- long-term memory architecture

Those live in:
- `packages/workflows/`
- `packages/agent-harness/`
- `clinical-resources/`
- `docs/foundations/memory-tier-boundary.md`

## Where to look first

- `src/server.ts` — MCP tool registration and service boundary
- `src/context/` — patient-context assembly and shaping
- `src/fhir/` — FHIR fetch and mapping layer
- `src/events/` — simulation/event progression logic
- `get-context.mjs` — local bounded patient-context inspection helper
- `fixtures/` — canonical fixture-backed patient path support

## What to ignore first

- `dist/` — build output, not source of truth
- `node_modules/` — dependency install state
- `.omc/` and local state files — runtime/tooling residue, not architecture

## Current rule

Treat `src/` as canonical code truth.

Treat `fixtures/` as support for the first bounded patient-context path, not as the product architecture.
Treat simulation code here as part of the clinical workspace lane, not as a separate platform.
Treat `src/fhir/writes.ts` as scaffold-only until write semantics are explicitly widened.

## Read this next

- `src/README.md`
- `fixtures/README.md`
- `../../docs/foundations/patient-context-bundle-contract.md`
- `../../docs/foundations/shift-report-canonical-patient-path.md`
- `../../docs/foundations/medplum-architecture-packet.md`
