# Agent Harness Scaffold

## Purpose

Define the minimal `pi.dev`-aligned harness Noah RN needs in order to route a bedside request into a bounded workflow with explicit contracts.

## Governing alignment

- `PLAN.md`: `pi.dev` is the active harness foundation.
- `TASKS.md`: the first `pi`-native bridge is on the current critical path.
- `README.md`: agent harness is one of the active subprojects.

## Canonical boundary

Agent harness means:

- workflow discovery
- workflow selection
- workflow contract interpretation
- deterministic tool access
- runtime routing behavior

It does not mean:

- broad conversational memory
- clinical resource ownership
- clinician workspace ownership

## Minimal architecture

### Layer 1: workflow authority

`packages/workflows/` remains authoritative for workflow contracts.

### Layer 2: harness consumers

`packages/agent-harness/` owns:
- registry consumers
- selection policy
- routing helpers
- bridge logic into runtime execution

### Layer 3: `pi.dev` bridge surfaces

`.pi/` is the scaffold surface for project-level promotion.
It should consume established contracts, not invent a second truth.

## Minimal runtime grammar

The harness should stay close to the operating grammar from the pi-like note:

1. intake
2. context
3. routing
4. workflow contract
5. deterministic support
6. output / handoff

That is enough for scaffolding.
Anything beyond that should earn its way in.

## Canonical surfaces now

- `packages/workflows/`
- `packages/agent-harness/`
- `.pi/`
- `docs/foundations/metadata-registry-spec.md`
- `docs/foundations/skill-contract-schema.md`

## Deferred work

- broad runtime abstraction layers
- alternate harness foundations
- autonomous multi-agent expansion without a concrete workflow need
- promotion of `.pi/` into runtime truth before the first bridge proves itself

## References

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `packages/agent-harness/README.md`
- `packages/agent-harness/SELECTION-POLICY.md`
- `docs/foundations/metadata-registry-spec.md`
- `docs/foundations/skill-contract-schema.md`
- `notes/noah-rn-pi-like-clinical-operating-structure.md`
