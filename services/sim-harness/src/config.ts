/**
 * Sim-harness configuration.
 * Reads from environment variables with sensible defaults matching the local Medplum instance.
 */
export const simConfig = {
  fhir: {
    serverUrl: process.env.FHIR_SERVER ?? "http://10.0.0.184:8103/fhir/R4",
    tokenEndpoint:
      process.env.FHIR_TOKEN_ENDPOINT ??
      "http://10.0.0.184:8103/oauth2/token",
    clientId: process.env.FHIR_CLIENT_ID ?? "",
    clientSecret: process.env.FHIR_CLIENT_SECRET ?? "",
    requestTimeoutMs: 10_000,
  },
  writeCadenceSeconds: Number(process.env.SIM_WRITE_CADENCE_SECONDS) || 60,
  scenarios: {
    rngSeed: Number(process.env.SIM_RNG_SEED) || 42,
  },
  pharmacokinetics: {
    noise: {
      alpha: 0.8,
      sigma: 1.0,
      clamp: 5,
    },
    heartRate: {
      baroReflexGain: 0.5,
      setpoint: 80,
      baselineMin: 40,
      baselineMax: 160,
    },
    norepinephrine: {
      emax: 60,
      ed50: 0.1,
      hillN: 2,
      tauMinutes: 5,
    },
    vasopressin: {
      emax: 40,
      ed50: 0.03,
      hillN: 2,
      tauMinutes: 10,
    },
    fluidBolus: {
      halfLifeMinutes: 30,
      peakResponse: 8,
      diminishingFactor: 0.7,
    },
  },
} as const;

/** Alias used by reference PK/PD modules */
export { simConfig as config };
