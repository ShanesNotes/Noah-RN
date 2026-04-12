# Clinical Simulation Harness Engine Wrapping

## Purpose

Lock the strategy for leveraging validated open-source clinical simulation projects inside the Clinical Simulation Harness. The rule is: **wrap, don't rebuild**. Physiology, rhythm taxonomies, and device-layer waveform patterns are solved problems in the open-source community; Noah RN's job is to adopt them through thin adapters, not to reinvent them.

This document decides, for each candidate project, whether it is a sidecar engine, a reference pattern, a fallback, or deferred — and names the decision boundary.

## Governing alignment

- `PLAN.md` Decision Log 2026-04-11 — wrap open-source engines, do not build in-house physiology
- `docs/foundations/sim-harness-scaffold.md` — Layer 0 is always an adapter over a wrapped engine
- `wiki/entities/pulse-physiology-engine.md`, `wiki/entities/biogears.md`, `wiki/entities/infirmary-integrated.md`, `wiki/entities/rohysimulator.md`, `wiki/entities/auto-als.md`
- Research: `research/Open Source Clinical Simulation.md`, `research/Architectural integration for noah-rn clinical simulation.md`

## Decision matrix

| Project | Role | Sidecar or Pattern | Licensing posture | Primary use |
|---|---|---|---|---|
| **Pulse Physiology Engine** | Primary physiology substrate | **Sidecar** (Python binding or REST) | Apache-2.0, Kitware copyright | Layer 0 cardiovascular / respiratory / renal / nervous / endocrine / GI / hepatic / tissue physiology; emergent vitals; validated hemorrhage and PK/PD models |
| **BioGears** | Fallback physiology substrate | **Deferred sidecar** | Apache-2.0 | Whole-body sepsis precedent; invoked only when Pulse does not cover a scenario cleanly; not required for first batch |
| **Infirmary Integrated** | Device-layer waveform and rhythm reference | **Pattern only** (not run) | Open source, tanjera / Ibi Keller RN | Stored-and-interpolated rhythm template taxonomy (NSR, AF, flutter, blocks, VT, VF, asystole, PEA, junctional, paced); scenario editor UX patterns; II:SIM desktop is NOT run as a sidecar; II:EHR web fork is NOT adopted (Medplum is our EHR) |
| **rohySimulator** | LLM virtual-patient dialogue reference | **Pattern only** (not run) | Open source, Node/React | Multi-backend LLM dialogue pattern (OpenAI / LM Studio / Ollama); 77+ lab database shape as reference for how labs are exposed; not run as a sidecar |
| **Auto-ALS / Virtu-ALS** | Gym-compatible eval interface reference | **Pattern only** for first batch; optional future wrapper | Open source | OpenAI Gym observation-space pattern for RL / meta-harness eval against a live sim environment; deferred until the static golden test suite matures |
| **CVSim / PhysioNet** | Historical lineage context | **Reference only** | PhysioNet terms | Understand that Pulse/BioGears inherit from the MIT/HMS lumped-parameter tradition; MIMIC databases are siblings from the same open-science lineage |

## Wrapping strategy per project

### Pulse Physiology Engine (primary)

**How it is wrapped**

- As a sidecar process exposing the Pulse API to `services/sim-harness/` through either:
  - Option A: Pulse's native Python bindings run inside a Python subprocess, addressed via stdio or a local socket
  - Option B: a thin REST or gRPC wrapper around the Python bindings so the TS adapter is process-agnostic
- The decision between A and B is deferred until first runtime batch. Both options keep the TypeScript monorepo clean and neither touches the Pulse C++ core.

**What the adapter owns**

- Patient initialization (height, weight, demographics, comorbidities — seedable from a MIMIC-IV patient row per `wiki/concepts/medical-digital-twin.md`)
- Action dispatch (insult, intervention, medication administration, environmental change)
- Tick-driven advance of simulated time
- Data retrieval (vital signs, compartment-specific physiology, substance-specific drug concentrations, waveforms)
- Scenario state serialization per Pulse's state JSON/XML format

**What the adapter does not own**

- any physiology math (that is Pulse's job)
- any rhythm generation math (that is Pulse + the Layer 3 rhythm template layer)
- any patient-context assembly (that is `services/clinical-mcp/`)

**License posture**

- Apache-2.0 permissive. No copyleft. Redistribution is allowed. Attribution preserved in the sim-harness README and scaffold doc.
- Kitware copyright is noted on every Pulse-sourced artifact.

### BioGears (fallback)

**How it is wrapped**

- Same adapter pattern as Pulse, behind a secondary adapter interface. Only bootstrapped when a scenario requires a physiological regime Pulse under-models (for first batch: whole-body sepsis is the canonical test).
- **Deferred from the first runtime batch.** Ships as a contract-only stub, not a running sidecar.

**Why it is kept on the map**

- Pulse's 2017 fork from BioGears 6.1 means BioGears occasionally still has cleaner handling for some system dynamics, and it remains under active maintenance by its own community.
- Having two wrappable engines keeps noah-rn from being single-vendor on physiology even though Pulse is the current default.

### Infirmary Integrated (pattern only)

**What is stolen**

- Rhythm taxonomy for Layer 3 canonical cycle templates. Infirmary Integrated's mathematical rhythm catalog (sinus, bigeminy, trigeminy, PACs, SSS, SA arrest, AF, flutter, AV blocks 1° / Mobitz I / Mobitz II / 3°, BBB, asystole, idioventricular, PEA, junctional, CPR artifact) is exactly the rhythm surface a noah-rn ICU workflow needs.
- The waveform generation approach: "algorithmically rendered from multiple interacting physiological factors, not static loops" — independent atrial and ventricular contractions, aberrant/ectopic beats, respiratory-variation effects. This informs how the Layer 3 rhythm template interpolator composes cycle templates with the Pulse hemodynamics.
- Scenario Editor UX as a model for how noah-rn's scenario timeline files should feel to author.

**What is not stolen**

- The II:SIM desktop application itself (C#/.NET). Not run as a sidecar; not a dependency.
- The II:EHR web fork (PHP/SQLite/NPM). Not a dependency. Medplum is noah-rn's EHR.

**Cultural note**

- Infirmary Integrated is authored by Ibi Keller, MSN RN CCRN CEN CNE — an actively practicing critical-care nurse. Shane is in the same demographic. The existence of this project is load-bearing evidence that clinician-authored open-source clinical software ships at device-grade fidelity, and its rhythm model is therefore the first reference consulted before any rhythm taxonomy decision.

### rohySimulator (pattern only)

**What is stolen**

- The multi-LLM backend pattern (OpenAI / LM Studio / Ollama) maps directly to noah-rn's dual-target runtime framing (see `wiki/concepts/dual-target-runtime.md`). The sim-harness LLM-driven virtual-patient dialogue, when it eventually exists, should follow this shape.
- The 77+ lab database structure as a reference for how labs are exposed to the agent through `sim_get_live_vitals` and adjacent tools.

**What is not stolen**

- The Node/React app itself. Not run as a sidecar.

### Auto-ALS / Virtu-ALS (pattern only for first batch)

**What is stolen**

- The OpenAI Gym observation-space shape: `{MeasuredHeartRate, MeasuredRespRate, MeasuredCapillaryGlucose, MeasuredTemperature, MeasuredMAP, MeasuredSats, time_since_last_measurement}`. This is the exact pattern the eventual meta-harness Gym wrapper should emit.
- The ABCDE protocol ordering as a reward signal reference for eventual RL work.

**What is deferred**

- Actually wrapping the sim-harness in a Gym-compatible interface. Deferred until the static golden test suite is mature enough that there is a concrete meta-harness loop asking for it. See `wiki/concepts/meta-harness-optimization.md` and `wiki/concepts/clinical-simulator-as-eval-substrate.md`.

## The adapter boundary

All wrapping lives behind a stable adapter boundary inside `services/sim-harness/`. The boundary is explicitly designed so that:

- an adapter can be swapped (Pulse → BioGears) without touching the Layer 1–5 code above it
- an adapter can be run as a sidecar or in-process without touching the consumer code
- adapter version pinning is explicit (any wrapped engine version is recorded in a decision record inside the adapter)
- the adapter never leaks physiology-engine-specific types up into Layer 1–5 — only canonical shapes (PatientState, VitalSignSnapshot, WaveformSamples, RhythmLabel)

The adapter boundary is the mechanism that prevents the sim-harness from becoming load-bearingly Pulse-specific even though Pulse is the current default.

## Runtime process topology (deferred, for reference)

When runtime work starts, the expected process topology is:

```text
clinician-dashboard (browser, apps/clinician-dashboard/)
       ↓ HTTP + WebSocket
clinical-mcp (Node, services/clinical-mcp/) ←────── agents (pi.dev, packages/agent-harness/)
       ↓ in-process (TypeScript adapter call)
sim-harness (Node, services/sim-harness/)
       ↓ stdio / local socket
Pulse sidecar (Python, vendored or externally installed)
       ↓ C++ core bindings
Pulse Physiology Engine
```

And in parallel:

```text
sim-harness ─── writes FHIR Observations / Encounter / MedicationAdministration / Procedure ──→ Medplum (infrastructure/)
                                                                                                      ↑
                                                                                          clinical-mcp reads ──── agents
```

## License and attribution posture

- Every wrapped engine is Apache-2.0 or comparably permissive. Attribution is preserved in `services/sim-harness/README.md` once the engines are actually vendored.
- No wrapped engine introduces a copyleft obligation on noah-rn.
- CVSim / PhysioNet material is referenced but not redistributed.

## Open decisions

- **Pulse transport: Python binding stdio vs REST sidecar.** Both work. Deferred to first runtime batch. Recorded here so the decision is visible when made.
- **BioGears bootstrap trigger.** What scenario or eval gap is allowed to trigger the BioGears fallback adapter? Default: none, until Pulse visibly fails on a specific physiological regime a workflow needs.
- **Infirmary Integrated rhythm template sourcing.** Infirmary Integrated's rhythm model is a reference, but noah-rn needs its own template asset files. Whether to hand-author them, derive them from Pulse, or derive them from a public ECG database (PhysioNet's own MIT-BIH arrhythmia database is a candidate) is deferred.
- **Gym wrapper adoption trigger.** What failure mode in the static golden test suite would justify building the Gym-compatible adapter? Default: none, until the static suite stops compounding useful signal.

## What this doc does not decide

- scenario timeline authoring format (that is a runtime decision)
- waveform rendering library selection (that is a runtime decision)
- Medplum write-back batching strategy (that is in `sim-harness-runtime-access-contract.md`'s territory and is a runtime decision)
- whether to run Pulse in a container vs a vendored Python environment (runtime decision, recorded when first runtime batch lands)

## References

- `docs/foundations/sim-harness-scaffold.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`
- `docs/foundations/sim-harness-waveform-vision-contract.md`
- `research/Open Source Clinical Simulation.md`
- `research/Open Source Clinical Simulation.original.md`
- `research/Architectural integration for noah-rn clinical simulation.md`
- `wiki/entities/pulse-physiology-engine.md`
- `wiki/entities/biogears.md`
- `wiki/entities/infirmary-integrated.md`
- `wiki/entities/rohysimulator.md`
- `wiki/entities/auto-als.md`
- `wiki/concepts/computational-physiology-engine.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
- `wiki/concepts/dual-target-runtime.md`
