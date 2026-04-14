# Clinical Simulation Harness Runtime Access Contract

> **Status (2026-04-13): working reference, superseded for authority.** The scaffold-salvage audit classified this document **REWRITE**. The canonical tool-surface authority is now:
>
> - Contract 4 (Monitor Telemetry, Alarm, and Artifact) in `docs/foundations/foundational-contracts-simulation-architecture.md` for live-vitals, waveform, alarm, signal-quality, and artifact tools.
> - Contract 6 (Scenario and Intervention) in the same file for intervention, medication, and scenario-state tools.
> - Contract 5 (Charting Policy and Provenance) for charting tools — which this document does **not** yet cover.
> - Contract 7 (Workspace and Obligation) for obligation tools — also not yet covered.
>
> The 8-tool surface below is retained as a working reference during implementation. It will be replaced incrementally as per-contract tool specs are produced (execution-packet Lanes D, E). Treat this document as a starting vocabulary, not a locked surface. `sim_read_current_encounter` in particular leaks L0 internals and must be re-specified with explicit layer annotations before implementation.

## Purpose

Define the agent-facing surface for interacting with a live Clinical Simulation Harness encounter. Agents never talk to `services/sim-harness/` directly. They reach it through `services/clinical-mcp/` — either as ordinary FHIR context reads that happen to be sim-backed, or through a small number of sim-only MCP tools registered at the clinical-mcp boundary.

This file locks the agent-facing contract shape. Actual runtime code is deferred.

## Governing alignment

- `docs/foundations/invariant-kernel-simulation-architecture.md` — canonical kernel and layer semantics
- `docs/foundations/foundational-contracts-simulation-architecture.md` — canonical contract authority
- `docs/foundations/sim-harness-scaffold.md` — historical pointer
- `docs/foundations/sim-harness-waveform-vision-contract.md` — waveform vision surface (depended on by the `get_waveform_*` tools defined below)
- `docs/foundations/sim-harness-engine-wrapping.md` — the Layer 0 engines that ultimately back these tools
- `docs/ARCHITECTURE.md` — runtime relationship map showing the sim-harness → Medplum → clinical-mcp → agent path

## Access modes

The agent has two access modes to a live sim-harness encounter.

### Mode 1: Implicit access via FHIR context reads

The agent reads patient context through the ordinary clinical-mcp patient-context bundle path. When the underlying encounter is sim-driven, the sim-harness has already written Observation / Encounter / MedicationAdministration / Procedure resources into Medplum on its write-back cadence. The agent experiences this as ordinary chart context — it looks identical to a static MIMIC read.

This mode exists to guarantee that every workflow that runs against real data also runs against live simulation without code changes. **The same patient-context bundle serves both.**

No new MCP tools are required for Mode 1. The contract shape is the existing `services/clinical-mcp/` patient-context bundle.

### Mode 2: Explicit sim-only MCP tools

A small number of tools are registered at the clinical-mcp boundary **only** when the encounter is sim-backed. These tools expose the parts of the simulation that are not captured in FHIR, and the parts that the agent needs real-time access to without waiting for a flowsheet write cycle.

The tools are:

1. `sim_get_live_vitals`
2. `sim_get_waveform_samples`
3. `sim_get_waveform_image`
4. `sim_administer_medication`
5. `sim_order_intervention`
6. `sim_read_current_encounter`
7. `sim_list_scenarios`
8. `sim_describe_scenario_state`

Each tool is specified below at contract level only — shape, not implementation.

## Tool contracts

### 1. `sim_get_live_vitals`

Returns the current vital-sign snapshot without waiting for the next FHIR write.

- Input: `{ encounter_id: string }`
- Output: `{ hr: number, rr: number, spo2: number, etco2: number, map: number, sbp: number, dbp: number, temp_c: number, rhythm_label: string, captured_at: iso8601, scenario_minutes_elapsed: number }`
- Failure modes: unknown `encounter_id`; encounter not sim-backed; engine stale.
- Safety note: `rhythm_label` is advisory only. The agent must not base clinical claims on it without cross-checking via `sim_get_waveform_image` and/or `sim_get_waveform_samples`. See `sim-harness-waveform-vision-contract.md`.

### 2. `sim_get_waveform_samples`

Returns a raw voltage sample array for one or more leads over a time window.

- Input: `{ encounter_id: string, leads: string[], seconds: number, start_offset_seconds?: number }`
- Output: `{ sample_rate_hz: number, leads: { [lead: string]: number[] }, start_time: iso8601, end_time: iso8601, physiology_source: "pulse" | "biogears" | "infirmary-integrated-template" | "fallback" }`
- Failure modes: requested window exceeds retained buffer; unknown lead; `seconds` above configured ceiling.
- Safety note: this is the numeric form of waveform vision. See waveform vision contract.

### 3. `sim_get_waveform_image`

Returns a rendered image of the waveform for vision-capable model inspection.

- Input: `{ encounter_id: string, leads: string[], seconds: number, start_offset_seconds?: number, format: "png" | "svg" }`
- Output: `{ image_bytes: base64, format: "png" | "svg", sweep_speed_mm_per_s: number, amplitude_mm_per_mv: number, grid: boolean, leads: string[], captured_at: iso8601 }`
- Default `sweep_speed_mm_per_s` is 25 (standard clinical ECG). Default `amplitude_mm_per_mv` is 10. Grid defaults on.
- Failure modes: unsupported format; window exceeds retained buffer.
- Safety note: this is the visual form of waveform vision. The agent is expected to use it to validate rhythm and hemodynamic claims against the raw surface, not against metadata labels.

### 4. `sim_administer_medication`

Applies a medication administration to the live physiology engine and writes a MedicationAdministration resource to FHIR.

- Input: `{ encounter_id: string, medication: string, dose: number, unit: string, route: string, administered_by: "agent" | "scenario-director" | "clinician" }`
- Output: `{ medication_administration_id: string, accepted: boolean, engine_response_summary: string, new_vitals: (same shape as sim_get_live_vitals output) }`
- Failure modes: unknown medication; dose out of engine range; encounter not sim-backed; engine refuses (e.g., safety rule inside the engine).
- Safety note: the engine-layer refusal surface is the final deterministic gate. A successful return does not imply clinical appropriateness — that is still the workflow's responsibility.

### 5. `sim_order_intervention`

Applies a non-medication intervention (intubation, central line placement, chest tube, defibrillation, pacing, fluid bolus, etc.) to the live physiology engine and writes a Procedure resource.

- Input: `{ encounter_id: string, intervention: string, parameters?: { [key: string]: any }, ordered_by: "agent" | "scenario-director" | "clinician" }`
- Output: `{ procedure_id: string, accepted: boolean, engine_response_summary: string, new_vitals: (same shape as sim_get_live_vitals output) }`
- Failure modes: unsupported intervention for the current engine; parameters out of range; encounter not sim-backed.

### 6. `sim_read_current_encounter`

Returns the full sim-harness view of the current encounter — including scenario metadata that is not captured in FHIR (scenario id, elapsed simulated minutes, director-scheduled upcoming events when visible, engine physiology source).

- Input: `{ encounter_id: string }`
- Output: `{ encounter_id: string, scenario_id: string, scenario_name: string, scenario_minutes_elapsed: number, physiology_source: string, active_drugs: {name, dose, unit}[], active_interventions: string[], upcoming_scheduled_events_visible_to_agent: ScheduledEvent[] | null }`
- Failure modes: encounter not sim-backed.
- Visibility note: `upcoming_scheduled_events_visible_to_agent` is intentionally scoped. Some evaluation modes hide future events from the agent; others reveal them for teaching mode. The scenario director decides which.

### 7. `sim_list_scenarios`

Returns the catalog of authored scenario timelines available to the sim-harness.

- Input: `{}`
- Output: `{ scenarios: { id: string, name: string, description: string, starting_demographics: {...}, seed_from: "mimic" | "synthetic" | "hand-authored", estimated_duration_minutes: number }[] }`

### 8. `sim_describe_scenario_state`

Returns a human-readable summary of the current scenario state for audit and UI surfaces.

- Input: `{ encounter_id: string }`
- Output: `{ summary_markdown: string, event_history: { minute: number, event: string }[] }`

## Registration path

- All sim-only tools register through `services/clinical-mcp/` at the time the clinical-mcp service is started and the sim-harness workspace center is detected.
- If the sim-harness workspace center is absent, none of these tools are exposed and the agent operates on static context only. This keeps static and live modes symmetric at the agent level.
- Tool names use the `sim_` prefix so they can be filtered at the routing layer when a workflow must forbid live-sim access (e.g., golden-test mode).

## What is explicitly out of scope for this contract

- engine configuration tools (e.g., loading a different Pulse patient template) — those are infrastructure-layer operations, not agent-level operations
- scenario authoring tools (authoring happens in JSON files, not through agent calls)
- clock manipulation tools (pause, resume, speed up) — those are dashboard operations, not agent operations
- multi-patient orchestration across encounters

## References

- `docs/foundations/sim-harness-scaffold.md`
- `docs/foundations/sim-harness-waveform-vision-contract.md`
- `docs/foundations/sim-harness-engine-wrapping.md`
- `docs/ARCHITECTURE.md`
- `research/Open Source Clinical Simulation.md`
- `wiki/concepts/clinical-simulator-as-eval-substrate.md`
