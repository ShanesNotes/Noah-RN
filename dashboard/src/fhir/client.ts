import type { FhirBundle, FhirResource } from './types';

const FHIR_BASE = '/fhir'; // Vite proxy → http://10.0.0.184:8080/fhir

export async function fhirSearch<T extends FhirResource>(
  resourceType: string,
  query: string,
): Promise<T[]> {
  const url = `${FHIR_BASE}/${resourceType}?${query}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`FHIR ${res.status}: ${res.statusText}`);
  }

  const bundle = (await res.json()) as FhirBundle<T>;
  return bundle.entry?.map(e => e.resource) ?? [];
}

// Format patient name from FHIR HumanName
export function formatPatientName(patient: { name?: Array<{ family?: string; given?: string[]; text?: string }> }): string {
  const n = patient.name?.[0];
  if (!n) return 'Unknown';
  if (n.text) return n.text;
  return [n.given?.join(' '), n.family].filter(Boolean).join(' ') || 'Unknown';
}
