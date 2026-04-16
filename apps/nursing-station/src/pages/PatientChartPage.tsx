import { Loader, SimpleGrid, Text } from '@mantine/core';
import type { DocumentReference, Patient, Task } from '@medplum/fhirtypes';
import { PatientTimeline } from '@medplum/react';
import { useMedplum, useMedplumProfile, useResource, useSearchResources } from '@medplum/react-hooks';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { colors } from '../theme';
import { ChartSectionNav, type ChartSectionItem } from '../components/ChartSectionNav';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OverviewPanel } from '../components/OverviewPanel';
import { PatientHeader } from '../components/PatientHeader';
import { type ReviewAction, TaskReviewPanel } from '../components/TaskReviewPanel';
import { TaskWorklist } from '../components/TaskWorklist';
import { VitalsPanel } from '../components/VitalsPanel';
import { LabResultsPanel } from '../components/LabResultsPanel';
import { MedicationList } from '../components/MedicationList';
import {
  isShellFixtureMode,
  shellFixtureAllergies,
  shellFixtureConditions,
  shellFixtureDrafts,
  shellFixtureEncounter,
  shellFixtureLabs,
  shellFixtureMedications,
  shellFixturePatient,
  shellFixtureTasks,
  shellFixtureVitals,
  withShellFixture,
} from '../fixtures/shell';

const SECTION_ITEMS: ChartSectionItem[] = [
  { id: 'overview', label: 'OVERVIEW', detail: 'What matters now, coverage gaps, and recent work.' },
  { id: 'timeline', label: 'TIMELINE', detail: 'Chronological patient activity and chart events.' },
  { id: 'vitals', label: 'VITALS', detail: 'Recent physiologic state with quick trend cues.' },
  { id: 'labs', label: 'RESULTS', detail: 'Recent lab values and abnormal result review.' },
  { id: 'meds', label: 'MEDICATIONS', detail: 'Current medication orders and status.' },
  { id: 'tasks', label: 'TASKS', detail: 'Patient-scoped workflow tasks and requests.' },
];

export function PatientChartPage(): JSX.Element {
  const location = useLocation();
  const fixtureMode = isShellFixtureMode(location.search);
  if (fixtureMode) {
    return <FixturePatientChartPage />;
  }

  return <LivePatientChartPage />;
}

function LivePatientChartPage(): JSX.Element {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  const [vitals] = useSearchResources('Observation', { patient: `Patient/${id}`, category: 'vital-signs', _sort: '-date', _count: '50' });
  const [labs] = useSearchResources('Observation', { patient: `Patient/${id}`, category: 'laboratory', _sort: '-date', _count: '50' });
  const [meds] = useSearchResources('MedicationRequest', { patient: `Patient/${id}`, _sort: '-date', _count: '50' });

  const isKnownSection = SECTION_ITEMS.some((item) => item.id === section);
  const activeSection = isKnownSection ? (section ?? 'overview') : 'overview';

  useEffect(() => {
    if (!id) {
      return;
    }

    if (!section || !isKnownSection) {
      navigate(`/Patient/${id}/${activeSection}`, { replace: true });
    }
  }, [activeSection, id, isKnownSection, navigate, section]);

  if (!patient) {
    return <div style={{ padding: 48 }}><Loader color={colors.accent} size="sm" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PatientHeader patient={patient} patientId={id ?? patient.id ?? ''} onBack={() => navigate('/')} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ChartSectionNav
          items={SECTION_ITEMS}
          activeSection={activeSection}
          onSelect={(nextSection) => navigate(`/Patient/${id}/${nextSection}`)}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Patient chart
              </Text>
              <Text fz={14} c={colors.textSecondary} mt={8}>
                Patient &gt; {SECTION_ITEMS.find((item) => item.id === activeSection)?.label ?? activeSection.toUpperCase()}
              </Text>
            </div>
            <Text fz={12} c={colors.textMuted}>
              {SECTION_ITEMS.find((item) => item.id === activeSection)?.detail}
            </Text>
          </div>
          {activeSection === 'overview' && id && <SectionFrame sectionId="overview"><ErrorBoundary panel="Overview"><OverviewPanel patientId={id} /></ErrorBoundary></SectionFrame>}

          {activeSection === 'timeline' && <SectionFrame sectionId="timeline"><ErrorBoundary panel="Timeline"><PatientTimeline patient={patient} /></ErrorBoundary></SectionFrame>}

          {activeSection === 'vitals' && <SectionFrame sectionId="vitals"><ErrorBoundary panel="Vitals"><VitalsPanel observations={vitals ?? []} /></ErrorBoundary></SectionFrame>}

          {activeSection === 'labs' && <SectionFrame sectionId="labs"><ErrorBoundary panel="Results"><LabResultsPanel observations={labs ?? []} /></ErrorBoundary></SectionFrame>}

          {activeSection === 'meds' && <SectionFrame sectionId="meds"><ErrorBoundary panel="Medications"><MedicationList medications={meds ?? []} /></ErrorBoundary></SectionFrame>}

          {activeSection === 'tasks' && (
            <SectionFrame sectionId="tasks">
              <ErrorBoundary panel="Tasks"><PatientTaskSection tasks={undefined} fixtureMode={false} /></ErrorBoundary>
            </SectionFrame>
          )}
        </div>
      </div>
    </div>
  );
}

function FixturePatientChartPage(): JSX.Element {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const isKnownSection = SECTION_ITEMS.some((item) => item.id === section);
  const activeSection = isKnownSection ? (section ?? 'overview') : 'overview';
  const patient = id === shellFixturePatient.id ? shellFixturePatient : null;

  useEffect(() => {
    if (!id) {
      return;
    }

    if (!section || !isKnownSection) {
      navigate(withShellFixture(`/Patient/${id}/${activeSection}`, true), { replace: true });
    }
  }, [activeSection, id, isKnownSection, navigate, section]);

  if (!patient) {
    return <div style={{ padding: 48 }}><Loader color={colors.accent} size="sm" /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PatientHeader
        patient={patient}
        patientId={id ?? patient.id ?? ''}
        onBack={() => navigate(withShellFixture('/', true))}
        fixtureData={{
          allergies: shellFixtureAllergies,
          encounter: shellFixtureEncounter,
          latestVital: shellFixtureVitals[0],
        }}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ChartSectionNav
          items={SECTION_ITEMS}
          activeSection={activeSection}
          onSelect={(nextSection) => navigate(withShellFixture(`/Patient/${id}/${nextSection}`, true))}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Patient chart
              </Text>
              <Text fz={14} c={colors.textSecondary} mt={8}>
                Patient &gt; {SECTION_ITEMS.find((item) => item.id === activeSection)?.label ?? activeSection.toUpperCase()}
              </Text>
            </div>
            <Text fz={12} c={colors.textMuted}>
              {SECTION_ITEMS.find((item) => item.id === activeSection)?.detail}
            </Text>
          </div>
          {activeSection === 'overview' && id && (
            <SectionFrame sectionId="overview">
              <OverviewPanel
                patientId={id}
                fixtureData={{
                  conditions: shellFixtureConditions,
                  vitals: shellFixtureVitals,
                  labs: shellFixtureLabs,
                  medications: shellFixtureMedications,
                  tasks: shellFixtureTasks,
                  allergies: shellFixtureAllergies,
                }}
              />
            </SectionFrame>
          )}

          {activeSection === 'timeline' && (
            <SectionFrame sectionId="timeline">
              <FixtureSectionText
                title="Fixture timeline"
                body="Chronological activity placeholder for shell navigation coverage."
              />
            </SectionFrame>
          )}

          {activeSection === 'vitals' && (
            <SectionFrame sectionId="vitals">
              <VitalsPanel observations={shellFixtureVitals} />
            </SectionFrame>
          )}

          {activeSection === 'labs' && (
            <SectionFrame sectionId="labs">
              <LabResultsPanel observations={shellFixtureLabs} />
            </SectionFrame>
          )}

          {activeSection === 'meds' && (
            <SectionFrame sectionId="meds">
              <MedicationList medications={shellFixtureMedications} />
            </SectionFrame>
          )}

          {activeSection === 'tasks' && (
            <SectionFrame sectionId="tasks">
              <PatientTaskSection tasks={shellFixtureTasks} fixtureMode />
            </SectionFrame>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionFrame({
  sectionId,
  children,
}: {
  sectionId: string;
  children: JSX.Element;
}): JSX.Element {
  return <div data-testid={`chart-section-${sectionId}`}>{children}</div>;
}

function FixtureSectionText({
  title,
  body,
}: {
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: colors.textPrimary }}>{title}</div>
      <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>{body}</div>
    </div>
  );
}

function PatientTaskSection({
  tasks: fixtureTasks,
  fixtureMode,
}: {
  tasks?: Task[];
  fixtureMode: boolean;
}): JSX.Element {
  if (fixtureMode) {
    return <FixturePatientTaskSection tasks={fixtureTasks ?? []} />;
  }

  return <LivePatientTaskSection />;
}

function FixturePatientTaskSection({
  tasks,
}: {
  tasks: Task[];
}): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [taskState, setTaskState] = useState<Task[]>(tasks);
  const [draftState, setDraftState] = useState<DocumentReference[]>(shellFixtureDrafts);
  const [actionError, setActionError] = useState<string | undefined>();
  const selectedTaskId = searchParams.get('reviewTask') ?? taskState[0]?.id;
  const selectedTask = taskState.find((task) => task.id === selectedTaskId) ?? taskState[0];
  const selectedDraft = draftState.find((draft) => draft.id === getSelectedDraftId(selectedTask));

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    const path = taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`;
    navigate(withShellFixture(path, true));
  }

  function handleReviewAction(action: ReviewAction): void {
    if (!selectedTask) {
      return;
    }

    setActionError(undefined);

    const nextTask = buildTaskReviewUpdate(selectedTask, action);
    setTaskState((current) => current.map((task) => (task.id === nextTask.id ? nextTask : task)));

    if (action === 'approved' && selectedDraft) {
      const nextDraft = buildFinalizedDraft(selectedDraft);
      setDraftState((current) => current.map((draft) => (draft.id === nextDraft.id ? nextDraft : draft)));
    }
  }

  return (
    <PatientTaskSectionLayout
      tasks={taskState}
      selectedTask={selectedTask}
      selectedDraft={selectedDraft}
      onSelectTask={openTask}
      onReviewAction={handleReviewAction}
      actionError={actionError}
    />
  );
}

function LivePatientTaskSection(): JSX.Element {
  const { id } = useParams();
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rawTasks, tasksLoading] = useSearchResources('Task', `patient=Patient/${id}&_sort=-date&_count=25`);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, Task>>({});
  const [draftOverrides, setDraftOverrides] = useState<Record<string, DocumentReference>>({});
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const tasks = rawTasks?.map((task) => (task.id && taskOverrides[task.id]) ? taskOverrides[task.id] : task);
  const selectedTaskId = searchParams.get('reviewTask') ?? tasks?.[0]?.id;
  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? tasks?.[0];
  const outputReference = selectedTask?.output?.find((output) => output.valueReference)?.valueReference?.reference;
  const fetchedDraft = useResource<DocumentReference>(
    outputReference?.startsWith('DocumentReference/') ? { reference: outputReference } : undefined,
  );
  const selectedDraftId = getSelectedDraftId(selectedTask);
  const selectedDraft = selectedDraftId && draftOverrides[selectedDraftId]
    ? draftOverrides[selectedDraftId]
    : fetchedDraft;

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    navigate(taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`);
  }

  async function handleReviewAction(action: ReviewAction): Promise<void> {
    if (!selectedTask) {
      return;
    }

    setActionPending(true);
    setActionError(undefined);

    try {
      const updatedTask = await medplum.updateResource(buildTaskReviewUpdate(selectedTask, action));
      setTaskOverrides((current) => ({ ...current, [updatedTask.id]: updatedTask }));

      if (action === 'approved' && selectedDraft) {
        const updatedDraft = await medplum.updateResource(buildFinalizedDraft(selectedDraft));
        setDraftOverrides((current) => ({ ...current, [updatedDraft.id]: updatedDraft }));

        const attesterReference = getProfileReference(profile);
        if (attesterReference) {
          await medplum.createResource(buildAttestationProvenance(updatedDraft, updatedTask, attesterReference));
        }
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Review action failed');
    } finally {
      setActionPending(false);
    }
  }

  return (
    <>
      {tasksLoading ? (
        <div style={{ padding: '24px 0' }}>
          <Loader color={colors.accent} size="sm" />
        </div>
      ) : (
        <PatientTaskSectionLayout
          tasks={tasks}
          selectedTask={selectedTask}
          selectedDraft={selectedDraft}
          onSelectTask={openTask}
          onReviewAction={handleReviewAction}
          actionPending={actionPending}
          actionError={actionError}
        />
      )}
    </>
  );
}

function PatientTaskSectionLayout({
  tasks,
  selectedTask,
  selectedDraft,
  onSelectTask,
  onReviewAction,
  actionPending,
  actionError,
}: {
  tasks: Task[] | undefined;
  selectedTask?: Task;
  selectedDraft?: DocumentReference;
  onSelectTask: (task: Task) => void;
  onReviewAction?: (action: ReviewAction) => void | Promise<void>;
  actionPending?: boolean;
  actionError?: string;
}): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          padding: '18px 20px',
        }}
      >
        <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Patient Review Queue
        </Text>
        <Text fz={13} c={colors.textSecondary} mt={10} lh={1.5}>
          Use this task queue to review agent work, draft artifacts, and operational follow-up for the current patient before promoting anything to final chart truth.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={18}>
        <TaskWorklist
          tasks={tasks}
          emptyMessage="No patient-scoped review tasks returned."
          onSelectTask={onSelectTask}
          testIdPrefix="patient-task-queue"
          selectedTaskId={selectedTask?.id}
        />
        <TaskReviewPanel
          task={selectedTask}
          draft={selectedDraft}
          emptyMessage="Select a patient-scoped task to inspect its review detail."
          testIdPrefix="patient-review-detail"
          onReviewAction={onReviewAction}
          actionPending={actionPending}
          actionError={actionError}
        />
      </SimpleGrid>
    </div>
  );
}

function getSelectedDraftId(task: Task | undefined): string | undefined {
  const reference = task?.output?.find((output) => output.valueReference)?.valueReference?.reference;
  return reference?.startsWith('DocumentReference/') ? reference.split('/')[1] : undefined;
}

function buildTaskReviewUpdate(task: Task, reviewState: ReviewAction): Task {
  return {
    ...task,
    resourceType: 'Task',
    id: task.id,
    businessStatus: {
      coding: [
        {
          system: 'https://noah-rn.dev/review-state',
          code: reviewState,
          display: reviewState,
        },
      ],
      text: reviewState,
    },
  };
}

function buildFinalizedDraft(draft: DocumentReference): DocumentReference {
  return {
    ...draft,
    resourceType: 'DocumentReference',
    id: draft.id,
    docStatus: 'final',
    description: 'Final Shift Report - nurse attested',
  };
}

function getProfileReference(profile: Patient | { resourceType?: string; id?: string } | undefined): { reference: string; display?: string } | undefined {
  if (!profile?.resourceType || !profile.id) {
    return undefined;
  }

  return {
    reference: `${profile.resourceType}/${profile.id}`,
  };
}

function buildAttestationProvenance(
  draft: DocumentReference,
  task: Task,
  attester: { reference: string; display?: string },
) {
  return {
    resourceType: 'Provenance' as const,
    recorded: new Date().toISOString(),
    occurredDateTime: new Date().toISOString(),
    target: [
      { reference: `DocumentReference/${draft.id}` },
      ...(task.id ? [{ reference: `Task/${task.id}` }] : []),
    ],
    activity: {
      coding: [
        {
          system: 'https://noah-rn.dev/provenance-activity',
          code: 'attest',
          display: 'Attest',
        },
      ],
      text: 'attest',
    },
    agent: [
      {
        type: {
          text: 'attester',
        },
        who: attester,
      },
    ],
  };
}
