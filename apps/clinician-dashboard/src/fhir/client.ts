import type { FhirBundle, FhirResource } from './types';

const FHIR_BASE = '/fhir'; // Vite proxy → configurable dev target /fhir/R4
const TOKEN_ENDPOINT = '/oauth2/token'; // Vite proxy → configurable dev target /oauth2/token
const CLIENT_ID = import.meta.env.VITE_FHIR_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_FHIR_CLIENT_SECRET;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('FHIR OAuth env vars missing. Set VITE_FHIR_CLIENT_ID and VITE_FHIR_CLIENT_SECRET.');
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
  }

  const body = await res.json() as { access_token: string; expires_in?: number };
  cachedToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

export async function fhirSearch<T extends FhirResource>(
  resourceType: string,
  query: string,
): Promise<T[]> {
  const token = await getAccessToken();
  const url = `${FHIR_BASE}/${resourceType}?${query}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

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
