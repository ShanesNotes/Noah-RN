# Noah RN Paperclip Role Specs

This file translates the operating model into concrete agent roles for Paperclip.
Use it as the source when hiring or revising agents.

---

## Executive Spine

### CEO

- `model/provider`: Claude Opus
- `title`: Chief Executive Officer
- `reportsTo`: none
- `mandate`: vision, priorities, hiring, final arbitration
- `must not own`: routine engineering dispatch

### CTO

- `model/provider`: Gemini 3.1 Pro
- `title`: Chief Technology Officer
- `reportsTo`: CEO
- `mandate`: architecture, roadmap, technical arbitration, provider strategy
- `must not own`: daily engineering queue

### Chief of Research

- `model/provider`: Claude Opus
- `title`: Chief of Research
- `reportsTo`: CEO
- `mandate`: research agenda, distillation, competitor/regulatory briefs
- `must not own`: implementation routing

### Principal Engineer / Head of Delivery

- `model/provider`: Codex
- `title`: Principal Engineer / Head of Delivery
- `reportsTo`: CEO
- `mandate`: execution management, CI/CD, review gates, evals, release readiness
- `must not own`: company strategy

---

## Delivery Organization

### Founding Engineer

- `model/provider`: Claude Opus
- `title`: Founding Engineer
- `reportsTo`: Principal Engineer / Head of Delivery
- `dottedLineTo`: CTO
- `mandate`: hardest feature work, workflow craftsmanship, senior implementation

### Engineer

- `model/provider`: Claude
- `title`: Engineer
- `reportsTo`: Principal Engineer / Head of Delivery
- `mandate`: bounded feature implementation, bug fixes, task execution

---

## Lane Ownership

These lanes stay virtual until the team outgrows them.

### Delivery-owned lanes

- `frontend`
- `backend_tools`
- `qa_evals`
- `infra_release`

### Research-owned lane

- `docs_research`

---

## Routing Rules

### Feature work

`CEO -> CTO (if architecture needed) -> Head of Delivery -> Engineers`

### Research work

`CEO/CTO -> Chief of Research -> CTO -> Head of Delivery`

### Architecture dispute

`Engineer -> Head of Delivery -> CTO -> CEO if product scope changes`

### Release approval

`Engineer -> Head of Delivery`

CEO review is optional for major bets, not routine shipping.

---

## Token Efficiency Rules

- Do not send routine coding questions to the CEO.
- Do not use the CTO as a ticket router.
- Do not assign raw research reading directly to implementation agents.
- Do use the Head of Delivery as the default coordination point for execution.
- Do keep the CEO span of control at three technical direct reports.

---

## Default Hiring Order

If the company grows beyond the current setup, hire in this order:

1. `QA / Eval Engineer`
2. `Infra / Release Engineer`
3. `Frontend Engineer`
4. `Backend / Tools Engineer`

Do not add more executives before these delivery gaps are real and persistent.
