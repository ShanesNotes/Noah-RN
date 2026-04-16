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
      clientId: process.env.FHIR_CLIENT_ID ?? '',
      clientSecret: process.env.FHIR_CLIENT_SECRET ?? '',
    },
  },

  context: {
    defaultBudgetTokens: 4000,
    tokenCharRatio: 0.28, // calibrated: ~0.28 tokens per char for FHIR JSON
  },
} as const;

// Load MIMIC LOINC mappings from clinical-resources directory
function resolveKnowledgeDir(): string {
  let current = __dirname;

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = resolve(current, 'clinical-resources', 'mimic-mappings.json');
    if (existsSync(candidate)) {
      return resolve(current, 'clinical-resources');
    }
    current = resolve(current, '..');
  }

  throw new Error(`Unable to locate clinical-resources/mimic-mappings.json from ${__dirname}`);
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
