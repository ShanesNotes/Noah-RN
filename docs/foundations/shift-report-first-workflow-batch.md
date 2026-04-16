# Shift Report First Workflow Batch

## Purpose

Define the first workflow-specific artifact layer for Noah RN using `Shift Report` as the forcing function.

This is the first workflow artifact set built on top of:
- the workspace map
- the first scaffold batch
- the new workspace-centered contract docs

It is still not an implementation plan.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/patient-context-bundle-contract.md`
- `docs/foundations/agent-harness-runtime-contract.md`
- `docs/foundations/clinical-resources-runtime-access-contract.md`
- `docs/foundations/memory-tier-boundary.md`

## Why Shift Report First

`PLAN.md` and `TASKS.md` already make `Shift Report` the first realistic bedside loop.

It is the best first workflow because it forces all of the important boundaries to become concrete:
- patient context
- workflow selection
- resource selection
- deterministic support
- output / handoff
- draft vs final clinical artifact behavior

## First workflow artifact set

This batch should be limited to three artifacts:

1. `shift-report-workflow-input-contract.md`
2. `shift-report-runtime-path.md`
3. `shift-report-output-boundary.md`

The next narrow layer after that is:

4. `shift-report-canonical-patient-path.md`
5. `shift-report-renderer-contract.md`
6. `shift-report-patient-123-acceptance-criteria.md`

## What this batch should establish

### 1. Workflow input contract

What minimum context `Shift Report` accepts:
- `clinical_narrative` or `patient_id`
- optional context shape
- what counts as sufficient vs insufficient

### 2. Runtime path

What the actual first end-to-end path is across workspace centers:
- harness
- patient-context boundary
- workflow contract
- clinical resources
- sidecar/draft output surfaces

### 3. Output boundary

What `Shift Report` is allowed to produce in the first loop:
- structured handoff draft
- provenance-aware output
- no autonomous chart write-back

## What this batch should not do

- define all later workflow variants
- redesign the router globally
- solve memory persistence beyond the first workflow need
- broaden into multiple workflow bundles at once

## Result

After this batch exists, the repo should be ready for a more granular implementation lane tied directly to `TASKS.md`.

### Status note (2026-04-15)

That granular lane is now actively underway.
Landed pieces include:
- shared Shift Report renderer: `packages/agent-harness/shift-report-renderer.mjs`
- Medplum worker draft body now rendered through the shared contract
- Pi dry-run bridge now reuses the shared renderer lineage
- explicit lane-coverage output for:
  - `ehr/chart`
  - `memory`
  - `clinical-resources`
  - `patient-monitor/simulation`
- context-planning surfaces now emit renderer-ready lane coverage for future preview/render integration
