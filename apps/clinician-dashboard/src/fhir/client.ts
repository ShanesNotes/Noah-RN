import type { FhirBundle, FhirResource } from './types';

const FHIR_BASE = '/fhir'; // Vite proxy → http://10.0.0.184:8103/fhir/R4
const TOKEN_ENDPOINT = '/oauth2/token'; // Vite proxy → http://10.0.0.184:8103/oauth2/token
const CLIENT_ID = '3c3c4c3a-2993-424c-b46d-f58db0d7ca14';
const CLIENT_SECRET = 'be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
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
