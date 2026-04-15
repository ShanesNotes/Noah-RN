# Headless Subagent Dev Harness

Status: proposed build-time developer harness only.

This document is about how we build Noah RN, not about Noah's runtime behavior inside the product.

## Purpose

Give the development harness a pane-free delegation path so Pi-based builder workflows can still fan out work when tmux/cmux/zellij/WezTerm pane spawning is unavailable or unreliable.

The target is simple:

- keep developer subagent-style delegation
- remove dependency on terminal multiplexers
- keep Noah product/runtime boundaries unchanged

## Non-goal

This is **not** a `.noah-pi-runtime/` feature.

Do not implement this inside the repo-hosted runtime bridge unless a future runtime requirement explicitly demands it. The current need is strictly a developer/build-time harness capability.

## Correct ownership

Primary lane:
- `packages/agent-harness/`

Reference/docs lane:
- `docs/foundations/`

Explicitly not the owner:
- `.noah-pi-runtime/`

Reason: `packages/agent-harness/` owns harness and routing architecture, while `.noah-pi-runtime/` is only the Pi-facing runtime bridge surface.

## Problem statement

Current delegation workflows in this environment assume a terminal multiplexer so a tool can spawn extra Pi sessions in panes. When the multiplexer path breaks, the orchestration pattern breaks with it.

But upstream Pi already documents two usable lower-level primitives:

1. extensions can register custom tools
2. custom tools can spawn isolated `pi` subprocesses in `--mode json`

The upstream example at `examples/extensions/subagent/` proves the basic pattern: spawn `pi`, stream JSONL events, collect assistant/tool output, and return a structured result. That gives us the right quick fix path for the dev harness.

## Proposed build-time architecture

### Phase 1 — minimal headless delegate

Build a developer-only delegation primitive in `packages/agent-harness/`.

Suggested shape:
- command or script entrypoint for direct use during development
- optional Pi extension wrapper later if needed
- single delegated task only

Minimum inputs:
- `task`
- optional `cwd`
- optional `model`
- optional `tools`
- optional `systemPrompt`

Execution path:
1. spawn `pi --mode json -p --no-session`
2. append a temp system prompt file if needed
3. feed the delegated task as prompt text
4. parse JSONL events from stdout
5. collect assistant messages, tool calls, stderr, and stop reason
6. return a final structured result

Minimum success criteria:
- no panes
- no tmux dependency
- isolated context window
- reproducible from a normal shell

### Phase 2 — named developer agents

Once the primitive works, add developer agent definitions.

Likely locations:
- user-level: `~/.pi/agent/agents/*.md`
- repo-local dev-only: a dedicated developer harness surface, not `.noah-pi-runtime/`

If repo-local developer agents are needed, they should live under a build-time harness surface owned by `packages/agent-harness/`, with clear docs about trust and scope.

### Phase 3 — parallel and chain execution

After single-task runs are stable, support:
- `tasks: [...]` parallel fan-out
- `chain: [...]` sequential handoff with previous-output injection

Do not build this first. The single-task path is enough to unblock builder workflows.

### Phase 4 — persistence and resumability

Only if the workflow actually needs it:
- run ids
- artifact logs
- resumable follow-ups
- SDK-managed sessions instead of raw subprocesses

## Implementation options

### Option A — subprocess runner

Use Node `spawn()` from a script or extension and invoke the installed `pi` executable.

Pros:
- shortest path
- already proven by upstream example
- minimal design risk

Cons:
- manual JSONL parsing
- manual temp-file management
- weaker resume semantics

Recommendation: start here.

### Option B — SDK-managed internal sessions

Use `createAgentSession()` / `createAgentSessionRuntime()` from `@mariozechner/pi-coding-agent`.

Pros:
- tighter lifecycle control
- easier future integration with Noah-specific orchestration
- cleaner path to resumable delegated runs

Cons:
- more code now
- unnecessary until subprocess limits are real

Recommendation: defer.

## Suggested repo shape

Near-term:
- `packages/agent-harness/headless-subagent/` or equivalent script lane
- docs here in `docs/foundations/headless-subagent-dev-harness.md`

Possible concrete files:
- `packages/agent-harness/headless-subagent/run-headless-subagent.mjs`
- `packages/agent-harness/headless-subagent/README.md`
- `packages/agent-harness/headless-subagent/agents/` for dev-only agent prompts if we later need them

## Guardrails

- keep this developer-only until a runtime need is proven
- do not widen `.noah-pi-runtime/` to absorb build-time orchestration concerns
- do not create backward-compat fallbacks for pane-based spawning; replace with a cleaner path when ready
- keep the first version single-purpose and boring

## Upstream references

Use these as implementation references:
- Pi package `README.md` — philosophy and extension posture
- `docs/extensions.md`
- `docs/sdk.md`
- `examples/extensions/subagent/README.md`
- `examples/extensions/subagent/index.ts`
- `examples/extensions/subagent/agents.ts`
- `examples/sdk/06-extensions.ts`
- `examples/sdk/13-session-runtime.ts`

## Decision

If we need a quick fix now, the next implementation step should be:

1. build a small subprocess-backed delegate runner under `packages/agent-harness/`
2. verify it can execute one isolated delegated task end to end
3. only then decide whether it should be exposed as a Pi extension, a repo script, or both
