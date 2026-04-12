# Shift Report Output Boundary

## Purpose

Define what the first `Shift Report` workflow is allowed to emit and what remains outside scope.

## Governing alignment

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/medplum-architecture-packet.md`
- `docs/foundations/memory-tier-boundary.md`

## Allowed output in the first loop

The first loop should allow:
- a structured seven-section handoff draft
- provenance-aware output
- explicit gap reporting
- bounded cross-skill suggestions when clearly supported

## Not allowed in the first loop

The first loop should not allow:
- autonomous chart write-back
- silent persistence into longitudinal memory
- facility-policy invention
- transformation of missing chart data into implied findings

## Draft vs final rule

The first `Shift Report` output is a draft working artifact.

That means:
- the nurse reviews it
- the nurse owns the final handoff
- any later write-back requires explicit approval and provenance

## Memory rule

For the first workflow:
- encounter-local working state is acceptable
- limited session continuity is acceptable
- persistent memory should remain outside the default path

## Clinical record rule

Do not treat the first workflow output as a chart artifact by default.
Treat it as bedside handoff support until a separate write-back policy is promoted into the runtime path.

## References

- `packages/workflows/shift-report/SKILL.md`
- `docs/foundations/medplum-architecture-packet.md`
- `docs/foundations/memory-tier-boundary.md`
