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

Planned build-time harness addition:
- headless subagent delegation for developer workflows, owned here rather than in `.noah-pi-runtime/`

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
- `.noah-pi-runtime/` (repo-hosted bridge surface; mounted as `/runtime/.pi`)

## Relationship to the Pi runtime surface

Treat `.noah-pi-runtime/` as conceptually subordinate to this lane.

**Authority rule (binding).** `packages/agent-harness/` and `packages/workflows/*/SKILL.md` are the authoritative contract surface. `.noah-pi-runtime/extensions/*` is the live execution surface and is subordinate. On any conflict between a contract and an extension, the contract wins; the extension updates within the same change.

**Product boundary rule.** No product imports code from another product. This package (Product A — Noah RN Agent Harness) reaches Product B (agent-native nursing EHR) and Product C (agent-native clinical simulation) only through the clinical-MCP and sim-harness MCP contracts. Cross-product in-process imports are boundary violations. See [../../docs/plans/three-product-alignment-2026-04-16.md](../../docs/plans/three-product-alignment-2026-04-16.md).

Current rule:
- `packages/agent-harness/` is the authoritative harness/routing source of truth
- `.noah-pi-runtime/` is the repo-hosted pi.dev-facing bridge surface
- inside the isolated runtime container this mounts as `/runtime/.pi`
- do not start harness architecture work in `.noah-pi-runtime/` unless the goal is specifically pi-bridge wiring

In shorthand:

```text
authoritative harness now: packages/agent-harness/
future bridge/runtime-facing shadow in repo: .noah-pi-runtime/
runtime mount inside container: /runtime/.pi
```

Near-term use:
- routing contracts
- orchestration policies
- future harness entrypoints
- developer-only headless delegation without tmux/cmux/zellij pane spawning

## Useful commands

```bash
npm run check --workspace packages/agent-harness
npm run describe-routing --workspace packages/agent-harness
npm run select-workflows --workspace packages/agent-harness
```

## Where to look first

- `router/clinical-router.md` — current routing behavior contract
- `SELECTION-POLICY.md` — workflow selection posture
- `REGISTRY-CONSUMER.md` — how this lane consumes workflow/tool/resource registries
- `select-workflows.mjs` — current structural selector
- `describe-routing-candidates.mjs` — workflow-facing routing report

## Read this next

- `../../docs/topology/subproject-workspace-map.md`
- `../../docs/foundations/agent-harness-runtime-contract.md`
- `../../docs/foundations/headless-subagent-dev-harness.md`
- `../../.noah-pi-runtime/README.md`
