import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  fhir: {
    serverUrl: process.env.FHIR_SERVER ?? 'http://10.0.0.184:8103/fhir/R4',
    fixtureDir: process.env.FHIR_FIXTURE_DIR ?? '',
    defaultObsCount: 50,
    requestTimeoutMs: 10000,
    auth: {
      tokenEndpoint: process.env.FHIR_TOKEN_ENDPOINT ?? 'http://10.0.0.184:8103/oauth2/token',
      clientId: process.env.FHIR_CLIENT_ID ?? '3c3c4c3a-2993-424c-b46d-f58db0d7ca14',
      clientSecret: process.env.FHIR_CLIENT_SECRET ?? 'be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34',
    },
  },

  context: {
    defaultBudgetTokens: 4000,
    tokenCharRatio: 0.28, // calibrated: ~0.28 tokens per char for FHIR JSON
  },

  scenarios: {
    stateDir: resolve(__dirname, '..', '.scenario-state'),
    rngSeed: 42,
  },

  pharmacokinetics: {
    norepinephrine: {
      emax: 35,     // max MAP increase (mmHg)
      ed50: 0.08,   // dose for 50% effect (mcg/kg/min)
      hillN: 2.0,   // Hill coefficient
      tauMinutes: 4, // onset time constant (minutes)
    },
    vasopressin: {
      emax: 15,     // max MAP increase (mmHg) — V1 pathway
      ed50: 0.03,   // dose for 50% effect (units/min)
      hillN: 1.5,
      tauMinutes: 10,
    },
    fluidBolus: {
      peakResponse: 12, // peak MAP increase (mmHg) per 500mL
      halfLifeMinutes: 30,
      diminishingFactor: 0.6, // each subsequent bolus has 60% of previous effect
    },
    noise: {
      alpha: 0.7,      // AR(1) autoregressive coefficient
      sigma: 2.5,      // noise standard deviation (mmHg)
      clamp: 8,        // max noise magnitude (mmHg)
    },
    heartRate: {
      baselineMin: 40,
      baselineMax: 160,
      baroReflexGain: -0.5, // bpm per mmHg MAP deviation from setpoint
      setpoint: 70,          // MAP setpoint for baroreflex (mmHg)
    },
  },
} as const;

// Load MIMIC LOINC mappings from knowledge directory
function resolveKnowledgeDir(): string {
  let current = __dirname;

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = resolve(current, 'knowledge', 'mimic-mappings.json');
    if (existsSync(candidate)) {
      return resolve(current, 'knowledge');
    }
    current = resolve(current, '..');
  }

  throw new Error(`Unable to locate knowledge/mimic-mappings.json from ${__dirname}`);
}

export function loadMimicMappings(): MimicMappings {
  const mappingPath = resolve(resolveKnowledgeDir(), 'mimic-mappings.json');
  const raw = readFileSync(mappingPath, 'utf-8');
  return JSON.parse(raw);
}

export interface MimicMapping {
  loinc: string;
  name: string;
  category?: string;
  aliases?: string[];
}

export interface MimicMappings {
  provenance: {
    source: string;
    version: string;
    date: string;
    compatibility_notes: string[];
  };
  item_id_to_loinc: Record<string, MimicMapping>;
}
