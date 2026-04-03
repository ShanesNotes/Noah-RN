# New Optimization Candidates — Batch 2

## Candidate 38: Codex Base Instructions Conflict with Paperclip Agent Identity

**Observation**: Session logs show Codex (GPT-5) sessions receive ~10KB of base instructions ("You are Codex, a coding agent based on GPT-5...") BEFORE the Paperclip agent instructions are injected. The Codex base instructions include formatting rules, personality traits, and behavioral constraints that directly conflict with Paperclip agent identities.

**Current State**:
- Codex base instructions define personality as "pragmatic, effective software engineer"
- Paperclip agents have distinct identities (Wiz, Dev, Scout, CEO, etc.) with different communication styles
- Codex instructions say "Never overwhelm the user with answers that are over 50-70 lines" — this truncates Paperclip agent outputs
- Codex instructions enforce specific formatting rules (no nested bullets, prose over bullets) that may conflict with clinical output requirements

**Impact**:
- Agent identity dilution — Wiz's "gifted talent" persona competes with Codex's "pragmatic engineer"
- Output truncation risk — complex clinical analyses may be cut short
- Formatting conflicts — clinical four-layer output format may violate Codex formatting rules
- Token waste — ~10KB of irrelevant instructions consumed in every session context window

**Expected Impact**: High. Every session carries this conflict. The identity mismatch alone causes inconsistent agent behavior across Paperclip vs. Codex-native sessions.

**Proposed Fix**:
- Wrap Paperclip agent instructions in XML tags that explicitly override Codex base personality
- Add `<override>` markers for: personality, output length limits, formatting rules
- Or: inject Paperclip instructions as developer-level system prompts (higher priority than user-level)

---

## Candidate 39: No Agent Onboarding/Offboarding Workflow

**Observation**: Agent 8a9b7a27 has both CEO and Scout artifacts in the same directory. Agent b107ef64 (QA) has a 3-line stub. Agent 15c40fce (Forge/Product Proposer) was added recently. There's no formal onboarding checklist or offboarding procedure.

**Current State**:
- New agents get minimal instructions (3 lines for QA)
- No standardized onboarding checklist
- No offboarding procedure when agents are deprecated
- Memory files and HEARTBEAT.md not created automatically

**Impact**:
- New agents start with near-zero context
- No verification that required artifacts exist before agent activation
- Zombie artifacts from deprecated agents linger

**Expected Impact**: Medium-High. Every new hire currently starts handicapped.

**Proposed Fix**:
- Create `AGENT_ONBOARDING.md` template with required artifacts checklist
- Automate verification: before first heartbeat, check AGENTS.md, HEARTBEAT.md, memory directory exist
- Add offboarding checklist: archive memory, update AGENT_REGISTRY.md, revoke access

---

## Candidate 40: Session Originator Mismatch — Codex Exec vs. Paperclip Agent

**Observation**: All 99 sessions on March 31 show `originator: "codex_exec"` and `source: "exec"`. These are Codex execution sessions, not Paperclip-native sessions. Paperclip agents are being run through Codex as a shim layer.

**Current State**:
- Paperclip defines agent identities and task assignments
- Codex executes the actual sessions with its own base instructions
- No Paperclip-native session type exists
- The shim layer adds: Codex base instructions, Codex skill system, Codex formatting rules

**Impact**:
- Double instruction loading (Codex + Paperclip)
- Potential for Codex to override Paperclip agent behavior
- No way to measure Paperclip-specific session performance vs. Codex baseline
- Token overhead from dual instruction sets

**Expected Impact**: High. This is the fundamental architecture issue underlying many other problems.

**Proposed Fix**:
- Document the shim architecture explicitly
- Measure token overhead from Codex base instructions
- Consider Paperclip-native session type that bypasses Codex base instructions
- Or: minimize Codex base instructions via minimal personality config

---

## Candidate 41: No Task Priority Propagation from Paperclip to Session

**Observation**: Paperclip tasks have priorities (P0, P1, etc.) but session metadata shows no priority field. Codex sessions have `effort: "high"` uniformly — no differentiation by task priority.

**Current State**:
- Paperclip: tasks have priority labels
- Codex sessions: all use `effort: "high"` regardless of task priority
- No priority-based model selection (P0 gets better model, P3 gets cheaper)
- Peak-hours policy references P0 but sessions don't carry this data

**Impact**:
- Cannot enforce peak-hours P0-only policy at session level
- All tasks consume equal resources regardless of priority
- No data for priority-based routing decisions

**Expected Impact**: Medium. Directly impacts cost efficiency and peak-hours compliance.

**Proposed Fix**:
- Map Paperclip task priority to Codex effort level
- P0 → high effort, P1 → medium, P2+ → low
- Include priority in session metadata for analytics
- Add priority-based model selection

---

## Candidate 42: Agent Instruction Escaping Corruption

**Observation**: Wiz's AGENTS.md contains escaped Markdown: `\## Core Invariants`, `\\*\\*Vision → Ship in One Breath\\*\\*`, `&#x20;` entities. This suggests the instructions were processed through an HTML/Markdown escaping layer that corrupted formatting.

**Current State**:
- Wiz AGENTS.md: `\## Core Invariants` instead of `## Core Invariants`
- Wiz AGENTS.md: `\\*\\*bold\\*\\*` instead of `**bold**`
- Wiz AGENTS.md: `&#x20;` HTML entities for spaces
- Dev AGENTS.md appears clean (no escaping issues)

**Impact**:
- LLM may misinterpret escaped instructions
- Section headers not recognized as headers
- Bold/emphasis formatting lost
- Inconsistent instruction quality between agents

**Expected Impact**: Medium-High. Wiz is the primary engineering agent; corrupted instructions reduce effectiveness.

**Proposed Fix**:
- Audit all AGENTS.md files for escaping artifacts
- Fix Wiz AGENTS.md to use proper Markdown
- Add instruction validation step: reject files with `\\*\\*` or `&#x` patterns
- Document the escaping issue in the instruction pipeline

---

## Candidate 43: No Cross-Agent Context Sharing Protocol

**Observation**: When Wiz completes a task, Dev has no visibility into what changed. When Scout completes research, findings aren't automatically shared with Dev or Wiz. Each agent operates in isolation.

**Current State**:
- Agents update Paperclip task status
- No automatic notification of completed work to dependent agents
- No shared changelog or "what changed since your last heartbeat"
- Agents must manually scan git log or issue comments for context

**Impact**:
- Duplicate work — two agents may work on overlapping areas
- Stale context — agents operate on outdated assumptions
- Integration gaps — changes by one agent break another's work

**Expected Impact**: High. This is the root cause of coordination overhead.

**Proposed Fix**:
- Create `COMPANY_STATE.md` updated on every task completion
- Include: recent changes, affected files, responsible agent
- Agents read COMPANY_STATE.md at heartbeat start
- Add "context delta" to Paperclip API: what changed since agent's last session

---

## Candidate 44: No Agent Capacity-Aware Task Assignment

**Observation**: Paperclip assigns tasks to agents without considering current workload. An agent with 3 in_progress tasks may receive a 4th while another agent is idle.

**Current State**:
- Task assignment is manual (CEO assigns via Paperclip API)
- No visibility into agent workload at assignment time
- No queue depth tracking per agent
- No automatic load balancing

**Impact**:
- Uneven workload distribution
- Some agents bottleneck while others idle
- No data for capacity planning

**Expected Impact**: Medium. Improves throughput with minimal implementation.

**Proposed Fix**:
- Add `workload` field to agent status: tasks in_progress, blocked, queued
- Show workload in Paperclip UI when assigning tasks
- Suggest least-loaded agent for new assignments
- Add queue depth limit per agent (max 3 in_progress)

---

## Candidate 45: Missing Agent-Specific Skill Verification at Startup

**Observation**: The existing RATIONALE.md (Candidate 36) notes that `desiredSkills` aren't verified. But the deeper issue is that each agent references different skills, and there's no per-agent skill audit.

**Current State**:
- CEO references: `dispatching-parallel-agents`, `writing-plans`, `executing-plans`
- Wiz/Dev reference: `subagent-driven-development`, `verification-before-completion`
- Scout/QA reference: none (minimal instructions)
- Some skills exist in Codex skill list but not in Paperclip skill list
- Skills are scattered across: `codex-home/skills/`, `.paperclip/.../skills/`, `@paperclipai/server/skills/`

**Impact**:
- Agents can't find skills referenced in their instructions
- Silent failures when invoking non-existent skills
- Different skill sources create confusion about which version to use

**Expected Impact**: High. Directly impacts agent effectiveness.

**Proposed Fix**:
- Create per-agent skill manifest: which skills this agent needs
- Validate all referenced skills exist before agent activation
- Consolidate skill sources into single location
- Add skill availability to HEARTBEAT.md checklist

---

## Candidate 46: No Agent Performance Baseline or Regression Detection

**Observation**: The product-level eval harness runs against a golden test suite with scores. The company-level has no equivalent. There's no way to know if an agent instruction change improved or degraded performance.

**Current State**:
- Product: eval-harness.sh runs golden tests, produces scores
- Company: no automated evaluation of agent instruction changes
- No baseline metrics for: task completion rate, cycle time, error rate
- No regression detection when agent instructions change

**Impact**:
- Cannot measure if instruction changes help or hurt
- No data-driven optimization
- Changes made on intuition, not evidence

**Expected Impact**: High. This is the fundamental missing piece for company-level optimization.

**Proposed Fix**:
- Create company-level eval harness: replay historical tasks against agent instructions
- Baseline metrics: task completion rate, cycle time, error rate, token efficiency
- Run eval on every instruction change candidate
- Compare candidate scores against baseline before proposing

---

## Candidate 47: Truncation Policy May Clip Critical Context

**Observation**: Codex session metadata shows `truncation_policy: {mode: "tokens", limit: 10000}`. Paperclip agent instructions for Wiz are ~7.8KB, Dev ~7.2KB, CEO ~3.3KB. Combined with Codex base instructions (~10KB), task descriptions, and conversation history, the 10K token truncation limit may clip critical context.

**Current State**:
- Truncation limit: 10,000 tokens
- Codex base instructions: ~10KB raw text (likely 2-3K tokens)
- Wiz AGENTS.md: ~7.8KB raw text
- Task descriptions: variable, can be 1-5KB
- Conversation history: grows with each turn

**Impact**:
- Later turns may lose agent instructions
- Critical safety constraints may be truncated
- Agent behavior degrades over long sessions

**Expected Impact**: Medium-High. Safety-critical for clinical context.

**Proposed Fix**:
- Measure actual token count of agent instructions
- Reduce Codex base instructions to minimize total context
- Add context compression for conversation history
- Consider increasing truncation limit or using sliding window

---

## Candidate 48: No Agent-to-Agent Communication Protocol

**Observation**: Agents communicate through Paperclip issue comments and @mentions. There's no structured protocol for inter-agent communication — no message format, no acknowledgment system, no escalation path.

**Current State**:
- Communication: Paperclip issue comments
- No message format standard
- No acknowledgment required
- No read receipt or response SLA
- Escalation: manual (CEO intervenes)

**Impact**:
- Messages lost in comment threads
- No visibility into who read what
- Escalation depends on manual scanning
- No audit trail of inter-agent communication

**Expected Impact**: Medium. Improves coordination efficiency.

**Proposed Fix**:
- Define inter-agent message format: {from, to, type, content, priority, requires_ack}
- Add acknowledgment tracking to Paperclip API
- Define escalation rules: no response in N heartbeats → escalate
- Create communication log for analytics

---

## Candidate 49: Model Provider Lock-in Risk in Session Config

**Observation**: All sessions show `model_provider: "openai"` and `model: "gpt-5.4"`. Paperclip agent instructions reference multiple model tiers (haiku, sonnet, opus) for subagents, but all actual execution goes through GPT-5.4 via Codex.

**Current State**:
- All sessions: OpenAI GPT-5.4
- Agent instructions reference: haiku, sonnet, opus (Anthropic models)
- No multi-provider session routing
- Subagent model selection is theoretical, not implemented

**Impact**:
- Single point of failure — OpenAI outage stops all work
- Cannot leverage model strengths (Claude for reasoning, GPT for coding)
- Cost optimization limited to single provider pricing
- Agent instructions reference capabilities that don't exist in current setup

**Expected Impact**: Medium. Strategic risk, not immediate blocker.

**Proposed Fix**:
- Document current model provider dependency
- Add model provider selection to task routing
- Map task types to optimal model providers
- Plan multi-provider session support

---

## Candidate 50: No Agent Instruction Version Control or Diff Tracking

**Observation**: Agent AGENTS.md files are modified directly with no version history, changelog, or diff tracking. When instructions change, there's no record of what changed, why, or by whom.

**Current State**:
- AGENTS.md files modified directly
- No version history
- No changelog
- No review process for instruction changes
- Changes made ad-hoc during sessions

**Impact**:
- Cannot trace instruction changes to behavior changes
- No rollback capability
- No review process for instruction quality
- Instruction drift over time

**Expected Impact**: Medium. Important for debugging and optimization.

**Proposed Fix**:
- Track AGENTS.md changes in git with structured commit messages
- Add instruction changelog to company state
- Require review for instruction changes
- Version-tag instruction sets for eval reproducibility

---

## Summary Table

| Candidate | Area | Effort | Impact | Priority |
|-----------|------|--------|--------|----------|
| 38: Codex instruction conflict | Architecture | Medium | High | P0 |
| 39: No onboarding workflow | Operations | Low | Medium | P1 |
| 40: Session originator mismatch | Architecture | High | High | P0 |
| 41: No priority propagation | Coordination | Low | Medium | P1 |
| 42: Instruction escaping corruption | Quality | Low | High | P0 |
| 43: No cross-agent context sharing | Coordination | Medium | High | P0 |
| 44: No capacity-aware assignment | Operations | Medium | Medium | P2 |
| 45: Missing skill verification | Quality | Medium | High | P1 |
| 46: No performance baseline | Analytics | High | High | P0 |
| 47: Truncation policy risk | Safety | Medium | High | P0 |
| 48: No communication protocol | Coordination | Medium | Medium | P1 |
| 49: Model provider lock-in | Architecture | High | Medium | P2 |
| 50: No instruction versioning | Operations | Low | Medium | P1 |
