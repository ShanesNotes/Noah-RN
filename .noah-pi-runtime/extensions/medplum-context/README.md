# `medplum-context` Extension Stub

Planned responsibility:
- expose patient-context and Medplum/FHIR integration to pi.dev workflows

Likely source surfaces:
- `services/clinical-mcp/` — agent-facing context boundary (owns patient-context assembly; no longer owns L0 physiology or scenarios as of 2026-04-13)
- `clinical-resources/mimic-mappings.json`
- `apps/nursing-station/` — Medplum-first clinician workspace (primary surface)

First target:
- support the Shift Report workflow's patient-context path (FHIR-queued `Task(status=requested)` → Noah runtime executes → draft `DocumentReference(status=current, docStatus=preliminary)` → `Task.output` links artifact, per Decision 2026-04-12)

Scaffold bridge:
- `describe-patient-context-bridge.mjs`
