# Skill Contract Schema (Draft)

## Goal

Extend workflow metadata so agents can reason about skills as explicit contracts, not just prose descriptions.

## Proposed Frontmatter Extension

```yaml
contract:
  you_will_get:
    - Four-layer clinical output
    - Structured section breakdown
  you_will_not_get:
    - Medication orders
    - Facility-specific policy beyond explicit references
    - Fabricated missing clinical data
  controllable_fields:
    - acuity_level: icu | med-surg | outpatient
    - depth: brief | standard | comprehensive
  use_when:
    - Full shift handoff is needed
  do_not_use_when:
    - Rapid response protocol execution is needed
```

## Apply First To

- `packages/workflows/shift-report/SKILL.md`
- `packages/workflows/shift-assessment/SKILL.md`
- `packages/workflows/protocol-reference/SKILL.md`

## Current Rule

`packages/workflows/` remains authoritative.
Do not make `.noah-pi-runtime/skills/` canonical until source-of-truth promotion is explicitly decided.
