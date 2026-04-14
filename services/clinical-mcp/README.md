# Clinical MCP

This folder is the clinical workspace center for Noah RN.

It is the agent-facing boundary between workflow/harness code and chart/simulation-derived patient context.

## What this folder owns

- MCP server surface for clinical tools
- patient-context assembly
- FHIR client and mapping logic
- FHIR-queued draft write path for Shift Report and related clinical actions (Contract 5: `Task(status=requested)` → runtime executes → draft `DocumentReference(status=current, docStatus=preliminary)` → `Task.output` links artifact)
- the agent-facing boundary that sim tools register through via the `registerSimTools()` seam (no-op until Lane F) — L0 physiology, reference pharmacokinetics, and scenario direction live in `services/sim-harness/` as of 2026-04-13
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

## Useful commands

```bash
npm run dev --workspace services/clinical-mcp
npm run build --workspace services/clinical-mcp
npm run test --workspace services/clinical-mcp
npm run get-context --workspace services/clinical-mcp
```

## Where to look first

- `src/server.ts` — MCP tool registration and service boundary (sim tools register through the `registerSimTools()` seam — no-op until Lane F)
- `src/context/` — patient-context assembly and shaping
- `src/fhir/` — FHIR fetch and mapping layer
- `src/events/` — event-surface shaping at the L3 boundary (L0 physiology and scenario direction live in `services/sim-harness/`)
- `get-context.mjs` — local bounded patient-context inspection helper
- `fixtures/` — canonical fixture-backed patient path support

## What to ignore first

- `dist/` — build output, not source of truth
- `node_modules/` — dependency install state
- `.omc/` and local state files — runtime/tooling residue, not architecture

## Current rule

Treat `src/` as canonical code truth.

Treat `fixtures/` as support for the first bounded patient-context path, not as the product architecture.
Treat this service as the agent-facing context boundary; live-runtime physiology is in `services/sim-harness/`.
Treat `src/fhir/writes.ts` as the Contract 5 draft write-back surface — expand only per the medplum write-path expansion spec.

## Read this next

- `src/README.md`
- `fixtures/README.md`
- `../../docs/foundations/patient-context-bundle-contract.md`
- `../../docs/foundations/shift-report-canonical-patient-path.md`
- `../../docs/foundations/medplum-architecture-packet.md`
- `../../docs/foundations/medplum-write-path-expansion.md`
- `../../docs/foundations/invariant-kernel-simulation-architecture.md`
- `../../docs/foundations/foundational-contracts-simulation-architecture.md`
