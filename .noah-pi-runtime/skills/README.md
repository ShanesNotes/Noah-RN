# `.noah-pi-runtime/skills/`

Dev-facing Pi agent skills live here — tools that help build Noah-RN.

**Clinical skills (Noah-RN product) live in `packages/workflows/`.**

This directory is for skills that assist the developer persona:
scaffolding, evals, deployment, code generation, architecture tasks.

## Why the separation

Pi agents discover skills from `.noah-pi-runtime/skills/`. If clinical product skills
live here, the dev harness routes developer questions through clinical
workflows. The product has its own discovery path via
`packages/workflows/registry.json`.

## History

Clinical skills were promoted here (2026-04-12 through 2026-04-13) then
consolidated back to `packages/workflows/` (2026-04-13) when the namespace
collision became clear. `dependencies.yaml` files were preserved and moved
to their respective `packages/workflows/*/` directories.
