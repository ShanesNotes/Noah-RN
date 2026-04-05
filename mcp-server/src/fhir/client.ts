import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { loincToItemIds } from './loinc-map.js';
import type {
  FhirBundle, FhirResult, Patient, Observation,
  Condition, MedicationRequest, Encounter,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fhirFetch<T>(path: string): Promise<FhirResult<T>> {
  // Fixture mode: read from cached JSON if configured or server unreachable
  if (config.fhir.fixtureDir) {
    return readFixture<T>(path);
  }

  const url = `${config.fhir.serverUrl}/${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.fhir.requestTimeoutMs);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { data: null, error: `FHIR ${res.status}: ${res.statusText} for ${path}` };
    }

    const data = await res.json() as T;
    return { data, error: null };
  } catch (err) {
    // Auto-fallback to fixtures on network failure
    if (config.fhir.fixtureDir || existsSync(resolve(__dirname, '..', '..', 'fixtures'))) {
      const fixtureResult = readFixture<T>(path);
      if (fixtureResult.data) {
        return fixtureResult;
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: `FHIR fetch failed: ${msg}` };
  }
}

function readFixture<T>(path: string): FhirResult<T> {
  const fixtureDir = resolve(config.fhir.fixtureDir || resolve(__dirname, '..', '..', 'fixtures'));
  // Allowlist sanitization: only alphanumeric, dash, underscore, dot
  const filename = path.replace(/[^a-zA-Z0-9_\-.]/g, '_') + '.json';
  const filepath = resolve(fixtureDir, filename);

  // Containment check: prevent path traversal
  if (!filepath.startsWith(fixtureDir + '/')) {
    return { data: null, error: 'Fixture path escapes base directory' };
  }

  if (!existsSync(filepath)) {
    return { data: null, error: `No fixture for: ${path}` };
  }

  try {
    const raw = readFileSync(filepath, 'utf-8');
    return { data: JSON.parse(raw) as T, error: null };
  } catch {
    return { data: null, error: 'Failed to read fixture file' };
  }
}

// --- Resource query functions ---

export async function getPatient(id: string): Promise<FhirResult<Patient>> {
  const result = await fhirFetch<FhirBundle<Patient>>(`Patient?_id=${id}&_count=1`);
  if (result.error || !result.data) return { data: null, error: result.error };

  const patient = result.data.entry?.[0]?.resource;
  if (!patient) return { data: null, error: `Patient not found: ${id}` };
  return { data: patient, error: null };
}

export async function getObservations(
  patientId: string,
  opts: { category?: string; loincCodes?: string[]; count?: number } = {},
): Promise<FhirResult<Observation[]>> {
  const count = opts.count ?? config.fhir.defaultObsCount;
  let path = `Observation?patient=${patientId}&_sort=-date&_count=${count}`;

  if (opts.category) {
    path += `&category=${opts.category}`;
  }

  if (opts.loincCodes?.length) {
    // Translate LOINC codes to MIMIC itemIDs internally
    const itemIds = loincToItemIds(opts.loincCodes);
    if (itemIds.length) {
      path += `&code=${itemIds.join(',')}`;
    }
  }

  const result = await fhirFetch<FhirBundle<Observation>>(path);
  if (result.error || !result.data) return { data: null, error: result.error };

  const observations = result.data.entry?.map(e => e.resource) ?? [];
  return { data: observations, error: null };
}

export async function getConditions(patientId: string): Promise<FhirResult<Condition[]>> {
  const result = await fhirFetch<FhirBundle<Condition>>(
    `Condition?patient=${patientId}&_count=100`,
  );
  if (result.error || !result.data) return { data: null, error: result.error };

  const conditions = result.data.entry?.map(e => e.resource) ?? [];
  return { data: conditions, error: null };
}

export async function getMedicationRequests(patientId: string): Promise<FhirResult<MedicationRequest[]>> {
  const result = await fhirFetch<FhirBundle<MedicationRequest>>(
    `MedicationRequest?patient=${patientId}&_sort=-date&_count=100`,
  );
  if (result.error || !result.data) return { data: null, error: result.error };

  const meds = result.data.entry?.map(e => e.resource) ?? [];
  return { data: meds, error: null };
}

export async function getEncounters(patientId: string): Promise<FhirResult<Encounter[]>> {
  const result = await fhirFetch<FhirBundle<Encounter>>(
    `Encounter?patient=${patientId}&_count=50`,
  );
  if (result.error || !result.data) return { data: null, error: result.error };

  const encounters = result.data.entry?.map(e => e.resource) ?? [];
  return { data: encounters, error: null };
}

export async function listPatients(count: number = 100): Promise<FhirResult<Array<{ id: string; name: string; gender: string }>>> {
  const result = await fhirFetch<FhirBundle<Patient>>(`Patient?_count=${count}`);
  if (result.error || !result.data) return { data: null, error: result.error };

  const patients = (result.data.entry ?? []).map(e => {
    const p = e.resource;
    const nameEntry = p.name?.[0];
    const name = nameEntry?.text
      ?? [nameEntry?.given?.join(' '), nameEntry?.family].filter(Boolean).join(' ')
      ?? 'Unknown';
    return {
      id: p.id ?? '',
      name,
      gender: p.gender ?? 'unknown',
    };
  });

  return { data: patients, error: null };
}
