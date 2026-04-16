# Shift Report `patient-123` Acceptance Criteria

## Purpose

Define the acceptance criteria for the first canonical `Shift Report` loop using `patient-123`.

This is the first implementation-facing artifact for the workflow.
It should be used to evaluate whether the current runtime path is good enough to keep hardening without widening write semantics prematurely.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/shift-report-canonical-patient-path.md`
- `docs/foundations/shift-report-renderer-contract.md`
- `docs/foundations/shift-report-runtime-path.md`

## Canonical input

The canonical acceptance path uses:
- `patient_id = patient-123`

The path is:
- harness selection
- `clinical-mcp` context assembly
- `shift-report` contract consumption
- draft handoff output

## Acceptance Criteria

### A. Selection and readiness

1. The harness selects `shift-report` for `shift_handoff` when `patient_id` is present.
2. The bridge readiness check reports `ready`.
3. The canonical workflow remains `packages/workflows/shift-report/SKILL.md`.
4. Bridge surfaces are present but not treated as authoritative runtime truth.
5. Routing/context planning surfaces may emit renderer-ready lane coverage, but rendering authority stays in `packages/agent-harness/shift-report-renderer.mjs`.

### B. Patient-context loading

5. `patient-123` resolves through `services/clinical-mcp/`.
6. The assembled context contains:
- patient identity
- encounter context
- timeline entries
- medications
- conditions
- explicit gaps
7. Missing or thin context is surfaced as gaps rather than inferred content.

### C. Renderer/output shape

8. The output is a seven-section handoff draft.
9. The required sections are present:
- `PATIENT`
- `STORY`
- `ASSESSMENT`
- `LINES & ACCESS`
- `ACTIVE ISSUES & PLAN`
- `HOUSEKEEPING`
- `FAMILY`
10. The patient-context output includes a patient line for `patient-123`.
11. The patient-context output includes at least one active medication when present in fixture context.
12. The output includes an explicit gap count or equivalent missing-data signal.
13. If `Device` data exists, `LINES & ACCESS` renders concrete device lines instead of a generic placeholder.
14. If `Device` timestamps are absent, the renderer says `timing unknown` rather than assigning false recency.
15. If the context bundle was truncated to fit budget, `ACTIVE ISSUES & PLAN` includes an explicit truncation notice.

### D. Boundary/safety behavior

16. The path remains draft-oriented.
17. The path does not perform autonomous chart write-back beyond the narrow draft `DocumentReference` path.
18. The path does not fabricate details for missing sections.
19. If the required input is missing, the path blocks cleanly and reports the missing required-context options.
20. The rendered draft includes explicit lane coverage for the current runtime path.
21. The rendered draft includes Evidence / Confidence / Provenance / Disclaimer layers.

## Current repo evidence

The following current tests already prove parts of this acceptance set:

- `tests/agents/test_workflow_selector.sh`
- `tests/agents/test_shift_report_bridge_readiness.sh`
- `tests/agents/test_shift_report_workflow_input.sh`
- `tests/agents/test_shift_report_runtime_runner.sh`
- `tests/agents/test_shift_report_dry_run_output.sh`

## Current success threshold

The current runtime lane is acceptable for the next step when:

- all readiness/selection tests pass
- `patient-123` context loads through the canonical path
- the shared renderer emits the seven sections
- output remains draft-oriented and gap-explicit
- lines/access output reflects actual assembled `Device` data when available
- truncation is surfaced explicitly instead of silently hiding dropped history
- renderer output includes lane coverage plus Evidence / Confidence / Provenance / Disclaimer layers

It is not yet required that:

- all sections are fully fidelity-complete
- every line/access detail is extracted
- the output is ready for chart write-back

Those belong to the next renderer-fidelity/runtime-promotion lane.

## Not yet required

- live-data-first path
- second canonical patient path
- persistent memory
- final artifact write-back to Medplum
- full bedside polish of every section body

## References

- `tests/agents/test_shift_report_bridge_readiness.sh`
- `tests/agents/test_shift_report_workflow_input.sh`
- `tests/agents/test_shift_report_runtime_runner.sh`
- `tests/agents/test_shift_report_dry_run_output.sh`
