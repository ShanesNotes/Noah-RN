> **Superseded:** This prompt is retained for historical context only. The active source of truth is now `optimization/company/FRACTAL-ARCHITECTURE-MEMO.md`, `optimization/company/ROLE-SPECS.md`, `docs/OPERATING-MODEL.md`, and `optimization/company/PAPERCLIP-CHANGE-LIST.md`.

You are in a fresh OMC context rooted at `/home/ark/noah-rn`.

## Mission

Refactor the Noah RN Paperclip company into a fractal OMC/OMX architecture:
- **Layer 1 (Company)**: Paperclip's org chart, delegation paths, and staged execution mirror OMC's team orchestration model (team-plan → team-prd → team-exec → team-verify → team-fix).
- **Layer 2 (Agent)**: Each Claude-backed Paperclip agent runs with OMC as its execution runtime. Each Codex-backed agent runs with OMX. Agents inherit OMC/OMX skills, delegation patterns, and verification protocols natively.

This is NOT "replace Paperclip." It is "Paperclip governs, OMC/OMX executes."

## Target Split

| Layer | Owns | Examples |
|-------|------|----------|
| **Paperclip** | Org chart, hiring, goals, budgets, governance, heartbeats, auditability, task control plane | Company scoping, single-assignee tasks, approval gates, budget hard-stops, activity logging |
| **OMC** | Claude Code dev tooling, team orchestration, skills, child-agent delegation, per-workspace runtime/state | `autopilot:`, `ralph:`, `ulw`, `/team N:role`, `omc team N:codex`, `ralplan`, `deep-interview`, `/ccg`, 19 specialized agents |
| **OMX** | Codex CLI workflow layer, team orchestration, skills, child-agent delegation, per-workspace runtime/state | `omx` CLI, `$autopilot`, `$ralph`, `$team`, `$ralplan`, `$deep-interview`, explore, planner, architect, debugger, executor, verifier |

## Required Reading (in order)

Read these BEFORE planning any changes:

**Current company state:**
1. `/home/ark/noah-rn/optimization/company/CEO-OUTCOME-SPEC-REFACTOR-PROMPT.md`
2. `/home/ark/noah-rn/optimization/company/ROLE-SPECS.md`
3. `/home/ark/noah-rn/optimization/company/proposer-prompt.md`
4. `/home/ark/noah-rn/optimization/company/candidates/candidate-38/RATIONALE.md` — Codex base instruction conflicts, agent identity loss
5. `/home/ark/noah-rn/optimization/company/candidates/candidate-51/RATIONALE.md` — Subagent instruction gaps, CWD issues, memory fragmentation

**Product and architecture:**
6. `/home/ark/noah-rn/docs/NORTH-STAR.md`
7. `/home/ark/noah-rn/docs/ARCHITECTURE.md`
8. `/home/ark/noah-rn/docs/OPERATING-MODEL.md`

**OMC internals (local plugin cache — do NOT fetch from GitHub):**
9. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/CLAUDE.md`
10. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/docs/ARCHITECTURE.md`
11. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/docs/AGENTS.md`
12. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/docs/shared/mode-hierarchy.md`
13. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/docs/shared/agent-tiers.md`
14. `~/.claude/plugins/cache/omc/oh-my-claudecode/4.10.1/skills/team/SKILL.md`

**OMX internals (upstream — local plugin cache only has the Claude Code bridge, not the full OMX runtime):**
15. `https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md` — Full OMX CLI, flags (`--madmax --high`), skill invocation (`$ralph`, `$team`, etc.)
16. `https://github.com/Yeachan-Heo/oh-my-codex/blob/main/AGENTS.md` — OMX agent roles (explore, planner, architect, debugger, executor, verifier), delegation model, workflow skills

**OMX Claude Code bridge (local plugin cache — this is just the thin forwarder, not the full OMX runtime):**
17. `~/.claude/plugins/cache/openai-codex/codex/1.0.0/agents/codex-rescue.md`
18. `~/.claude/plugins/cache/openai-codex/codex/1.0.0/skills/codex-cli-runtime/SKILL.md`

**Upstream Paperclip (if needed for control-plane internals):**
19. `https://github.com/paperclipai/paperclip/blob/master/README.md`
20. `https://github.com/paperclipai/paperclip/blob/master/AGENTS.md`

## Phase 0: Audit Current State

**Prerequisites** — verify before proceeding:
- OMC is installed as a Claude Code plugin (check `~/.claude/settings.json` for `omc` entry). Since `claude_local` runs the real `claude` CLI, OMC is automatically available to all Claude-based Paperclip agents.
- OMX is installed globally (`which omx` or `npm list -g oh-my-codex`). If not, install it — the Principal Architect's `codex_local` adapter needs it on PATH.

Before changing anything, produce a state-of-the-world snapshot:

1. **Enumerate all 10 live agents** at `~/.paperclip/instances/default/companies/cc420500-bbb4-4390-aaac-45faeffe65bc/agents/`. For each: read SOUL.md, AGENTS.md, HEARTBEAT.md (if present). Map agent ID → codename → role → model/provider.

2. **Enumerate all skills** symlinked in `/home/ark/noah-rn/.agents/skills/`. For each: identify whether it overlaps with an OMC skill, an OMX skill, or is Noah-RN-specific.

3. **Read the current project CLAUDE.md** at `/home/ark/noah-rn/.claude/CLAUDE.md`. Identify every stale skill reference (e.g., `superpowers:*`, `code-review:code-review`, `dispatch`) and map each to its OMC/OMX equivalent or mark for deletion.

4. **Read settings.json** at `/home/ark/noah-rn/.claude/settings.json`. The 4 Noah RN safety hooks are permanent and must coexist with OMC's hook system.

5. **Audit each agent's `desiredSkills`** in their Paperclip adapter config (via `npm exec paperclipai -- agent get <agent-id>` or reading the database). Known Paperclip-era skills to prune (OMC replaces them): `obra/superpowers/*`, `garrytan/gstack/qa`, `garrytan/gstack/review`, `vercel-labs/agent-skills/*`. Keep only: `paperclipai/paperclip/paperclip` (API access), `paperclipai/paperclip/paperclip-create-agent` (if CEO needs hiring).

Output this audit as a table before proceeding.

## Design Direction

### Org Simplification: 10 agents → 3

The previous org chart (CEO, CTO, Chief of Research, Head of Delivery, Founding Engineer, Engineers, Scout, QA, Gem, Anvil) is overbuilt. Prune to a minimal trio. **Delete all agents not listed below.** Previous architectural decisions, role specs, and reporting lines are superseded by this section.

#### The Roster

| Role | Model/Provider | Runtime | Owns |
|------|---------------|---------|------|
| **CEO / Product Owner** | Claude Opus (raw — no OMC plugin overhead) | Paperclip native | Vision, priorities, task decomposition, delegation, final verification, company governance. The only agent that talks to Shane. |
| **Founding Engineer** | Claude Opus | OMC (`claude_local`) | All Claude-side engineering: features, refactors, debugging, testing, review, research, architecture. Owns the codebase. |
| **Principal Architect** | Codex (GPT-5.4) via `omx` CLI | OMX (`codex_local`) | Architecture review, CI/CD, evals, bulk refactors, second-opinion on design, implementation when Codex is the better tool. Owns structural integrity. |

The CEO does NOT run OMC — it runs as a raw Claude Opus Paperclip agent with clear delegation instructions. The engineers ARE the OMC/OMX runtime. This keeps the CEO lightweight and the execution layers rich.

#### Runtime Setup (how OMC/OMX reach agents)

Paperclip adapters run the real CLI tools:
- **`claude_local`** runs the actual `claude` CLI → global `~/.claude/settings.json` plugins (including OMC) ARE inherited automatically. OMC hooks, skills, and agents are available to every Claude-based Paperclip agent.
- **`codex_local`** runs the actual `codex` CLI → Paperclip injects desired skills into `.agents/skills/` in the workspace. `omx` CLI is available if globally installed (`npm i -g oh-my-codex`).
- **Paperclip skills API** currently serves 3 skills: `paperclip`, `para-memory-files`, `paperclip-create-agent`. All other skills in `desiredSkills` lists are Paperclip-era or third-party skills that may overlap with OMC/OMX.
- **Adapter config** supports `extraArgs` (for passing additional CLI flags) and `env` (for environment variables).

**Implication**: OMC is already available to Claude agents. The refactor's main work is:
1. Rewriting agent instructions to USE OMC/OMX modes explicitly
2. Pruning `desiredSkills` lists — remove Paperclip-era skills that OMC replaces (e.g., `obra/superpowers/*`, `garrytan/gstack/*`)
3. Keeping only Paperclip-specific skills (`paperclip`, `paperclip-create-agent`) that provide API access
4. Verifying `omx` is globally installed for the Principal Architect's `codex_local` adapter
5. Post-refactor: configure surviving agents in Paperclip UI with updated skill lists

#### CEO Delegation Protocol

The CEO's primary job is decomposing work and routing it to the right engineer with the right OMC/OMX mode. The CEO must include these instructions in its AGENTS.md:

**For the Founding Engineer**, delegate using OMC orchestration modes (keywords or slash commands):
- **Small bounded task** → `ralph: <task>` (persistence loop with verify/fix until done; includes ultrawork parallelism)
- **Multi-file feature or refactor** → `autopilot: <task>` (full lifecycle: plan → implement → QA → verify)
- **Parallel independent subtasks** → `ulw <task>` (maximum parallelism, non-team)
- **Coordinated multi-agent work** → `/team N:executor "<task>"` (Claude-backed agents, staged: plan → prd → exec → verify → fix)
- **Need Codex/Gemini CLI workers** → `omc team N:codex "<task>"` or `omc team N:gemini "<task>"` (tmux-backed real processes)
- **Planning/design before execution** → `ralplan <task>` (iterative planning consensus)
- **Unclear requirements** → `deep-interview "<task>"` (Socratic clarification before execution)
- **Deep investigation** → `/deep-dive` or `/trace`
- **Tri-model synthesis** → `/ccg <task>` (asks Codex + Gemini, Claude synthesizes)

**For the Principal Architect**, delegate using OMX orchestration modes (invoked via `omx` CLI, NOT the `codex-rescue` bridge):
- **Unclear scope** → instruct the engineer to use `$deep-interview` (clarify intent and boundaries first)
- **Planning/design before execution** → instruct the engineer to use `$ralplan` (consensus on architecture and tradeoffs)
- **Small bounded task** → instruct the engineer to use `$ralph` (persistent completion loop until done)
- **Multi-file feature or refactor** → instruct the engineer to use `$autopilot` (full lifecycle)
- **Parallel independent subtasks** → instruct the engineer to use `$team N:role` (coordinated parallel execution, requires tmux)
- **Code review or second pass** → route via `codex-rescue` bridge from Claude Code side, or `omx explore` for read-only analysis

The CEO should:
- Never do implementation work directly
- Always specify: task scope, target files, expected deliverable, verification method
- Verify engineer output before marking tasks complete
- Escalate to Shane when blocked or when a decision exceeds its mandate

### Fractal Runtime Model

**At the company level**, the CEO decomposes and delegates. No team stages at this layer — just direct CEO → Engineer routing with mode selection.

**At the engineer level**, each engineer's internal execution uses OMC/OMX natively:
- The Founding Engineer spawns OMC subagents (explore, executor, verifier, architect, etc.) via whichever mode the CEO specified
- The Principal Architect runs `omx` CLI natively with `$ralph`, `$team`, `$autopilot`, etc. — same skill vocabulary as OMC but on the Codex runtime
- Both engineers inherit: Paperclip company context + Noah RN project context + their runtime rules

### Delegation Contract

Every task the CEO assigns must include:
```
task_id:          Paperclip task ID
engineer:         Founding Engineer (OMC) | Principal Architect (OMX)
mode:             OMC: autopilot:, ralph:, ulw, /team N:role, omc team N:codex, ralplan, deep-interview, /ccg | OMX: $autopilot, $ralph, $team N:role, $ralplan, $deep-interview
cwd:              /home/ark/noah-rn (always explicit, never assumed)
scope:            Exact files/directories the engineer may modify
deliverable:      What the engineer must produce
verification:     How completion is verified (test command, build, manual check)
escalation:       Escalate to CEO if blocked; CEO escalates to Shane
```

## P0 Problems to Solve

1. **Too many agents** — 10 agents with overlapping roles, fragmented memory, inconsistent instructions. Fix by pruning to 3 and making each one count.
2. **Subagents lose company/project instructions** — Candidates 51, 54, 57 document this. Fix by ensuring each engineer's runtime (OMC/OMX) inherits Paperclip identity + project CLAUDE.md.
3. **Stale skill references everywhere** — CLAUDE.md Harness Integration table, agent AGENTS.md files, and `.agents/skills/` all reference Paperclip-era skills that OMC replaces. Audit and consolidate.
4. **No execution-substrate split** — Docs define roles but not which runtime each role uses. Fix by making the roster table above canonical.
5. **Agent instructions are bloated** — SOUL.md files contain generic LLM coaching. Distill to: identity, constraints, runtime reference, delegation contract, escalation path.

## Non-Negotiables

- Preserve Paperclip control-plane invariants: company scoping, single-assignee task model, approval gates, budget hard-stops, activity logging
- Preserve Noah RN product invariants: no PHI, deterministic safety floor, four-layer output, provenance/confidence boundaries, 5 Tier 1 safety hooks
- Noah RN safety hooks (sanitize-input, validate-calculator, validate-dosage, validate-units, validate-negation) coexist with OMC hooks — do not remove or modify them
- Prefer deletion over addition
- No new dependencies without clear justification
- Keep diffs small, reviewable, and reversible

## What Must Change

### 1. Skill Consolidation
Keep the core Paperclip skills that ship with the default runtime (`paperclip`, `paperclip-create-agent`, `para-memory-files`). Remove user-added skills from `.agents/skills/` and `desiredSkills` that OMC/OMX fulfill better:

**Remove (OMC replaces):**
- `obra/superpowers/*` (executing-plans, subagent-driven-development, using-superpowers, etc.) → OMC `autopilot`, `ralph`, `team`, `ultrawork`
- `garrytan/gstack/qa` → OMC `verifier` agent
- `garrytan/gstack/review` → OMC `code-reviewer` agent
- `vercel-labs/agent-skills/*` → not Noah-RN-relevant
- Any other third-party skills added during experimentation

**Keep:**
- `paperclipai/paperclip/paperclip` — Paperclip API access (heartbeat, tasks, governance)
- `paperclipai/paperclip/paperclip-create-agent` — CEO hiring capability
- `para-memory-files` — memory system (evaluate if OMC `project-memory` replaces this)
- Noah-RN clinical domain skills in `plugin/skills/` — these are product skills, not tooling skills

### 2. CLAUDE.md Update
Update `/home/ark/noah-rn/.claude/CLAUDE.md` — keep the structure, fix the stale references:
- **Keep the Harness Integration table** — it drives Paperclip heartbeat mechanics and agent communication scaffolding. Update the skill names in the table to OMC/OMX equivalents where stale (e.g., `superpowers:brainstorming` → OMC equivalent, `code-review:code-review` → OMC `code-reviewer` agent)
- Replace stale skill references (`superpowers:*`, `code-review:*`, `dispatch`) with their OMC/OMX equivalents throughout
- Keep: Identity, Hard Constraints, Git Workflow, Session Rules, Tool Conventions, Architecture summary, Harness Integration table
- Add a brief note identifying the three-agent roster and their runtimes

### 3. Agent Pruning (do this BEFORE rewriting instructions)
Delete all agents except the 3 in the roster. Document what was removed and why. This takes 10 agents down to 3.

### 4. Instruction Rewrites (only for the 3 surviving agents)
Write new `SOUL.md` and `AGENTS.md` for each:

**CEO / Product Owner** — SOUL.md: identity, Noah RN mission, constraints, "charge nurse voice" principle. AGENTS.md: delegation protocol (the full mode-selection table from Design Direction above), delegation contract schema, escalation rules, verification expectations. No OMC/OMX runtime references — the CEO delegates to engineers who use those runtimes.

**Founding Engineer** — SOUL.md: identity as the Claude-side execution engine and codebase owner, Noah RN project constraints. AGENTS.md: declares OMC as runtime, lists invocation syntax for each mode (`autopilot:`, `ralph:`, `ulw`, `/team N:role`, `omc team N:codex`, `ralplan`, `deep-interview`, `/ccg`), lists available OMC agents (explore, analyst, planner, architect, executor, debugger, verifier, test-engineer, code-reviewer, security-reviewer, designer, writer), escalation to CEO.

**Principal Architect** — SOUL.md: identity as the Codex-side architect and structural integrity owner, Noah RN project constraints. AGENTS.md: declares OMX as runtime (invoked via `omx` CLI, launched with `omx --madmax --high`), lists available OMX skills (`$autopilot`, `$ralph`, `$team`, `$ralplan`, `$deep-interview`), lists available OMX agents (explore, planner, architect, debugger, executor, verifier), notes `codex-rescue` bridge for Claude Code → Codex handoffs, escalation to CEO.

### 5. ROLE-SPECS.md Rewrite
Replace the current multi-section role specs with the 3-agent roster. Each entry needs: `model/provider`, `runtime`, `mandate`, `delegation_mechanism`, `escalation_path`. Delete all references to CTO, Chief of Research, Head of Delivery, and virtual lanes.

### 6. Operating Model Rewrite
Replace `/home/ark/noah-rn/docs/OPERATING-MODEL.md` to reflect the simplified three-layer architecture:
- **Paperclip** (governance): CEO / Product Owner + task control plane + company scoping
- **OMC/OMX** (execution): Founding Engineer (OMC) + Principal Architect (OMX)
- **Tools** (deterministic): Shell-based calculators, lookups, validators
Delete all references to the old executive spine, functional lanes, and routing rules.

### 7. Proposer Prompt Update
Update `/home/ark/noah-rn/optimization/company/proposer-prompt.md` to evaluate candidates against the 3-agent model with OMC/OMX runtimes.

## Deliverables

1. **Phase 0 audit table** — All 10 current agents, all skills, all stale references mapped
2. **Architecture memo** — Short doc: Paperclip (governance) / OMC+OMX (execution) / Tools (deterministic), fractal model
3. **Agent pruning** — Delete 7 agents, keep only CEO / Product Owner + Founding Engineer + Principal Architect. Document what was removed and why.
4. **New agent instructions** — Fresh SOUL.md + AGENTS.md for each surviving agent (3 total)
5. **CEO delegation protocol** — The mode-selection table and contract schema baked into CEO / Product Owner's AGENTS.md
6. **Updated CLAUDE.md** — Distilled, OMC-native project directives, no stale skill references
7. **Updated ROLE-SPECS.md** — Rewritten for 3 agent roster with runtime and delegation fields
8. **Updated OPERATING-MODEL.md** — Simplified three-layer architecture, no old executive spine
9. **Skill consolidation** — Stale Paperclip skills removed from `.agents/skills/`, OMC mappings documented
10. **`desiredSkills` cleanup** — Updated per-agent skill lists: remove Paperclip-era skills replaced by OMC/OMX, keep only Noah-RN-specific skills (e.g., `paperclipai/paperclip/paperclip` for API access)
11. **Paperclip-side change list** — Exact commands/changes needed at `~/.paperclip/` to delete pruned agents and update adapter configs
12. **Post-refactor Paperclip UI setup checklist** — Step-by-step instructions for configuring each surviving agent's runtime in the Paperclip UI: which plugins/skills to add, which to remove, adapter type confirmation
13. **Verification evidence** — lint, typecheck, tests, build, or explicit gaps listed

## Execution Expectations

- Use OMC's own orchestration (`/team` or `/ralplan`) for this refactor — do not invent a custom workflow
- Phase 0 (audit) is prerequisite to all changes — do not skip it
- Finish each file completely before moving to the next
- Verify before claiming completion
- Final report: changed files, simplifications made, remaining risks, manual Paperclip-side follow-up
