# Clinical Simulation Harness Scaffold

## Purpose

Define the minimal Clinical Simulation Harness Noah RN needs in order for the agentic harness to operate inside a realistic, tickable clinical environment with live vitals, live waveforms, and live FHIR chart state — **without** rebuilding clinical physiology in-house.

The harness is what makes a workflow under test feel like an actual ICU encounter. Static MIMIC snapshots seed it; validated open-source physiology engines drive it forward in simulated time; the same FHIR backbone the clinical workspace already uses receives the resulting patient-state changes.

## Governing alignment

- `PLAN.md` subproject #2 (Clinical Workspace) — Clinical Simulation Harness is a named scope inside this subproject with its own workspace center.
- `PLAN.md` Decision Log 2026-04-11 — wrap open-source engines; do not build in-house physiology; agent must have vision on waveforms.
- `TASKS.md` item 4 — land the sim-harness scaffold as docs-only before any runtime code.
- `docs/ARCHITECTURE.md` — `services/sim-harness/` is the second workspace center in the Clinical Workspace lane.
- `docs/topology/subproject-workspace-map.md` — `services/sim-harness/` placement as Workspace center B under Clinical Workspace.
- `docs/foundations/clinical-workspace-scaffold.md` — simulation belongs inside the clinical workspace lane, not as a parallel product architecture.
- Origin research: `research/Open Source Clinical Simulation.md`, `research/Open Source Clinical Simulation.original.md`, `research/Architectural integration for noah-rn clinical simulation.md`.
- Wiki synthesis: `wiki/concepts/clinical-simulator-as-eval-substrate.md`, `wiki/concepts/computational-physiology-engine.md`, `wiki/concepts/emergent-vitals-from-physics.md`, `wiki/concepts/medical-digital-twin.md`, `wiki/concepts/synthetic-physiological-data-generation.md`.

## Canonical boundary

Clinical Simulation Harness means:

- `services/sim-harness/` owns the tickable live runtime, the scenario director, the waveform generation layer, and the FHIR write-back layer.
- `services/clinical-mcp/` owns the agent-facing MCP boundary; the sim-harness does not register agent-facing tools directly.
- `infrastructure/` (Medplum + HAPI FHIR R4) is the shared chart substrate; the sim-harness writes Observation / Encounter / MedicationAdministration resources into the same backbone the clinical workspace reads from.
- `apps/clinician-dashboard/` is the sidecar waveform viewer and live-vitals panel.
- `evals/` is the eventual downstream consumer through a Gym-compatible interface for meta-harness work.

Agents must never talk to `services/sim-harness/` directly. All agent access goes through `services/clinical-mcp/` — either as context reads from Medplum (indistinguishable from static MIMIC reads) or as a small number of sim-only MCP tools registered through the clinical-mcp boundary.

## Minimal architecture

### Layer 0: Wrapped open-source engines

The substrate. Always external; never replaced by in-house code.

- **Pulse Physiology Engine** (Kitware, Apache-2.0, C++ core with Python bindings) — primary physiology. Computes cardiovascular, respiratory, renal, nervous, endocrine, GI, hepatic, and tissue systems with 20 ms time steps. Vitals are emergent outputs of insults and interventions, not settable parameters.
- **BioGears** (Apache-2.0, C++) — fallback / comparison substrate for cases Pulse does not cover cleanly. Whole-body sepsis modeling precedent.
- **Infirmary Integrated** (tanjera, open source) — reference pattern for device-layer waveform rendering, rhythm taxonomy, and scenario editor UX. Authored by a practicing critical-care RN; patterns are stolen, the C#/.NET desktop app is not run as a sidecar.
- **rohySimulator** (Node/React, open source) — reference pattern for LLM-driven virtual-patient dialogue and multi-backend support (OpenAI / LM Studio / Ollama).
- **Auto-ALS / Virtu-ALS** (open source, OpenAI Gym wrapper) — reference pattern for exposing the sim-harness as a Gym-compatible environment to the meta-harness eval loop.

Detailed wrapping strategy: `docs/foundations/sim-harness-engine-wrapping.md`.

### Layer 1: Simulation clock

Owns:

- tick cadence (wall-clock for live demo, accelerated N× for eval, frozen for golden tests)
- tick loop that drives the Layer 0 engine forward in simulated time
- encounter-scoped state isolation so multiple simulations can run in parallel

### Layer 2: Scenario director

Owns:

- scenario timeline authoring (`t=0 baseline → t=3min apply tension pneumothorax → t=7min intubation → ...`)
- scheduled insult and intervention actions dispatched to Layer 0 on clock ticks
- integration with MIMIC-IV seeding so a scenario can start from a real patient's demographics + comorbidities

Scenario timelines are data, not code. They live in `services/sim-harness/scenarios/` when runtime work starts.

### Layer 3: Waveform generation

Owns:

- stored-and-interpolated canonical cycle templates per rhythm (NSR, a-fib, flutter, VT, VF, asystole, PEA, bundle branch block, heart blocks 1°/2°/3°, junctional, paced)
- ECG (Lead I–XII), plethysmography, capnography, arterial line, CVP, ICP generators
- waveform surface exposed to the agent per the vision contract — see `sim-harness-waveform-vision-contract.md`

Templates are data (`services/sim-harness/waveforms/rhythms/*.json`). The interpolation logic is a thin adapter, not a physiology engine.

### Layer 4: FHIR write-back

Owns:

- Encounter lifecycle management (open on scenario start, close on scenario reset)
- Observation batch write on a cadence matching real ICU flowsheet behavior (default: 60s or state-change, whichever comes first)
- MedicationAdministration write when the agent or scenario director administers a medication
- Procedure write for intervention events

The write-back is the glue that makes the agent see the same chart whether the source is static MIMIC or live simulation.

### Layer 5: Agent-facing MCP tool surface

Owns:

- a small number of sim-only tools registered through `services/clinical-mcp/` (never through `services/sim-harness/` directly)
- live-vitals snapshot
- waveform vision access (both raw sample arrays and rendered image bytes)
- administer medication
- order intervention
- read current encounter

Detailed surface: `docs/foundations/sim-harness-runtime-access-contract.md`.

### Layer 6: Clinician dashboard surface

Owns:

- waveform viewer component consuming Layer 3 output
- live-vitals panel consuming Layer 4 write-back
- scenario control panel (author, run, pause, reset)

Lives in `apps/clinician-dashboard/`, not in `services/sim-harness/`.

## Waveform vision requirement (non-negotiable)

A nurse validates a rhythm reading by looking at the strip. The agent must do the same. Exposing only a rhythm label (`"rhythm": "v-tach"`) to the agent bakes a silent-failure surface into the harness — a mis-classification propagates downstream unchecked.

Therefore the agent must be able to retrieve the **raw waveform surface** for the current encounter, in two forms:

- a JSON array of voltage samples per lead for the last N seconds (for numeric claims: QRS width, ST elevation mm, PR interval)
- a rendered image of the waveform (PNG or SVG, last N seconds) for visual pattern recognition using a vision-capable model

Both forms are exposed through `services/clinical-mcp/` as MCP tools registered from the sim-harness. This is a hard requirement, not an option. Full spec: `sim-harness-waveform-vision-contract.md`.

## What does not belong in the sim-harness

- in-house physiology modeling — Layer 0 is always an adapter over a wrapped engine
- patient-context assembly logic — that is `services/clinical-mcp/`
- direct agent-facing MCP tool registration — tools register through `services/clinical-mcp/`
- clinical knowledge resources — those live in `clinical-resources/`
- workflow orchestration logic — that is `packages/agent-harness/` + `packages/workflows/`
- memory persistence — that is `packages/memory/`
- waveform rendering that bypasses the agent vision contract

## Canonical surfaces now

- `services/sim-harness/` (scaffold only)
- `docs/foundations/sim-harness-scaffold.md`
- `docs/foundations/sim-harness-first-batch.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`
- `docs/foundations/sim-harness-waveform-vision-contract.md`
- `docs/foundations/sim-harness-engine-wrapping.md`

## Deferred work

- any runtime code, including the engine-wrapping adapters themselves, until the first bedside workflow needs live vitals
- in-house physiology extension beyond what Layer 0 engines cover
- production packaging of a Pulse sidecar
- an authoring UI for scenario timelines (scenarios are JSON files until proven otherwise)
- multi-patient multi-encounter dashboards beyond a single live encounter
- a Gym-compatible eval interface — deferred until the static golden test suite matures

## References

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/clinical-workspace-scaffold.md`
- `docs/foundations/sim-harness-first-batch.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`
- `docs/foundations/sim-harness-waveform-vision-contract.md`
- `docs/foundations/sim-harness-engine-wrapping.md`
- `research/Open Source Clinical Simulation.md`
- `research/Open Source Clinical Simulation.original.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
- `wiki/concepts/computational-physiology-engine.md`
- `wiki/concepts/emergent-vitals-from-physics.md`
- `wiki/concepts/medical-digital-twin.md`
- `wiki/concepts/synthetic-physiological-data-generation.md`
