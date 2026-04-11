# Noah RN — Project Directives

## Identity

- Noah RN is an agent-native clinical workspace harness with an emphasis on context architecture
- Decomposed clinical workflows captured in skills.md and tools.md optimized for specification precision 
- Multi-agent orchestration integrated inside of an electronic health record for maximal patient context awareness


## Wiki — Claude's Working Memory

Noah RN has a project-local LLM wiki at `wiki/` (gitignored) following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It is Claude's synthesis layer — persistent working memory that compounds across sessions. Shane reads; Claude writes.

**Session start protocol** (before any ingest/query/work):
1. Read `wiki/WIKI-SCHEMA.md` — conventions, workflows, hard rules (THE source of truth for how to use the wiki)
2. Read `wiki/index.md` — content catalog
3. Read tail of `wiki/log.md` — recent activity: `grep "^## \[" wiki/log.md | tail -5`

**Core workflow:** Raw source arrives → Claude ingests (reads raw transcript from `~/university/` or `research/`, never a Paperclip summary) → creates/updates source + concept + entity + question pages → updates `index.md` + `log.md`. One source typically touches 5-15 pages. Over time, stable concepts get promoted into `docs/PHASED-ROADMAP.md` / `docs/TASKS.md`.

**Standing directive (2026-04-08):** When reviewing YouTube research, read the RAW transcript from `~/university/<channel>/<slug>/transcript.md`, NOT the Paperclip-generated report. Translate out-of-domain references (e.g. "CRM") to clinical / medical AI context.

See `wiki/WIKI-SCHEMA.md` for page types, templates, hard rules, and the full Ingest / Query / Lint / Promote workflows.


## Harness Integration

| Workflow | Skill | When |
|----------|-------|------|
| Session start | `claude-mem:mem-search` | Recall prior session context |
| Skill authoring | `plugin-dev:skill-development` | Writing clinical skills |
| Command authoring | `plugin-dev:command-development` | Writing slash commands |
| Agent authoring | `plugin-dev:agent-development` | Writing clinical agents |
| API docs | `context7` | Before integrating any external API |
| Durable knowledge | `obsidian` | Clinical decisions → Eve vault |
| Skill optimization | `optimize-skill` | Auditing and improving skill prompt quality |

## Tool Conventions

- Tools live in `tools/<name>/` with bash implementations
- Exit codes: 0=success, 1=input/no-match error, 2=API/system error
- Paths resolve via `git rev-parse --show-toplevel`, not relative paths
- Tests live in `tests/<tool-name>/test_<name>.sh`


## What Shane Brings

Tenured licensed critical care RN 

Self-taught engineer. First-principles thinker. Minimalist bias.
