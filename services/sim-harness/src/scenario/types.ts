/**
 * Scenario definition and response types.
 *
 * @layer L2 (scenario controller) with L0 initial state
 *
 * These types describe the scenario-director surface (Contract 6). A
 * ScenarioDefinition is authored data; a ScenarioResponse is the
 * controller-produced snapshot exposed to callers.
 */
import type { ActiveDrug, PhysiologyState } from '../reference/pharmacokinetics.js';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  basePatientId: string;
  patientWeight: number;
  initialState: Omit<PhysiologyState, 'rng'>;
}

export interface ScenarioSnapshot {
  definition: ScenarioDefinition;
  state: Omit<PhysiologyState, 'rng'>;
  history: Array<{ action: string; minutesElapsed: number; mapBefore: number; mapAfter: number }>;
}

export interface AdvanceAction {
  action: 'titrate' | 'bolus' | 'add_medication';
  medication?: string;
  new_dose?: number;
  volume_ml?: number;
}

export interface ScenarioResponse {
  id: string;
  name: string;
  description: string;
  patientWeight: number;
  basePatientId: string;
  currentState: {
    map: number;
    hr: number;
    activeDrugs: ActiveDrug[];
    fluidBoluses: number;
    minutesElapsed: number;
  };
  history: ScenarioSnapshot['history'];
}
