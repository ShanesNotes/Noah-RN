import { Alert, Badge, Button, Code, Group, Text } from '@mantine/core';
import { formatCodeableConcept, formatDateTime, formatReferenceString } from '@medplum/core';
import type { DocumentReference, Task } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { colors } from '../theme';

export type ReviewAction = 'reviewed' | 'acknowledged' | 'approved';

interface TaskReviewPanelProps {
  task?: Task;
  draft?: DocumentReference;
  emptyMessage?: string;
  testIdPrefix?: string;
  onReviewAction?: (action: ReviewAction) => void | Promise<void>;
  actionPending?: boolean;
  actionError?: string;
}

function getTaskTitle(task: Task): string {
  return formatCodeableConcept(task.code) || task.description || 'Unnamed task';
}

function getTaskOutputReference(task: Task): string | undefined {
  return task.output?.find((output) => output.valueReference)?.valueReference?.reference;
}

function getTaskOutputDisplay(task: Task): string | undefined {
  const reference = task.output?.find((output) => output.valueReference)?.valueReference;
  return reference?.display || formatReferenceString(reference);
}

function decodeDraftContent(draft: DocumentReference | undefined): string | undefined {
  const data = draft?.content?.[0]?.attachment?.data;
  if (!data || typeof globalThis.atob !== 'function') {
    return undefined;
  }

  try {
    return globalThis.atob(data);
  } catch {
    return undefined;
  }
}

function getReviewState(task: Task): ReviewAction | 'review-required' | undefined {
  const code = task.businessStatus?.coding?.[0]?.code ?? task.businessStatus?.text;
  return code as ReviewAction | 'review-required' | undefined;
}

function getNextActionLabel(action: ReviewAction): string {
  switch (action) {
    case 'reviewed':
      return 'Mark Reviewed';
    case 'acknowledged':
      return 'Acknowledge';
    case 'approved':
      return 'Finalize Draft';
  }
}

export function TaskReviewPanel({
  task,
  draft,
  emptyMessage = 'Select a task to inspect its review state.',
  testIdPrefix = 'task-review-panel',
  onReviewAction,
  actionPending = false,
  actionError,
}: TaskReviewPanelProps): JSX.Element {
  if (!task) {
    return (
      <section
        data-testid={`${testIdPrefix}-empty`}
        style={{
          border: `1px dashed ${colors.borderLight}`,
          padding: '18px 20px',
          background: colors.surface,
        }}
      >
        <Text fz={13} c={colors.textMuted}>{emptyMessage}</Text>
      </section>
    );
  }

  const draftOutput = Boolean(getTaskOutputReference(task)?.startsWith('DocumentReference/'));
  const preview = decodeDraftContent(draft);
  const artifactDescription = draft?.description || getTaskOutputDisplay(task) || 'Draft artifact linked from task output';
  const lastUpdated = task.lastModified || task.authoredOn;
  const reviewState = getReviewState(task);
  const availableActions: ReviewAction[] =
    reviewState === 'approved'
      ? []
      : reviewState === 'acknowledged'
        ? ['approved']
        : reviewState === 'reviewed'
          ? ['acknowledged', 'approved']
          : ['reviewed', 'acknowledged'];

  return (
    <section
      data-testid={`${testIdPrefix}-panel`}
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Review Detail
          </Text>
          <Text fz={20} fw={600} c={colors.textPrimary} mt={8}>
            {getTaskTitle(task)}
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant="light" color={draftOutput ? 'cyan' : 'blue'} radius="sm">
            {draftOutput ? 'Draft Review' : 'Operational Task'}
          </Badge>
          {draft?.docStatus && (
            <Badge variant="light" color="yellow" radius="sm" data-testid={`${testIdPrefix}-doc-status`}>
              {draft.docStatus}
            </Badge>
          )}
        </div>
      </div>

      <div
        data-testid={`${testIdPrefix}-state-banner`}
        style={{
          border: `1px solid ${draftOutput ? 'rgba(14, 165, 233, 0.28)' : colors.border}`,
          background: draftOutput ? 'rgba(14, 165, 233, 0.08)' : 'rgba(59, 130, 246, 0.08)',
          padding: '14px 16px',
        }}
      >
        <Text fz={13} fw={600} c={colors.textPrimary}>
          {draftOutput
            ? 'This artifact is draft-only. Nurse review is required before anything becomes final chart truth.'
            : 'This task has no linked draft artifact yet. Use the queue state and notes below to track agent progress and follow-up.'}
        </Text>
        <Text fz={12} c={colors.textSecondary} mt={8} lh={1.45}>
          Noah RN remains the execution owner. Medplum remains the request/review plane. The review surface is intentionally task-driven.
        </Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px 18px' }}>
        <MetaField label="Task Status" value={task.status} />
        <MetaField label="Review State" value={reviewState ?? 'review-required'} testId={`${testIdPrefix}-review-state`} />
        <MetaField label="Patient" value={task.for?.display || formatReferenceString(task.for) || 'Unassigned'} />
        <MetaField label="Artifact" value={artifactDescription} />
        <MetaField label="Updated" value={lastUpdated ? formatDateTime(lastUpdated) : 'Timestamp unavailable'} />
      </div>

      {draftOutput && onReviewAction && (
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Review Actions
          </Text>
          <Group gap={10} mt={10}>
            {availableActions.map((action) => (
              <Button
                key={action}
                size="xs"
                radius="sm"
                variant={action === 'approved' ? 'filled' : 'light'}
                color={action === 'approved' ? 'cyan' : 'gray'}
                loading={actionPending}
                disabled={actionPending}
                data-testid={`${testIdPrefix}-action-${action}`}
                onClick={() => {
                  void onReviewAction(action);
                }}
              >
                {getNextActionLabel(action)}
              </Button>
            ))}
          </Group>
        </div>
      )}

      {actionError && (
        <Alert
          color="red"
          variant="light"
          radius="md"
          data-testid={`${testIdPrefix}-action-error`}
          styles={{
            root: {
              background: colors.surface,
              border: '1px solid rgba(225, 29, 72, 0.35)',
            },
            message: { color: colors.textSecondary },
          }}
        >
          {actionError}
        </Alert>
      )}

      {task.description && (
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Queue Note
          </Text>
          <Text fz={13} c={colors.textSecondary} mt={8} lh={1.5}>
            {task.description}
          </Text>
        </div>
      )}

      {draftOutput && (
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Draft Preview
          </Text>
          <div
            data-testid={`${testIdPrefix}-draft-preview`}
            style={{
              marginTop: 10,
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              padding: '14px 16px',
            }}
          >
            {preview ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: colors.textPrimary,
                  fontSize: 12,
                  lineHeight: 1.55,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {preview}
              </pre>
            ) : (
              <Text fz={12} c={colors.textMuted}>
                Draft content is linked but no text preview is available yet.
              </Text>
            )}
          </div>
        </div>
      )}

      <div>
        <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Provenance Guardrail
        </Text>
        <Code block mt={10} style={{ background: '#0f172a', color: '#bae6fd', border: `1px solid ${colors.borderLight}` }}>
          Task review -&gt; draft artifact -&gt; nurse review -&gt; explicit finalization later
        </Code>
      </div>
    </section>
  );
}

function MetaField({ label, value, testId }: { label: string; value: string; testId?: string }): JSX.Element {
  return (
    <div>
      <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text fz={13} c={colors.textPrimary} mt={6} data-testid={testId}>
        {value}
      </Text>
    </div>
  );
}
