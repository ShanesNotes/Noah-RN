import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  scenarios: {
    stateDir: resolve(__dirname, '..', '..', '.scenario-state'),
    rngSeed: 42,
  },

  pharmacokinetics: {
    norepinephrine: {
      emax: 35,
      ed50: 0.08,
      hillN: 2.0,
      tauMinutes: 4,
    },
    vasopressin: {
      emax: 15,
      ed50: 0.03,
      hillN: 1.5,
      tauMinutes: 10,
    },
    fluidBolus: {
      peakResponse: 12,
      halfLifeMinutes: 30,
      diminishingFactor: 0.6,
    },
    noise: {
      alpha: 0.7,
      sigma: 2.5,
      clamp: 8,
    },
    heartRate: {
      baselineMin: 40,
      baselineMax: 160,
      baroReflexGain: -0.5,
      setpoint: 70,
    },
  },
} as const;
