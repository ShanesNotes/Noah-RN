# `.pi/extensions/`

pi.dev extensions live here. pi.dev is the active agent harness foundation (Decision 2026-04-10); these extensions are subordinate to `packages/agent-harness/` + `packages/workflows/`.

Repo note: this directory is stored at `.noah-pi-runtime/extensions/` and mounts as `/runtime/.pi/extensions/`.

Extension lanes:
- `noah-clinical-tools/` — deterministic Noah RN tool registration
- `medplum-context/` — patient context + active patient session wiring
- `noah-context/` — context-bundle planning across EHR, memory, resources, and monitor lanes
- `noah-router/` — workflow routing + dependency manifest inspection
- `noah-guardrails/` — patient-bound workflow and deterministic-tool guardrails

These extensions are the Pi-native bridge over authoritative Noah RN surfaces in `packages/`, `services/`, and `tools/`. They should wrap existing runtime contracts, not replace them.

Current bridge alignment rule:
- routing/context planning may compute `renderer_lane_coverage`, but Shift Report rendering authority stays in `packages/agent-harness/shift-report-renderer.mjs`
- bridge previews and dry-runs should consume the same renderer-input / lane-coverage contract instead of drifting into their own template logic
