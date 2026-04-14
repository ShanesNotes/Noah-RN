/**
 * Type vocabulary for the Clinical Simulation Harness.
 *
 * These contracts mirror the agent-facing tool surface defined in Contracts 4
 * (Monitor), 5 (Charting), 6 (Scenario/Intervention), and 7 (Obligations) in
 * `docs/foundations/foundational-contracts-simulation-architecture.md`.
 *
 * Layer annotations on interfaces follow the invariant kernel's L0–L4
 * projection model. Types without an explicit `@layer` tag are structural
 * and cross-cutting (enums, format selectors, response envelopes).
 *
 * Runtime wiring is deferred to execution-packet Lane F.
 */

export type PhysiologySource =
  | "pulse"
  | "biogears"
  | "infirmary-integrated-template"
  | "fallback";

export type SimWaveformFormat = "png" | "svg";
export type SimAdministeredBy = "agent" | "scenario-director" | "clinician";
export type SimSeedSource = "mimic" | "synthetic" | "hand-authored";

/**
 * Simulation-clock mode contract per Contract 3.
 *
 * @layer L0 control surface (clock is the single time authority)
 */
export interface SimulationClockContract {
  mode: "wall-clock" | "accelerated" | "frozen" | "skip-ahead";
  encounterScopedStateIsolation: boolean;
}

/**
 * Live numeric telemetry frame produced by the L1 monitor projection.
 *
 * @layer L1
 */
export interface SimLiveVitalsSnapshot {
  hr: number;
  rr: number;
  spo2: number;
  etco2: number;
  map: number;
  sbp: number;
  dbp: number;
  temp_c: number;
  rhythm_label: string;
  captured_at: string;
  scenario_minutes_elapsed: number;
}

/**
 * @layer L1 (waveform vision — numeric form per the waveform vision contract)
 */
export interface SimWaveformSamplesRequest {
  encounter_id: string;
  leads: string[];
  seconds: number;
  start_offset_seconds?: number;
}

/** @layer L1 */
export interface SimWaveformSamplesResponse {
  sample_rate_hz: number;
  leads: Record<string, number[]>;
  start_time: string;
  end_time: string;
  physiology_source: PhysiologySource;
}

/** @layer L1 (waveform vision — rendered form) */
export interface SimWaveformImageRequest {
  encounter_id: string;
  leads: string[];
  seconds: number;
  start_offset_seconds?: number;
  format: SimWaveformFormat;
}

/** @layer L1 */
export interface SimWaveformImageResponse {
  image_bytes: string;
  format: SimWaveformFormat;
  sweep_speed_mm_per_s: number;
  amplitude_mm_per_mv: number;
  grid: boolean;
  leads: string[];
  captured_at: string;
}

/** @layer L2 intervention input — closed at L0, propagated L0→L1→L3→L4 */
export interface SimAdministerMedicationRequest {
  encounter_id: string;
  medication: string;
  dose: number;
  unit: string;
  route: string;
  administered_by: SimAdministeredBy;
}

/** @layer L2 (response) + L1 (new_vitals projection) */
export interface SimAdministerMedicationResponse {
  medication_administration_id: string;
  accepted: boolean;
  engine_response_summary: string;
  new_vitals: SimLiveVitalsSnapshot;
}

/** @layer L2 intervention input */
export interface SimOrderInterventionRequest {
  encounter_id: string;
  intervention: string;
  parameters?: Record<string, unknown>;
  ordered_by: SimAdministeredBy;
}

/** @layer L2 (response) + L1 (new_vitals projection) */
export interface SimOrderInterventionResponse {
  procedure_id: string;
  accepted: boolean;
  engine_response_summary: string;
  new_vitals: SimLiveVitalsSnapshot;
}

/** @layer L2 */
export interface SimScheduledEvent {
  minute: number;
  event: string;
}

/**
 * Agent-facing encounter view.
 *
 * @layer L2 (scenario metadata) — must not leak L0 internals.
 *
 * Per the scaffold-salvage audit and the rewrite marker on the runtime-access
 * contract, this shape is a working reference; `physiology_source` is
 * constrained to the PhysiologySource enum (no free-form strings) to prevent
 * L0 source leakage into agent-visible state.
 */
export interface SimEncounterView {
  encounter_id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_minutes_elapsed: number;
  physiology_source: PhysiologySource;
  active_drugs: Array<{ name: string; dose: number; unit: string }>;
  active_interventions: string[];
  upcoming_scheduled_events_visible_to_agent: SimScheduledEvent[] | null;
}

/** @layer L2 (scenario catalog entry) */
export interface SimScenarioSummary {
  id: string;
  name: string;
  description: string;
  starting_demographics: Record<string, unknown>;
  seed_from: SimSeedSource;
  estimated_duration_minutes: number;
}

/** @layer L2 (scenario list response envelope) */
export interface SimListScenariosResponse {
  scenarios: SimScenarioSummary[];
}

/** @layer L2 */
export interface SimScenarioStateDescription {
  summary_markdown: string;
  event_history: SimScheduledEvent[];
}

// Placeholder surfaces for Contracts 4/5/7 (alarm, charting, obligation).
// Full type design lands alongside the runtime-access-contract rewrite; these
// markers reserve the shape so downstream imports stabilize.

/** @layer L1 — alarm event; full shape deferred to Contract 4 implementation. */
export interface SimAlarmEventPlaceholder {
  encounter_id: string;
  priority: "high" | "medium" | "low";
  kind: "threshold" | "arrhythmia" | "technical";
  parameter?: string;
  captured_at: string;
}

/** @layer L3 — charting authority state; full model deferred to Contract 5. */
export type SimChartingAuthorityPlaceholder =
  | "observe"
  | "propose"
  | "prepare"
  | "execute"
  | "attest"
  | "escalate";

/** @layer L4 — obligation record; full lifecycle deferred to Contract 7. */
export interface SimObligationPlaceholder {
  encounter_id: string;
  kind: "ordered-cadence" | "event-driven" | "judgment-driven";
  due_at_scenario_minute: number;
  status: "pending" | "due" | "overdue" | "resolved" | "deferred" | "escalated";
}
