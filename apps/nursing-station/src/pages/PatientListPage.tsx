import { SearchControl } from '@medplum/react';
import { useSearchResources } from '@medplum/react-hooks';
import type { Patient, Task } from '@medplum/fhirtypes';
import type { JSX } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AssignmentWorklist, type AssignmentPatientCard } from '../components/AssignmentWorklist';
import {
  isShellFixtureMode,
  shellFixtureAssignmentPatients,
  shellFixtureTasks,
  withShellFixture,
} from '../fixtures/shell';
import { colors } from '../theme';
import { Badge, Loader, Skeleton, Text } from '@mantine/core';
import { IconSearch, IconSparkles } from '@tabler/icons-react';

export function PatientListPage(): JSX.Element {
  const location = useLocation();
  const fixtureMode = isShellFixtureMode(location.search);
  if (fixtureMode) {
    return <FixturePatientListPage />;
  }

  return <LivePatientListPage />;
}

function FixturePatientListPage(): JSX.Element {
  const navigate = useNavigate();

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    const path = taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`;
    navigate(withShellFixture(path, true));
  }

  function openPatient(patientId: string): void {
    navigate(withShellFixture(`/Patient/${patientId}/overview`, true));
  }

  return (
    <PatientListPageView
      tasks={shellFixtureTasks}
      patients={shellFixtureAssignmentPatients}
      loading={false}
      onOpenTask={openTask}
      onOpenPatient={openPatient}
      fixtureMode
    />
  );
}

function LivePatientListPage(): JSX.Element {
  const navigate = useNavigate();
  const [tasks, tasksLoading] = useSearchResources('Task', '_sort=-authored-on&_count=40');
  const [patients, patientsLoading] = useSearchResources('Patient', '_count=40');

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    navigate(taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`);
  }

  function openPatient(patientId: string): void {
    navigate(`/Patient/${patientId}/overview`);
  }

  const assignmentPatients = buildAssignmentPatients(tasks, patients);

  return (
    <PatientListPageView
      tasks={tasks}
      patients={assignmentPatients}
      loading={tasksLoading || patientsLoading}
      onOpenTask={openTask}
      onOpenPatient={openPatient}
      fixtureMode={false}
    />
  );
}

function PatientListPageView({
  tasks,
  patients,
  loading,
  onOpenTask,
  onOpenPatient,
  fixtureMode,
}: {
  tasks: Task[] | undefined;
  patients: AssignmentPatientCard[];
  loading: boolean;
  onOpenTask: (task: Task) => void;
  onOpenPatient: (patientId: string) => void;
  fixtureMode: boolean;
}): JSX.Element {
  return (
    <div style={{ padding: '40px 48px 48px', minHeight: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.9fr)',
          gap: 20,
          marginBottom: 28,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: '24px 24px 22px',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(24,24,27,0.98) 55%, rgba(24,24,27,0.98) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Badge variant="light" color="cyan" radius="sm">Assignment Hub</Badge>
            {fixtureMode && <Badge variant="outline" color="gray" radius="sm">Fixture mode</Badge>}
          </div>
          <Text fz={28} fw={600} c={colors.textPrimary}>My Assignment</Text>
          <Text fz={14} c={colors.textSecondary} mt={10} maw={720} lh={1.6}>
            Work-first entry surface for the clinician workspace: review queue, running agent work, and patient drill-in from one assignment board.
          </Text>
        </div>

        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: '20px 22px',
            background: colors.surface,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: 'rgba(14, 165, 233, 0.12)',
                color: colors.accent,
              }}
            >
              <IconSparkles size={18} />
            </div>
            <div>
              <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Queue posture
              </Text>
              <Text fz={14} fw={600} c={colors.textPrimary} mt={4}>
                {loading ? 'Syncing assignment board…' : `${patients.length} patients · ${(tasks ?? []).length} tasks in scope`}
              </Text>
            </div>
          </div>
          <Text fz={12} c={colors.textSecondary} mt={14} lh={1.55}>
            Prioritize high-signal task review first, then move into chart sections with the latest clinical context already framed.
          </Text>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader color={colors.accent} size="sm" />
            <Text fz={13} c={colors.textSecondary}>Loading assignment worklist</Text>
          </div>
          <Skeleton height={148} radius="md" />
          <Skeleton height={148} radius="md" />
          <Skeleton height={148} radius="md" />
        </div>
      ) : (
        <AssignmentWorklist
          tasks={tasks}
          patients={patients}
          onOpenTask={onOpenTask}
          onOpenPatient={onOpenPatient}
        />
      )}

      {!fixtureMode && (
        <div
          style={{
            marginTop: 24,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: '22px 24px 24px',
            background: colors.surface,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: 'rgba(14, 165, 233, 0.12)',
                color: colors.accent,
              }}
            >
              <IconSearch size={18} />
            </div>
            <div>
              <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Search all patients
              </Text>
              <Text fz={13} c={colors.textSecondary} mt={4}>
                Jump directly into any chart outside the active assignment board.
              </Text>
            </div>
          </div>
          <SearchControl
            search={{ resourceType: 'Patient', fields: ['name', 'birthDate', 'gender'], count: 20 }}
            onClick={(e) => {
              if (e.resource.id) {
                onOpenPatient(e.resource.id);
              }
            }}
            hideFilters
            hideToolbar
          />
        </div>
      )}
    </div>
  );
}

function buildAssignmentPatients(tasks: Task[] | undefined, patients: Patient[] | undefined): AssignmentPatientCard[] {
  const patientMap = new Map<string, AssignmentPatientCard>(
    (patients ?? []).map((patient) => {
      const fullName = patient.name?.[0]?.text
        ?? [patient.name?.[0]?.given?.join(' '), patient.name?.[0]?.family].filter(Boolean).join(' ')
        ?? patient.id
        ?? 'Unknown patient';

      return [
        patient.id ?? '',
        {
          id: patient.id ?? '',
          name: fullName,
          summary: 'Open patient chart',
        } satisfies AssignmentPatientCard,
      ] as const;
    }),
  );

  const orderedPatientIds = Array.from(new Set((tasks ?? []).map((task) => task.for?.reference?.split('/')[1]).filter(Boolean))) as string[];
  const assignedPatients = orderedPatientIds
    .map((patientId) => patientMap.get(patientId))
    .filter((patient): patient is AssignmentPatientCard => patient !== undefined);

  const fallbackPatients = (patients ?? [])
    .filter((patient) => !orderedPatientIds.includes(patient.id ?? ''))
    .slice(0, 8)
    .map((patient) => patientMap.get(patient.id ?? ''))
    .filter((patient): patient is AssignmentPatientCard => patient !== undefined);

  return [...assignedPatients, ...fallbackPatients];
}
