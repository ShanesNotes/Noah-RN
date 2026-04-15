// --- Runtime modules ---
export { SimulationClock } from "./clock.js";
export type { ClockMode, ClockOptions } from "./clock.js";
export { WaveformBuffer } from "./waveform-buffer.js";
export { WaveformInterpolator } from "./waveform-interpolator.js";
export { WaveformRenderer } from "./waveform-renderer.js";
export type { RenderOptions } from "./waveform-renderer.js";
export type { RhythmTemplate } from "./waveforms/rhythms/schema.js";
export {
  loadRhythmTemplate,
  loadAllTemplates,
  validateTemplate,
} from "./waveforms/rhythms/schema.js";
export { SimulationEngine } from "./engine.js";
export type { EngineOptions } from "./engine.js";
export type {
  Scenario,
  ScenarioEvent,
  ScenarioEventAction,
  VitalsTarget,
} from "./scenario.js";
export { loadScenario, loadAllScenarios } from "./scenario.js";
export { DeviceBridge, OBSERVATION_ORIGIN_SYSTEM, DEVICE_ORIGIN_SYSTEM } from "./device-bridge.js";
export type {
  DeviceBridgeOptions,
  WriterResult,
  FhirTransactionBundle,
  FhirObservation,
  FhirDevice,
  FhirEncounter,
} from "./device-bridge.js";

// --- Contract types ---
export type PhysiologySource =
  | "pulse"
  | "biogears"
  | "infirmary-integrated-template"
  | "fallback";

export type SimWaveformFormat = "png" | "svg";
export type SimAdministeredBy = "agent" | "scenario-director" | "clinician";
export type SimSeedSource = "mimic" | "synthetic" | "hand-authored";

export interface SimulationClockContract {
  mode: "wall-clock" | "accelerated" | "frozen";
  encounterScopedStateIsolation: boolean;
}

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

export interface SimWaveformSamplesRequest {
  encounter_id: string;
  leads: string[];
  seconds: number;
  start_offset_seconds?: number;
}

export interface SimWaveformSamplesResponse {
  sample_rate_hz: number;
  leads: Record<string, number[]>;
  start_time: string;
  end_time: string;
  physiology_source: PhysiologySource;
}

export interface SimWaveformImageRequest {
  encounter_id: string;
  leads: string[];
  seconds: number;
  start_offset_seconds?: number;
  format: SimWaveformFormat;
}

export interface SimWaveformImageResponse {
  image_bytes: string;
  format: SimWaveformFormat;
  sweep_speed_mm_per_s: number;
  amplitude_mm_per_mv: number;
  grid: boolean;
  leads: string[];
  captured_at: string;
}

export interface SimAdministerMedicationRequest {
  encounter_id: string;
  medication: string;
  dose: number;
  unit: string;
  route: string;
  administered_by: SimAdministeredBy;
}

export interface SimAdministerMedicationResponse {
  medication_administration_id: string;
  accepted: boolean;
  engine_response_summary: string;
  new_vitals: SimLiveVitalsSnapshot;
}

export interface SimOrderInterventionRequest {
  encounter_id: string;
  intervention: string;
  parameters?: Record<string, unknown>;
  ordered_by: SimAdministeredBy;
}

export interface SimOrderInterventionResponse {
  procedure_id: string;
  accepted: boolean;
  engine_response_summary: string;
  new_vitals: SimLiveVitalsSnapshot;
}

export interface SimScheduledEvent {
  minute: number;
  event: string;
}

export interface SimEncounterView {
  encounter_id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_minutes_elapsed: number;
  physiology_source: PhysiologySource | string;
  active_drugs: Array<{ name: string; dose: number; unit: string }>;
  active_interventions: string[];
  upcoming_scheduled_events_visible_to_agent: SimScheduledEvent[] | null;
}

export interface SimScenarioSummary {
  id: string;
  name: string;
  description: string;
  starting_demographics: Record<string, unknown>;
  seed_from: SimSeedSource;
  estimated_duration_minutes: number;
}

export interface SimScenarioStateDescription {
  summary_markdown: string;
  event_history: SimScheduledEvent[];
}

export interface SimulationFidelityContract {
  waveformBufferSeconds: 60;
  supportsWaveformVision: true;
  agentAccessBoundary: "services/clinical-mcp";
  writeBackBoundary: "medplum-fhir";
  wrappedEnginePolicy: "wrap-dont-rebuild";
}

export const simulationFidelityContract: SimulationFidelityContract = {
  waveformBufferSeconds: 60,
  supportsWaveformVision: true,
  agentAccessBoundary: "services/clinical-mcp",
  writeBackBoundary: "medplum-fhir",
  wrappedEnginePolicy: "wrap-dont-rebuild",
};
