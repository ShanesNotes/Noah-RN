# `medplum-context` Extension Stub

Planned responsibility:
- expose patient-context and Medplum/FHIR integration to pi.dev workflows

Likely source surfaces:
- `services/clinical-mcp/`
- `clinical-resources/mimic-mappings.json`
- current Medplum workspace path documented in `PLAN.md` / `TASKS.md`

First target:
- support the Shift Report workflow's patient-context path

Scaffold bridge:
- `describe-patient-context-bridge.mjs`
