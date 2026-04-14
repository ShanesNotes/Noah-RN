# Agent Harness Router

This folder holds the current router contract surface for Noah RN.

## What this folder owns

- the active clinical routing behavior contract
- request classification and skill-routing posture
- the current human/agent-readable routing source of truth

## What this folder does not own

- workflow contract content itself
- patient-context assembly
- Pi runtime bridge logic

Those live in:
- `packages/workflows/`
- `services/clinical-mcp/`
- `.noah-pi-runtime/extensions/noah-router/`

## Current rule

If you need to understand how Noah RN decides which workflow should handle a request, start here.

If you need to change the future pi-native bridge shape, read this first and then move to `.noah-pi-runtime/extensions/noah-router/`.

## Current primary file

- `clinical-router.md`
