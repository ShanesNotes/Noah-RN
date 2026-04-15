# `.noah-pi-runtime/skills/` Migration Map

## Status: Consolidated (2026-04-13)

Clinical skills previously promoted to `.noah-pi-runtime/skills/` have been consolidated
back to `packages/workflows/`. The `dependencies.yaml` manifests created
during promotion were preserved and moved alongside each skill contract.

**`.noah-pi-runtime/skills/` is now reserved for dev-facing Pi agent skills.**

See `SELECTION-BRIDGE.md` for the namespace boundary.
