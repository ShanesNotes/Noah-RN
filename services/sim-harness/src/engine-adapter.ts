/**
 * Engine adapter boundary for Contract 1.
 *
 * This isolates L0 physiology computation from the rest of the harness so the
 * underlying engine can change without touching projection-layer code.
 */
import type { PhysiologySource, SimLiveVitalsSnapshot } from './index.js';

export interface EnginePatientSeed {
  encounterId: string;
  baselineMAP: number;
  baselineHR: number;
  weightKg?: number;
  initialDrugs?: ReadonlyArray<EngineMedication>;
}

export interface EngineMedication {
  name: string;
  dose: number;
  unit: string;
  minutesSinceLastChange?: number;
}

export interface EngineInterventionMedication extends EngineMedication {
  kind: 'medication';
}

export interface EngineInterventionFluidBolus {
  kind: 'fluid-bolus';
  volumeMl: number;
}

export type EngineIntervention = EngineInterventionMedication | EngineInterventionFluidBolus;

export interface EngineHemodynamicInsult {
  kind: 'hemodynamic-shift';
  name: string;
  mapDelta: number;
  hrDelta?: number;
  durationMs?: number;
}

export type EngineInsult = EngineHemodynamicInsult;

export interface EngineTick {
  previousTimeMs: number;
  currentTimeMs: number;
  deltaMs: number;
}

export interface EngineAgentProjection {
  encounterId: string;
  physiologySource: PhysiologySource;
  timeMs: number;
  vitals: Omit<SimLiveVitalsSnapshot, 'captured_at' | 'scenario_minutes_elapsed' | 'rhythm_label'> & {
    rhythmLabel: string;
  };
  activeInterventions: EngineMedication[];
  activeInsults: Array<{ name: string }>;
}

export interface EngineWaveformFrame {
  encounterId: string;
  physiologySource: PhysiologySource;
  sampleRateHz: number;
  startTimeMs: number;
  endTimeMs: number;
  leads: Record<string, number[]>;
}

export interface EngineTickResult {
  tick: EngineTick;
  projection: EngineAgentProjection;
  waveformFrame: EngineWaveformFrame;
}

export interface SimulationEngine<TState> {
  readonly physiologySource: PhysiologySource;
  readonly tickIntervalMs: number;
  applyIntervention(intervention: EngineIntervention): void;
  applyInsult(insult: EngineInsult): void;
  tick(tick: EngineTick): EngineTickResult;
  getAgentProjection(): EngineAgentProjection;
  getLatestWaveformFrame(): EngineWaveformFrame;
  getEvalSnapshot(): Readonly<TState>;
}

export interface SimulationEngineAdapter<TState> {
  readonly physiologySource: PhysiologySource;
  readonly tickIntervalMs: number;
  create(seed: EnginePatientSeed): SimulationEngine<TState>;
}

export function cloneReadonly<T>(value: T): Readonly<T> {
  return JSON.parse(JSON.stringify(value)) as Readonly<T>;
}
