import { assemblePatientContext } from '../context/assembler.js';
import { createDraftShiftReport } from '../fhir/writes.js';
import { getRequestedShiftReportTasks, updateTask } from '../fhir/client.js';
import type { DocumentReference, Task } from '../fhir/types.js';

export const MAX_STATUS_REASON_TEXT = 512;

export interface ShiftReportTaskResult {
  taskId: string;
  status: 'completed' | 'failed';
  documentReferenceId?: string;
  error?: string;
}

export interface ShiftReportPollSummary {
  found: number;
  completed: number;
  failed: number;
  results: ShiftReportTaskResult[];
}

export async function pollOnce(count: number = 20): Promise<ShiftReportPollSummary> {
  const taskResult = await getRequestedShiftReportTasks(count);
  if (taskResult.error || !taskResult.data) {
    throw new Error(`pollOnce failed: ${taskResult.error}`);
  }

  const results: ShiftReportTaskResult[] = [];
  for (const task of taskResult.data) {
    results.push(await processTask(task));
  }

  return {
    found: taskResult.data.length,
    completed: results.filter(result => result.status === 'completed').length,
    failed: results.filter(result => result.status === 'failed').length,
    results,
  };
}

export async function processTask(task: Task): Promise<ShiftReportTaskResult> {
  const taskId = task.id ?? 'unknown-task';

  try {
    if (!task.id) {
      throw new Error('Task is missing id');
    }

    const patientId = extractPatientId(task);
    const encounterId = extractEncounterId(task);
    const context = await assemblePatientContext(patientId);
    const draft = await createDraftShiftReport({
      patientId,
      encounterId,
      reportMarkdown: JSON.stringify(context, null, 2),
    });

    if (!draft.id) {
      throw new Error('Draft DocumentReference missing id');
    }

    await updateTaskOrThrow(task.id, buildCompletedTask(task, draft));

    return {
      taskId,
      status: 'completed',
      documentReferenceId: draft.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (task.id) {
      const failureUpdate = await updateTask(task.id, buildFailedTask(task, message));
      if (failureUpdate.error) {
        return {
          taskId,
          status: 'failed',
          error: `${message}; failed to update Task/${task.id}: ${failureUpdate.error}`,
        };
      }
    }

    return {
      taskId,
      status: 'failed',
      error: message,
    };
  }
}

export function extractPatientId(task: Task): string {
  const reference = task.for?.reference ?? '';
  const match = /^Patient\/([^/]+)$/.exec(reference);

  if (!match) {
    throw new Error(`Task.for.reference must be Patient/{id}; received: ${reference || 'missing'}`);
  }

  return match[1];
}

export function extractEncounterId(task: Task): string | undefined {
  const reference = task.encounter?.reference;
  if (!reference) return undefined;

  const match = /^Encounter\/([^/]+)$/.exec(reference);
  return match ? match[1] : undefined;
}

export function buildCompletedTask(task: Task, draft: DocumentReference): Task {
  return {
    ...task,
    resourceType: 'Task',
    id: task.id,
    status: 'completed',
    statusReason: undefined,
    output: [
      {
        type: { text: 'shift-report-draft' },
        valueReference: {
          reference: `DocumentReference/${draft.id}`,
          display: 'Draft Shift Report',
        },
      },
    ],
  };
}

export function buildFailedTask(task: Task, message: string): Task {
  return {
    ...task,
    resourceType: 'Task',
    id: task.id,
    status: 'failed',
    statusReason: { text: truncateStatusReason(message) },
    output: undefined,
  };
}

export function truncateStatusReason(message: string, maxLength: number = MAX_STATUS_REASON_TEXT): string {
  if (message.length <= maxLength) {
    return message;
  }

  return `${message.slice(0, Math.max(0, maxLength - 12))} [truncated]`;
}

async function updateTaskOrThrow(taskId: string, updatedTask: Task): Promise<void> {
  const result = await updateTask(taskId, updatedTask);
  if (result.error || !result.data) {
    throw new Error(`updateTask failed: ${result.error}`);
  }
}
