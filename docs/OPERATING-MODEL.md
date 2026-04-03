# Noah RN Operating Model

## Purpose

This document defines the working org structure for the Noah RN Paperclip company.
The goal is not startup theater. The goal is to route work to the model/provider
best suited to it while minimizing token waste, rework, and CEO bottlenecks.

Default optimization target: safe shipping over maximum throughput.

---

## Executive Structure

The company uses a hybrid spine. The CEO has three direct reports:

1. `CTO` — Gemini 3.1 Pro
2. `Chief of Research` — Claude Opus
3. `Principal Engineer / Head of Delivery` — Codex

The `Principal Engineer / Head of Delivery` is a direct report because this role
owns execution quality, release readiness, and delegation flow. This is not an
IC reporting line; it is an execution leadership role.

---

## Role Charters

### CEO — Claude Opus

Owns:
- product vision
- priority calls
- hiring and org design
- final arbitration when architecture, research, and execution disagree

Does not own:
- day-to-day task dispatch
- routine code review
- queue management for engineers

### CTO — Gemini 3.1 Pro

Owns:
- system architecture
- technical roadmap
- model/provider portfolio decisions
- anti-scope-creep judgment
- RFC review and approval for major technical changes

Best use of Gemini:
- architecture critique
- design synthesis
- comparative tradeoff analysis
- identifying where the system is overbuilt

Does not own:
- daily coding throughput
- CI/CD gatekeeping
- engineer task queue management

### Chief of Research — Claude Opus

Owns:
- research agenda
- competitor and regulatory analysis
- distillation of long-form research into implementation guidance
- long-horizon opportunity mapping

Output standard:
- decision memos
- distilled recommendations
- risk briefs

Does not own:
- implementation management
- release approval

### Principal Engineer / Head of Delivery — Codex

Owns:
- engineering queue decomposition
- CI/CD and release process
- execution planning
- code review and regression review
- eval discipline and quality gates
- cross-agent coordination for implementation

Best use of Codex:
- repo-grounded implementation judgment
- turning architecture into executable work
- catching hidden regressions and weak assumptions
- keeping work scoped, testable, and reviewable

Does not own:
- company vision
- long-horizon research agenda
- final product prioritization

---

## Engineering Structure

The delivery organization rolls up under the `Principal Engineer / Head of Delivery`.

### Founding Engineer — Claude Opus

Role:
- senior implementation lead
- hardest feature work
- prompt and workflow craftsmanship
- high-complexity product building

Reports to:
- operationally to `Principal Engineer / Head of Delivery`
- dotted-line collaboration with `CTO` on major design changes

### Engineers — Claude

Role:
- general implementation capacity
- bounded feature work
- task execution from delivery plans

Reports to:
- `Principal Engineer / Head of Delivery`

---

## Functional Lanes

These are lanes, not executive titles yet. Keep them under delivery until there
is enough sustained volume to justify dedicated leads.

- `Frontend` — dashboard UI, confidence UI, workflow surfaces
- `Backend / Tools` — deterministic tooling, data adapters, calculators, hooks
- `QA / Evals` — scenario harnesses, regression review, validation discipline
- `Infra / Release` — CI, release workflow, environment sanity, operational checks
- `Docs / Research` — long-form research, distillation, external analysis

Ownership:
- `Frontend`, `Backend / Tools`, `QA / Evals`, and `Infra / Release` live under delivery
- `Docs / Research` lives under the Chief of Research

---

## Delegation Paths

### Normal feature flow

1. CEO defines priority.
2. CTO approves architecture or implementation direction when needed.
3. Principal Engineer decomposes work into tasks.
4. Engineers implement.
5. Principal Engineer reviews and decides release readiness.

### Architecture escalation

1. Engineer raises issue to Principal Engineer.
2. Principal Engineer resolves locally if possible.
3. If the issue changes architecture, escalate to CTO.
4. If the issue changes product direction, CTO escalates to CEO.

### Research flow

1. CEO or CTO requests research.
2. Chief of Research produces a decision memo.
3. CTO converts research into architectural stance.
4. Principal Engineer converts that stance into implementation work.

### Release gate

The release gate sits with the `Principal Engineer / Head of Delivery`.
No routine code change should require CEO review to ship.

---

## Token Efficiency Rules

To minimize waste and rate-limit pressure:

- CEO should not be the default router for routine technical discussion.
- CTO should review architecture, not micromanage implementation.
- Research should arrive as distilled guidance, not raw document dumps.
- Engineers should receive bounded tasks with explicit acceptance criteria.
- Codex should be used as the execution backbone and quality gate, not as overflow coding labor.

Preferred work split:

- `Claude Opus CEO`: strategy and final judgment
- `Gemini CTO`: architecture and technical arbitration
- `Claude Opus Research`: deep research and synthesis
- `Codex Delivery`: execution management, review, CI/CD, quality
- `Claude Engineers`: implementation throughput

---

## Decisions This Structure Locks In

- The org is not flat.
- The CEO does not directly manage all engineers.
- Codex reports directly to the CEO only in the capacity of delivery leadership.
- Gemini is the architecture executive, not the daily engineering manager.
- The company optimizes for safe shipping, not maximal parallelism.
- Functional specialization exists as lanes first and titles second.
