import { Badge, SimpleGrid, Text } from '@mantine/core';
import { formatCodeableConcept, formatDateTime, formatReferenceString } from '@medplum/core';
import type { Reference, Task } from '@medplum/fhirtypes';
import { IconClockHour4, IconStethoscope } from '@tabler/icons-react';
import type { JSX } from 'react';
import { colors } from '../theme';

interface TaskWorklistProps {
  tasks: Task[] | undefined;
  emptyMessage: string;
  onSelectTask?: (task: Task) => void;
  showPatient?: boolean;
  compact?: boolean;
  testIdPrefix?: string;
  selectedTaskId?: string;
}

interface TaskQueueSummaryProps {
  tasks: Task[] | undefined;
}

type TaskStateTone = 'cyan' | 'blue' | 'yellow' | 'red' | 'green' | 'gray';
type TaskQueueBucket = 'review-required' | 'acknowledged' | 'finalized' | 'active' | 'attention' | 'other';

function getTaskTitle(task: Task): string {
  return formatCodeableConcept(task.code) || task.description || 'Unnamed task';
}

function getTaskOutputReference(task: Task): Reference | undefined {
  return task.output?.find((output) => output.valueReference)?.valueReference;
}

function getTaskOutputType(task: Task): string | undefined {
  return task.output?.find((output) => output.valueReference)?.type?.text;
}

function getTaskPatient(task: Task): string {
  return task.for?.display || formatReferenceString(task.for) || 'Unassigned patient';
}

function getTaskTimestamp(task: Task): string | undefined {
  return task.lastModified || task.authoredOn;
}

function isDraftArtifactOutput(outputReference: Reference | undefined): boolean {
  return Boolean(outputReference?.reference?.startsWith('DocumentReference/'));
}

function getTaskReviewState(task: Task): string | undefined {
  return task.businessStatus?.coding?.[0]?.code ?? task.businessStatus?.text;
}

function getTaskState(task: Task): { label: string; tone: TaskStateTone } {
  const outputReference = getTaskOutputReference(task);
  const reviewState = getTaskReviewState(task);

  if (task.status === 'completed' && isDraftArtifactOutput(outputReference)) {
    if (reviewState === 'approved') {
      return { label: 'Finalized', tone: 'green' };
    }
    if (reviewState === 'acknowledged') {
      return { label: 'Acknowledged', tone: 'blue' };
    }
    if (reviewState === 'reviewed') {
      return { label: 'Reviewed', tone: 'yellow' };
    }
    return { label: 'Review Required', tone: 'cyan' };
  }

  if (task.status === 'failed' || task.status === 'rejected' || task.status === 'on-hold') {
    return { label: 'Needs Attention', tone: 'red' };
  }

  if (task.status === 'in-progress' || task.status === 'accepted' || task.status === 'received' || task.status === 'ready') {
    return { label: 'Agent Running', tone: 'blue' };
  }

  if (task.status === 'requested' || task.status === 'draft') {
    return { label: 'Requested', tone: 'yellow' };
  }

  if (task.status === 'completed') {
    return { label: 'Completed', tone: 'green' };
  }

  return { label: task.status, tone: 'gray' };
}

function getTaskSecondaryBadges(task: Task): Array<{ label: string; tone: TaskStateTone }> {
  const badges: Array<{ label: string; tone: TaskStateTone }> = [];
  const outputReference = getTaskOutputReference(task);
  const outputType = getTaskOutputType(task);
  const reviewState = getTaskReviewState(task);

  if (task.priority && task.priority !== 'routine') {
    badges.push({ label: task.priority.toUpperCase(), tone: task.priority === 'stat' ? 'red' : 'yellow' });
  }

  if (outputReference && isDraftArtifactOutput(outputReference)) {
    badges.push({ label: outputType || 'Document Draft', tone: 'cyan' });
  }

  if (reviewState && !['review-required', 'reviewed', 'acknowledged', 'approved'].includes(reviewState)) {
    badges.push({ label: reviewState, tone: 'gray' });
  }

  return badges;
}

function getTaskDetailLines(task: Task): string[] {
  const lines: string[] = [];
  const outputReference = getTaskOutputReference(task);
  const outputDisplay = outputReference?.display || formatReferenceString(outputReference);

  if (task.description) {
    lines.push(task.description);
  }

  if (outputDisplay) {
    lines.push(`Output: ${outputDisplay}`);
  }

  if (task.statusReason?.text) {
    lines.push(`Status note: ${task.statusReason.text}`);
  }

  if (task.requester?.display) {
    lines.push(`Requested by ${task.requester.display}`);
  }

  if (task.owner?.display) {
    lines.push(`Owned by ${task.owner.display}`);
  }

  return lines;
}

function getTaskQueueBucket(task: Task): TaskQueueBucket {
  const outputReference = getTaskOutputReference(task);
  const reviewState = getTaskReviewState(task);

  if (task.status === 'failed' || task.status === 'rejected' || task.status === 'on-hold') {
    return 'attention';
  }

  if (task.status === 'in-progress' || task.status === 'accepted' || task.status === 'received' || task.status === 'ready' || task.status === 'requested' || task.status === 'draft') {
    return 'active';
  }

  if (task.status === 'completed' && isDraftArtifactOutput(outputReference)) {
    if (reviewState === 'approved') {
      return 'finalized';
    }
    if (reviewState === 'acknowledged') {
      return 'acknowledged';
    }
    return 'review-required';
  }

  return 'other';
}

function getTaskBucketTitle(bucket: TaskQueueBucket): string {
  switch (bucket) {
    case 'review-required':
      return 'Needs review';
    case 'acknowledged':
      return 'Acknowledged / ready to finalize';
    case 'finalized':
      return 'Finalized';
    case 'active':
      return 'Requested / running';
    case 'attention':
      return 'Needs attention';
    default:
      return 'Other';
  }
}

function summarizeTasks(tasks: Task[] | undefined): {
  reviewRequired: number;
  acknowledged: number;
  finalized: number;
  activeQueue: number;
  attention: number;
} {
  const list = tasks ?? [];
  let reviewRequired = 0;
  let acknowledged = 0;
  let finalized = 0;
  let activeQueue = 0;
  let attention = 0;

  for (const task of list) {
    const bucket = getTaskQueueBucket(task);
    if (bucket === 'review-required') {
      reviewRequired += 1;
    } else if (bucket === 'acknowledged') {
      acknowledged += 1;
    } else if (bucket === 'finalized') {
      finalized += 1;
    } else if (bucket === 'active') {
      activeQueue += 1;
    } else if (bucket === 'attention') {
      attention += 1;
    }
  }

  return { reviewRequired, acknowledged, finalized, activeQueue, attention };
}

export function TaskQueueSummary({ tasks }: TaskQueueSummaryProps): JSX.Element {
  const summary = summarizeTasks(tasks);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing={12}>
      <SummaryCell label="Review Required" value={summary.reviewRequired} tone={summary.reviewRequired ? 'cyan' : 'gray'} />
      <SummaryCell label="Acknowledged" value={summary.acknowledged} tone={summary.acknowledged ? 'blue' : 'gray'} />
      <SummaryCell label="Finalized" value={summary.finalized} tone={summary.finalized ? 'green' : 'gray'} />
      <SummaryCell label="Active Queue" value={summary.activeQueue} tone={summary.activeQueue ? 'blue' : 'gray'} />
      <SummaryCell label="Needs Attention" value={summary.attention} tone={summary.attention ? 'red' : 'gray'} />
    </SimpleGrid>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: TaskStateTone;
}): JSX.Element {
  const backgroundByTone: Record<TaskStateTone, string> = {
    cyan: 'rgba(14, 165, 233, 0.10)',
    blue: 'rgba(59, 130, 246, 0.10)',
    yellow: 'rgba(234, 179, 8, 0.10)',
    red: 'rgba(225, 29, 72, 0.10)',
    green: 'rgba(34, 197, 94, 0.10)',
    gray: 'rgba(63, 63, 70, 0.28)',
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: backgroundByTone[tone],
        padding: '14px 16px',
      }}
    >
      <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text fz={24} fw={600} c={colors.textPrimary} mt={8}>
        {value}
      </Text>
    </div>
  );
}

export function TaskWorklist({
  tasks,
  emptyMessage,
  onSelectTask,
  showPatient = false,
  compact = false,
  testIdPrefix = 'task-worklist',
  selectedTaskId,
}: TaskWorklistProps): JSX.Element {
  if (!tasks?.length) {
    return (
      <div
        data-testid={`${testIdPrefix}-empty`}
        style={{
          border: `1px dashed ${colors.borderLight}`,
          borderRadius: 16,
          padding: compact ? '14px 16px' : '18px 20px',
        }}
      >
        <Text fz={13} c={colors.textMuted}>{emptyMessage}</Text>
      </div>
    );
  }

  if (!compact) {
    const groupedTasks: Array<{ bucket: TaskQueueBucket; tasks: Task[] }> = ([
      'review-required',
      'acknowledged',
      'active',
      'attention',
      'finalized',
      'other',
    ] as const)
      .map((bucket) => ({
        bucket,
        tasks: tasks.filter((task) => getTaskQueueBucket(task) === bucket),
      }))
      .filter((group) => group.tasks.length > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groupedTasks.map((group) => (
          <div key={group.bucket} data-testid={`${testIdPrefix}-group-${group.bucket}`}>
            <Text
              ff="monospace"
              fz={11}
              fw={600}
              c={colors.textMuted}
              tt="uppercase"
              mb={10}
              style={{ letterSpacing: '0.08em' }}
            >
              {getTaskBucketTitle(group.bucket)}
            </Text>
            <TaskRowList
              tasks={group.tasks}
              onSelectTask={onSelectTask}
              showPatient={showPatient}
              compact={compact}
              testIdPrefix={testIdPrefix}
              selectedTaskId={selectedTaskId}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TaskRowList
      tasks={tasks}
      onSelectTask={onSelectTask}
      showPatient={showPatient}
      compact={compact}
      testIdPrefix={testIdPrefix}
      selectedTaskId={selectedTaskId}
    />
  );
}

function TaskRowList({
  tasks,
  onSelectTask,
  showPatient,
  compact,
  testIdPrefix,
  selectedTaskId,
}: {
  tasks: Task[] | undefined;
  onSelectTask?: (task: Task) => void;
  showPatient?: boolean;
  compact: boolean;
  testIdPrefix: string;
  selectedTaskId?: string;
}): JSX.Element {
  if (!tasks?.length) {
    return <></>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
      {tasks.map((task, index) => {
        const taskId = task.id || `row-${index}`;
        const state = getTaskState(task);
        const secondaryBadges = getTaskSecondaryBadges(task);
        const timestamp = getTaskTimestamp(task);
        const detailLines = getTaskDetailLines(task);
        const isSelected = task.id === selectedTaskId;
        const leftStripe =
          state.tone === 'red'
            ? colors.critical
            : state.tone === 'yellow'
              ? colors.warning
              : state.tone === 'green'
                ? colors.normal
                : colors.accent;

        return (
          <button
            key={taskId}
            type="button"
            data-testid={`${testIdPrefix}-row-${taskId}`}
            onClick={() => onSelectTask?.(task)}
            style={{
              width: '100%',
              border: `1px solid ${isSelected ? 'rgba(14, 165, 233, 0.35)' : colors.border}`,
              borderRadius: 16,
              background: isSelected ? 'rgba(14, 165, 233, 0.08)' : colors.surface,
              padding: 0,
              cursor: onSelectTask ? 'pointer' : 'default',
              textAlign: 'left',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '6px 1fr', minHeight: compact ? 110 : 128 }}>
              <div style={{ background: leftStripe }} />
              <div style={{ padding: compact ? '14px 16px' : '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 420px' }}>
                    <Text fz={compact ? 14 : 15} fw={600} c={colors.textPrimary}>
                      {getTaskTitle(task)}
                    </Text>
                    {showPatient && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <IconStethoscope size={13} color={colors.textMuted} />
                        <Text fz={12} c={colors.textSecondary}>
                          {getTaskPatient(task)}
                        </Text>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge variant="light" color={state.tone} radius="sm" data-testid={`${testIdPrefix}-state-${taskId}`}>
                      {state.label}
                    </Badge>
                    {secondaryBadges.map((badge) => (
                      <Badge key={`${taskId}-${badge.label}`} variant="light" color={badge.tone} radius="sm">
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {detailLines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {detailLines.map((line) => (
                      <Text key={`${taskId}-${line}`} fz={12} c={colors.textSecondary} lh={1.45}>
                        {line}
                      </Text>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconClockHour4 size={13} color={colors.textMuted} />
                    <Text ff="monospace" fz={11} c={colors.textMuted}>
                      {timestamp ? formatDateTime(timestamp) : 'Timestamp unavailable'}
                    </Text>
                  </div>
                  {task.encounter?.display && (
                    <Text ff="monospace" fz={11} c={colors.textMuted}>
                      {task.encounter.display}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
