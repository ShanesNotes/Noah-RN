# Wiki-Grounded Architecture Readiness

This note distills the highest-leverage architecture concepts from `wiki/` into current Noah RN repo preparation work.

## Prepare Now

### 1. Metadata-First Registry
Source: `wiki/concepts/metadata-first-registry.md`

Attach to current surfaces:
- `packages/workflows/`
- `packages/agent-harness/`
- `.pi/skills/`
- `knowledge/`
- `tools/`

Readiness target:
- structural registries for skills, tools, and knowledge
- routing based on metadata rather than prose-only interpretation

### 2. Skill-as-Contract
Source: `wiki/concepts/skill-as-contract.md`

Attach to current surfaces:
- `packages/workflows/*/SKILL.md`
- `.pi/skills/`
- `packages/agent-harness/router/clinical-router.md`

Readiness target:
- explicit contract schema extension for workflow metadata
- clearer agent-callable boundaries before pi-native promotion

### 3. Observability From Day One
Source: `wiki/concepts/observability-from-day-one.md`

Attach to current surfaces:
- `tools/trace/trace.sh`
- `evals/product/traces/`
- `.pi/`
- `services/clinical-mcp/`

Readiness target:
- richer trace schema
- category tags
- first-workflow measurement plan

### 4. Context Architecture / Four Context Primitives
Sources:
- `wiki/concepts/context-architecture-as-crowning-skill.md`
- `wiki/concepts/four-context-primitives.md`

Attach to current surfaces:
- `services/clinical-mcp/`
- `packages/memory/`
- `.pi/`
- `knowledge/`

Readiness target:
- vocabulary and contracts for write/select/compress/isolate
- first Shift Report context assembly contract

## Defer But Capture

### Workflow State vs Conversation State
Source: `wiki/concepts/workflow-state-vs-conversation-state.md`

Future gate for:
- multi-step clinical protocol engines
- explicit state persistence under future memory/workflow surfaces

### Filesystem-as-Feedback Loop
Source: `wiki/concepts/filesystem-as-feedback-loop.md`

Future gate for:
- harness optimization loops
- eval/trace-driven outer-loop improvement under `evals/`

## First Workflow Filter

Shift Report remains the filter for what matters next.
If a wiki concept does not improve the first pi-native Shift Report path, it should probably wait.
