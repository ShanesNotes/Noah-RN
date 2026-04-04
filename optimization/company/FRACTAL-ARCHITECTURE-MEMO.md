# Noah RN Fractal Architecture Memo

## Status
This memo is a short rationale / ADR for the refactor. `optimization/company/ROLE-SPECS.md` and `docs/OPERATING-MODEL.md` remain the canonical operational docs.

## Canonical split

| Layer | Owns | Runtime surface |
|---|---|---|
| Paperclip | Org chart, budgets, approvals, heartbeats, auditability, task routing, final governance | Paperclip company + CEO / Product Owner |
| OMC / OMX | Engineering execution, planning, delegation, verification, recovery state | Founding Engineer on OMC; Principal Architect on OMX |
| Deterministic tools | Calculators, validators, conversions, lookups, safety hooks | Shell tools and Noah RN hook scripts |

## Fractal model
Paperclip governs at the company layer. It does **not** become the execution substrate.

- The **CEO / Product Owner** decomposes work, chooses the engineer, sets scope, and verifies completion.
- The **Founding Engineer** executes Claude-side work through OMC modes.
- The **Principal Architect** executes Codex-side work through OMX modes.
- Both engineers inherit the same Noah RN safety floor and the same Paperclip task context, but they execute through their native runtimes.

## Company-level flow
Paperclip stays simple at the top level:

`CEO -> Founding Engineer` or `CEO -> Principal Architect`

Each delegation must specify:
- `task_id`
- `engineer`
- `mode`
- `cwd`
- `scope`
- `deliverable`
- `verification`
- `escalation`

## Engineer-level flow
Inside each engineer runtime, work becomes staged and recursive.

### OMC / OMX execution shape
`team-plan -> team-prd -> team-exec -> team-verify -> team-fix`

That staged execution happens **inside** the engineer runtime, not inside the Paperclip org chart.

## Preserved invariants
This refactor keeps the following intact:
- Paperclip company scoping, single-assignee tasks, approval gates, budget hard-stops, activity logging
- Noah RN's outcome-spec workspace harness framing
- deterministic safety hooks and tool-only math
- provenance / confidence boundaries
- no-PHI and HITL constraints

## Why this is the right split
Paperclip is strongest as the company control plane. OMC and OMX are strongest as execution runtimes. The refactor makes those responsibilities explicit instead of forcing Paperclip-era skills, stale role sprawl, and runtime overlap to coexist.
