# `noah-router` Extension Stub

Planned responsibility:
- project-level routing and dispatch behavior for Noah RN clinical workflows

Expected inputs:
- workflow contract metadata from `packages/workflows/`
- active patient context from `medplum-context`
- control/routing guidance from `packages/agent-harness/router/clinical-router.md`

Expected output:
- route a request toward the correct workflow skill or clarification path

Current source-of-truth:
- `packages/agent-harness/router/clinical-router.md`
- `describe-shift-report-bridge.mjs` for the first scaffold bridge report
- `describe-shift-report-runtime-contract.mjs` for the first combined bridge contract
- `resolve-shift-report-request.mjs` for minimal input-mode-aware bridge resolution
- `plan-shift-report-execution.mjs` for a non-invasive execution-plan bridge layer
- `evaluate-shift-report-bridge-readiness.mjs` for a filesystem-backed readiness check
- `build-shift-report-invocation-payload.mjs` for a dry-run handoff payload
- `describe-shift-report-bridge-stack.mjs` for an integrated view of the full scaffold chain
- `run-shift-report-bridge.mjs` for a minimal runtime-aware bridge attempt
- `build-shift-report-workflow-input.mjs` for a workflow-facing dry-run input artifact
- `build-shift-report-dry-run-summary.mjs` for a human-readable dry-run summary artifact
- `build-shift-report-dry-run-output.mjs` for a sectioned dry-run handoff artifact
- `describe-shift-report-dry-run-bundle.mjs` for the full integrated dry-run artifact
