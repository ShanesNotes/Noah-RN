# Clinical Workspace Scaffold

## Purpose

Define the minimal clinical workspace Noah RN needs in order to build and test real bedside workflows against realistic patient context.

## Governing alignment

- `PLAN.md`: Medplum remains the clinical workspace and FHIR backbone.
- `TASKS.md`: harden the first Medplum-native Shift Report review loop, keep Medplum primary, and defer sim runtime work until a bedside workflow actually needs live vitals.
- `docs/ARCHITECTURE.md`: `services/clinical-mcp/` is the context boundary, `services/sim-harness/` is the live-runtime boundary, and `apps/clinician-dashboard/` is a runtime-console sidecar.

## Canonical boundary

Clinical workspace means:

- Medplum owns canonical patient-chart context
- `services/clinical-mcp/` is the agent-facing context boundary
- `apps/clinician-dashboard/` is a sidecar surface, not the source of truth

Agents should not talk to Medplum directly.
They should consume assembled context through the clinical MCP boundary.

## Minimal architecture

### Layer 1: Medplum workspace

Owns:
- patient chart state
- encounters
- vitals
- labs
- medications
- notes and clinically writable artifacts when approved

### Layer 2: clinical-mcp

Owns:
- patient context assembly
- timeline shaping
- gap reporting
- FHIR query normalization
- simulation-facing read path

### Layer 3: sidecar workspace surfaces

Includes:
- clinician dashboard
- workflow-specific observability panels
- draft artifacts before nurse approval

These surfaces observe and support the workspace.
They do not replace it.

## Clinical simulation position

Clinical simulation belongs inside the clinical workspace lane. It is **not** a standalone product and **not** a parallel architecture, but it **is** its own workspace center within the lane.

Current stance:
- simulation must feed realistic vitals, waveforms, and patient-state changes into the same context boundary used by live/demo chart workflows
- simulation must strengthen the patient-context loop, not create a second architecture
- simulation must wrap validated open-source physiology engines rather than rebuild physiology in-house; engine selection is still gated on the Research-Hook contract, not fixed here
- the agent must have direct vision on the raw waveform surface to validate rhythm and hemodynamic claims — rhythm labels alone are a silent-failure surface

Workspace split inside Clinical Workspace:
- `services/clinical-mcp/` owns context assembly and the agent-facing boundary
- `services/sim-harness/` owns tickable live runtime, waveform generation, and scenario direction
- Both read/write the same Medplum FHIR backbone, so workflows read the same context bundle regardless of whether the source is static MIMIC or a live sim-harness encounter

Canonical simulation docs now:
- `docs/foundations/invariant-kernel-simulation-architecture.md` — governing kernel invariants
- `docs/foundations/foundational-contracts-simulation-architecture.md` — nine foundational contracts
- `docs/foundations/execution-packet-simulation-architecture.md` — implementation lanes A–F
- `docs/foundations/sim-harness-waveform-vision-contract.md` — non-negotiable waveform vision access for the agent
- `docs/foundations/sim-harness-scaffold.md` — historical pointer only
- `docs/foundations/sim-harness-runtime-access-contract.md` — working reference, not canonical authority
- `docs/foundations/sim-harness-engine-wrapping.md` — research context for engine wrapping

## Canonical surfaces now

- `infrastructure/`
- `services/clinical-mcp/`
- `services/sim-harness/` (scaffold + contracts canonical; runtime code deferred)
- `apps/clinician-dashboard/`
- `docs/foundations/medplum-architecture-packet.md`
- `docs/foundations/invariant-kernel-simulation-architecture.md`
- `docs/foundations/foundational-contracts-simulation-architecture.md`

## Deferred work

- broad UI expansion
- production deployment packaging
- multiple patient/workflow paths before the first canonical path is proven
- simulation-specific platform work that does not improve the first workflow loop

## References

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/foundations/medplum-architecture-packet.md`
- `research/Open Source Clinical Simulation.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `research/Engineering a MIMIC-IV to HAPI FHIR R4 pipeline for noah-rn.md`
