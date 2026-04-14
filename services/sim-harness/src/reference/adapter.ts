/**
 * Reference pharmacokinetic engine adapter for Contract 1.
 *
 * This concrete adapter keeps the current PK/PD reference model behind the
 * engine boundary until Contract 9 selects a validated external engine.
 */
import { cloneReadonly, type EngineAgentProjection, type EngineInsult, type EngineIntervention, type EnginePatientSeed, type EngineTick, type EngineTickResult, type EngineWaveformFrame, type SimulationEngine, type SimulationEngineAdapter } from '../engine-adapter.js';
import {
  baroReflexHR,
  computeMAP,
  createSeededRng,
  type ActiveDrug,
  type FluidBolus,
  type PhysiologyState,
} from './pharmacokinetics.js';
import { config } from '../config.js';

interface ActiveHemodynamicInsult {
  kind: 'hemodynamic-shift';
  name: string;
  mapDelta: number;
  hrDelta: number;
  startedAtMs: number;
  durationMs?: number;
}

export interface ReferencePkSerializedState {
  encounterId: string;
  clockTimeMs: number;
  baselineMAP: number;
  baselineHR: number;
  physiology: Omit<PhysiologyState, 'rng'>;
  activeInsults: ActiveHemodynamicInsult[];
}

interface ReferencePkState extends Omit<ReferencePkSerializedState, 'physiology'> {
  physiology: PhysiologyState;
  latestWaveformFrame: EngineWaveformFrame;
}

export class ReferencePkEngineAdapter implements SimulationEngineAdapter<ReferencePkSerializedState> {
  readonly physiologySource = 'fallback' as const;
  readonly tickIntervalMs: number;

  constructor(options: { tickIntervalMs?: number } = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;
  }

  create(seed: EnginePatientSeed): SimulationEngine<ReferencePkSerializedState> {
    return new ReferencePkEngine(this.tickIntervalMs, seed);
  }
}

export function restoreReferencePkEngine(
  state: ReferencePkSerializedState,
  options: { tickIntervalMs?: number } = {},
): SimulationEngine<ReferencePkSerializedState> {
  return new ReferencePkEngine(options.tickIntervalMs ?? 1000, undefined, state);
}

class ReferencePkEngine implements SimulationEngine<ReferencePkSerializedState> {
  readonly physiologySource = 'fallback' as const;
  readonly tickIntervalMs: number;
  private readonly state: ReferencePkState;

  constructor(tickIntervalMs: number, seed?: EnginePatientSeed, restored?: ReferencePkSerializedState) {
    this.tickIntervalMs = tickIntervalMs;

    if (restored) {
      this.state = {
        ...restored,
        physiology: {
          ...restored.physiology,
          activeDrugs: restored.physiology.activeDrugs.map(cloneDrug),
          fluidBoluses: restored.physiology.fluidBoluses.map(cloneBolus),
          rng: createSeededRng(config.scenarios.rngSeed + Math.round(restored.clockTimeMs / tickIntervalMs)),
        },
        activeInsults: restored.activeInsults.map(insult => ({ ...insult })),
        latestWaveformFrame: createWaveformFrame(restored.encounterId, this.physiologySource, restored.clockTimeMs - tickIntervalMs, restored.clockTimeMs, {
          hr: restored.physiology.currentHR,
          rr: Math.max(8, Math.min(40, Math.round(16 + Math.max(0, 65 - restored.physiology.currentMAP) / 6))),
          map: restored.physiology.currentMAP,
          spo2: Math.max(70, Math.min(100, Math.round(98 - Math.max(0, 65 - restored.physiology.currentMAP) / 12))),
          etco2: Math.max(10, Math.min(60, Math.round(36 - Math.max(0, 65 - restored.physiology.currentMAP) / 10))),
        }),
      };
      return;
    }

    if (!seed) {
      throw new Error('ReferencePkEngine requires either a seed or a restored state');
    }

    this.state = {
      encounterId: seed.encounterId,
      clockTimeMs: 0,
      baselineMAP: seed.baselineMAP,
      baselineHR: seed.baselineHR,
      physiology: {
        baselineMAP: seed.baselineMAP,
        baselineHR: seed.baselineHR,
        currentMAP: seed.baselineMAP,
        currentHR: seed.baselineHR,
        activeDrugs: (seed.initialDrugs ?? []).map(drug => ({
          name: drug.name,
          currentDose: drug.dose,
          unit: drug.unit,
          minutesSinceLastChange: drug.minutesSinceLastChange ?? 0,
        })),
        fluidBoluses: [],
        previousNoise: 0,
        rng: createSeededRng(config.scenarios.rngSeed),
        totalMinutesElapsed: 0,
      },
      activeInsults: [],
      latestWaveformFrame: createWaveformFrame(seed.encounterId, this.physiologySource, 0, tickIntervalMs, {
        hr: seed.baselineHR,
        rr: 16,
        map: seed.baselineMAP,
        spo2: 98,
        etco2: 36,
      }),
    };

    this.recomputeCurrentVitals();
  }

  applyIntervention(intervention: EngineIntervention): void {
    if (intervention.kind === 'medication') {
      const existing = this.state.physiology.activeDrugs.find(drug => drug.name === intervention.name);
      if (existing) {
        existing.currentDose = intervention.dose;
        existing.unit = intervention.unit;
        existing.minutesSinceLastChange = 0;
        return;
      }

      this.state.physiology.activeDrugs.push({
        name: intervention.name,
        currentDose: intervention.dose,
        unit: intervention.unit,
        minutesSinceLastChange: 0,
      });
      return;
    }

    const bolusNumber = this.state.physiology.fluidBoluses.length + 1;
    const diminishing = Math.pow(config.pharmacokinetics.fluidBolus.diminishingFactor, bolusNumber - 1);
    this.state.physiology.fluidBoluses.push({
      volumeMl: intervention.volumeMl,
      peakEffect: config.pharmacokinetics.fluidBolus.peakResponse * (intervention.volumeMl / 500) * diminishing,
      minutesSinceBolus: 0,
      bolusNumber,
    });
  }

  applyInsult(insult: EngineInsult): void {
    this.state.activeInsults.push({
      kind: 'hemodynamic-shift',
      name: insult.name,
      mapDelta: insult.mapDelta,
      hrDelta: insult.hrDelta ?? 0,
      startedAtMs: this.state.clockTimeMs,
      durationMs: insult.durationMs,
    });
  }

  tick(tick: EngineTick): EngineTickResult {
    if (tick.currentTimeMs < this.state.clockTimeMs) {
      throw new Error(`engine tick cannot move backward (${tick.currentTimeMs} < ${this.state.clockTimeMs})`);
    }

    const deltaMinutes = tick.deltaMs / 60_000;
    this.state.clockTimeMs = tick.currentTimeMs;
    this.state.physiology.totalMinutesElapsed += deltaMinutes;

    for (const drug of this.state.physiology.activeDrugs) {
      drug.minutesSinceLastChange += deltaMinutes;
    }

    for (const bolus of this.state.physiology.fluidBoluses) {
      bolus.minutesSinceBolus += deltaMinutes;
    }

    this.expireInsults();

    const activeMapDelta = this.state.activeInsults.reduce((sum, insult) => sum + insult.mapDelta, 0);
    const activeHrDelta = this.state.activeInsults.reduce((sum, insult) => sum + insult.hrDelta, 0);

    this.state.physiology.baselineMAP = this.state.baselineMAP + activeMapDelta;
    this.state.physiology.baselineHR = this.state.baselineHR + activeHrDelta;
    this.recomputeCurrentVitals();

    const projection = this.getAgentProjection();
    this.state.latestWaveformFrame = createWaveformFrame(
      this.state.encounterId,
      this.physiologySource,
      tick.previousTimeMs,
      tick.currentTimeMs,
      {
        hr: projection.vitals.hr,
        rr: projection.vitals.rr,
        map: projection.vitals.map,
        spo2: projection.vitals.spo2,
        etco2: projection.vitals.etco2,
      },
    );

    return {
      tick,
      projection,
      waveformFrame: this.state.latestWaveformFrame,
    };
  }

  getAgentProjection(): EngineAgentProjection {
    const map = this.state.physiology.currentMAP;
    const hr = this.state.physiology.currentHR;
    const pulsePressure = Math.max(18, Math.min(60, 24 + (hr - 70) * 0.12 + Math.max(0, map - 65) * 0.08));
    const dbp = Math.round(map - pulsePressure / 3);
    const sbp = Math.round(dbp + pulsePressure);
    const shockSeverity = Math.max(0, 65 - map);

    return {
      encounterId: this.state.encounterId,
      physiologySource: this.physiologySource,
      timeMs: this.state.clockTimeMs,
      vitals: {
        hr,
        rr: Math.max(8, Math.min(40, Math.round(16 + shockSeverity / 6))),
        spo2: Math.max(70, Math.min(100, Math.round(98 - shockSeverity / 12))),
        etco2: Math.max(10, Math.min(60, Math.round(36 - shockSeverity / 10))),
        map,
        sbp,
        dbp,
        temp_c: 37,
        rhythmLabel: hr >= 120 ? 'sinus tachycardia' : 'sinus rhythm',
      },
      activeInterventions: this.state.physiology.activeDrugs.map(drug => ({
        name: drug.name,
        dose: drug.currentDose,
        unit: drug.unit,
      })),
      activeInsults: this.state.activeInsults.map(insult => ({ name: insult.name })),
    };
  }

  getLatestWaveformFrame(): EngineWaveformFrame {
    return cloneReadonly(this.state.latestWaveformFrame);
  }

  getEvalSnapshot(): Readonly<ReferencePkSerializedState> {
    return cloneReadonly({
      ...this.state,
      physiology: {
        ...this.state.physiology,
        activeDrugs: this.state.physiology.activeDrugs.map(cloneDrug),
        fluidBoluses: this.state.physiology.fluidBoluses.map(cloneBolus),
      },
      activeInsults: this.state.activeInsults.map(insult => ({ ...insult })),
    });
  }

  private recomputeCurrentVitals(): void {
    this.state.physiology.currentMAP = computeMAP(this.state.physiology);
    this.state.physiology.currentHR = baroReflexHR(this.state.physiology.baselineHR, this.state.physiology.currentMAP);
  }

  private expireInsults(): void {
    this.state.activeInsults.splice(
      0,
      this.state.activeInsults.length,
      ...this.state.activeInsults.filter(insult =>
        insult.durationMs == null || this.state.clockTimeMs - insult.startedAtMs < insult.durationMs),
    );
  }
}

function cloneDrug(drug: ActiveDrug): ActiveDrug {
  return { ...drug };
}

function cloneBolus(bolus: FluidBolus): FluidBolus {
  return { ...bolus };
}

function createWaveformFrame(
  encounterId: string,
  physiologySource: EngineWaveformFrame['physiologySource'],
  startTimeMs: number,
  endTimeMs: number,
  vitals: { hr: number; rr: number; map: number; spo2: number; etco2: number },
): EngineWaveformFrame {
  const sampleRateHz = 125;
  const sampleCount = Math.max(1, Math.round(((endTimeMs - startTimeMs) / 1000) * sampleRateHz));
  const heartHz = Math.max(0.5, vitals.hr / 60);
  const respHz = Math.max(0.08, vitals.rr / 60);
  const mapAmplitude = Math.max(8, Math.min(45, vitals.map * 0.18));
  const spo2Amplitude = Math.max(0.2, Math.min(1.2, vitals.spo2 / 100));
  const etco2Amplitude = Math.max(10, Math.min(45, vitals.etco2));

  const leadII: number[] = [];
  const pleth: number[] = [];
  const arterial: number[] = [];
  const capno: number[] = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const t = startTimeMs / 1000 + i / sampleRateHz;
    const cardiacPhase = fractionalCycle(t * heartHz);
    const respPhase = fractionalCycle(t * respHz);
    const ecg =
      gaussian(cardiacPhase, 0.18, 0.025, 0.12) +
      gaussian(cardiacPhase, 0.42, 0.01, -0.15) +
      gaussian(cardiacPhase, 0.45, 0.008, 1.2) +
      gaussian(cardiacPhase, 0.48, 0.01, -0.25) +
      gaussian(cardiacPhase, 0.72, 0.05, 0.35);
    const pulseEnvelope = Math.max(0, Math.sin(Math.PI * cardiacPhase));
    const respiratoryModulation = 1 + 0.08 * Math.sin(2 * Math.PI * respPhase);

    leadII.push(roundWaveform(ecg));
    pleth.push(roundWaveform(spo2Amplitude * pulseEnvelope * respiratoryModulation));
    arterial.push(roundWaveform(vitals.map + mapAmplitude * pulseEnvelope * respiratoryModulation));
    capno.push(roundWaveform(etco2Amplitude * Math.max(0, Math.sin(Math.PI * respPhase))));
  }

  return {
    encounterId,
    physiologySource,
    sampleRateHz,
    startTimeMs,
    endTimeMs,
    leads: {
      II: leadII,
      pleth: pleth,
      art: arterial,
      etco2: capno,
    },
  };
}

function gaussian(x: number, center: number, width: number, amplitude: number): number {
  return amplitude * Math.exp(-Math.pow(x - center, 2) / (2 * width * width));
}

function fractionalCycle(value: number): number {
  return value - Math.floor(value);
}

function roundWaveform(value: number): number {
  return Math.round(value * 1000) / 1000;
}
