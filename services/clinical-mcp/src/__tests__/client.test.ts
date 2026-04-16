import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../fhir/types.js';

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  };
}

describe('FHIR client read/write enrichment', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.FHIR_FIXTURE_DIR;
    process.env.FHIR_CLIENT_ID = 'test-client-id';
    process.env.FHIR_CLIENT_SECRET = 'test-client-secret';
  });

  afterEach(() => {
    delete process.env.FHIR_CLIENT_ID;
    delete process.env.FHIR_CLIENT_SECRET;
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

  it('retrieves requested shift report Tasks', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token', expires_in: 3600 }))
      .mockResolvedValueOnce(createJsonResponse({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          {
            resource: {
              resourceType: 'Task',
              id: 'task-1',
              status: 'requested',
              for: { reference: 'Patient/patient-123' },
            },
          },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { getRequestedShiftReportTasks } = await import('../fhir/client.js');
    const result = await getRequestedShiftReportTasks(5);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.id).toBe('task-1');
    expect(String(fetchMock.mock.calls[1][0])).toContain('Task?code=shift-report&status=requested&_sort=-_lastUpdated&_count=5');
  });

  it('fails fast when live FHIR auth credentials are missing', async () => {
    delete process.env.FHIR_CLIENT_ID;
    delete process.env.FHIR_CLIENT_SECRET;

    const { fhirPost } = await import('../fhir/client.js');
    const result = await fhirPost('Observation', { resourceType: 'Observation' });

    expect(result.error).toContain('FHIR client credentials are required');
  });

  it('updates a Task with PUT', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({ access_token: 'token', expires_in: 3600 }))
      .mockResolvedValueOnce(createJsonResponse({
        resourceType: 'Task',
        id: 'task-1',
        status: 'completed',
      }));
    vi.stubGlobal('fetch', fetchMock);

    const { updateTask } = await import('../fhir/client.js');
    const task: Task = {
      resourceType: 'Task',
      id: 'task-1',
      status: 'completed',
      output: [{
        type: { text: 'shift-report-draft' },
        valueReference: { reference: 'DocumentReference/doc-123' },
      }],
    };
    const result = await updateTask('task-1', task);

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'completed',
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/Task/task-1');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({
        'Content-Type': 'application/fhir+json',
      }),
      body: JSON.stringify(task),
    });
  });
});
