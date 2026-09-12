# Clinical Resources

This folder is the canonical clinical resource surface for Noah RN.

## What this folder owns

- curated protocol files
- reference data used at runtime
- shared templates used by workflows
- provenance/freshness metadata
- the clinical resources registry

Current contents:
- `drug-ranges.json` — deterministic dosage support data
- `drug-reference/` — OpenFDA drug facts + reference layer
- `FRESHNESS.md` — review/freshness manifest
- `mimic-mappings.json` — mapping/reference data for current FHIR context work
- `protocols/` — bedside protocol references
- `registry.json` — runtime-facing clinical resource registry
- `templates/` — output and routing support templates

## What this folder does not own

- raw research corpus
- workflow routing logic
- patient-context assembly
- memory persistence

Those live elsewhere:
- routing: `packages/agent-harness/`
- workflows: `packages/workflows/` (authoritative for workflow contracts)
- patient context / agent-facing boundary: `services/clinical-mcp/`
- L0 physiology substrate (Pulse): `services/sim-harness/`

## Current rule

Use this folder for curated runtime-facing resources only.

Do not treat `research/` or `notes/` as runtime truth.
If a source is still exploratory, distill it first before adding anything here.

## Read this next

- `../docs/topology/subproject-workspace-map.md`
- `../docs/foundations/clinical-resources-runtime-access-contract.md`
- `../docs/foundations/metadata-registry-spec.md`
