# Agent Harness

This lane is the current harness/routing center for Noah RN.

It is the canonical workspace center for the agent harness subproject.

Current contents:
- `router/clinical-router.md`
- `list-skills.mjs`
- `list-tools.mjs`
- `list-clinical-resources.mjs`
- `select-workflows.mjs`
- `describe-routing-candidates.mjs`
- `workflow-dependencies.json`
- `REGISTRY-CONSUMER.md`

## What this folder owns

- workflow selection and routing substrate
- registry consumers
- routing policy
- bridge logic for the first workflow path

## What this folder does not own

- authoritative workflow contract content
- patient-context assembly
- curated clinical resources
- project-level pi runtime config

Those live in:
- `packages/workflows/`
- `services/clinical-mcp/`
- `clinical-resources/`
- `.pi/` (scaffold/bridge surface only)

## Relationship to `.pi/`

Treat `.pi/` as conceptually subordinate to this lane.

Current rule:
- `packages/agent-harness/` is the authoritative harness/routing source of truth
- `.pi/` is the future pi.dev-facing bridge surface
- `.pi/` stays at repo root for now because it is a project-level runtime/scaffold exception
- do not start harness architecture work in `.pi/` unless the goal is specifically pi-bridge wiring

In shorthand:

```text
authoritative harness now: packages/agent-harness/
future bridge/runtime-facing shadow: .pi/
```

Near-term use:
- routing contracts
- orchestration policies
- future harness entrypoints

## Where to look first

- `router/clinical-router.md` — current routing behavior contract
- `SELECTION-POLICY.md` — workflow selection posture
- `REGISTRY-CONSUMER.md` — how this lane consumes workflow/tool/resource registries
- `select-workflows.mjs` — current structural selector
- `describe-routing-candidates.mjs` — workflow-facing routing report

## Read this next

- `../../docs/topology/subproject-workspace-map.md`
- `../../docs/foundations/agent-harness-runtime-contract.md`
- `../../.pi/README.md`
