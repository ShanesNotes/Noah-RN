// Minimal Phase 8 stub store for the sim-harness MCP skeleton.
//
// Real instance state (running scenarios, per-encounter clocks, waveform
// buffers) binds through the scenario controller + instance store in
// Phase 8b. This file provides deterministic placeholders so the MCP
// tools return contract-shaped responses during tool-registration
// testing and early consumer integration.
//
// This file is explicitly labeled stub; it does NOT drive real physiology.

import type {
  SimLiveVitalsSnapshot,
  SimScenarioSummary,
  SimEncounterView,
} from '../index.js';

const STUB_SCENARIOS: SimScenarioSummary[] = [
  {
    id: 'pressor-titration',
    name: 'Pressor Titration',
    description: 'Post-op ICU patient on norepinephrine — titration decision-support scenario.',
    starting_demographics: { age: 64, sex: 'F', weight_kg: 72 },
    seed_from: 'hand-authored',
    estimated_duration_minutes: 60,
  },
  {
    id: 'fluid-responsive',
    name: 'Fluid Responsive Shock',
    description: 'Septic shock with fluid-responsive hemodynamics; guides fluid + pressor decisions.',
    starting_demographics: { age: 71, sex: 'M', weight_kg: 85 },
    seed_from: 'hand-authored',
    estimated_duration_minutes: 75,
  },
  {
    id: 'hyporesponsive',
    name: 'Hyporesponsive Shock',
    description: 'Refractory shock not responding to initial resuscitation.',
    starting_demographics: { age: 58, sex: 'F', weight_kg: 68 },
    seed_from: 'hand-authored',
    estimated_duration_minutes: 90,
  },
];

function defaultVitals(): SimLiveVitalsSnapshot {
  return {
    hr: 96,
    rr: 18,
    spo2: 96,
    etco2: 36,
    map: 68,
    sbp: 112,
    dbp: 64,
    temp_c: 37.1,
    rhythm_label: 'sinus',
    captured_at: new Date(0).toISOString(),
    scenario_minutes_elapsed: 0,
  };
}

interface InstanceState {
  encounter_id: string;
  scenario_id: string;
  scenario_name: string;
  clock_mode: 'wall-clock' | 'accelerated' | 'frozen';
  minutes_elapsed: number;
  vitals: SimLiveVitalsSnapshot;
}

const instances = new Map<string, InstanceState>();

export function __resetStubStoreForTests(): void {
  instances.clear();
}

export function listScenarios(): SimScenarioSummary[] {
  return [...STUB_SCENARIOS];
}

export function loadScenario(scenarioId: string, encounterId: string): SimEncounterView {
  const summary = STUB_SCENARIOS.find((s) => s.id === scenarioId);
  if (!summary) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  const vitals = defaultVitals();
  instances.set(encounterId, {
    encounter_id: encounterId,
    scenario_id: summary.id,
    scenario_name: summary.name,
    clock_mode: 'frozen',
    minutes_elapsed: 0,
    vitals,
  });
  return {
    encounter_id: encounterId,
    scenario_id: summary.id,
    scenario_name: summary.name,
    scenario_minutes_elapsed: 0,
    physiology_source: 'fallback',
    active_drugs: [],
    active_interventions: [],
    upcoming_scheduled_events_visible_to_agent: null,
  };
}

export function getVitalsSnapshot(encounterId: string): SimLiveVitalsSnapshot {
  const state = instances.get(encounterId);
  if (!state) {
    throw new Error(`No loaded scenario for encounter: ${encounterId}. Call sim_load_scenario first.`);
  }
  return {
    ...state.vitals,
    captured_at: new Date().toISOString(),
    scenario_minutes_elapsed: state.minutes_elapsed,
  };
}

export function advanceClock(encounterId: string, durationSeconds: number): SimLiveVitalsSnapshot {
  const state = instances.get(encounterId);
  if (!state) {
    throw new Error(`No loaded scenario for encounter: ${encounterId}. Call sim_load_scenario first.`);
  }
  state.minutes_elapsed += durationSeconds / 60;
  // Placeholder physiology drift — real physiology lands in Phase 8b via the
  // scenario controller's engine adapter.
  state.vitals = {
    ...state.vitals,
    scenario_minutes_elapsed: state.minutes_elapsed,
    captured_at: new Date().toISOString(),
  };
  return state.vitals;
}

export function setClockMode(encounterId: string, mode: 'wall-clock' | 'accelerated' | 'frozen'): void {
  const state = instances.get(encounterId);
  if (!state) {
    throw new Error(`No loaded scenario for encounter: ${encounterId}. Call sim_load_scenario first.`);
  }
  state.clock_mode = mode;
}
