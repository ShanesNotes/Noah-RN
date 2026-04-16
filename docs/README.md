# Noah RN Docs Index

This directory is the reference and architecture surface for Noah RN.

It is **not** the project control plane.

If you need a fast task-oriented map before diving into a specific folder, start with [NAVIGATION.md](NAVIGATION.md).

The control plane remains:
- [README.md](../README.md)
- [PLAN.md](../PLAN.md)
- [TASKS.md](../TASKS.md)

Use `docs/` for reference material, topology decisions, architectural boundaries, and archived history.

Hidden planning folders such as `.omx/`, `.hermes/`, and `.omc/` may contain earlier drafts or local planning artifacts, but `docs/` is where promoted, git-tracked documentation belongs.

## How To Use `docs/`

Use this file when the question is:
- where should a new doc live?
- which docs are active vs historical?
- which doc should I read first for a given topic?

Use [NAVIGATION.md](NAVIGATION.md) when the question is:
- I need the quickest path to the right doc for a coding task
- I am about to edit a repo surface and want the minimum first-read set
- I need the repo-wide map distilled for agents

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
- [foundations/invariant-kernel-simulation-architecture.md](foundations/invariant-kernel-simulation-architecture.md) — canonical sim authority (kernel)
- [foundations/foundational-contracts-simulation-architecture.md](foundations/foundational-contracts-simulation-architecture.md) — canonical sim authority (9 contracts, Contract 9 locks Pulse)
- [foundations/first-bedside-workflow-spec.md](foundations/first-bedside-workflow-spec.md) — first bedside workflow (ICU respiratory decompensation)
- [foundations/medplum-write-path-expansion.md](foundations/medplum-write-path-expansion.md) — Contract 5 charting write-path
- [foundations/scaffolding-alignment.md](foundations/scaffolding-alignment.md)
- [foundations/first-scaffold-batch.md](foundations/first-scaffold-batch.md)
- [foundations/patient-context-bundle-contract.md](foundations/patient-context-bundle-contract.md)
- [foundations/agent-harness-runtime-contract.md](foundations/agent-harness-runtime-contract.md)
- [foundations/clinical-resources-runtime-access-contract.md](foundations/clinical-resources-runtime-access-contract.md)
- [foundations/memory-tier-boundary.md](foundations/memory-tier-boundary.md)
- [foundations/medplum-primary-workspace-note.md](foundations/medplum-primary-workspace-note.md)
- [foundations/medplum-rails-noah-runtime.md](foundations/medplum-rails-noah-runtime.md)
- [foundations/medplum-shift-report-contract.md](foundations/medplum-shift-report-contract.md)
- [foundations/pi-dev-runtime-lane-checkpoint-1.md](foundations/pi-dev-runtime-lane-checkpoint-1.md)

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
- promoted implementation-planning syntheses when they are analysis-heavy rather than contract docs

Current docs:
- [analysis/ehr-ui-ux-start-here.md](analysis/ehr-ui-ux-start-here.md)
- [analysis/ehr-ui-ux-hidden-surface-map.md](analysis/ehr-ui-ux-hidden-surface-map.md)
- [analysis/clinician-ui-phased-roadmap.md](analysis/clinician-ui-phased-roadmap.md)
- [analysis/clinician-ui-feature-matrix.md](analysis/clinician-ui-feature-matrix.md)
- [analysis/ui-ux-foundations-caveman.md](analysis/ui-ux-foundations-caveman.md)
- [analysis/ui-resource-ledger.md](analysis/ui-resource-ledger.md)
- [analysis/epic-source-triage.md](analysis/epic-source-triage.md)
- [analysis/hidden-docs-reconciliation-note-2026-04-14.md](analysis/hidden-docs-reconciliation-note-2026-04-14.md)
- [analysis/distillation-cross-reference.md](analysis/distillation-cross-reference.md)
- [analysis/safety-compliance-report.md](analysis/safety-compliance-report.md)
- [analysis/2026-04-12-session-closeout-audit.md](analysis/2026-04-12-session-closeout-audit.md)

Read first for current clinician workspace planning:
- [analysis/ehr-ui-ux-start-here.md](analysis/ehr-ui-ux-start-here.md)

Read first for hidden-doc cleanup / promotion work:
- [analysis/hidden-docs-reconciliation-note-2026-04-14.md](analysis/hidden-docs-reconciliation-note-2026-04-14.md)

### `docs/plans/`

Purpose:
- implementation-ready plans with concrete file paths, acceptance criteria, and verification steps
- the output of `/plan` mode and architect passes
- handoff docs for engineer agents about to execute a specific lane

Read first when:
- starting implementation on a named lane or feature
- picking up a plan another agent drafted

Active plans (execute in order — each depends on the previous):
- [plans/p0.1-persistent-patient-header.md](plans/p0.1-persistent-patient-header.md) — persistent patient header for `apps/nursing-station/`
- [plans/p0.2-chart-shell-and-nav.md](plans/p0.2-chart-shell-and-nav.md) — left rail + nested routes; depends on P0.1
- [plans/p0.3-overview-page.md](plans/p0.3-overview-page.md) — populate default landing view; depends on P0.2

Rule:
- planning output must land here (or `docs/analysis/` if analysis-heavy), never in hidden folders like `~/.claude/plans/`, `.hermes/`, or `.omx/`
- once a plan is executed and merged, move it to `docs/archive/` with a short outcome note

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

## Hidden Planning Reconciliation

When you find a planning doc in a hidden folder:

1. Check whether it explicitly says the canonical copy moved into `docs/`.
2. If the same topic exists in `docs/`, treat the `docs/` copy as authoritative.
3. If the hidden doc is still useful but unpromoted, mine it for ideas instead of linking to it as active guidance.
4. If a hidden doc conflicts with `README.md`, `PLAN.md`, or `TASKS.md`, the control plane wins.

Current examples:
- `.omx/plans/invariant-kernel-simulation-architecture.md` points to `docs/foundations/invariant-kernel-simulation-architecture.md` as canonical.
- `.hermes/plans/*` contains UI implementation planning notes that are useful inputs for `docs/analysis/`, not control-plane replacements.

## Doc Placement Rule

Before creating a new doc, decide its class:

1. **Control-plane**
   - belongs in root `README.md`, `PLAN.md`, or `TASKS.md`
   - do not create a parallel control-plane doc in `docs/`

2. **Topology / placement**
   - belongs in `docs/topology/`

3. **Boundary / contract / scaffold**
   - belongs in `docs/foundations/`

4. **Implementation plan (executable by engineer agent)**
   - belongs in `docs/plans/`
   - never in hidden folders (`~/.claude/plans/`, `.hermes/`, `.omx/`, `notes/`)

5. **Stable reference**
   - may belong at `docs/` root

6. **Historical / superseded**
   - belongs in `docs/archive/`

7. **Local-only**
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
