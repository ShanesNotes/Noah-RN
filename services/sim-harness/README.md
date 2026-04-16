# sim-harness

Clinical Simulation Harness workspace center. Live-runtime boundary inside the Clinical Workspace lane.

**Status:** scaffold + type contracts + relocated reference pharmacokinetics + simulation clock (Lane A partial — wall/accelerated/frozen/skip-ahead modes and the engine-adapter boundary). Pulse Physiology Engine (Kitware, Apache-2.0) is the locked L0 substrate per Contract 9 (2026-04-13). Lanes B–F remain deferred to the execution packet.

## Canonical architecture

The governing documents are:

- `docs/foundations/invariant-kernel-simulation-architecture.md` — eight kernel invariants (Patient Truth, Clock Semantics, Monitor-as-Avatar, L0–L4 Projection, Charting Authority, Obligation Lifecycle, Intervention Closure, Clinical Pressure Filter).
- `docs/foundations/foundational-contracts-simulation-architecture.md` — nine contracts (Patient Truth, Projection, Clock, Monitor/Alarm, Charting, Scenario/Intervention, Obligations, Eval/Trace, Research-Hook). Amended 2026-04-13 with D1–D4 + M1–M3.
- `docs/foundations/execution-packet-simulation-architecture.md` — six implementation lanes (A Clock+Engine → B Projections+Scenario → C Monitor → D Charting → E Obligations → F Eval+Integration).

Supporting references:

- `docs/foundations/scaffold-salvage-audit-simulation.md` — classification of every scaffold surface.
- `docs/foundations/brownfield-mapping-simulation-architecture.md` — move/rewrite/retire decisions driving the current code layout.
- `docs/foundations/sim-harness-waveform-vision-contract.md` — KEPT; enforces the monitor-as-avatar invariant at the L1 waveform surface.

## L0–L4 framing

The kernel separates patient reality into five projection layers. Everything under `services/sim-harness/` speaks this vocabulary, not the older 7-layer scaffold:

- **L0 — Hidden patient truth.** Canonical physiological state. Evolves continuously on the simulation clock. Owned by the engine adapter. No agent-facing surface may read L0 directly; only the eval recorder has access.
- **L1 — Monitor projection.** Telemetry, waveforms, alarms, signal quality. The **primary patient avatar** — what the nurse and agent perceive. Lossy, noisy, can diverge from the chart.
- **L2 — Events.** Lab results, imaging, consult notes, order completions. Two-stage release: L0 makes events eligible, the scenario controller releases them on the clock (amendment D2).
- **L3 — Chart.** FHIR record in Medplum. Reached via `services/clinical-mcp/`. Every entry carries a FHIR Provenance resource with an explicit authority state.
- **L4 — Obligations.** Documentation duties, follow-up windows, workflow pressure. First-class, not implicit side effects.

Monitor-as-avatar is non-negotiable: rhythm and hemodynamic claims must be validated against the raw waveform surface (samples or rendered image), not against metadata labels. See `docs/foundations/sim-harness-waveform-vision-contract.md`.

## What lives here today

- `src/index.ts` — type vocabulary mirroring Contracts 4, 5, 6, 7. Layer annotations on every surface. Placeholder types for alarm / charting-authority / obligation reserve the shape pending the runtime-access contract rewrite.
- `src/config.ts` — scenarios + reference pharmacokinetic parameters (relocated from clinical-mcp per brownfield mapping; L0 config belongs here, not at the L3 boundary).
- `src/reference/pharmacokinetics.ts` — Hill-equation dose-response, first-order onset delay, fluid bolus decay, AR(1) bounded noise, baroreflex HR compensation. Reference implementations that back the L0 engine adapter alongside the Pulse Physiology Engine (locked per Contract 9, 2026-04-13).
- `src/clock.ts` — simulation clock (Contract 3) with wall / accelerated / frozen / skip-ahead modes. Engine-adapter boundary in `src/reference/adapter.ts`.
- `src/scenario/types.ts` + `src/scenario/controller.ts` — scenario-director scaffolding (Contract 6): state management, disk persistence, advance logic.
- `scenarios/pressor-titration.ts` + `fluid-responsive.ts` + `hyporesponsive.ts` — three seed ICU scenarios.
- `__tests__/pharmacokinetics.test.ts` + `__tests__/scenario-controller.test.ts` — coverage for the reference math and the controller.

## What does not live here

- Agent-facing MCP tool registration. The `services/clinical-mcp/` server is the single agent-facing boundary. Sim tools register through the `registerSimTools()` seam there — no-op until Lane F.
- FHIR write-back logic. Lives in `services/clinical-mcp/` per Contract 5.
- Dashboard waveform viewer or scenario control UI. Lives in `apps/clinician-dashboard/`.
- Workflow orchestration. Lives in `packages/agent-harness/` + `packages/workflows/`.

## Scripts

From repo root:

```bash
npm run check --workspace services/sim-harness
npm run test --workspace services/sim-harness
```

From this folder:

- `npm run check` — `tsc --noEmit` typecheck across `src/`, `scenarios/`, and `__tests__/`.
- `npm run test` — vitest run.
- `npm run test:watch` — vitest watch mode.

## Where this sits in the control plane

- `PLAN.md` subproject #2, scope "Clinical Simulation Harness".
- `TASKS.md` deferred sim-harness runtime work — runtime lane A stays gated on the first bedside workflow that actually needs live vitals.
- `docs/ARCHITECTURE.md` — workspace-center description.
- `docs/topology/subproject-workspace-map.md` — Workspace center B under Clinical Workspace.

## Read this next

- `../../docs/foundations/invariant-kernel-simulation-architecture.md` — canonical kernel authority
- `../../docs/foundations/foundational-contracts-simulation-architecture.md` — binding simulation contracts
- `../../docs/foundations/execution-packet-simulation-architecture.md` — implementation lanes A–F
- `../../docs/ARCHITECTURE.md` — repo-wide boundary map
- `../clinical-mcp/README.md` — agent-facing boundary that sim work must route through
