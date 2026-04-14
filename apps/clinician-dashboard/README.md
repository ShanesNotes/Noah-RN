# Clinician Dashboard

This folder holds the Noah RN runtime-console dashboard sidecar.

It is a supporting application surface, not the canonical clinical workspace.

## What this app owns

- runtime-console sidecar views (evals, traces, context inspection, skills, terminal)
- eval and trace observability
- context inspection
- skill/runtime visibility
- terminal/operator support
- future sim observability

## What this app does not own

- the clinician chart / patient workspace UI (that is `apps/nursing-station/`, the Medplum-first app)
- canonical patient-context assembly (lives in `services/clinical-mcp/`)
- workflow contract truth
- routing authority
- L0 physiology or scenario control (lives in `services/sim-harness/`)

Those live in:
- `apps/nursing-station/` — primary clinician workspace (Medplum-first, Mantine 8)
- `services/clinical-mcp/` — agent-facing context boundary (no longer owns physiology as of 2026-04-13)
- `services/sim-harness/` — Clinical Simulation Harness runtime center (Pulse L0 substrate)
- `packages/workflows/`
- `packages/agent-harness/` (pi.dev is the active harness foundation, Decision 2026-04-10)
- Medplum as the clinical workspace backbone

## Current role

Treat this app as:
- sidecar observability
- runtime-console prototyping
- workflow-support surface

Current panel set:
- eval dashboard
- trace viewer
- context inspector
- skill panel
- terminal panel

Do not treat it as the source of truth for clinical workspace architecture.

## Useful commands

```bash
npm run dev --workspace apps/clinician-dashboard
npm run build --workspace apps/clinician-dashboard
npm run test --workspace apps/clinician-dashboard
```

## Current stack

- Vite
- React
- TypeScript
- Mantine 7 (the nursing-station app uses Mantine 8 as required by the Medplum SDK; both share a unified design system via shared tokens)
- Recharts

## Current data posture

The app reads runtime-console signals (evals, traces, context bundles, skill state) through the current FHIR/clinical workspace path.

It is a sidecar consumer — not the clinician chart surface and not the owner of the clinical workspace.

## Where to look first

- `src/App.tsx` — overall shell and panel switching
- `src/components/` — runtime-console panels and workflow support surfaces
- `src/fhir/` — app-side FHIR client helpers (used for context inspection, not chart rendering)
- `src/hooks/` — app-side data hooks

## What to ignore first

- `dist/` — build output
- `node_modules/` — dependency install state
- local `.omc/` state — tooling/runtime residue

## Current rule

If a change affects:
- chart-context truth or bundle shape → start in `services/clinical-mcp/`
- workflow contract or routing behavior → start in `packages/workflows/` or `packages/agent-harness/`
- runtime-console display or interaction → start here

## Read this next

- `src/README.md`
- `../../docs/ARCHITECTURE.md`
- `../../docs/foundations/invariant-kernel-simulation-architecture.md` — canonical sim authority
- `../../docs/foundations/foundational-contracts-simulation-architecture.md` — 9 contracts (amended 2026-04-13)
- `../../docs/foundations/first-bedside-workflow-spec.md` — ICU respiratory decompensation
- `../../docs/foundations/shift-report-runtime-path.md`
