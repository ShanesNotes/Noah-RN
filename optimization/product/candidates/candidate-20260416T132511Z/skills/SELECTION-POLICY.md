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

## Model-selection advisory note

See `packages/agent-harness/MODEL-SELECTION-NOTES.md` for non-binding recommendations on:
- model profiles (`fast_router`, `deterministic_worker`, `clinical_reasoner`, `high_fidelity_reasoner`)
- complexity-tier to profile mapping
- skill-level routing suggestions
- escalation rules for ambiguous or multi-skill requests

Recommended default posture from that note:
- `simple` -> `fast_router`
- `moderate` -> `deterministic_worker`
- `complex` -> `clinical_reasoner`
- escalate to `high_fidelity_reasoner` for difficult synthesis, retries, or unresolved ambiguity

These notes are advisory and should be applied through runtime policy, not by hardcoding vendor model names into workflow contracts.

## Current rule

This is a readiness policy note only.

It should inform:
- future router refactors in `packages/agent-harness/`
- future pi-native discovery behavior in `.noah-pi-runtime/skills/`
- future model-profile binding work in the harness

It should **not** silently override the current router contract.
