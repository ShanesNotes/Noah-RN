# @noah-rn/contracts

Shared cross-product types for Noah RN.

**Who consumes this package?** Every product and subordinate lane that crosses a product boundary:

- **Product A — Noah RN Agent Harness** (`packages/agent-harness/`)
- **Product B — Agent-Native Nursing EHR** (`services/clinical-mcp/`, `apps/nursing-station/`)
- **Product C — Agent-Native Clinical Simulation** (`services/sim-harness/`)
- **Subordinate lanes** — clinical-resources, memory, observability

No subordinate imports types from another subordinate directly. All cross-product types live here.

## Exports

- [`@noah-rn/contracts/lane-coverage`](src/lane-coverage.ts) — canonical lane vocabulary (`ehr/chart`, `memory`, `clinical-resources`, `patient-monitor/simulation`) and coverage states.
- [`@noah-rn/contracts/context-bundle`](src/context-bundle.ts) — `PatientContextBundle` returned by the clinical-MCP contract v1 `get_patient_context` tool.
- [`@noah-rn/contracts/provenance-envelope`](src/provenance-envelope.ts) — FHIR Provenance envelope shape with closed-set author categories and source-layer values.
- [`@noah-rn/contracts/trace-envelope`](src/trace-envelope.ts) — cross-product observability envelope (v0; Phase 7 expands it).
- [`@noah-rn/contracts/mcp-tool-types`](src/mcp-tool-types.ts) — input/output types for clinical-MCP contract v1 tools.
- [`@noah-rn/contracts/renderer-input`](src/renderer-input.ts) — shared renderer-input shape between Product A renderer and Product B worker.

## Versioning

Stays in lockstep with the published standards under [`docs/standards/`](../../docs/standards/). Type additions follow additive semantics in v1; breaking changes require v2 of the owning standard.

## Usage

```ts
import type { PatientContextBundle, LaneCoverage } from '@noah-rn/contracts';
// or
import type { RenderShiftReportArgs } from '@noah-rn/contracts/mcp-tool-types';
```

Type-only imports are the intended pattern. This package has no runtime output; consumers that use TypeScript compile-time stripping see no Node.js resolution of the `.ts` files at runtime.
