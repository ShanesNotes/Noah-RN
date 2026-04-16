# `noah-router`

Responsibility:
- project-level routing and dependency inspection for Noah RN workflows

Current capabilities:
- `resolve_noah_request` tool — matches bedside requests to likely workflow skills using workflow dependency manifests plus harness routing metadata
- `resolve_noah_request` now also returns context planning output including `renderer_lane_coverage`
- `describe_noah_skill_dependencies` tool — summarizes `packages/workflows/*/dependencies.yaml`
- `/route <request>` command — quick interactive routing helper
- `before_agent_start` hook — injects likely workflow/dependency hints into the turn so the agent reads both `SKILL.md` and `dependencies.yaml`

Primary sources of truth:
- `packages/agent-harness/router/clinical-router.md`
- `packages/agent-harness/describe-routing-candidates.mjs`
- `packages/workflows/*/dependencies.yaml`

Rule:
- routing authority stays in `packages/agent-harness/`
- this extension is the Pi-native bridge, not a second routing design surface
