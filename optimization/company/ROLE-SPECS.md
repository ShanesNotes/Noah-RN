# Noah RN Paperclip Role Specs

This file is the canonical roster for the Noah RN Paperclip company.
Previous executive-spine and lane-based role specs are superseded.

---

## Shared Noah RN constraints

These constraints apply to every role above:
- no PHI handling, storage, or logging
- preserve deterministic safety hooks, tool-only math, and the outcome-spec safety floor
- preserve four-layer output, provenance/confidence boundaries, and HITL Category II limits
- prefer deletion over addition when simplifying the company or runtime surface

---

## CEO / Product Owner

- `model/provider`: Claude Opus
- `runtime`: Paperclip native via `claude_local --bare` (no OMC orchestration in the CEO lane)
- `mandate`: vision, priorities, company governance, task decomposition, engineer assignment, final verification, escalation to Shane
- `delegation_mechanism`: direct Paperclip task assignment using the delegation contract; routes work to Founding Engineer (OMC) or Principal Architect (OMX)
- `escalation_path`: blocked engineer -> CEO / Product Owner -> Shane when the decision exceeds mandate

## Founding Engineer

- `model/provider`: Claude Opus
- `runtime`: OMC via `claude_local`
- `mandate`: Claude-side engineering ownership for features, refactors, debugging, tests, review, research, and architecture in the Noah RN codebase
- `delegation_mechanism`: OMC modes and subagents (`deep-interview`, `ralplan`, `ralph`, `autopilot`, `ulw`, `/team`, `omc team`, `/ccg`)
- `escalation_path`: Founding Engineer -> CEO / Product Owner for priority, scope, or product decisions; coordinate with Principal Architect when structural review is needed

## Principal Architect

- `model/provider`: Codex / GPT-5.4
- `runtime`: OMX via `codex_local` + `omx --madmax --high`
- `mandate`: structural integrity, architecture review, CI/CD, evals, bulk refactors, second-opinion design review, and Codex-native implementation when Codex is the better tool
- `delegation_mechanism`: OMX skills and roles (`$deep-interview`, `$ralplan`, `$ralph`, `$autopilot`, `$team`, `explore`, `planner`, `architect`, `debugger`, `executor`, `verifier`)
- `escalation_path`: Principal Architect -> CEO / Product Owner for mandate or priority changes; coordinate with Founding Engineer on shared repo changes
