import { Badge, SimpleGrid, Text } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { colors } from '../theme';

export interface AssignmentPatientCard {
  id: string;
  name: string;
  unit?: string;
  summary?: string;
}

interface AssignmentWorklistProps {
  tasks: Task[] | undefined;
  patients: AssignmentPatientCard[];
  onOpenPatient: (patientId: string) => void;
  onOpenTask: (task: Task) => void;
}

type AssignmentBucket = 'review' | 'active' | 'attention';

function getReviewState(task: Task): string | undefined {
  return task.businessStatus?.coding?.[0]?.code ?? task.businessStatus?.text;
}

function getBucket(task: Task): AssignmentBucket {
  const reviewState = getReviewState(task);
  const hasDraft = Boolean(task.output?.find((output) => output.valueReference?.reference?.startsWith('DocumentReference/')));

  if (task.status === 'failed' || task.status === 'rejected' || task.status === 'on-hold') {
    return 'attention';
  }

  if (task.status === 'completed' && hasDraft && reviewState !== 'approved') {
    return 'review';
  }

  return 'active';
}

function getBucketTitle(bucket: AssignmentBucket): string {
  switch (bucket) {
    case 'review':
      return 'Needs Review';
    case 'active':
      return 'Running / Due Soon';
    case 'attention':
      return 'Needs Attention';
  }
}

function getBucketTone(bucket: AssignmentBucket): 'cyan' | 'blue' | 'red' {
  switch (bucket) {
    case 'review':
      return 'cyan';
    case 'active':
      return 'blue';
    case 'attention':
      return 'red';
  }
}

function getTaskTitle(task: Task): string {
  return task.code?.text || task.description || 'Unnamed task';
}

function getTaskReviewLabel(task: Task): string {
  const reviewState = getReviewState(task);

  if (task.status === 'completed' && reviewState === 'approved') {
    return 'Finalized';
  }
  if (task.status === 'completed' && reviewState === 'acknowledged') {
    return 'Acknowledged';
  }
  if (task.status === 'completed' && reviewState === 'reviewed') {
    return 'Reviewed';
  }
  if (task.status === 'completed') {
    return 'Review Required';
  }
  if (task.status === 'failed') {
    return 'Needs Attention';
  }
  if (task.status === 'in-progress') {
    return 'Agent Running';
  }
  return 'Requested';
}

function buildAssignmentRows(tasks: Task[] | undefined, patients: AssignmentPatientCard[]): Array<{
  bucket: AssignmentBucket;
  task: Task;
  patient: AssignmentPatientCard | undefined;
}> {
  const patientMap = new Map(patients.map((patient) => [patient.id, patient] as const));
  return (tasks ?? []).map((task) => {
    const patientId = task.for?.reference?.split('/')[1] ?? '';
    return {
      bucket: getBucket(task),
      task,
      patient: patientMap.get(patientId),
    };
  });
}

export function AssignmentWorklist({
  tasks,
  patients,
  onOpenPatient,
  onOpenTask,
}: AssignmentWorklistProps): JSX.Element {
  const rows = buildAssignmentRows(tasks, patients);
  const assignmentPatientCount = new Set(rows.map((row) => row.patient?.id).filter(Boolean)).size;
  const reviewCount = rows.filter((row) => row.bucket === 'review').length;
  const activeCount = rows.filter((row) => row.bucket === 'active').length;
  const attentionCount = rows.filter((row) => row.bucket === 'attention').length;

  const groupedRows: Array<{ bucket: AssignmentBucket; rows: typeof rows }> = (['review', 'active', 'attention'] as const)
    .map((bucket) => ({
      bucket,
      rows: rows.filter((row) => row.bucket === bucket),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={12}>
        <SummaryCell label="Assigned Patients" value={assignmentPatientCount} tone="gray" />
        <SummaryCell label="Needs Review" value={reviewCount} tone="cyan" />
        <SummaryCell label="Running / Due" value={activeCount} tone="blue" />
        <SummaryCell label="Needs Attention" value={attentionCount} tone="red" />
      </SimpleGrid>

      {groupedRows.map((group) => (
        <div key={group.bucket} data-testid={`assignment-group-${group.bucket}`}>
          <Text
            ff="monospace"
            fz={11}
            fw={600}
            c={colors.textMuted}
            tt="uppercase"
            mb={10}
            style={{ letterSpacing: '0.08em' }}
          >
            {getBucketTitle(group.bucket)}
          </Text>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {group.rows.map(({ task, patient }) => (
              <button
                key={task.id}
                type="button"
                data-testid={`assignment-task-${task.id}`}
                onClick={() => onOpenTask(task)}
                style={{
                  width: '100%',
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  padding: '18px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 420px' }}>
                    <Text fz={15} fw={600} c={colors.textPrimary}>
                      {patient?.name || task.for?.display || 'Unassigned patient'}
                    </Text>
                    <Text fz={12} c={colors.textSecondary} mt={6}>
                      {patient?.unit || 'Patient context'}
                    </Text>
                  </div>

                  <Badge variant="light" color={getBucketTone(group.bucket)} radius="sm" data-testid={`assignment-state-${task.id}`}>
                    {getTaskReviewLabel(task)}
                  </Badge>
                </div>

                <Text fz={14} fw={500} c={colors.textPrimary} mt={12}>
                  {getTaskTitle(task)}
                </Text>

                {(task.description || patient?.summary) && (
                  <Text fz={12} c={colors.textSecondary} mt={8} lh={1.45}>
                    {task.description || patient?.summary}
                  </Text>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          padding: '18px 20px',
        }}
      >
        <Text
          ff="monospace"
          fz={11}
          fw={600}
          c={colors.textMuted}
          tt="uppercase"
          mb={10}
          style={{ letterSpacing: '0.08em' }}
        >
          Patient Directory
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {patients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              data-testid={`assignment-patient-${patient.id}`}
              onClick={() => onOpenPatient(patient.id)}
              style={{
                width: '100%',
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                padding: '14px 16px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <Text fz={14} fw={500} c={colors.textPrimary}>
                {patient.name}
              </Text>
              <Text fz={12} c={colors.textSecondary} mt={6}>
                {patient.unit || patient.summary || 'Open patient chart'}
              </Text>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'cyan' | 'blue' | 'red' | 'gray';
}): JSX.Element {
  const backgroundByTone = {
    cyan: 'rgba(14, 165, 233, 0.10)',
    blue: 'rgba(59, 130, 246, 0.10)',
    red: 'rgba(225, 29, 72, 0.10)',
    gray: 'rgba(63, 63, 70, 0.28)',
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
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
