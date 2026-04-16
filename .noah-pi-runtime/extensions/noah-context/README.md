# `noah-context`

Responsibility:
- plan context assembly for Noah RN workflows across the major context lanes

Current capabilities:
- `describe_noah_context_lanes` — shows which context lanes are available in the workspace
- `plan_noah_context_bundle` — maps a workflow/request to the context lanes that should be assembled next
- `plan_noah_context_bundle` also returns `renderer_lane_coverage` so preview/render surfaces can consume the same lane vocabulary as the shared renderer
- `/context-plan <request>` — quick interactive context-bundle planning helper

Context lanes:
- EHR / chart context
- memory
- clinical resources
- patient monitor / simulation context

Rule:
- this extension plans context assembly
- it does not replace `medplum-context`, `noah-router`, or the authoritative workflow contracts
- it exists so the harness can decide *which context bundle* to assemble, not just *which workflow* matches
