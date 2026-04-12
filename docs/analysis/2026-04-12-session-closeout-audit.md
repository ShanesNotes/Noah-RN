# 2026-04-12 Session Closeout Audit

## Purpose

Capture what the current branch actually accomplished, where the docs drifted, and what remains intentionally scaffolded before the next implementation wave.

## What Landed

### 1. Medplum-first workspace correction

- `apps/nursing-station/` now exists as a Medplum-native patient/task workspace.
- `apps/clinician-dashboard/` has been re-scoped into a runtime-console sidecar built around evals, traces, context inspection, skills, and terminal/operator workflows.
- `docs/foundations/medplum-primary-workspace-note.md` and `docs/foundations/medplum-rails-noah-runtime.md` now define the intended split:
  - Medplum = clinician rails / review surface
  - Noah RN = runtime / orchestration / context assembly

### 2. Shift Report forcing path became real enough to operate

- `.pi/` bridge scaffolds now exist for the first Shift Report path.
- `packages/agent-harness/` exists as a real routing/selection workspace center.
- `infrastructure/medplum/test-shift-report-task.sh` defines the operator proof path for:
  - create `Task`
  - run worker
  - wait for completion
  - inspect resulting `DocumentReference`
- `services/clinical-mcp/src/fhir/types.ts` widened toward real Medplum/FHIR coverage.

Important boundary:
- `services/clinical-mcp/src/fhir/writes.ts` is still intentionally scaffold-only. The read path and operator path are ahead of the full productized write path.

### 3. Runtime observability became a first-class lane

- `evals/product/eval-harness.sh` has been reworked around the harness/runtime path.
- Dashboard-consumable eval and trace mirrors now exist under `apps/clinician-dashboard/public/`.
- The repo now clearly has a meta-harness lane that is more than shell-only output.

### 4. A separate pi-runtime operator lane exists

- `infrastructure/pi/` and `scripts/tower-pi-*.sh` establish a tower-focused runtime lane.
- `scripts/start-dev.sh` reflects the intended split:
  - Medplum as primary workspace
  - dashboard as sidecar

### 5. Workspace normalization continued

- Root workspaces now include new app/service/package surfaces.
- `services/sim-harness/` remains scaffold-only, but it is now a first-class workspace center with clear boundary docs.

## Repo-Truth Corrections Made In This Pass

- Control-plane docs now reflect that the first pi bridge and sim-harness scaffold already landed.
- Architecture/topology docs now include `apps/nursing-station/` and describe the dashboard as a runtime console instead of a bedside chart.
- App/service/docs indexes now better distinguish canonical surfaces from generated or local support artifacts.

## Generated / Local Artifacts To Treat Carefully

These are valuable, but they should not compete with active product surfaces:

- `.dev-logs/`
- `.hermes/`
- `graphify-out.bak-20260411/`
- `graphify-out/` itself when it predates a major structural/doc shift; the current canonical snapshot is from `2026-04-11`
- `docs/analysis/session-*.html`
- dashboard `public/evals/` and `public/traces/` mirrors
- raw eval result and trace run folders

## Remaining Gaps

1. The write path is still intentionally narrow and partially stubbed.
2. The dashboard is not yet the waveform-viewer surface described in some earlier docs; that remains future sim work.
3. The nursing-station app needs to prove the real Medplum-native entry/review pattern for Shift Report.
4. Large generated eval/trace corpora still need a final policy decision: checked-in demo artifacts vs generated local mirrors.

## Recommended Next Step

Use the current Medplum-first / dashboard-sidecar split as fixed for the next wave, then harden the first end-to-end Shift Report loop before adding broader runtime behavior.
