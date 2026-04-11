# Metadata Registry Spec (Draft)

## Goal

Move Noah RN toward metadata-first discovery for skills, tools, and knowledge.

## Registries to Prepare

### Skill registry
Source surfaces:
- `packages/workflows/*/SKILL.md`
- future `.pi/skills/*/SKILL.md`

Proposed record shape:
```yaml
name: shift-report
description: routing signal
scope: [shift_handoff, nursing_report]
complexity_tier: complex
required_context:
  mandatory_one_of: [clinical_narrative, patient_id]
limitations: [does_not_fabricate_findings]
contract_ref: skill contract block
source_path: packages/workflows/shift-report/SKILL.md
```

### Tool registry
Source surfaces:
- `tools/clinical-calculators/`
- `tools/drug-lookup/`
- `tools/unit-conversions/`
- `tools/trace/`
- `tools/safety-hooks/`

Proposed record shape:
```yaml
name: get_patient_context
kind: deterministic_tool
source_path: services/clinical-mcp/
inputs: [patient_id]
outputs: [patient_context_bundle]
side_effects: none
```

### Knowledge registry
Source surfaces:
- `knowledge/`

Proposed record shape:
```yaml
name: cross-skill-triggers
kind: knowledge_asset
source_path: knowledge/templates/cross-skill-triggers.md
provenance: required
freshness: required
```

## Current Rule

These registries are specification targets only.
Current source-of-truth remains the underlying files, not a generated registry artifact yet.
