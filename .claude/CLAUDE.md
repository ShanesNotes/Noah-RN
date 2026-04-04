# Noah RN — Project Directives

## Identity

Noah RN is an outcome-spec clinical workspace harness — a Claude Code plugin + companion project.
Resolves nursing workspace problems by assembling context, tools, knowledge, and guardrails.
Complements ambient documentation platforms (ChartWell AI's lane), doesn't compete.
See `docs/NORTH-STAR.md` for canonical product framing.

Paperclip runtime note:
- **CEO / Product Owner** = Paperclip native governance lane
- **Founding Engineer** = Claude-side OMC execution lane
- **Principal Architect** = Codex-side OMX execution lane

## Hard Constraints

- FHIR integration via synthetic data on tower (10.0.0.184:8080) — no production EHR, no PHI, Synthea-only. See `docs/FHIR-INTEGRATION.md`.
- No PHI handling, storage, or logging. Nurse provides context, Noah provides structure.
- No web UI. This is a CLI plugin.
- No dependencies without Shane's approval.
- No medical device claims. This is a clinical knowledge tool.
- Deterministic before generative: if it can be computed (scores, interactions, conversions), use a tool — don't ask an LLM to do math.

## Phase Plan & Tracking

See `docs/ARCHITECTURE.md` for phase plan. Track progress in project management tools, not here.

## Commands

```bash
# Validate plugin structure
claude plugin validate ./plugin

# Run drug lookup tool
REPO_ROOT=$(git rev-parse --show-toplevel) && bash "$REPO_ROOT/tools/drug-lookup/lookup.sh" <drug_name>

# Run tool tests (requires network for API tests)
bash tests/drug-lookup/test_lookup.sh
```

## Git Workflow (Company Policy)

All code changes MUST go through pull requests. Direct pushes to `main` are prohibited.

1. **Branch**: Create a feature branch from `main`. Name it `<agent>/<short-description>` (e.g., `wiz/vitals-chart`, `architect/runtime-audit`).
2. **Commit**: Commit on your feature branch. Include `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.
3. **Push**: Push your feature branch and open a pull request against `main`.
4. **Review**: PRs require review before merge. Do not self-merge.
5. **Never push directly to main.** No exceptions.

## Session Rules

- One phase at a time. One runtime mode at a time. Finish completely before moving on.
- Read `docs/ARCHITECTURE.md` before building any skill or starting a new phase.
- Test every skill against realistic clinical scenarios. Bar: "Would a 13-year ICU nurse actually use this output?"
- Skills produce copy-paste-ready text, not conversational responses.
- Every skill includes a clinical safety disclaimer.
- Fail loudly. No silent bad data from tools.
- **Charge nurse voice.** Noah is the experienced colleague, not a textbook. Practical ranges over rigid cutoffs. Context caveats inline. "Per facility protocol" is a valid answer. Accurate and up-to-date, but presented with bedside nuance. Include "why we care" one-liners where they add clinical meaning. See ARCHITECTURE.md principle #6.
- **Three tiers of confidence.** Tier 1: national guidelines presented exactly. Tier 2: bedside suggestions labeled as such. Tier 3: facility-specific rules require local config — Noah doesn't guess policy. See ARCHITECTURE.md principle #7.
- Noah RN's repo-local safety hooks (`sanitize-input`, `validate-calculator`, `validate-dosage`, `validate-units`, `validate-negation`) are permanent. They must coexist with OMC hooks; they are not replaced by them.

## Harness Integration

| Workflow | Skill / mode | When |
|----------|--------------|------|
| Session start | `claude-mem:mem-search` | Recall prior session context |
| Work routing | `deep-interview` / `$deep-interview` | Clarify ambiguous requests before execution |
| Planning | `ralplan` / `$ralplan` | Multi-step work and design decisions |
| Small bounded execution | `ralph:` / `$ralph` | Persist until the scoped task is verified complete |
| Multi-file feature or refactor | `autopilot:` / `$autopilot` | Full lifecycle execution |
| Parallel coordination | `/team N:role`, `omc team N:codex`, `$team N:role` | Split independent or staged work across workers |
| TDD / regression discipline | `test-engineer`, `verifier`, test-first within `ralph:` / `autopilot:` | Every skill, hook, and tool change |
| Skill authoring | `plugin-dev:skill-development` | Writing clinical skills |
| Command authoring | `plugin-dev:command-development` | Writing slash commands |
| Agent authoring | `plugin-dev:agent-development` | Writing clinical agents |
| API docs | `context7` | Before integrating any external API |
| Review | `code-reviewer`, `security-reviewer`, OMX verifier | Before phase completion |
| Completion | `ralph:` / `$ralph` verification protocol | Before claiming done |
| Durable knowledge | `obsidian` | Clinical decisions → Eve vault |

## Tool Conventions

- Tools live in `tools/<name>/` with bash implementations
- Exit codes: 0=success, 1=input/no-match error, 2=API/system error
- Paths resolve via `git rev-parse --show-toplevel`, not relative paths
- Tests live in `tests/<tool-name>/test_<name>.sh`
- Knowledge files in `knowledge/` are curated clinical content — edit with care

## Architecture (summary)

Outcome-spec workspace harness. Workspace agent (`plugin/agents/workspace.md`)
resolves clinical problems by composing tools, knowledge, and capability contracts.
Skills define output standards (contracts), not step-by-step procedures.
Shared contracts in `plugin/skills/_shared/`. Policy overlays in `harness/policy/`.
Full structure and specs in `docs/ARCHITECTURE.md`.

## What Shane Brings

14yr licensed RN, 13yr critical care at Level 1 trauma center (Grand Rapids, MI).
Deep ICU, ventilator management, hemodynamic monitoring, code/rapid response, complex drips.
Self-taught engineer. First-principles thinker. Subtractive bias. No tolerance for slop.
