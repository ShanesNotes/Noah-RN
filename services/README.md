# Services

Runnable service/process surfaces live here.

Current services:
- `clinical-mcp/` — MCP server for context assembly and simulation-facing reads
- `sim-harness/` — Clinical Simulation Harness workspace center (scaffold + type contracts + relocated reference PK + simulation clock — Lane A partial; Pulse Physiology Engine locked as L0 substrate per Contract 9, 2026-04-13; canonical authority is `docs/foundations/invariant-kernel-simulation-architecture.md` and `docs/foundations/foundational-contracts-simulation-architecture.md`)

Useful commands:

```bash
npm run dev --workspace services/clinical-mcp
npm run build --workspace services/clinical-mcp
npm run test --workspace services/clinical-mcp
npm run get-context --workspace services/clinical-mcp

npm run check --workspace services/sim-harness
npm run test --workspace services/sim-harness
```

Current rule:
- the Clinical Workspace lane has two workspace centers: `services/clinical-mcp/` (context boundary) and `services/sim-harness/` (live-runtime boundary)
- if work is about patient-context assembly, timeline shaping, FHIR normalization, or MCP tool surfaces, start at `services/clinical-mcp/`
- if work is about live vitals, live waveforms, scenario direction, or wrapping the Pulse Physiology Engine (locked 2026-04-13), start at `services/sim-harness/` — but do not widen runtime code until the deferred sim-harness runtime lanes (B–F) in `TASKS.md` are intentionally pulled forward from the current queue
- agents never talk to `services/sim-harness/` directly; agent-facing tools register through `services/clinical-mcp/`
- read the service-local README before changing code
