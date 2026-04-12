# sim-harness

Clinical Simulation Harness workspace center.

**Status:** scaffold only — no runtime code. Runtime work is gated on the first bedside workflow needing live vitals (see `TASKS.md` item 4).

## What this is

`services/sim-harness/` is the live-runtime workspace center inside the Clinical Workspace lane. It exists so the Noah RN agentic harness can operate inside a realistic, tickable clinical environment with live vital signs, live waveforms, and live FHIR chart state — without rebuilding clinical physiology in-house.

It is the second of two workspace centers in Clinical Workspace:

- `services/clinical-mcp/` — context boundary (chart assembly, timeline shaping, FHIR normalization)
- `services/sim-harness/` — live-runtime boundary (tickable physiology, waveform generation, scenario direction, FHIR write-back)

Both read and write the same Medplum FHIR backbone. Agents never talk to `services/sim-harness/` directly — all agent access goes through `services/clinical-mcp/` or through sim-only MCP tools registered at the clinical-mcp boundary.

## What this wraps

Wrap, don't rebuild. The physiology is always an adapter over a validated open-source engine.

- **Pulse Physiology Engine** (Kitware, Apache-2.0) — primary physiology substrate
- **BioGears** (Apache-2.0) — fallback physiology substrate
- **Infirmary Integrated** — rhythm taxonomy and device-layer waveform pattern reference
- **rohySimulator** — LLM virtual-patient dialogue pattern reference
- **Auto-ALS / Virtu-ALS** — Gym-compatible eval interface pattern reference

Full wrapping decisions: `docs/foundations/sim-harness-engine-wrapping.md`.

## Non-negotiable: agent waveform vision

The agent **must** have direct vision on the raw waveform surface of any live-simulated encounter. Rhythm labels alone are a silent-failure surface. A nurse validates a rhythm reading by looking at the strip; the agent must do the same.

Full contract: `docs/foundations/sim-harness-waveform-vision-contract.md`.

## Canonical specs

- `docs/foundations/sim-harness-scaffold.md` — canonical boundary, minimal architecture, layered subsystem map
- `docs/foundations/sim-harness-first-batch.md` — what the first scaffolding batch contains
- `docs/foundations/sim-harness-runtime-access-contract.md` — agent-facing MCP tool surface
- `docs/foundations/sim-harness-waveform-vision-contract.md` — waveform vision requirement
- `docs/foundations/sim-harness-engine-wrapping.md` — how each wrapped engine is adopted

## Where this lives in the control plane

- `PLAN.md` subproject #2, named scope "Clinical Simulation Harness"
- `PLAN.md` Decision Log 2026-04-11
- `README.md` Current Shape item #2 and Repository Map
- `docs/ARCHITECTURE.md` Workspace centers section
- `docs/topology/subproject-workspace-map.md` Workspace center B under Clinical Workspace
- `TASKS.md` item 4

## Research and wiki references

- `research/Open Source Clinical Simulation.md`
- `research/Open Source Clinical Simulation.original.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `wiki/sources/2026-04-10-open-source-clinical-simulation.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
- `wiki/concepts/computational-physiology-engine.md`
- `wiki/concepts/emergent-vitals-from-physics.md`
- `wiki/concepts/medical-digital-twin.md`
- `wiki/concepts/synthetic-physiological-data-generation.md`
- `wiki/entities/pulse-physiology-engine.md`
- `wiki/entities/biogears.md`
- `wiki/entities/infirmary-integrated.md`
- `wiki/entities/rohysimulator.md`
- `wiki/entities/auto-als.md`
