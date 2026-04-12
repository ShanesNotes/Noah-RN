# Agent Harness Selection Policy

This note describes how future routing should combine the new readiness artifacts without changing current runtime behavior yet.

## Inputs

### Workflow inventory
- `packages/workflows/registry.json`
- `packages/workflows/*/SKILL.md`

### Tool inventory
- `tools/registry.json`

### Knowledge inventory
- `clinical-resources/registry.json`

### Current routing authority
- `packages/agent-harness/router/clinical-router.md`

## Intended selection order

1. **Discover candidate workflows structurally**
   - start from `packages/workflows/registry.json`
   - filter by scope / routing signal / required context

2. **Confirm contract fit**
   - inspect workflow `contract:` block
   - verify the workflow gives the right artifact and does not violate negative-space constraints

3. **Confirm tool and clinical resource dependencies**
   - use `tools/registry.json` and `clinical-resources/registry.json`
   - verify required deterministic tools and reference assets exist

4. **Apply current routing policy**
   - keep `packages/agent-harness/router/clinical-router.md` as the final behavior guide until runtime promotion is explicit

## Current rule

This is a readiness policy note only.

It should inform:
- future router refactors in `packages/agent-harness/`
- future pi-native discovery behavior in `.pi/skills/`

It should **not** silently override the current router contract.
