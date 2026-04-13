# `.noah-pi-runtime/prompts/`

Dev-facing reusable prompt templates for Pi agents.

**Product prompts (Noah-RN nurse-facing) live in `packages/workflows/prompts/`.**

This directory is for prompts that help the developer persona —
code generation tasks, architecture queries, delegation to specialized agents.

## History

- Product prompts (shift-handoff, new-admission, rapid-assessment) moved to
  `packages/workflows/prompts/` on 2026-04-13 during namespace separation.
- `codex-task-shift-report-worker.md` retired — task was completed
  (`services/clinical-mcp/src/worker/shift-report-worker.ts` exists).
- `ui-design-pi-minimalism.md` promoted to a proper dev skill at
  `.noah-pi-runtime/skills/ui-generation/SKILL.md`.
