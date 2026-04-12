# Noah RN Root Classification

Every current root item must have an explicit class during the restructure.

## Classes

- **Control-plane** — root anchors that orient humans and agents
- **Deliverable** — product/runtime/reference surfaces that belong to the active repo topology
- **Local grounding** — private/foundational research context for agents
- **Generated/local** — machine output, scratch artifacts, or transient files
- **Runtime exception** — path-sensitive hidden/tooling state that stays put until explicitly migrated
- **Archive candidate** — legacy or duplicate surface to archive/remove after review

## Current Root Inventory

| Root item | Class | Target / handling |
|---|---|---|
| `README.md` | Control-plane | stays root |
| `PLAN.md` | Control-plane | stays root |
| `TASKS.md` | Control-plane | stays root |
| `package.json` | Control-plane / runtime anchor | stays root as npm workspace orchestrator |
| `apps/` | Deliverable | contains `clinician-dashboard/` |
| `services/` | Deliverable | contains `clinical-mcp/` |
| `packages/` | Deliverable | harness + workflows + future memory/safety packages |
| `plugin/` | Local-only leftover / archive target | ignored legacy plugin remnants only; not part of active topology |
| `clinical-resources/` | Deliverable | stays root |
| `infrastructure/` | Deliverable | stays root |
| `tests/` | Deliverable | stays root |
| `tools/` | Deliverable | stays root |
| `docs/` | Deliverable | stays root |
| `evals/` | Deliverable | meta-harness traces, candidates, and evaluation assets |
| `local/` | Deliverable support / local boundary anchor | stays root as the intended home for non-deliverable local material |
| `wiki/` | Local grounding | `local/grounding/wiki/` target |
| `research/` | Local grounding | `local/grounding/research/` target |
| `notes/` | Local grounding | `local/grounding/notes/` target |
| `graphify-out/` | Generated/local | canonical full-project graph artifact; `local/graphify/` target when safe |
| `local/graphify/legacy/graphify-out-full-project-20260411/` | Generated/local | archived legacy/custom merged graph artifact |
| `graphify-out.bak-20260411/` | Generated/local | backup artifact; move under `local/graphify/` or delete after review |
| `.obsidian/` | Runtime exception | keep at root or move only with wiki/link audit |
| `.omx/` | Runtime exception | keep at root |
| `.omc/` | Runtime exception | keep at root |
| `.claude/` | Runtime exception | review separately; do not move casually |
| `.codex-home/` | Runtime exception | local tool state; do not move casually |
| `.pi/` | Runtime exception / bridge surface | keep at root for now as project-level pi scaffold; not authoritative runtime truth |
| `.agents/` | Runtime exception / tool surface | keep at root unless tooling contract is changed explicitly |
| `.hermes/` | Runtime exception / local tooling residue | review separately; do not move casually |
| `.git/` | Runtime exception | git metadata |
| `.github/` | Deliverable | stays root |
| `.mcp.json` | Runtime exception | local/runtime config |
| `.graphify_detect.json` | Generated/local | move to `local/scratch/` or regenerate as needed |
| `.graphify_detect_root.json` | Generated/local | move to `local/scratch/` or regenerate as needed |
| `.graphify_chunks.json` | Generated/local | move to `local/scratch/` or regenerate as needed |
| `codex` | Runtime exception | local launcher/tooling script; review before moving |
| `.codex` | Generated/local | local state artifact |

## Notes

- `wiki/`, `research/`, `notes/`, and `docs/local/` should be treated as one conceptual family even if they do not all move at the same time.
- `plugin/` is not the future architecture center; it is a migration source.
- `evals/` is now the active name for meta-harness work.
- Hidden/runtime state paths should not be moved as part of the first structural batch.
- `package.json` is intentionally root-level because the repo uses root npm workspaces across `apps/*`, `services/*`, and `packages/*`.
- `graphify-out/` is the canonical full-project graph artifact for repo-wide navigation, but it is still a generated/local output rather than an architectural surface.
- `local/graphify/legacy/graphify-out-full-project-20260411/` is an archived legacy/custom artifact from an earlier merge workflow.
- other `graphify-out*` folders are support artifacts unless explicitly promoted.
- root scratch artifacts were moved into `local/scratch/`.
- `noah-rn-v0.1.0-chart.excalidraw` was moved into `notes/` as a local design artifact.
