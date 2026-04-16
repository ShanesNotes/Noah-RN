# `medplum-context`

Responsibility:
- expose Noah RN patient-context and FHIR integration to Pi-native workflows

Current capabilities:
- `noah_get_patient_context` — loads the assembled patient timeline from `services/clinical-mcp/`
- `noah_inspect_patient_context` — surfaces record counts, gaps, and token estimate
- `noah_list_patients` — lists available patients from the FHIR boundary
- `set_active_patient` / `get_active_patient` — session-scoped patient pinning
- `/patient <id|show|clear>` — interactive patient context control
- `before_agent_start` hook — reminds the agent about the active patient without silently overriding explicit user input

Primary sources of truth:
- `services/clinical-mcp/`
- `clinical-resources/mimic-mappings.json`
- `apps/nursing-station/`

Rule:
- this extension wraps the clinical-mcp boundary
- it does not duplicate or redesign FHIR access
- it represents only one context lane in Noah RN; memory, clinical resources, and monitor/simulation context remain separate inputs to the harness
