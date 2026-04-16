import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PatientContext } from '../context/types.js';

const sampleContext: PatientContext = {
  patient: {
    id: 'patient-123',
    name: 'John Doe',
    dob: '1954-01-01',
    gender: 'male',
  },
  timeline: [],
  trends: [],
  gaps: [],
  assembledAt: '2026-04-13T00:00:00.000Z',
  sources: ['Patient'],
  tokenEstimate: 42,
  budgetTruncated: false,
  truncatedCount: 0,
};

describe('shift report worker fixture-backed integration', () => {
  let fixtureDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T00:00:00.000Z'));

    fixtureDir = mkdtempSync(join(tmpdir(), 'noah-rn-shift-report-fixtures-'));
    process.env.FHIR_FIXTURE_DIR = fixtureDir;
    process.env.FHIR_CLIENT_ID = 'test-client-id';
    process.env.FHIR_CLIENT_SECRET = 'test-client-secret';

    const query = 'Task?code=shift-report&status=requested&_sort=-_lastUpdated&_count=20';
    const filename = `${query.replace(/[^a-zA-Z0-9_\-.]/g, '_')}.json`;
    writeFileSync(join(fixtureDir, filename), JSON.stringify({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Task',
            id: 'task-1',
            status: 'requested',
            intent: 'order',
            code: {
              coding: [
                {
                  system: 'https://noah-rn.dev/workflows',
                  code: 'shift-report',
                  display: 'Shift Report',
                },
              ],
              text: 'Generate Shift Report',
            },
            for: { reference: 'Patient/patient-123' },
            encounter: { reference: 'Encounter/enc-456' },
            description: 'Generate shift handoff draft',
          },
        },
      ],
    }));
  });

  afterEach(() => {
    delete process.env.FHIR_FIXTURE_DIR;
    delete process.env.FHIR_CLIENT_ID;
    delete process.env.FHIR_CLIENT_SECRET;
    rmSync(fixtureDir, { recursive: true, force: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.doUnmock('../context/assembler.js');
  });

  it('processes fixture-backed requested Tasks through real write paths', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ access_token: 'token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          resourceType: 'DocumentReference',
          id: 'doc-123',
          status: 'current',
          docStatus: 'preliminary',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          resourceType: 'Task',
          id: 'task-1',
          status: 'completed',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('../context/assembler.js', () => ({
      assemblePatientContext: vi.fn().mockResolvedValue(sampleContext),
    }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 1,
      failed: 0,
      results: [
        {
          taskId: 'task-1',
          status: 'completed',
          documentReferenceId: 'doc-123',
          executionId: 'shift-report:task-1:1776038400000',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/DocumentReference');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/fhir+json',
      }),
    });
    const documentReferenceBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(documentReferenceBody).toMatchObject({
      resourceType: 'DocumentReference',
      meta: {
        tag: [
          {
            system: 'https://noah-rn.dev/workflows',
            code: 'shift-report',
            display: 'Shift Report',
          },
          {
            system: 'https://noah-rn.dev/review-status',
            code: 'review-required',
            display: 'Review Required',
          },
        ],
      },
      identifier: [
        {
          system: 'https://noah-rn.dev/task-id',
          value: 'task-1',
        },
        {
          system: 'https://noah-rn.dev/execution-id',
          value: 'shift-report:task-1:1776038400000',
        },
      ],
      status: 'current',
      docStatus: 'preliminary',
      type: {
        coding: [
          {
            system: 'https://noah-rn.dev/artifacts',
            code: 'shift-report-draft',
            display: 'Draft Shift Report',
          },
          {
            system: 'http://loinc.org',
            code: '28651-8',
            display: 'Nurse transfer note',
          },
        ],
        text: 'Draft Shift Report',
      },
      subject: { reference: 'Patient/patient-123' },
      description: 'Draft Shift Report — requires nurse review',
      context: {
        encounter: [{ reference: 'Encounter/enc-456' }],
      },
    });
    const renderedDraft = Buffer.from(String(documentReferenceBody.content?.[0]?.attachment?.data ?? ''), 'base64').toString('utf8');
    expect(renderedDraft).toContain('Summary');
    expect(renderedDraft).toContain('PATIENT');
    expect(renderedDraft).toContain('STORY');

    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/Task/task-1');
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({
        'Content-Type': 'application/fhir+json',
      }),
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'completed',
      focus: {
        reference: 'DocumentReference/doc-123',
        display: 'Draft Shift Report',
      },
      output: [
        {
          type: { text: 'shift-report-draft' },
          valueReference: {
            reference: 'DocumentReference/doc-123',
            display: 'Draft Shift Report',
          },
        },
      ],
    });
  });
});
