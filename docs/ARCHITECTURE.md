# Noah RN Architecture

This file is a short architecture pointer. The canonical project direction lives in [../PLAN.md](../PLAN.md).

## Current Architecture Posture

Noah RN is being reorganized around a simple foundation:

- `pi.dev` is the agent harness foundation for the next phase.
- Medplum remains the clinical workspace and FHIR backbone.
- Existing apps, services, packages, knowledge, infrastructure, and eval surfaces are useful project assets, but not all historical directories define the future architecture.
- Claude/OpenClaw/NemoClaw-era architecture docs are historical unless a specific component is intentionally adopted later.

## Active Subsystems

- `apps/clinician-dashboard/` - clinician workspace prototype.
- `services/clinical-mcp/` - context assembly and simulation server.
- `packages/` - harness, workflow, and safety contracts.
- `knowledge/` - curated clinical protocols, ranges, and output templates.
- `infrastructure/` - Medplum and related local environment setup.
- `evals/` - eval traces and meta-harness artifacts.

## Design Constraints

- Keep the nurse in the loop.
- Do not diagnose or place orders.
- Use deterministic tools for exact computation, lookup, and validation.
- Preserve provenance and confidence boundaries.
- Add runtime complexity only after the first workflow proves it needs it.

## Historical Architecture

The previous long architecture plan moved to:

```text
docs/archive/legacy-control-plane/ARCHITECTURE.md
```

Use it as historical context only. Extract durable ideas into [../PLAN.md](../PLAN.md) or focused reference docs before treating them as active direction.
