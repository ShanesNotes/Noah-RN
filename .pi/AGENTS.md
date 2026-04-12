# Noah RN `.pi` Agent Context

This file is the future project-level agent context surface for pi.dev.

Until pi runtime glue exists, use it as a bridge between the current restructured repo and the intended pi-native harness shape.

## Canonical current sources

- `PLAN.md` — project direction and decisions
- `TASKS.md` — active execution queue
- `packages/agent-harness/` — current harness/routing source of truth
- `packages/workflows/` — current workflow-contract source of truth
- `services/clinical-mcp/` — current patient-context and simulation surface
- `clinical-resources/` — current clinical resource surface

## First workflow priority

The first workflow remains **Shift Report**.

If a future pi-native implementation begins, the first meaningful end-to-end path should connect:

1. `.pi/extensions/noah-router/`
2. `.pi/extensions/medplum-context/`
3. `.pi/skills/shift-report/`
4. `services/clinical-mcp/`
5. `clinical-resources/templates/cross-skill-triggers.md`

## Current rule

Do not treat `.pi/` as the authoritative contract surface yet.

Authoritative surfaces remain:
- `packages/workflows/`
- `packages/agent-harness/`
- `tools/safety-hooks/`

`.pi/` is currently scaffold + mapping + placeholders.
