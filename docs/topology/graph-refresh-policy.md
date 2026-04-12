# Noah RN Graph Refresh Policy

This document defines how Graphify should be used in `noah-rn` as the project evolves.

## Purpose

The canonical graph artifact for this repo is the **single full-project graph**.

Current canonical output:
- `graphify-out/`

That canonical graph should represent the repo as a whole when refreshed meaningfully. Subproject graphs are still allowed, but they are optional working artifacts for focused exploration. They are not the primary graph surface future agents should assume first.

## Why

`noah-rn` spans multiple tightly related workspace centers:
- `services/clinical-mcp/`
- `services/sim-harness/`
- `packages/agent-harness/`
- `packages/workflows/`
- `clinical-resources/`
- `packages/memory/`
- `evals/`

Important architectural questions often cross those boundaries. A single full-project graph is therefore more useful than a collection of isolated local graphs.

## Policy

### Canonical target

- Refresh toward `graphify-out/`
- Treat it as the main graph artifact for repo-wide navigation, architecture tracing, and agent onboarding

### Subproject graphs

Use subproject graphs only when:
- a local lane needs faster iteration
- a folder is being explored in isolation
- a temporary graph is helpful before the next full-project refresh

Do not treat a subproject graph as the lasting source of truth if it diverges from the canonical full-project graph.

## Refresh cadence

Refresh the canonical full-project graph:
- after meaningful architecture changes
- after structural repo changes
- after major doc or contract changes
- before broad architecture review
- before onboarding another agent to repo-wide work

Do not try to refresh it on every small edit.

## Automation posture

Default posture:
- manual, intentional refreshes

Allowed helper modes:
- `graphify --update` for incremental refresh
- `graphify --watch` during a focused local session
- git hook automation if the repo later adopts one cleanly

But the intended artifact remains the same: the next meaningful full-project graph at `graphify-out/`.

Baseline hygiene:
- keep a root `.graphifyignore`
- exclude legacy graph artifacts, backups, cache, converted files, and any graph memory you do not want folded back into the next baseline

## Current handling

- `graphify-out/` is the canonical graph artifact
- a legacy/custom merged artifact was archived under `local/graphify/legacy/graphify-out-full-project-20260411/`
- other Graphify folders are generated/local support artifacts unless explicitly promoted
- Graphify outputs remain generated/local, not product architecture surfaces

## Agent rule

When an agent needs graph context:

1. check `graphify-out/` first
2. use subproject graphs only if the task is intentionally local
3. recommend a refresh of the canonical full-project graph when it is likely stale relative to recent architecture changes
