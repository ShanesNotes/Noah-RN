# Noah RN Architecture

This file is a short technical boundary map.

The canonical project direction lives in [../PLAN.md](../PLAN.md).
The active execution queue lives in [../TASKS.md](../TASKS.md).
The active three-product alignment plan lives in [plans/three-product-alignment-2026-04-16.md](plans/three-product-alignment-2026-04-16.md).
The canonical workspace placement map lives in [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md).

Use this file when the question is:
- what are the three products and their subordinate lanes?
- how do they relate at a high level?
- what is canonical vs sidecar vs deferred?

Do not use this file as a second planning surface.

## Current Architecture Posture

Noah RN is structured as **three modular products** plus shared subordinate lanes. The core mission remains the pi-native agent harness; the EHR and simulation products exist to create realistic, observable operating context for that harness, but each is strong enough to ship independently.

Foundation decisions:
- `pi.dev` is the agent harness foundation for the next phase.
- Medplum remains the clinical workspace FHIR backbone (Product B today; swappable under the clinical-MCP contract).
- Pulse Physiology Engine is the Product C L0 substrate (Contract 9 + 2026-04-16 REST-sidecar decision).
- Claude/OpenClaw/NemoClaw-era architecture docs are historical unless a specific component is intentionally adopted.

Current forcing function:
- The three-product alignment plan (`docs/plans/three-product-alignment-2026-04-16.md`) is the execution substrate.
- Shift Report review loop is consolidating. MAR surface + five-rights-verification workflow (alignment plan Phase 4+6) is the next forcing exercise. ICU respiratory decompensation scenario (Phase 9) is the next-next.

## Products

### Product A — Noah RN Agent Harness (core deliverable)

Center:
- `packages/agent-harness/` — authoritative contract surface: routing, workflow selection, registry consumers, selection policy, renderer.
- `packages/workflows/` — authoritative workflow contract content.

Supporting surfaces:
- `.noah-pi-runtime/extensions/*` — live execution surface (runtime code). Subordinate to the contract surface. On conflict, the contract wins and the extension updates in the same change.
- `packages/contracts/` — shared cross-product types (lands Phase 3 of alignment plan).

Consumes (via contracts, never imports):
- Product B through the clinical-MCP contract (patient context, MAR, draft-write lifecycle).
- Product C through the sim-harness MCP contract (waveform vision, scenario control, obligations).
- Subordinate lanes through their own declared contracts.

Standalone posture:
- Ships against any clinical-MCP-compliant EHR. Epic/Cerner integration reduces to implementing the contract, not porting the harness.

### Product B — Agent-Native Nursing EHR

Centers:
- `apps/nursing-station/` — Medplum-first clinician workspace surface.
- `services/clinical-mcp/` — EHR-side MCP server. Sole agent-facing boundary for chart data, MAR, orders, documentation, Contract 5 draft write path.
- `infrastructure/` — Medplum server and local environment setup.

Owns:
- FHIR chart truth, Medplum rails, Contract 5 draft write lifecycle (`Task → preliminary DocumentReference → Task.output`).
- Agent-facing MCP tools for chart/MAR context.
- Clinician-facing UI for worklist, chart, review, results, trend, and MAR (Phase 4 of alignment plan).

Does not own:
- Workflow contracts (Product A).
- Physiology, waveform generation, scenario direction (Product C).
- Drug reference content (subordinate lane).

Standalone posture:
- Ships as a full agent-native EHR without the Noah harness installed. Gold-standard trajectory: Epic. Another team could adopt this as their agent-native chart substrate and point a different agent harness at it via the clinical-MCP contract.

### Product C — Agent-Native Clinical Simulation

Center:
- `services/sim-harness/` — L0 engine adapter (Pulse via REST sidecar), simulation clock (Contract 3), scenario director (Contract 6), L1 monitor projection, L2 event release, reference pharmacokinetics, waveform vision surface.

Supporting surface:
- `infrastructure/pulse/` — Pulse Physiology Engine REST sidecar (Python 3.11, FastAPI, port 8104; pre-baked `.pbb` state files). Lands Phase 8 of alignment plan.

Owns:
- L0–L4 projection per the invariant kernel.
- Monitor-as-avatar enforcement: rhythm and hemodynamic claims validated against raw waveform samples/images, not labels.
- Sim-harness MCP surface (Phase 8 of alignment plan): `sim_get_vitals_snapshot`, `sim_get_waveform_samples`, `sim_get_waveform_image`, `sim_advance_clock`, `sim_set_clock_mode`, `sim_list_scenarios`, `sim_load_scenario`, `sim_get_active_obligations`.

Does not own:
- FHIR chart writes — goes through whatever EHR backbone is pointed at (Product B today).
- Workflow orchestration (Product A).
- Clinician-facing UI (Product B + dashboard).

Standalone posture:
- Code ships standalone. At runtime requires any FHIR-capable EHR (Product B or any FHIR R4 server) to be clinically useful. Without a MAR write path it cannot simulate medication-administration feedback loops.

## Clinical-MCP Contract (the standard)

Publication: [standards/clinical-mcp-contract-v1.md](standards/clinical-mcp-contract-v1.md) (Phase 2 of the alignment plan).

Scope: the normative schema any EHR implements to be agent-ready. Read tools, write tools (draft-review lifecycle), context bundle shape, provenance envelope, lane vocabulary. Versioned (v1.0.0 initial). Implementable by Product B today; implementable by an Epic-bridge or Cerner-bridge without changes to the harness.

## Subordinate Lanes

Shared substrate, not products. Any product may consume them through their declared contracts; they do not import from products.

- **Clinical resources — `clinical-resources/`.** Curated protocols, drug ranges, templates, provenance, freshness metadata. Drug reference (Lexicomp-mirror scaffold) lands in `clinical-resources/drug-reference/` per Phase 5 of the alignment plan.
- **Memory layer — `docs/foundations/memory-layer-scaffold.md`.** Five-tier spec (longitudinal patient H&P, encounter canvas, session memory, provider persistent memory, task-local agent memory). Spec-only today. First runtime landing gated on a workflow that demonstrably requires persistent state.
- **Meta-harness observability — `evals/` + `tools/trace/` + `apps/clinician-dashboard/`.** Telemetry pipeline (landed 2026-04-16), dashboard console, evaluation traces. Shared trace envelope (Phase 7 of alignment plan) lets all three products emit coherent traces.

## Runtime Relationship Map

High-level request path (static-context encounter):

```text
Product A (harness)
  ├── packages/agent-harness/ (routing)
  │     → packages/workflows/ (selects workflow)
  │           → invokes MCP tool on Product B
  ├── clinical-MCP tools on Product B
  │     → services/clinical-mcp/ (patient context assembly, FHIR draft writes)
  │           → infrastructure/ (Medplum FHIR)
  ├── clinical resources
  │     → clinical-resources/ (lookup via tool)
  └── output as draft bedside artifact, nurse-reviewable in apps/nursing-station/
```

When the encounter is a live simulation, an additional path runs continuously in the background:

```text
Product C (sim)
  ├── services/sim-harness/ (Pulse L0 via REST sidecar + clock + scenario director + L1 projection)
  ├── writes FHIR → infrastructure/ (Medplum, i.e. Product B)
  └── exposes its own MCP surface for waveform vision, scenario control, obligations
         → agents call via the sim-harness MCP client, same transport as clinical-MCP
```

The agent never talks to `services/sim-harness/` via imports. Clinical-mcp never imports sim-harness. All inter-product traffic is MCP or FHIR.

## Canonical vs Sidecar vs Deferred

Canonical now:
- `packages/workflows/*/SKILL.md`
- `packages/agent-harness/` (routing + renderer + MCP client)
- `services/clinical-mcp/` (Product B server side)
- `apps/nursing-station/` (Product B chart UI; MAR surface lands Phase 4)
- `services/sim-harness/` (Lane A live; Lane B partial; MCP surface + Lane C land Phase 8)
- `clinical-resources/` (drug reference scaffold lands Phase 5)
- `docs/standards/clinical-mcp-contract-v1.md` (publishes Phase 2)
- `packages/contracts/` (lands Phase 3)

Sidecar now:
- `apps/clinician-dashboard/` (runtime console, observability)
- `.noah-pi-runtime/` extensions (live execution surface; subordinate to contract surface)

Deferred:
- Memory runtime (spec-only until a workflow demands it)
- Renaming `services/clinical-mcp/` to reflect its Product B allegiance
- Full Lexicomp clone (Phase 5 ships a 20-drug scaffold; full catalog later)
- Epic/Cerner integration (requires only a contract-compliant MCP server; not on current roadmap)
- In-house physiology modelling (explicitly superseded — L0 is always an adapter over a wrapped external engine; Contract 9 locked Pulse)
- Broad runtime promotion beyond the three-product alignment plan

## Active Subsystems Summary

- `apps/nursing-station/` — Product B chart UI. Worklist, review, results, trend spine landed. MAR surface lands Phase 4.
- `apps/clinician-dashboard/` — runtime-console sidecar. Dashboard console landed 2026-04-16.
- `services/clinical-mcp/` — Product B server side. Patient-context boundary, FHIR reads, Contract 5 draft writes. `registerSimTools()` seam for Product C.
- `services/sim-harness/` — Product C. Lane A live (clock + engine adapter + reference PK). Lane B partial. MCP surface and Lanes C–F land Phase 8.
- `packages/agent-harness/` — Product A routing and renderer substrate.
- `packages/workflows/` — Product A authoritative workflow contracts.
- `packages/contracts/` — shared types across product boundaries (lands Phase 3).
- `clinical-resources/` — subordinate resource lane; drug-reference scaffold lands Phase 5.
- `docs/foundations/memory-layer-scaffold.md` — memory-layer spec until runtime demanded.
- `infrastructure/` — Medplum + (Phase 8) Pulse sidecar.
- `evals/` — meta-harness traces and evaluation artifacts.

## Next Detail Surfaces

For more detail, read:

- [../PLAN.md](../PLAN.md)
- [../TASKS.md](../TASKS.md)
- [plans/three-product-alignment-2026-04-16.md](plans/three-product-alignment-2026-04-16.md) — active alignment plan
- [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md)
- [foundations/clinical-workspace-scaffold.md](foundations/clinical-workspace-scaffold.md)
- [foundations/invariant-kernel-simulation-architecture.md](foundations/invariant-kernel-simulation-architecture.md) — canonical kernel
- [foundations/foundational-contracts-simulation-architecture.md](foundations/foundational-contracts-simulation-architecture.md) — nine contracts
- [foundations/execution-packet-simulation-architecture.md](foundations/execution-packet-simulation-architecture.md) — Lanes A–F
- [foundations/first-bedside-workflow-spec.md](foundations/first-bedside-workflow-spec.md) — ICU respiratory decompensation
- [foundations/medplum-write-path-expansion.md](foundations/medplum-write-path-expansion.md) — Contract 5 write-path expansion
- [foundations/sim-harness-waveform-vision-contract.md](foundations/sim-harness-waveform-vision-contract.md)
- [foundations/agent-harness-scaffold.md](foundations/agent-harness-scaffold.md)
- [foundations/clinical-resources-scaffold.md](foundations/clinical-resources-scaffold.md)
- [foundations/memory-layer-scaffold.md](foundations/memory-layer-scaffold.md)
- [foundations/shift-report-runtime-path.md](foundations/shift-report-runtime-path.md)
- [analysis/agent-native-clinical-workspace-long-range-plan.md](analysis/agent-native-clinical-workspace-long-range-plan.md)

## Historical Architecture

The previous long architecture plan moved to:

```text
docs/archive/legacy-control-plane/ARCHITECTURE.md
```

Use it as historical context only. Extract durable ideas into [../PLAN.md](../PLAN.md) or focused reference docs before treating them as active direction.
