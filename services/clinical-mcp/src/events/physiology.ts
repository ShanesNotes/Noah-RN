import { config } from '../config.js';

const pk = config.pharmacokinetics;

// Hill equation: sigmoid dose-response
// MAP_delta = Emax * dose^n / (ED50^n + dose^n)
export function hillEquation(dose: number, emax: number, ed50: number, n: number): number {
  if (dose <= 0) return 0;
  const doseN = Math.pow(dose, n);
  const ed50N = Math.pow(ed50, n);
  return emax * doseN / (ed50N + doseN);
}

// First-order onset delay: effect(t) = target * (1 - e^(-t/tau))
export function onsetDelay(targetEffect: number, minutesSinceDose: number, tauMinutes: number): number {
  if (minutesSinceDose <= 0) return 0;
  return targetEffect * (1 - Math.exp(-minutesSinceDose / tauMinutes));
}

// Fluid bolus response: exponential decay from peak
export function fluidBolusResponse(
  peakResponse: number,
  minutesSinceBolus: number,
  halfLifeMinutes: number,
): number {
  if (minutesSinceBolus <= 0) return peakResponse;
  const decayConstant = Math.LN2 / halfLifeMinutes;
  return peakResponse * Math.exp(-decayConstant * minutesSinceBolus);
}

// AR(1) bounded noise for physiologic variability
export function ar1Noise(previousNoise: number, rng: () => number): number {
  const { alpha, sigma, clamp } = pk.noise;
  // Box-Muller for Gaussian
  const u1 = rng();
  const u2 = rng();
  const epsilon = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2) * sigma;
  const noise = alpha * previousNoise + epsilon;
  return Math.max(-clamp, Math.min(clamp, noise));
}

// Baroreceptor heart rate compensation
export function baroReflexHR(baseHR: number, currentMAP: number): number {
  const { baroReflexGain, setpoint, baselineMin, baselineMax } = pk.heartRate;
  const deviation = currentMAP - setpoint;
  const hr = baseHR + baroReflexGain * deviation;
  return Math.max(baselineMin, Math.min(baselineMax, Math.round(hr)));
}

// Compute MAP from all active drug effects
export function computeMAP(state: PhysiologyState): number {
  let mapDelta = 0;

  // Vasopressor effects (independent receptor pathways, additive across pathways)
  for (const drug of state.activeDrugs) {
    const params = drug.name === 'norepinephrine' ? pk.norepinephrine
      : drug.name === 'vasopressin' ? pk.vasopressin
      : null;

    if (params) {
      const steadyState = hillEquation(drug.currentDose, params.emax, params.ed50, params.hillN);
      const withOnset = onsetDelay(steadyState, drug.minutesSinceLastChange, params.tauMinutes);
      mapDelta += withOnset;
    }
  }

  // Fluid bolus effects (cumulative, each with diminishing response)
  for (const bolus of state.fluidBoluses) {
    const response = fluidBolusResponse(
      bolus.peakEffect,
      bolus.minutesSinceBolus,
      pk.fluidBolus.halfLifeMinutes,
    );
    mapDelta += response;
  }

  // Apply noise and propagate for AR(1) temporal correlation
  const noise = ar1Noise(state.previousNoise, state.rng);
  state.previousNoise = noise;

  const map = Math.round(state.baselineMAP + mapDelta + noise);
  return Math.max(20, Math.min(180, map)); // physiologic bounds
}

// Seeded PRNG (simple LCG for reproducibility)
export function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export interface ActiveDrug {
  name: string;
  currentDose: number;
  unit: string;
  minutesSinceLastChange: number;
}

export interface FluidBolus {
  volumeMl: number;
  peakEffect: number;
  minutesSinceBolus: number;
  bolusNumber: number; // for diminishing returns
}

export interface PhysiologyState {
  baselineMAP: number;
  baselineHR: number;
  currentMAP: number;
  currentHR: number;
  activeDrugs: ActiveDrug[];
  fluidBoluses: FluidBolus[];
  previousNoise: number;
  rng: () => number;
  totalMinutesElapsed: number;
}
