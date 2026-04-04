# Noah RN Operating Model

## Purpose

This document defines the simplified Noah RN company architecture:
**Paperclip governs, OMC/OMX execute, deterministic tools enforce the safety floor.**

---

## Safety and governance floor

These constraints are mandatory across every layer:
- no PHI handling, storage, or logging
- deterministic tools before model arithmetic
- five Noah RN safety hooks remain active (`sanitize-input`, `validate-calculator`, `validate-dosage`, `validate-units`, `validate-negation`)
- four-layer output and provenance/confidence boundaries remain intact
- HITL Category II and no-medical-device-claim boundaries remain intact

---

## Layer 1 — Paperclip governance

Paperclip remains the control plane.
It owns:
- company scoping
- single-assignee task control
- approval gates
- budget hard-stops
- heartbeats and activity logging
- final company-level auditability

### CEO / Product Owner
The CEO is the only agent who talks to Shane.
The CEO does not implement.
The CEO:
- decomposes work
- selects the execution runtime
- assigns the task to one engineer
- verifies the deliverable before closing the task

At the company layer, routing is direct:

`CEO -> Founding Engineer` or `CEO -> Principal Architect`

There is no extra executive spine, no research branch, and no delivery-manager layer.

---

## Layer 2 — Engineer runtimes

### Founding Engineer — OMC
The Founding Engineer is the Claude-side execution owner.
Use OMC modes for Claude-side work:
- `deep-interview` for unclear requirements
- `ralplan` for planning and design consensus
- `ralph:` for bounded execution with persistent verification
- `autopilot:` for multi-file lifecycle work
- `ulw` for parallel independent subtasks
- `/team N:role` or `omc team N:codex` for coordinated multi-agent execution
- `/ccg` for cross-model synthesis when needed

### Principal Architect — OMX
The Principal Architect is the Codex-side structural-integrity owner.
Use OMX for Codex-side work:
- `$deep-interview` for unclear scope
- `$ralplan` for architecture/tradeoff planning
- `$ralph` for bounded persistent execution
- `$autopilot` for multi-file lifecycle work
- `$team N:role` for coordinated parallel execution
- `omx explore` or the Codex rescue bridge for read-only/second-pass handoffs

### Shared execution rule
Inside each engineer runtime, work follows staged execution and verification:

`team-plan -> team-prd -> team-exec -> team-verify -> team-fix`

That staged loop happens **inside OMC/OMX**, not in the Paperclip org chart.

---

## Layer 3 — Deterministic tools

Deterministic tooling remains a separate layer from model reasoning.
It includes:
- clinical calculators
- unit conversions
- drug lookups
- Noah RN hook scripts and validators

These tools keep the safety floor stable while the model handles synthesis.

---

## Delegation contract

Every CEO-issued task must include:

```text
task_id:          Paperclip task ID
engineer:         Founding Engineer (OMC) | Principal Architect (OMX)
mode:             OMC or OMX execution mode
cwd:              /home/ark/noah-rn
scope:            Exact files/directories allowed
deliverable:      Expected output artifact
verification:     Command, test, or manual check that proves completion
escalation:       Engineer -> CEO -> Shane if blocked
```

## Operating rules

- Paperclip remains the governance layer.
- OMC and OMX are the execution substrates.
- Prefer deletion over addition.
- Do not reintroduce Paperclip-era skill overlap when OMC/OMX already provide the capability.
- Preserve Noah RN hooks and clinical safety invariants unchanged.
- Keep the CEO lightweight and the execution runtimes rich.
