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
- `pi/` — pi-runtime environment scaffolding for the tower/operator lane
- `load-mimic.sh` — dataset loading helper
- `nemoclaw/` — historical exploratory integration material; not the active foundation

## What this folder does not own

- patient-context contract logic
- workflow contracts
- clinical resources
- evaluation traces

Those live in:
- `services/clinical-mcp/`
- `packages/workflows/`
- `clinical-resources/`
- `evals/`

## Current rule

Treat this folder as platform/environment support, not product control-plane truth.

If a change affects runtime boundaries, document the boundary in `docs/foundations/` or `docs/ARCHITECTURE.md`, not only here.
If a change is tower/pi-runtime operator-specific, keep the operational detail here or in `scripts/`, not in the product control plane.

## Read this next

- `../docs/ARCHITECTURE.md`
- `../docs/foundations/medplum-architecture-packet.md`
- `nemoclaw/README.md`
