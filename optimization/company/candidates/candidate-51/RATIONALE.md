# New Optimization Candidates — Batch 3

## Candidate 51: Subagent Sessions Lack Paperclip Agent Instructions Entirely

**Observation**: Of 99 sessions on March 31, 108 are `agent_role: "explorer"` and 34 are `agent_role: "worker"`. These are Codex subagent sessions spawned by Paperclip agents. They receive Codex base instructions but **zero Paperclip agent instructions** — no AGENTS.md content is injected.

**Current State**:
- 108 explorer subagent sessions: pure Codex instructions, no Paperclip context
- 34 worker subagent sessions: pure Codex instructions, no Paperclip context
- 10 default sessions: receive Paperclip AGENTS.md
- Subagent nicknames (Huygens, Einstein, Kuhn, etc.) are Codex-generated, not Paperclip agent identities
- Subagent CWDs vary: some point to `/home/ark/noah-rn`, some to agent workspace dirs

**Impact**:
- Subagents operate with zero knowledge of: project architecture, engineering standards, clinical constraints, HITL requirements, output format contracts
- Subagents may produce output that violates Paperclip invariants (no PHI, deterministic tools, provenance)
- 142 of 152 total sessions (93%) run without Paperclip instructions
- This is the single largest source of quality variance

**Expected Impact**: Critical. The vast majority of execution happens in subagents that have no awareness of the system they're building.

**Proposed Fix**:
- Inject Paperclip AGENTS.md into subagent sessions as developer instructions
- Or: create a `SUBAGENT_INSTRUCTIONS.md` that's injected into all subagent spawns
- At minimum: inject hard constraints (No PHI, HITL Category II, provenance, four-layer output)
- Add project architecture overview to subagent context

---

## Candidate 52: 14% of Sessions Hit Rate Limits with Zero Work Completed

**Observation**: 14 of 99 sessions (14%) hit rate limits immediately on startup. These sessions complete with zero token usage and zero work done.

**Current State**:
- Rate limit types observed:
  - Primary: 100% used (5-min window) — 5 sessions
  - Secondary: 100% used (weekly window) — 9 sessions
  - Credits: 0 balance — all 14 sessions
- Sessions that hit limits complete immediately with `task_complete` and no `last_agent_message`
- Subagent sessions are most affected (spawned when parent already near limits)

**Impact**:
- Wasted session overhead: each session still consumes ~10KB of base instructions in context
- No retry logic or backoff — sessions just fail silently
- Parent agent may not know subagent failed
- Cascading failure: one rate-limited session triggers more spawns that also fail

**Expected Impact**: High. 14% of sessions are pure waste.

**Proposed Fix**:
- Add rate limit check before spawning subagents
- Implement exponential backoff on rate limit: wait, then retry
- Surface rate limit status to parent agent so it can adjust strategy
- Add "rate limit aware" task scheduling: defer non-critical work when limits approaching

---

## Candidate 53: Subagent CWD Inconsistency Causes Path Resolution Failures

**Observation**: Subagent sessions have different CWDs depending on spawn context:
- Some: `/home/ark/noah-rn` (repo root)
- Some: `/home/ark/.paperclip/instances/default/projects/cc420500-bbb4-4390-aaac-45faeffe65bc/478f3b41-7023-4992-9f02-9decb2ada0b3/_default`
- Some: `/home/ark/.paperclip/instances/default/workspaces/228a37ec-848a-4b94-9f2e-ab9d0ec166c4`

**Current State**:
- Paperclip instructions say: "Resolve via `git rev-parse --show-toplevel`, not relative paths"
- But subagents don't receive Paperclip instructions
- Codex base instructions don't mention path resolution
- Different CWDs mean relative paths resolve differently

**Impact**:
- Subagents may read/write wrong files
- Path-dependent operations (tests, tools) may fail
- Inconsistent behavior across subagent spawns

**Expected Impact**: Medium. Causes intermittent failures that are hard to reproduce.

**Proposed Fix**:
- Standardize subagent CWD to repo root (`/home/ark/noah-rn`)
- Or: pass resolved absolute paths to subagents in task description
- Document CWD expectations in subagent instructions

---

## Candidate 54: No Subagent Result Aggregation or Quality Validation

**Observation**: Parent agents spawn subagents (explorer/worker) but there's no structured mechanism for collecting, validating, or aggregating subagent results.

**Current State**:
- Subagents complete and return results to parent thread
- No quality validation of subagent output
- No consistency checks across parallel subagent results
- No conflict resolution when subagents produce contradictory findings

**Impact**:
- Poor subagent output propagates to parent decisions
- No visibility into subagent success/fail rate
- Cannot measure if subagent delegation improves or degrades quality

**Expected Impact**: Medium. Affects reliability of delegated work.

**Proposed Fix**:
- Define subagent result schema: {status, findings, confidence, artifacts}
- Add validation step: parent reviews subagent output before using
- Track subagent success rate per role type
- Add conflict detection for parallel subagent results

---

## Candidate 55: Agent Nickname Collision Across Sessions

**Observation**: Multiple sessions share the same agent nickname (e.g., "Kuhn" appears in 8 sessions, "Lorentz" in 6). These are Codex-generated names, not unique identifiers.

**Current State**:
- 54 unique nicknames across 152 sessions
- Nicknames repeat: Kuhn (8), Lorentz (6), Einstein (6), and 17 others with 4 sessions each
- No session-unique identifier in task context
- Nicknames are decorative, not functional

**Impact**:
- Cannot trace a specific session's output to its execution
- Debugging requires matching by timestamp, not identity
- Analytics must use session ID, not human-readable name

**Expected Impact**: Low-Medium. Cosmetic but impacts debuggability.

**Proposed Fix**:
- Include Paperclip task ID in subagent spawn context
- Use task ID as primary identifier, nickname as secondary
- Add task_id to session metadata for traceability

---

## Candidate 56: No Session-to-Task Correlation in Session Metadata

**Observation**: Session metadata contains `originator`, `source`, `agent_nickname`, `agent_role` but **no Paperclip task ID**. The only way to correlate sessions to tasks is by parsing the user message content or matching timestamps.

**Current State**:
- Session meta fields: id, timestamp, cwd, originator, source, agent_nickname, agent_role, model_provider
- Missing: task_id, issue_number, parent_session_id
- User messages sometimes contain task references (e.g., "NOA-24") but not consistently

**Impact**:
- Cannot build session-to-task analytics
- Cannot measure task completion time across multiple sessions
- Cannot identify which sessions contributed to which task outcome

**Expected Impact**: Medium. Blocks all session-level analytics.

**Proposed Fix**:
- Add `task_id` and `issue_number` to session metadata at spawn time
- Include `parent_session_id` for subagent sessions
- Create session-task mapping table for analytics

---

## Candidate 57: Explorer Subagents Receive No Exploration Scope or Boundaries

**Observation**: All 108 explorer subagent sessions receive the same generic Codex instructions. The task prompt varies but there's no standardized exploration scope, time limit, or output format.

**Current State**:
- Explorer subagents: generic "explore the codebase" tasks
- No time limit or depth constraint
- No standardized output format for exploration results
- No scope definition (what NOT to explore)

**Impact**:
- Explorers may go too deep or too shallow
- Inconsistent exploration quality
- No way to compare explorer effectiveness
- Token waste on irrelevant exploration paths

**Expected Impact**: Medium. Improves exploration efficiency and consistency.

**Proposed Fix**:
- Define explorer scope template: {target, depth_limit, time_budget, output_format}
- Include in subagent spawn context
- Standardize explorer output: {files_examined, findings, recommendations}
- Add depth limit to prevent infinite exploration

---

## Candidate 58: No Agent Instruction Hot-Reload Detection

**Observation**: When AGENTS.md files are modified, running sessions don't pick up the changes. The instructions are injected at session start and never refreshed.

**Current State**:
- Instructions injected once at session spawn
- No mechanism to detect instruction changes mid-session
- No version hash of instructions in session metadata
- Cannot tell which instruction version a session used

**Impact**:
- Sessions may run on stale instructions after improvements
- Cannot correlate instruction changes to behavior changes
- No A/B testing capability

**Expected Impact**: Medium. Important for optimization iteration speed.

**Proposed Fix**:
- Add instruction version hash to session metadata
- Detect instruction file changes and flag affected sessions
- Consider hot-reload for long-running sessions
- Version-tag all sessions for eval reproducibility

---

## Summary Table

| Candidate | Area | Effort | Impact | Priority |
|-----------|------|--------|--------|----------|
| 51: Subagents lack Paperclip instructions | Architecture | Medium | Critical | P0 |
| 52: 14% sessions hit rate limits | Operations | Medium | High | P0 |
| 53: Subagent CWD inconsistency | Quality | Low | Medium | P1 |
| 54: No subagent result validation | Quality | Medium | Medium | P1 |
| 55: Nickname collision | Debuggability | Low | Low | P2 |
| 56: No session-to-task correlation | Analytics | Medium | Medium | P1 |
| 57: No exploration scope | Quality | Low | Medium | P1 |
| 58: No instruction hot-reload | Operations | Medium | Medium | P1 |
