# Infrastructure

This folder holds environment and platform bring-up material for Noah RN.

## What this folder owns

- local infrastructure setup
- Medplum stack bring-up
- data loading scripts
- infrastructure-side experimental integrations

Current contents:
- `docker-compose.yml` — active Medplum local stack
- `load-mimic.sh` — dataset loading helper
- `docker-compose.hapi-archive.yml` — archived legacy HAPI stack
- `nemoclaw/` — exploratory/runtime-adjacent integration material

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

## Read this next

- `../docs/ARCHITECTURE.md`
- `../docs/foundations/medplum-architecture-packet.md`
- `nemoclaw/README.md`
