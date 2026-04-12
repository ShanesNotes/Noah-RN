# Shift Report Canonical Patient Path

## Purpose

Define the single canonical patient path for the first `Shift Report` workflow.

This exists to keep the first end-to-end loop bounded.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/shift-report-runtime-path.md`
- `docs/foundations/patient-context-bundle-contract.md`
- `docs/foundations/medplum-architecture-packet.md`

## Canonical path

The first canonical patient path is:

- `patient_id = patient-123`
- source path through `services/clinical-mcp/`
- fixture-backed context assembly first

This path is already the best current anchor because the repo contains explicit fixture coverage for:
- patient
- encounter
- conditions
- vitals
- labs
- medication requests
- medication administrations
- document references

## Why this patient path wins now

- it is already wired into the current bridge/test surfaces
- it exercises more of the target patient-context bundle than a smaller fixture path would
- it stays aligned with the Medplum/clinical-mcp contract instead of inventing a second demo path

## Path shape

1. request enters harness with `patient_id`
2. harness selects `shift-report`
3. `services/clinical-mcp/` assembles context for `patient-123`
4. workflow receives the assembled bundle
5. output is emitted as a draft handoff artifact

## What this path must prove

The canonical patient path should prove that the first loop can carry:
- patient identity
- encounter state
- timeline context
- active meds
- active conditions
- note/lab/vitals presence or explicit gaps

It does not need to prove:
- production write-back
- multi-patient routing
- persistent memory
- broad simulation orchestration

## Current repository evidence

Current fixture coverage exists under:
- `services/clinical-mcp/fixtures/Patient__id_patient-123__count_1.json`
- `services/clinical-mcp/fixtures/Encounter_patient_patient-123__count_50.json`
- `services/clinical-mcp/fixtures/Condition_patient_patient-123__count_100.json`
- `services/clinical-mcp/fixtures/Observation_patient_patient-123_category_vital-signs__sort_-date__count_50.json`
- `services/clinical-mcp/fixtures/Observation_patient_patient-123_category_laboratory__sort_-date__count_50.json`
- `services/clinical-mcp/fixtures/MedicationRequest_patient_patient-123__sort_-date__count_100.json`
- `services/clinical-mcp/fixtures/MedicationAdministration_patient_patient-123__sort_-date__count_100.json`
- `services/clinical-mcp/fixtures/DocumentReference_patient_patient-123__sort_-date__count_100.json`

## Deferred work

- choosing a second canonical patient path
- live-data-first routing
- canonical scenario progression beyond the current fixture path

## References

- `services/clinical-mcp/fixtures/`
- `tests/agents/test_shift_report_workflow_input.sh`
- `tests/agents/test_shift_report_runtime_runner.sh`
