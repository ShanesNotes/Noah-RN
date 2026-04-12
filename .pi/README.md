# Noah RN `.pi/` Scaffold

This directory is the future project-level pi.dev configuration surface.

It is a bridge/shadow surface for the agent harness subproject, not the current harness source of truth.

It is being introduced as a **non-functional scaffold** so the restructured repo has an obvious home for:
- project-level pi settings
- system prompt and context stacking
- extensions
- skill discovery
- workflow prompt templates

Current scaffold contents now include:
- `.pi/AGENTS.md`
- `.pi/SYSTEM.md`
- migration maps
- extension stubs
- prompt-template stubs

Current intent:
- keep runtime behavior unchanged
- avoid implementing pi.dev integration code yet
- give future agents a canonical place to continue the harness build

## Relationship to `packages/agent-harness/`

Current rule:
- `packages/agent-harness/` is authoritative now
- `.pi/` is the project-level bridge/shadow for future pi-native runtime work
- if a change is about current routing truth, start in `packages/agent-harness/`
- if a change is about future pi-facing shape or bridge wiring, start here only after reading the authoritative harness docs

Why `.pi/` is still at repo root:
- it is a project-level runtime/scaffold exception
- its placement reflects future runtime shape, not current authority

Reference basis:
- `.omc/research/pidev-harness-skeleton.md`
- `packages/agent-harness/`
- `packages/workflows/`
