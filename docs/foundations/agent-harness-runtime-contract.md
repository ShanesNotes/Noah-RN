# Agent Harness Runtime Contract

Workspace center:
- `packages/agent-harness/`

## Purpose

Define the minimum runtime contract for selecting and invoking the first workflow path.

This is a contract artifact, not a full runtime design.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/agent-harness-first-batch.md`
- `docs/foundations/skill-contract-schema.md`
- `docs/foundations/metadata-registry-spec.md`

## Contract

### Inputs

The harness should consume:
- user request / intake
- patient-context bundle when required
- workflow registry
- workflow contract metadata
- deterministic tool registry
- clinical resource registry

### Responsibilities

The harness should:
- classify request shape
- select a workflow using metadata and contract fit first
- verify required context before invocation
- pass only the minimum required context forward
- preserve deterministic-tool boundaries

### Outputs

The harness should emit:
- selected workflow
- required context verdict
- referenced deterministic tools
- referenced clinical resource assets
- handoff-ready invocation payload

## Rules

- `packages/workflows/` remains authoritative for workflow contracts
- `.pi/` consumes current contracts and does not become a second source of truth
- routing should be metadata-first, prose-second
- selection should stay legible and auditable

## Not yet in scope

- broad autonomous multi-agent orchestration
- alternative harness foundations
- deep runtime state machines
- replacing workflow contracts with ad hoc routing logic

## Later runtime mirror

When implementation begins, the runtime mirror of this contract should live under:
- `packages/agent-harness/`
- `.pi/` only as a consumer/bridge surface

## References

- `docs/foundations/agent-harness-scaffold.md`
- `docs/foundations/agent-harness-first-batch.md`
- `packages/agent-harness/SELECTION-POLICY.md`
