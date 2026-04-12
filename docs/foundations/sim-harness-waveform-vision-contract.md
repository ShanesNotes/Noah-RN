# Clinical Simulation Harness Waveform Vision Contract

## Purpose

Define the non-negotiable requirement that the agent running inside Noah RN **must** have direct vision on the raw waveform surface of any live-simulated clinical encounter. Rhythm labels and numeric vitals alone are not sufficient — they bake a silent-failure surface into the harness.

A nurse validates a rhythm reading by looking at the strip. The agent must do the same.

## Governing alignment

- `PLAN.md` Decision Log 2026-04-11 — agent must have vision on raw waveform for clinical validation
- `docs/foundations/sim-harness-scaffold.md` — Layer 3 (waveform generation) and Layer 5 (agent-facing MCP tool surface)
- `docs/foundations/sim-harness-runtime-access-contract.md` — the `sim_get_waveform_samples` and `sim_get_waveform_image` MCP tools are the enforcement surface of this contract
- `wiki/concepts/emergent-vitals-from-physics.md` — why waveforms are the right ground truth for hemodynamic and rhythm claims
- `wiki/concepts/computational-physiology-engine.md` — why labels alone decouple claims from the physics

## The rule

Any workflow running against a live sim-harness encounter must be able to answer the question *"how do you know this is v-tach?"* by pointing at the raw waveform surface, not by repeating a rhythm label.

Formally:

1. The sim-harness **must** produce both a numeric (sample array) and visual (rendered image) representation of the waveform for every active lead on every sim-backed encounter.
2. Both representations **must** be reachable by the agent through MCP tools registered at the `services/clinical-mcp/` boundary — specifically `sim_get_waveform_samples` and `sim_get_waveform_image`.
3. Any workflow that emits a rhythm, ischemia, or hemodynamic claim from a sim-backed encounter **must** have had the opportunity to call at least one of those tools before emitting the claim. Enforcement can be soft (trace audit) or hard (hook veto) depending on the workflow; the contract only requires that the surface exists.
4. The rendered image **must** match the clinical convention a nurse expects: 25 mm/s sweep speed by default, 10 mm/mV amplitude by default, grid on by default, leads labeled.
5. The sample array **must** carry its sample rate, its lead identifiers, its physiology source (Pulse, BioGears, Infirmary Integrated template, fallback), and its absolute time window so the agent can reason about QRS width, PR interval, ST elevation, respiratory variation, and any other numeric claim without guessing timing.
6. Label fields on the live-vitals snapshot (`rhythm_label`, `ischemia_flag`, etc.) are advisory only. They are never the single source of truth for an agent-emitted clinical claim.

## Why both forms

Some claims are visual: *"this looks like polymorphic v-tach, not monomorphic"*, *"the ST segment is scooped, not elevated"*, *"the baseline is wandering"*. Vision-capable models handle these directly against a rendered image.

Other claims are numeric: *"QRS is 140 ms wide, so this is wide-complex"*, *"the PR interval is 260 ms"*, *"the ST segment is elevated 2.3 mm in Lead II"*. Numeric claims belong on the sample array where measurement is exact.

The contract demands both because the agent should use whichever form the claim actually depends on — and be corrigible by a downstream reviewer on the form the reviewer trusts.

## What "raw waveform" means

Per `wiki/concepts/emergent-vitals-from-physics.md`, Pulse-style engines already carry waveforms as either:

- **emergent physics outputs** — arterial BP, CVP, plethysmography, capnography fall out of the 0-D lumped-parameter circuit analogs as genuine physics outputs; these are *natively* raw.
- **stored-and-interpolated digitized traces** — ECG Lead I–XII in Pulse is stored as canonical cycle templates and interpolated per cardiac cycle, because full bidomain electrophysiology is too expensive for real-time. The stored trace is digitized voltage-over-time and is still raw from the agent's perspective.

Both forms are acceptable under this contract. The agent does not need to know whether an ECG came from a physics simulation or an interpolated template. It needs the numeric samples and the rendered image.

## Buffer retention

The sim-harness **must** retain at least the last **60 seconds** of waveform samples per active lead per active encounter, in memory. This is enough for:

- rhythm strip visual inspection (standard 10-second strip fits 6× over)
- QRS-by-QRS numeric analysis across a typical arrhythmia
- capnography cycle analysis across a dozen breath cycles

Longer retention is allowed but not required. Waveforms do not need to be written to FHIR — FHIR receives vital signs and observations on the write-back cadence; waveforms stay in the sim-harness in-memory buffer.

## Lead coverage

Minimum acceptable:

- ECG: Leads I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6 (full 12-lead) when rhythm generation is from a Pulse-class engine or an Infirmary-Integrated-style stored template.
- ECG minimum fallback: Lead II and V1 if a wrapped engine does not expose 12-lead natively. The fallback surface **must** be declared in the `physiology_source` field of the sample output so the agent can reason about coverage.
- Plethysmography: SpO2 waveform per connected probe.
- Capnography: ETCO2 waveform when the scenario involves respiratory monitoring.
- Arterial line: when an A-line intervention has been placed in the current scenario.
- CVP: when a central line has been placed.
- ICP: when ICP monitoring has been placed.

## Enforcement

This contract is enforced at three layers:

1. **Existence** — `services/sim-harness/` must expose the waveform samples and image endpoints. `services/clinical-mcp/` must register `sim_get_waveform_samples` and `sim_get_waveform_image` whenever a sim-harness workspace center is present.
2. **Observability** — every call to `sim_get_waveform_samples` / `sim_get_waveform_image` is traced under `evals/` per the observability contract. This is the soft enforcement surface: a workflow that emits a rhythm claim without first reading the waveform is visible in the trace and becomes an eval failure.
3. **Optional hard enforcement** — a safety hook under `tools/safety-hooks/` may block a workflow output tagged as a rhythm or hemodynamic claim if no waveform read was observed in the trace for that workflow invocation. Whether to enable the hook is a per-workflow decision recorded in the workflow's SKILL.md contract.

## What this contract does not do

- It does not mandate a specific vision-capable model for the rendered image. The clinical-mcp boundary returns bytes; the downstream model is the workflow's choice.
- It does not replace the rhythm label surface entirely. Labels still exist as advisory metadata on the live-vitals snapshot. The contract just forbids labels from being the single source of truth for a clinical claim.
- It does not extend to static MIMIC encounters. Real MIMIC-IV data does not ship a raw waveform surface at this resolution. The contract is only binding when the encounter is sim-backed.
- It does not govern how `apps/clinician-dashboard/` renders the waveform for the clinician. The clinician waveform viewer is a downstream consumer of the same data but its UX is not in scope here.

## References

- `docs/foundations/sim-harness-scaffold.md`
- `docs/foundations/sim-harness-runtime-access-contract.md`
- `docs/foundations/sim-harness-engine-wrapping.md`
- `wiki/concepts/emergent-vitals-from-physics.md`
- `wiki/concepts/computational-physiology-engine.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
- `wiki/concepts/silent-failures.md`
- `research/Open Source Clinical Simulation.md`
