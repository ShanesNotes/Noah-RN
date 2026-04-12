# Noah RN `.pi` System Stub

This is a placeholder system-surface for the future pi.dev harness.

## Intended posture

- route clinical requests to the correct workflow contract
- prefer deterministic tools for exact computation, validation, and lookup
- preserve provenance and confidence boundaries
- keep the nurse in the loop
- do not diagnose, place orders, or invent missing clinical data

## Current implementation boundary

The actual routing/source-of-truth currently lives in:
- `packages/agent-harness/router/clinical-router.md`
- `packages/workflows/*`

This file should not diverge from those surfaces until pi-native runtime implementation begins.

## First migration target

The first pi-native workflow target is **Shift Report**.

That future path should be built around:
- `.pi/extensions/noah-router/`
- `.pi/extensions/medplum-context/`
- `.pi/skills/shift-report/`
- `services/clinical-mcp/`
- `clinical-resources/templates/cross-skill-triggers.md`
