# `noah-router` Extension TODO

This is a planning stub for the future pi-native routing extension.

## Source-of-truth today

- `packages/agent-harness/router/clinical-router.md`
- `.pi/AGENTS.md`
- `.pi/SYSTEM.md`

## First implementation goals

1. expose the router as a pi-native extension surface
2. use workflow metadata from `packages/workflows/`
3. preserve the current deterministic-first routing posture
4. keep Shift Report as the first end-to-end migration target

## Non-goals

- do not rewrite routing policy here yet
- do not duplicate the full router contract into extension code before the runtime layer is intentionally started
