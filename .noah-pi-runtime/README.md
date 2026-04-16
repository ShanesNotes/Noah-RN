# `.pi/`

Repo-hosted Pi configuration surface for Noah RN. Noah RN is the clinical workspace agent harness; Pi is the active foundational substrate used to build that harness (Decision 2026-04-10). This surface is subordinate to `packages/agent-harness/` + `packages/workflows/`.

In this repository, these files live under `.noah-pi-runtime/`.
Inside the isolated runtime lane, this directory mounts as `/runtime/.pi`.
When docs inside this folder say `.pi/...`, read that as the runtime-mounted path.

## Contents

- `SYSTEM.md` — runtime system prompt for the Pi agent
- `AGENTS.md` — agent context and canonical source map
- `skills/` — promoted workflow skill contracts
- `extensions/` — Pi extensions (router, medplum-context, context planning, guardrails, clinical-tools)
- `prompts/` — reusable prompt templates

## Skills

| Skill | Complexity | Tools | Promoted |
|-------|-----------|-------|----------|
| shift-report | complex | clinical-mcp | 2026-04-12 |
| unit-conversion | moderate | convert.sh | 2026-04-13 |
| neuro-calculator | moderate | gcs.sh, nihss.sh, rass.sh, cpot.sh | 2026-04-13 |
| risk-calculator | moderate | wells-pe.sh, wells-dvt.sh, curb65.sh, braden.sh | 2026-04-13 |
| acuity-calculator | moderate | apache2.sh, news2.sh | 2026-04-13 |
| drug-reference | moderate | lookup.sh (OpenFDA) | 2026-04-13 |
| protocol-reference | moderate | knowledge files | 2026-04-13 |
| io-tracker | moderate | track.sh | 2026-04-13 |
| hello-nurse | simple | — | 2026-04-13 |

Discovery: `skills/SELECTION-BRIDGE.md`
Migration: `skills/MIGRATION-MAP.md`

## Relationship to `packages/`

- `packages/workflows/` remains authoritative for clinical workflow content and `dependencies.yaml` manifests
- `packages/agent-harness/` remains authoritative for harness/routing behavior
- `.noah-pi-runtime/` is authoritative only for Pi bridge wiring in the repo (extensions, system prompt, prompts, bridge docs)
- `packages/agent-harness/shift-report-renderer.mjs` is the shared Shift Report renderer contract used by the harness runner, the Medplum worker, and the Pi dry-run bridge
- If clinical workflow content changes, change it in `packages/workflows/` first
- If harness behavior changes, change it in `packages/agent-harness/` first unless the work is specifically bridge wiring
