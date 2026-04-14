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
- `apps/nursing-station/` — Medplum-first clinician workspace surface for patient/task flows.
- `apps/clinician-dashboard/` — runtime-console sidecar for evals, traces, context inspection, skills, terminal workflows, and future sim observability.

Role of `services/clinical-mcp/`:
- assemble patient context
- normalize chart/simulation-facing data
- provide the agent-facing boundary to the clinical workspace

Role of `services/sim-harness/`:
- own the **L0–L4 projection model** per the invariant kernel: L0 hidden patient truth (engine adapter, eval-recorder-only access), L1 monitor projection (primary patient avatar; numeric telemetry + waveforms + alarms + signal quality), L2 events (two-stage release: L0 eligibility + scenario-controller release per amendment D2), L3 chart (written through clinical-mcp to Medplum), L4 obligations (documentation duties, follow-up windows, workflow pressure)
- wrap a validated external physiology engine behind the L0 adapter — Contract 9 (2026-04-13) locked **Pulse Physiology Engine** (Kitware, Apache-2.0) as the L0 substrate
- drive the **simulation clock** (single time authority — wall-clock, accelerated(N), frozen, skip-ahead per Contract 3)
- enforce **monitor-as-avatar**: rhythm and hemodynamic claims must validate against raw waveform surface (samples + rendered image), not against labels (see `docs/foundations/sim-harness-waveform-vision-contract.md`)
- write Observation / Encounter / MedicationAdministration / Provenance resources through the clinical-mcp boundary into the same FHIR backbone
- expose agent-facing MCP tools through `services/clinical-mcp/` only — registered via the `registerSimTools()` seam when a sim-harness runtime is present (no-op today)

### Agent harness

Center:
- `packages/agent-harness/`

Supporting surfaces:
- `packages/workflows/`
- `.noah-pi-runtime/` (mounted in the isolated lane as `/runtime/.pi`)

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
- `docs/foundations/memory-layer-scaffold.md`

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
  -> (wraps Pulse Physiology Engine (L0) + scenario director + waveform generators)
  -> infrastructure/ (Medplum FHIR) -> services/clinical-mcp/ -> packages/agent-harness/
  -> apps/clinician-dashboard/ (future waveform/vitals observability surface)
```

The agent does not talk to `services/sim-harness/` directly. It goes through `services/clinical-mcp/`, which exposes the live simulation the same way it exposes static MIMIC context — plus a small number of sim-only MCP tools (live-vitals snapshot, waveform vision access, medication administration, intervention orders, charting authority actions, obligation queries) registered through the same boundary. Authoritative tool surface: Contracts 4, 5, 6, 7 in `docs/foundations/foundational-contracts-simulation-architecture.md`. Waveform vision surface: `docs/foundations/sim-harness-waveform-vision-contract.md`. The older `docs/foundations/sim-harness-runtime-access-contract.md` is a working reference only and is being replaced incrementally.

## Canonical vs Sidecar vs Deferred

Canonical now:
- `packages/workflows/*/SKILL.md`
- `packages/agent-harness/`
- `services/clinical-mcp/`
- `services/sim-harness/` (scaffold + contracts canonical; runtime code deferred until the first workflow loop needs it)
- `clinical-resources/`

Sidecar now:
- `apps/clinician-dashboard/`
- `.noah-pi-runtime/` bridge/scaffold surfaces

Deferred:
- broad memory persistence
- broad runtime promotion beyond the first workflow
- in-house physiology modeling (explicitly superseded — L0 is always an adapter over a wrapped external engine; Contract 9 locked Pulse as that engine on 2026-04-13)
- alternative harness foundations

## Active Subsystems Summary

- `apps/nursing-station/` - Medplum-first clinician workspace surface
- `apps/clinician-dashboard/` - runtime-console sidecar prototype for evals, traces, context inspection, skill visibility, and terminal/operator workflows
- `services/clinical-mcp/` - patient-context and simulation-facing boundary
- `services/sim-harness/` - clinical simulation harness center (scaffold only); wraps open-source physiology engines; drives live vitals, waveforms, and scenario timelines; writes FHIR back into Medplum
- `packages/agent-harness/` - routing and harness substrate
- `packages/workflows/` - authoritative workflow contracts
- `clinical-resources/` - curated clinical resource surface
- `docs/foundations/memory-layer-scaffold.md` - current memory-layer definition surface until runtime code returns
- `infrastructure/` - Medplum and local environment setup
- `evals/` - meta-harness traces and evaluation artifacts

## Next Detail Surfaces

For more detail, read:

- [../PLAN.md](../PLAN.md)
- [../TASKS.md](../TASKS.md)
- [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md)
- [foundations/clinical-workspace-scaffold.md](foundations/clinical-workspace-scaffold.md)
- [foundations/invariant-kernel-simulation-architecture.md](foundations/invariant-kernel-simulation-architecture.md) — canonical kernel
- [foundations/foundational-contracts-simulation-architecture.md](foundations/foundational-contracts-simulation-architecture.md) — nine contracts
- [foundations/scaffold-salvage-audit-simulation.md](foundations/scaffold-salvage-audit-simulation.md)
- [foundations/brownfield-mapping-simulation-architecture.md](foundations/brownfield-mapping-simulation-architecture.md)
- [foundations/encounter-validation-simulation-architecture.md](foundations/encounter-validation-simulation-architecture.md)
- [foundations/contract-consistency-review-simulation-architecture.md](foundations/contract-consistency-review-simulation-architecture.md)
- [foundations/execution-packet-simulation-architecture.md](foundations/execution-packet-simulation-architecture.md) — Lanes A–F
- [foundations/first-bedside-workflow-spec.md](foundations/first-bedside-workflow-spec.md) — first bedside workflow (ICU respiratory decompensation)
- [foundations/medplum-write-path-expansion.md](foundations/medplum-write-path-expansion.md) — Contract 5 charting write-path expansion
- [foundations/sim-harness-waveform-vision-contract.md](foundations/sim-harness-waveform-vision-contract.md) — KEPT
- [foundations/sim-harness-scaffold.md](foundations/sim-harness-scaffold.md) — historical pointer
- [foundations/sim-harness-runtime-access-contract.md](foundations/sim-harness-runtime-access-contract.md) — working reference (superseded for authority)
- [foundations/sim-harness-engine-wrapping.md](foundations/sim-harness-engine-wrapping.md) — research context only
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
