import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { config } from '../config.js';
import { computeMAP, baroReflexHR, createSeededRng, type PhysiologyState, type ActiveDrug, type FluidBolus } from './physiology.js';
import { pressorTitration } from './scenarios/pressor-titration.js';
import { fluidResponsive } from './scenarios/fluid-responsive.js';
import { hyporesponsive } from './scenarios/hyporesponsive.js';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  basePatientId: string;
  patientWeight: number;
  initialState: Omit<PhysiologyState, 'rng'>;
}

interface ScenarioSnapshot {
  definition: ScenarioDefinition;
  state: Omit<PhysiologyState, 'rng'>;
  history: Array<{ action: string; minutesElapsed: number; mapBefore: number; mapAfter: number }>;
}

const scenarios = new Map<string, ScenarioDefinition>([
  ['pressor-titration', pressorTitration],
  ['fluid-responsive', fluidResponsive],
  ['hyporesponsive', hyporesponsive],
]);

// In-memory state cache (hydrated from disk on first access)
const liveStates = new Map<string, ScenarioSnapshot>();

function stateDir(): string {
  const dir = config.scenarios.stateDir;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function statePath(scenarioId: string): string {
  return resolve(stateDir(), `${scenarioId}.json`);
}

function persistState(scenarioId: string, snapshot: ScenarioSnapshot): void {
  writeFileSync(statePath(scenarioId), JSON.stringify(snapshot, null, 2));
}

function loadPersistedState(scenarioId: string): ScenarioSnapshot | null {
  const path = statePath(scenarioId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function initSnapshot(def: ScenarioDefinition): ScenarioSnapshot {
  return {
    definition: def,
    state: { ...def.initialState },
    history: [],
  };
}

function getOrInitSnapshot(scenarioId: string): ScenarioSnapshot {
  // Check in-memory cache first
  if (liveStates.has(scenarioId)) return liveStates.get(scenarioId)!;

  // Try loading from disk
  const persisted = loadPersistedState(scenarioId);
  if (persisted) {
    liveStates.set(scenarioId, persisted);
    return persisted;
  }

  // Initialize from definition
  const def = scenarios.get(scenarioId);
  if (!def) throw new Error(`Unknown scenario: ${scenarioId}. Available: ${[...scenarios.keys()].join(', ')}`);

  const snapshot = initSnapshot(def);
  liveStates.set(scenarioId, snapshot);
  persistState(scenarioId, snapshot);
  return snapshot;
}

function hydrateRng(state: Omit<PhysiologyState, 'rng'>): PhysiologyState {
  return {
    ...state,
    rng: createSeededRng(config.scenarios.rngSeed + state.totalMinutesElapsed),
  };
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

export async function getScenario(scenarioId: string): Promise<ScenarioResponse> {
  const snapshot = getOrInitSnapshot(scenarioId);
  const state = hydrateRng(snapshot.state);

  // Recompute current MAP with physiology engine
  const currentMAP = computeMAP(state);
  const currentHR = baroReflexHR(state.baselineHR, currentMAP);

  return {
    id: snapshot.definition.id,
    name: snapshot.definition.name,
    description: snapshot.definition.description,
    patientWeight: snapshot.definition.patientWeight,
    basePatientId: snapshot.definition.basePatientId,
    currentState: {
      map: currentMAP,
      hr: currentHR,
      activeDrugs: state.activeDrugs,
      fluidBoluses: state.fluidBoluses.length,
      minutesElapsed: state.totalMinutesElapsed,
    },
    history: snapshot.history,
  };
}

export interface AdvanceAction {
  action: 'titrate' | 'bolus' | 'add_medication';
  medication?: string;
  new_dose?: number;
  volume_ml?: number;
}

export async function advanceScenario(scenarioId: string, action: AdvanceAction): Promise<ScenarioResponse> {
  const snapshot = getOrInitSnapshot(scenarioId);
  const mapBefore = snapshot.state.currentMAP;

  // Advance time: 5 minutes per action
  const timeAdvance = 5;
  snapshot.state.totalMinutesElapsed += timeAdvance;

  // Age existing drugs and boluses
  for (const drug of snapshot.state.activeDrugs) {
    drug.minutesSinceLastChange += timeAdvance;
  }
  for (const bolus of snapshot.state.fluidBoluses) {
    bolus.minutesSinceBolus += timeAdvance;
  }

  // Apply action
  switch (action.action) {
    case 'titrate': {
      if (!action.medication || action.new_dose == null) {
        throw new Error('titrate requires medication and new_dose');
      }
      const drug = snapshot.state.activeDrugs.find(d => d.name === action.medication);
      if (drug) {
        drug.currentDose = action.new_dose;
        drug.minutesSinceLastChange = 0;
      } else {
        throw new Error(`Drug "${action.medication}" not active in this scenario. Active: ${snapshot.state.activeDrugs.map(d => d.name).join(', ')}`);
      }
      break;
    }

    case 'bolus': {
      const volumeMl = action.volume_ml ?? 500;
      const bolusNum = snapshot.state.fluidBoluses.length + 1;
      const diminishing = Math.pow(config.pharmacokinetics.fluidBolus.diminishingFactor, bolusNum - 1);
      snapshot.state.fluidBoluses.push({
        volumeMl,
        peakEffect: config.pharmacokinetics.fluidBolus.peakResponse * (volumeMl / 500) * diminishing,
        minutesSinceBolus: 0,
        bolusNumber: bolusNum,
      });
      break;
    }

    case 'add_medication': {
      if (!action.medication) throw new Error('add_medication requires medication name');
      if (snapshot.state.activeDrugs.some(d => d.name === action.medication)) {
        throw new Error(`${action.medication} is already active — use titrate to adjust dose`);
      }
      snapshot.state.activeDrugs.push({
        name: action.medication,
        currentDose: action.new_dose ?? 0.01,
        unit: action.medication === 'vasopressin' ? 'units/min' : 'mcg/kg/min',
        minutesSinceLastChange: 0,
      });
      break;
    }
  }

  // Recompute physiology
  const state = hydrateRng(snapshot.state);
  snapshot.state.currentMAP = computeMAP(state);
  snapshot.state.currentHR = baroReflexHR(state.baselineHR, snapshot.state.currentMAP);
  snapshot.state.previousNoise = state.previousNoise;

  // Record history
  snapshot.history.push({
    action: `${action.action}${action.medication ? ` ${action.medication}` : ''}${action.new_dose != null ? ` → ${action.new_dose}` : ''}${action.volume_ml ? ` ${action.volume_ml}mL` : ''}`,
    minutesElapsed: snapshot.state.totalMinutesElapsed,
    mapBefore,
    mapAfter: snapshot.state.currentMAP,
  });

  // Persist state
  persistState(scenarioId, snapshot);
  liveStates.set(scenarioId, snapshot);

  return getScenario(scenarioId);
}

export async function resetScenario(scenarioId: string): Promise<void> {
  const def = scenarios.get(scenarioId);
  if (!def) throw new Error(`Unknown scenario: ${scenarioId}`);

  // Remove persisted state
  const path = statePath(scenarioId);
  if (existsSync(path)) unlinkSync(path);

  // Reset in-memory
  liveStates.delete(scenarioId);
}
