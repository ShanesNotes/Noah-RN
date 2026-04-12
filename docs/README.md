# Noah RN Docs Index

This directory is the reference and architecture surface for Noah RN.

It is **not** the project control plane.

The control plane remains:
- [README.md](../README.md)
- [PLAN.md](../PLAN.md)
- [TASKS.md](../TASKS.md)

Use `docs/` for reference material, topology decisions, architectural boundaries, and archived history.

## How To Use `docs/`

Use this file when the question is:
- where should a new doc live?
- which docs are active vs historical?
- which doc should I read first for a given topic?

## Directory Roles

### Root `docs/*.md`

Purpose:
- stable reference docs
- short technical orientation docs
- product/reference material that does not belong in the control plane

Current root docs:
- [ARCHITECTURE.md](ARCHITECTURE.md) — short technical boundary map
- [FHIR-INTEGRATION.md](FHIR-INTEGRATION.md) — FHIR/Medplum integration reference
- [REGULATORY.md](REGULATORY.md) — regulatory posture reference
- [LIMITATIONS.md](LIMITATIONS.md) — known system limits
- [DEGRADATION.md](DEGRADATION.md) — fallback/degradation behavior
- [DEMO.md](DEMO.md) — demo/reference flow

Rule:
- if a doc is stable and broadly useful, it may live at `docs/` root
- if it is temporary, boundary-specific, or organizational, it should probably not live here

### Current root-doc status

Use this status map when deciding whether a root doc is first-read material or deeper reference.

| Doc | Status | Intended use |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | active root reference | quick boundary map |
| [FHIR-INTEGRATION.md](FHIR-INTEGRATION.md) | active root reference | Medplum/FHIR technical reference |
| [REGULATORY.md](REGULATORY.md) | active root reference | regulatory posture and boundary conditions |
| [LIMITATIONS.md](LIMITATIONS.md) | active root reference | current limits and non-goals |
| [DEGRADATION.md](DEGRADATION.md) | active root reference | fallback behavior |
| [DEMO.md](DEMO.md) | active root reference | reproducible walkthrough/demo |

### `docs/topology/`

Purpose:
- repo shape
- workspace placement
- migration and classification rules

Read first when:
- deciding where a subproject lives
- deciding where a new artifact should go
- checking the approved target repo shape

Key docs:
- [topology/subproject-workspace-map.md](topology/subproject-workspace-map.md)
- [topology/repo-topology-target.md](topology/repo-topology-target.md)
- [topology/graph-refresh-policy.md](topology/graph-refresh-policy.md)
- [topology/workspace-orchestration.md](topology/workspace-orchestration.md)
- [topology/root-classification.md](topology/root-classification.md)

### `docs/foundations/`

Purpose:
- architectural boundaries
- scaffold notes
- contract-level docs before implementation
- first-batch and first-workflow shaping artifacts

Read first when:
- defining a subproject boundary
- defining a contract before code changes
- narrowing a high-level plan into implementation-ready artifacts

Key docs:
- [foundations/scaffolding-alignment.md](foundations/scaffolding-alignment.md)
- [foundations/first-scaffold-batch.md](foundations/first-scaffold-batch.md)
- [foundations/patient-context-bundle-contract.md](foundations/patient-context-bundle-contract.md)
- [foundations/agent-harness-runtime-contract.md](foundations/agent-harness-runtime-contract.md)
- [foundations/clinical-resources-runtime-access-contract.md](foundations/clinical-resources-runtime-access-contract.md)
- [foundations/memory-tier-boundary.md](foundations/memory-tier-boundary.md)

`Shift Report` workflow-specific artifacts also currently live here because they are still boundary/contract docs rather than implementation docs.

### `docs/reference/`

Purpose:
- deeper reference material
- market / positioning context
- non-control-plane background docs

Current docs:
- [reference/competitive-analysis.md](reference/competitive-analysis.md)

### `docs/analysis/`

Purpose:
- deeper analytical material
- gap mapping
- cross-reference and compliance analysis

Current docs:
- [analysis/distillation-cross-reference.md](analysis/distillation-cross-reference.md)
- [analysis/safety-compliance-report.md](analysis/safety-compliance-report.md)

### `docs/archive/`

Purpose:
- historical documents
- superseded control-plane material
- earlier architecture phases

Read only when:
- mining durable ideas
- tracing history
- checking whether an old assumption still matters

Do not treat archive docs as active instructions unless their content is intentionally promoted back into an active doc.

### `docs/local/`

Purpose:
- local-only or environment-specific context

Current rule:
- this is not a canonical deliverable docs surface
- use it for local grounding only

## Doc Placement Rule

Before creating a new doc, decide its class:

1. **Control-plane**
   - belongs in root `README.md`, `PLAN.md`, or `TASKS.md`
   - do not create a parallel control-plane doc in `docs/`

2. **Topology / placement**
   - belongs in `docs/topology/`

3. **Boundary / contract / scaffold**
   - belongs in `docs/foundations/`

4. **Stable reference**
   - may belong at `docs/` root

5. **Historical / superseded**
   - belongs in `docs/archive/`

6. **Local-only**
   - belongs in `docs/local/` or outside deliverable docs entirely

## Canonicality Rules

- `README.md`, `PLAN.md`, and `TASKS.md` outrank any doc in `docs/`
- `docs/ARCHITECTURE.md` is a boundary map, not a roadmap
- `docs/topology/` decides workspace placement
- `docs/foundations/` decides boundary/contract shape before implementation
- `docs/archive/` is never active by default

## Current Recommendation

Keep `docs/` minimal by function:
- few root reference docs
- topology docs in one place
- foundation docs in one place
- archive clearly separated

If a docs area starts feeling messy again, the first fix should be improving categorization and lifecycle, not creating a new top-level bucket.
