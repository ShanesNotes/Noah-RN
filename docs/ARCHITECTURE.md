# Noah RN Architecture

This file is a short technical boundary map.

The canonical project direction lives in [../PLAN.md](../PLAN.md).
The active execution queue lives in [../TASKS.md](../TASKS.md).
The canonical workspace placement map lives in [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md).

Use this file when the question is:
- what are the active runtime/subsystem centers?
- how do they relate at a high level?
- what is canonical vs sidecar vs deferred?

Do not use this file as a second planning surface.

## Current Architecture Posture

Noah RN is being reorganized around a simple foundation:

- `pi.dev` is the agent harness foundation for the next phase.
- Medplum remains the clinical workspace and FHIR backbone.
- Existing apps, services, packages, clinical-resources, infrastructure, and eval surfaces are useful project assets, but not all historical directories define the future architecture.
- Claude/OpenClaw/NemoClaw-era architecture docs are historical unless a specific component is intentionally adopted later.

Current forcing function:
- `Shift Report` is the first real bedside workflow used to make architecture boundaries concrete.

## Workspace Centers

### Clinical workspace

The Clinical Workspace lane has two workspace centers. One is the context boundary (context assembly, timeline shaping, FHIR normalization). The other is the live-runtime boundary (tickable physiology, waveform generation, scenario direction, FHIR write-back).

Context boundary center:
- `services/clinical-mcp/`

Live-runtime boundary center:
- `services/sim-harness/`

Supporting surfaces:
- `infrastructure/` — Medplum and local environment setup; the shared FHIR backbone that both centers read from and the sim-harness writes into.
- `apps/clinician-dashboard/` — sidecar observability, prototyping surface, and the **waveform viewer** for sim-harness output.

Role of `services/clinical-mcp/`:
- assemble patient context
- normalize chart/simulation-facing data
- provide the agent-facing boundary to the clinical workspace

Role of `services/sim-harness/`:
- wrap validated open-source physiology engines (Pulse primary; BioGears fallback; Infirmary Integrated as device/rhythm reference pattern; rohySimulator as LLM virtual-patient dialogue reference; Auto-ALS as Gym-compatible eval interface reference)
- drive tickable patient state on a simulation clock (WallClock for live demo, AcceleratedClock for eval, FrozenClock for golden tests)
- generate waveforms (ECG, plethysmography, capnography) and expose them to the agent so rhythm and hemodynamic claims can be validated against the raw surface, not just metadata labels
- write Observation / Encounter / MedicationAdministration resources to the same FHIR backbone `services/clinical-mcp/` reads from, so the agent and clinician see the same chart regardless of whether the patient is static MIMIC or live simulated
- expose agent-facing MCP tools through `services/clinical-mcp/` (not a parallel boundary)

### Agent harness

Center:
- `packages/agent-harness/`

Supporting surfaces:
- `packages/workflows/`
- `.pi/`

Role:
- classify requests
- select workflows
- consume workflow, tool, and clinical-resource contracts

### Clinical resources

Center:
- `clinical-resources/`

Supporting surfaces:
- workflow reference packages under `packages/workflows/`

Role:
- hold curated protocols, reference data, templates, provenance, and freshness metadata

### Memory layer

Center:
- `packages/memory/`

Role:
- define memory boundaries before broader persistence work

### Meta-harness

Center:
- `evals/`

Supporting surfaces:
- `tools/trace/`

Role:
- hold evaluation, observability, and optimization artifacts

## Runtime Relationship Map

The current high-level path is:

1. request enters the harness
2. harness selects a workflow contract
3. clinical workspace boundary assembles patient context when needed
4. workflow consumes clinical resources and deterministic tools
5. output leaves as a draft bedside artifact

In shorthand:

```text
packages/agent-harness/
  -> packages/workflows/
  -> services/clinical-mcp/
  -> clinical-resources/
  -> draft/output surfaces
```

When the encounter is a live simulation, an additional path runs continuously in the background:

```text
services/sim-harness/
  -> (wraps Pulse/BioGears physiology engine + scenario director + waveform generators)
  -> infrastructure/ (Medplum FHIR) -> services/clinical-mcp/ -> packages/agent-harness/
  -> apps/clinician-dashboard/ (waveform viewer + live vitals panel)
```

The agent does not talk to `services/sim-harness/` directly. It goes through `services/clinical-mcp/`, which exposes the live simulation the same way it exposes static MIMIC context — plus a small number of sim-only MCP tools (live-vitals snapshot, waveform vision access, medication administration, intervention orders) registered through the same boundary. See `docs/foundations/sim-harness-runtime-access-contract.md` and `docs/foundations/sim-harness-waveform-vision-contract.md`.

## Canonical vs Sidecar vs Deferred

Canonical now:
- `packages/workflows/*/SKILL.md`
- `packages/agent-harness/`
- `services/clinical-mcp/`
- `services/sim-harness/` (scaffold canonical; runtime code deferred until the first workflow loop needs it)
- `clinical-resources/`

Sidecar now:
- `apps/clinician-dashboard/`
- `.pi/` bridge/scaffold surfaces

Deferred:
- broad memory persistence
- broad runtime promotion beyond the first workflow
- in-house physiology modeling (explicitly superseded by the Clinical Simulation Harness wrapping strategy — see `docs/foundations/sim-harness-engine-wrapping.md`)
- alternative harness foundations

## Active Subsystems Summary

- `apps/clinician-dashboard/` - clinician sidecar prototype and waveform viewer surface
- `services/clinical-mcp/` - patient-context and simulation-facing boundary
- `services/sim-harness/` - clinical simulation harness center (scaffold only); wraps open-source physiology engines; drives live vitals, waveforms, and scenario timelines; writes FHIR back into Medplum
- `packages/agent-harness/` - routing and harness substrate
- `packages/workflows/` - authoritative workflow contracts
- `clinical-resources/` - curated clinical resource surface
- `packages/memory/` - future memory-layer center
- `infrastructure/` - Medplum and local environment setup
- `evals/` - meta-harness traces and evaluation artifacts

## Next Detail Surfaces

For more detail, read:

- [../PLAN.md](../PLAN.md)
- [../TASKS.md](../TASKS.md)
- [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md)
- [foundations/clinical-workspace-scaffold.md](foundations/clinical-workspace-scaffold.md)
- [foundations/sim-harness-scaffold.md](foundations/sim-harness-scaffold.md)
- [foundations/sim-harness-runtime-access-contract.md](foundations/sim-harness-runtime-access-contract.md)
- [foundations/sim-harness-waveform-vision-contract.md](foundations/sim-harness-waveform-vision-contract.md)
- [foundations/sim-harness-engine-wrapping.md](foundations/sim-harness-engine-wrapping.md)
- [foundations/agent-harness-scaffold.md](foundations/agent-harness-scaffold.md)
- [foundations/clinical-resources-scaffold.md](foundations/clinical-resources-scaffold.md)
- [foundations/memory-layer-scaffold.md](foundations/memory-layer-scaffold.md)
- [foundations/shift-report-runtime-path.md](foundations/shift-report-runtime-path.md)

## Historical Architecture

The previous long architecture plan moved to:

```text
docs/archive/legacy-control-plane/ARCHITECTURE.md
```

Use it as historical context only. Extract durable ideas into [../PLAN.md](../PLAN.md) or focused reference docs before treating them as active direction.
