import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  };
}

describe('FHIR client read-path enrichment', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.FHIR_FIXTURE_DIR;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('retrieves document references for a patient', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token', expires_in: 3600 }))
      .mockResolvedValueOnce(createJsonResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'DocumentReference',
              id: 'doc-1',
              date: '2026-04-10T11:30:00Z',
            },
          },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { getDocumentReferences } = await import('../fhir/client.js');
    const result = await getDocumentReferences('patient-123');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain('DocumentReference?patient=patient-123&_sort=-date&_count=100');
  });

  it('retrieves medication administrations for a patient', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token', expires_in: 3600 }))
      .mockResolvedValueOnce(createJsonResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'MedicationAdministration',
              id: 'ma-1',
              effectiveDateTime: '2026-04-10T10:45:00Z',
            },
          },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { getMedicationAdministrations } = await import('../fhir/client.js');
    const result = await getMedicationAdministrations('patient-123');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain('MedicationAdministration?patient=patient-123&_sort=-date&_count=100');
  });
});
