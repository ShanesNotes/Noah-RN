# Services

Runnable service/process surfaces live here.

Current services:
- `clinical-mcp/` — MCP server for context assembly and simulation-facing reads
- `sim-harness/` — Clinical Simulation Harness workspace center (scaffold only; canonical spec in `docs/foundations/sim-harness-scaffold.md`)

Current rule:
- the Clinical Workspace lane has two workspace centers: `services/clinical-mcp/` (context boundary) and `services/sim-harness/` (live-runtime boundary)
- if work is about patient-context assembly, timeline shaping, FHIR normalization, or MCP tool surfaces, start at `services/clinical-mcp/`
- if work is about live vitals, live waveforms, scenario direction, or wrapping Pulse/BioGears/Infirmary Integrated, start at `services/sim-harness/` — but do not write runtime code until `TASKS.md` item 4 has moved into a runtime batch
- agents never talk to `services/sim-harness/` directly; agent-facing tools register through `services/clinical-mcp/`
- read the service-local README before changing code
