# `noah-router` Extension TODO

Repo note: this extension lives at `.noah-pi-runtime/extensions/noah-router/` and mounts as `/runtime/.pi/extensions/noah-router/`.

This is a planning stub for the future pi-native routing extension.

## Source-of-truth today

- `packages/agent-harness/router/clinical-router.md`
- `.pi/AGENTS.md` (repo path: `.noah-pi-runtime/AGENTS.md`)
- `.pi/SYSTEM.md` (repo path: `.noah-pi-runtime/SYSTEM.md`)

## First implementation goals

1. expose the router as a pi-native extension surface
2. use workflow metadata from `packages/workflows/`
3. preserve the current deterministic-first routing posture
4. keep Shift Report as the first end-to-end migration target

## Non-goals

- do not rewrite routing policy here yet
- do not duplicate the full router contract into extension code before the runtime layer is intentionally started
