# Patient Context Bundle Contract

Workspace center:
- `services/clinical-mcp/`

## Purpose

Define the minimum patient-context bundle the first workflow can rely on.

This is a contract artifact, not a runtime implementation.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/clinical-workspace-first-batch.md`
- `docs/foundations/medplum-architecture-packet.md`

## Contract

### Input side

The bundle is assembled from the canonical clinical workspace path:
- Medplum-backed chart context
- `clinical-mcp` assembly logic
- simulation-fed patient-state changes when present

### Output side

The first bundle should expose only:
- patient identity
- encounter snapshot
- recent timeline
- medications
- labs
- notes when available
- explicit gaps when data is missing

## Rules

- agents do not query Medplum directly
- all patient context arrives through the assembled bundle
- missing data must appear as a gap, not an inference
- simulated and non-simulated paths should converge into the same bundle shape

## Not yet in scope

- broad longitudinal history assembly
- silent persistence
- generalized multi-patient context loading
- production EHR integration beyond the current Medplum path

## Later runtime mirror

When implementation begins, the runtime mirror of this contract should live under:
- `services/clinical-mcp/src/context/`

## References

- `docs/foundations/clinical-workspace-scaffold.md`
- `docs/foundations/clinical-workspace-first-batch.md`
- `docs/foundations/medplum-architecture-packet.md`
