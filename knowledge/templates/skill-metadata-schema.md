# Skill Metadata Schema

Every SKILL.md in `plugin/skills/` must begin with this YAML frontmatter block.
This schema serves dual purpose: routing logic for the clinical dispatch agent
and machine-readable capability description (A2A readiness).

## Required Frontmatter

```yaml
---
name: <skill-id>                    # matches directory name
skill_version: "1.0.0"             # semver, bump on prompt changes
description: >-
  This skill should be used when the user asks to...
  [trigger patterns here]
scope:                              # clinical domains this skill covers
  - <domain>                        # e.g., cardiac_arrest, medication_reference
complexity_tier: simple | moderate | complex   # guides model routing
required_context:
  mandatory:                        # skill MUST request these if missing
    - <field>                       # e.g., rhythm, vitals, medication_name
  optional:                         # skill uses if provided, doesn't request
    - <field>
knowledge_sources:                  # paths to knowledge/ files this skill reads
  - "knowledge/protocols/acls.md"
limitations:                        # what this skill cannot do
  - "adult_patients_only"
  - "does_not_replace_clinical_judgment"
completeness_checklist:             # output MUST address all items
  - <required_element>              # e.g., rhythm_identification, drug_interactions
hitl_category: "II"                 # always II — documentation assistance
---
```

## Field Notes

- **complexity_tier**: `simple` = deterministic calculation or single lookup.
  `moderate` = protocol reference or structured documentation.
  `complex` = multi-system assessment, cross-referencing, or ambiguous clinical scenario.
- **required_context.mandatory**: If the user's input is missing mandatory context,
  the skill MUST ask for it before proceeding. Never infer missing vitals, labs, or meds.
- **completeness_checklist**: The output validation layer. Every item must appear in
  the response or be explicitly noted as "not assessed / not applicable."
  Omission > commission as the dangerous failure mode.
- **hitl_category**: Always "II" (documentation assistance). The moment a skill
  produces autonomous clinical decisions without human review, it crosses into
  FDA device territory. This is an architectural constraint, not a limitation.
- **knowledge_sources**: List every file in knowledge/ that this skill reads.
  Enables automated staleness detection via FRESHNESS.md cross-reference.
