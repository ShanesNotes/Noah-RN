# Infrastructure

This folder holds environment and platform bring-up material for Noah RN.

## What this folder owns

- local infrastructure setup
- Medplum stack bring-up
- data loading scripts
- infrastructure-side experimental integrations

Current contents:
- `docker-compose.yml` — active Medplum local stack
- `medplum/` — Medplum operator scripts and app config for the current Shift Report lane
- `pi/` — pi-runtime environment scaffolding for the tower/operator lane (`pi.dev` is the active agent harness foundation per 2026-04-10 decision)
- `load-mimic.sh` — legacy MIMIC-IV dataset loading helper (current active dataset is Synthea; MIMIC migration is future)
- `nemoclaw/` — **legacy** exploratory NemoClaw/OpenClaw sandbox material; not the active foundation

## What this folder does not own

- patient-context contract logic
- workflow contracts
- clinical resources
- evaluation traces

Those live in:
- `services/clinical-mcp/` — agent-facing context boundary
- `services/sim-harness/` — Clinical Sim Harness (L0 physiology via Pulse, scenario controller, monitor projection); owns live-runtime boundary
- `packages/workflows/` — authoritative workflow contracts
- `clinical-resources/`
- `evals/` — meta-harness center

## Current rule

Treat this folder as platform/environment support, not product control-plane truth.

If a change affects runtime boundaries, document the boundary in `docs/foundations/` or `docs/ARCHITECTURE.md`, not only here.
If a change is tower/pi-runtime operator-specific, keep the operational detail here or in `scripts/`, not in the product control plane.

## Read this next

- `../docs/ARCHITECTURE.md`
- `../docs/foundations/medplum-architecture-packet.md`
- `nemoclaw/README.md`
