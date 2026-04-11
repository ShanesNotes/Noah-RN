# Noah RN — Local Grounding Boundary

This note documents the target homes and handling rules for local/private/generated surfaces that should not compete with deliverable repo topology.

## Goal

Keep deliverable surfaces legible for coding agents while preserving high-value local grounding material for research and architecture work.

## Target Homes

| Current surface | Target home | Handling now |
|---|---|---|
| `wiki/` | `local/grounding/wiki/` | keep in place for now; move only with link/path audit |
| `research/` | `local/grounding/research/` | keep in place for now; treat as source corpus |
| `notes/` | `local/grounding/notes/` | keep in place for now |
| `docs/local/` | `local/grounding/docs-local/` | keep in place for now |
| `graphify-out/` | `local/graphify/` | keep local-only; move only when Graphify defaults are updated cleanly |
| `.obsidian/` | runtime/local exception | keep in place unless wiki/link audit says otherwise |
| `.omx/` | runtime exception | keep in place |
| `.omc/` | runtime exception | keep in place |
| `plugin/` leftovers | ignored local-only remnant | keep ignored; do not treat as active topology |

## Move Policy

1. Document target homes before moving local grounding surfaces.
2. Do not move `wiki/`, `research/`, or `.obsidian/` independently of one another if links or vault behavior would break.
3. Keep generated artifacts local-only and ignored throughout the restructure.
4. Preserve OMX/OMC runtime state at root until tooling explicitly supports relocation.

## Verification

Use these checks when touching local/private/generated boundaries:

```bash
git check-ignore -v local/** wiki/** research/** notes/** graphify-out/** .obsidian/** .omx/** .omc/** plugin/**
find . -maxdepth 1 -mindepth 1 | sort
```
