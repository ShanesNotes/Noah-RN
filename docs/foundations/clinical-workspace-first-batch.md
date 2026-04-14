# Clinical Workspace First Batch

Workspace center:
- `services/clinical-mcp/`

## Purpose

Establish the minimum clinical workspace boundary needed for the first real bedside workflow.

## Derived from

- `PLAN.md` active subproject: Clinical Workspace
- `TASKS.md` items 1-3
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/clinical-workspace-scaffold.md`

## This batch should establish

### 1. Patient-context bundle boundary

Define the minimum assembled context shape for the first workflow:
- patient identity
- encounter snapshot
- recent timeline
- meds
- labs
- notes/gaps when available

### 2. Medplum / MCP / sidecar split

Lock the rule:
- Medplum is canonical workspace
- `clinical-mcp` is the agent-facing contract boundary
- dashboard is sidecar observability/prototyping only

### 3. Simulation position

Lock the rule:
- simulation feeds the same context boundary
- simulation is not a parallel product architecture
- simulation **does** get its own workspace center inside the lane: `services/sim-harness/`
- simulation wraps validated open-source engines rather than rebuilding physiology in-house; final engine selection is deferred behind the Research-Hook contract
- the agent **must** have vision on raw waveforms to validate rhythm and hemodynamic claims
- canonical sim authority now lives in `docs/foundations/invariant-kernel-simulation-architecture.md` and `docs/foundations/foundational-contracts-simulation-architecture.md`

## This batch should not do

- define broad dashboard product scope
- design production deployment
- design a full simulation platform
- choose more than one canonical patient/workflow path

## The likely next concrete artifacts later

- patient-context contract doc
- first canonical patient path doc
- draft-vs-final Medplum write-back policy doc

Current artifact:
- `docs/foundations/patient-context-bundle-contract.md`

## Deep references

- `docs/foundations/medplum-architecture-packet.md`
- `research/Open Source Clinical Simulation.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `research/Engineering a MIMIC-IV to HAPI FHIR R4 pipeline for noah-rn.md`
