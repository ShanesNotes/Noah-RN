import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PatientContext } from '../context/types.js';
import type { Task } from '../fhir/types.js';

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

function createRequestedTask(): Task {
  return {
    resourceType: 'Task',
    id: 'task-1',
    status: 'requested',
    intent: 'order',
    code: {
      coding: [{
        system: 'https://noah-rn.dev/workflows',
        code: 'shift-report',
        display: 'Shift Report',
      }],
      text: 'Generate Shift Report',
    },
    for: { reference: 'Patient/patient-123' },
    encounter: { reference: 'Encounter/enc-456' },
    description: 'Generate shift handoff draft',
  };
}

describe('shift report worker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.doUnmock('../fhir/client.js');
    vi.doUnmock('../fhir/writes.js');
    vi.doUnmock('../context/assembler.js');
  });

  it('exports pure helpers for Task transitions and truncates long failure reasons', async () => {
    const { buildCompletedTask, buildFailedTask, truncateStatusReason, MAX_STATUS_REASON_TEXT } = await import('../worker/shift-report-worker.js');
    const task = createRequestedTask();

    expect(buildCompletedTask(task, {
      resourceType: 'DocumentReference',
      id: 'doc-123',
    })).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'completed',
      output: [{
        type: { text: 'shift-report-draft' },
        valueReference: {
          reference: 'DocumentReference/doc-123',
          display: 'Draft Shift Report',
        },
      }],
    });

    const longMessage = 'x'.repeat(MAX_STATUS_REASON_TEXT + 50);
    const truncated = truncateStatusReason(longMessage);
    expect(truncated.length).toBeLessThanOrEqual(MAX_STATUS_REASON_TEXT);
    expect(truncated.endsWith(' [truncated]')).toBe(true);
    expect(buildFailedTask(task, longMessage)).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'failed',
      statusReason: { text: truncated },
    });
  });

  it('clears stale output when marking a Task failed', async () => {
    const { buildFailedTask } = await import('../worker/shift-report-worker.js');
    const task: Task = {
      ...createRequestedTask(),
      output: [{
        type: { text: 'shift-report-draft' },
        valueReference: { reference: 'DocumentReference/doc-123' },
      }],
    };

    expect(buildFailedTask(task, 'context exploded')).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'failed',
      statusReason: { text: 'context exploded' },
    });
    expect(buildFailedTask(task, 'context exploded').output).toBeUndefined();
  });

  it('completes requested Tasks after creating a draft shift report', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [createRequestedTask()],
      error: null,
    });
    const updateTask = vi.fn().mockResolvedValue({
      data: { resourceType: 'Task', id: 'task-1', status: 'completed' },
      error: null,
    });
    const assemblePatientContext = vi.fn().mockResolvedValue(sampleContext);
    const createDraftShiftReport = vi.fn().mockResolvedValue({
      resourceType: 'DocumentReference',
      id: 'doc-123',
      status: 'current',
      docStatus: 'preliminary',
    });

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 1,
      failed: 0,
      results: [{
        taskId: 'task-1',
        status: 'completed',
        documentReferenceId: 'doc-123',
      }],
    });

    expect(assemblePatientContext).toHaveBeenCalledWith('patient-123');
    expect(createDraftShiftReport).toHaveBeenCalledWith({
      patientId: 'patient-123',
      encounterId: 'enc-456',
      reportMarkdown: JSON.stringify(sampleContext, null, 2),
    });
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        resourceType: 'Task',
        id: 'task-1',
        status: 'completed',
        output: [{
          type: { text: 'shift-report-draft' },
          valueReference: {
            reference: 'DocumentReference/doc-123',
            display: 'Draft Shift Report',
          },
        }],
      }),
    );
  });

  it('returns an empty summary when no tasks are available', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const updateTask = vi.fn();

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext: vi.fn() }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport: vi.fn() }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 0,
      completed: 0,
      failed: 0,
      results: [],
    });
    expect(updateTask).not.toHaveBeenCalled();
  });

  it('marks the Task failed when context assembly fails', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [createRequestedTask()],
      error: null,
    });
    const updateTask = vi.fn().mockResolvedValue({
      data: { resourceType: 'Task', id: 'task-1', status: 'failed' },
      error: null,
    });
    const assemblePatientContext = vi.fn().mockRejectedValue(new Error('context exploded'));
    const createDraftShiftReport = vi.fn();

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 0,
      failed: 1,
      results: [{
        taskId: 'task-1',
        status: 'failed',
        error: 'context exploded',
      }],
    });
    expect(createDraftShiftReport).not.toHaveBeenCalled();
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        resourceType: 'Task',
        id: 'task-1',
        status: 'failed',
        statusReason: { text: 'context exploded' },
      }),
    );
  });

  it('marks the Task failed when draft creation fails', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [createRequestedTask()],
      error: null,
    });
    const updateTask = vi.fn().mockResolvedValue({
      data: { resourceType: 'Task', id: 'task-1', status: 'failed' },
      error: null,
    });
    const assemblePatientContext = vi.fn().mockResolvedValue(sampleContext);
    const createDraftShiftReport = vi.fn().mockRejectedValue(new Error('FHIR POST failed: boom'));

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 0,
      failed: 1,
      results: [{
        taskId: 'task-1',
        status: 'failed',
        error: 'FHIR POST failed: boom',
      }],
    });
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        resourceType: 'Task',
        id: 'task-1',
        status: 'failed',
        statusReason: { text: 'FHIR POST failed: boom' },
      }),
    );
  });

  it('marks the Task failed when Task.for.reference is malformed', async () => {
    const malformedTask: Task = {
      ...createRequestedTask(),
      for: { reference: 'Encounter/enc-456' },
    };
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [malformedTask],
      error: null,
    });
    const updateTask = vi.fn().mockResolvedValue({
      data: { resourceType: 'Task', id: 'task-1', status: 'failed' },
      error: null,
    });

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext: vi.fn() }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport: vi.fn() }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 0,
      failed: 1,
      results: [{
        taskId: 'task-1',
        status: 'failed',
        error: 'Task.for.reference must be Patient/{id}; received: Encounter/enc-456',
      }],
    });
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        status: 'failed',
        statusReason: {
          text: 'Task.for.reference must be Patient/{id}; received: Encounter/enc-456',
        },
      }),
    );
  });

  it('attempts to mark the Task failed when completion update fails', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [createRequestedTask()],
      error: null,
    });
    const updateTask = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: 'FHIR PUT 409: Conflict — version mismatch',
      })
      .mockResolvedValueOnce({
        data: { resourceType: 'Task', id: 'task-1', status: 'failed' },
        error: null,
      });
    const assemblePatientContext = vi.fn().mockResolvedValue(sampleContext);
    const createDraftShiftReport = vi.fn().mockResolvedValue({
      resourceType: 'DocumentReference',
      id: 'doc-123',
      status: 'current',
      docStatus: 'preliminary',
    });

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 0,
      failed: 1,
      results: [{
        taskId: 'task-1',
        status: 'failed',
        error: 'updateTask failed: FHIR PUT 409: Conflict — version mismatch',
      }],
    });
    expect(updateTask).toHaveBeenCalledTimes(2);
    expect(updateTask.mock.calls[0]?.[1]).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'completed',
    });
    expect(updateTask.mock.calls[1]?.[1]).toMatchObject({
      resourceType: 'Task',
      id: 'task-1',
      status: 'failed',
      statusReason: {
        text: 'updateTask failed: FHIR PUT 409: Conflict — version mismatch',
      },
    });
  });

  it('reports when failure status update also fails', async () => {
    const getRequestedShiftReportTasks = vi.fn().mockResolvedValue({
      data: [createRequestedTask()],
      error: null,
    });
    const updateTask = vi.fn().mockResolvedValue({
      data: null,
      error: 'FHIR PUT 500: Internal Server Error — down',
    });
    const assemblePatientContext = vi.fn().mockRejectedValue(new Error('context exploded'));

    vi.doMock('../fhir/client.js', () => ({ getRequestedShiftReportTasks, updateTask }));
    vi.doMock('../context/assembler.js', () => ({ assemblePatientContext }));
    vi.doMock('../fhir/writes.js', () => ({ createDraftShiftReport: vi.fn() }));

    const { pollOnce } = await import('../worker/shift-report-worker.js');
    const summary = await pollOnce();

    expect(summary).toEqual({
      found: 1,
      completed: 0,
      failed: 1,
      results: [{
        taskId: 'task-1',
        status: 'failed',
        error: 'context exploded; failed to update Task/task-1: FHIR PUT 500: Internal Server Error — down',
      }],
    });
    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        resourceType: 'Task',
        id: 'task-1',
        status: 'failed',
        statusReason: { text: 'context exploded' },
      }),
    );
  });
});
