# `medplum-context` Extension TODO

Repo note: this extension lives at `.noah-pi-runtime/extensions/medplum-context/` and mounts as `/runtime/.pi/extensions/medplum-context/`.

This is a planning stub for the future pi-native Medplum/patient-context extension.

## Source-of-truth today

- `services/clinical-mcp/`
- `clinical-resources/mimic-mappings.json`
- current Medplum workspace decisions in `PLAN.md` and `TASKS.md`

## First implementation goals

1. expose patient-context retrieval to pi-native workflows
2. preserve the current `get_patient_context` path as the first migration target
3. support Shift Report first

## Non-goals

- do not re-architect FHIR/data access before a pi-native workflow actually needs it
- do not duplicate service logic blindly into the Pi runtime surface
