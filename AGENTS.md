# Noah RN Project Overrides

This file adds project-local guidance for Pi while working in the Noah RN repository.
It does not replace the root control plane (`README.md`, `PLAN.md`, `TASKS.md`).

## Delegation override for this repo

When work in this repository is substantial enough to delegate:
- prefer `headless_subagent` over pane-based `subagent` / cmux / tmux / zellij workflows
- do not rely on terminal multiplexer pane spawning as the primary delegation path
- keep delegation developer-only unless a runtime need is explicitly being worked on

## Delegation threshold

Use direct tools for quick, obvious, local changes.
Use `headless_subagent` when isolated context would help with:
- multi-step investigation
- bounded implementation work
- focused review
- keeping the main thread clean

## Noah-specific boundary

This headless delegation pattern is for **building Noah RN**.
It is not, by itself, a `.noah-pi-runtime/` product/runtime feature.

## Skill preference

When relevant, load and follow:
- `.agents/skills/noah-dev-headless-delegation/SKILL.md`
