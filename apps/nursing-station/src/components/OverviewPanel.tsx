import { Badge, Loader, SimpleGrid, Text } from '@mantine/core';
import { formatCodeableConcept, formatDateTime, formatReferenceString } from '@medplum/core';
import type { Condition, MedicationRequest, Observation, Task } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import { IconAlertTriangle, IconChartDots3, IconClipboardCheck, IconHeartbeat, IconPill, IconStethoscope } from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isShellFixtureMode, withShellFixture } from '../fixtures/shell';
import { TaskQueueSummary, TaskWorklist } from './TaskWorklist';
import { colors } from '../theme';

interface OverviewFixtureData {
  conditions?: Condition[];
  vitals?: Observation[];
  labs?: Observation[];
  medications?: MedicationRequest[];
  tasks?: Task[];
  allergies?: { id?: string }[];
}

interface OverviewPanelProps {
  patientId: string;
  fixtureData?: OverviewFixtureData;
}

function resolveObservationValue(observation: Observation): string {
  if (observation.valueQuantity?.value !== undefined) {
    return `${observation.valueQuantity.value}${observation.valueQuantity.unit ? ` ${observation.valueQuantity.unit}` : ''}`;
  }

  if (observation.valueString) {
    return observation.valueString;
  }

  if (observation.valueCodeableConcept) {
    return formatCodeableConcept(observation.valueCodeableConcept);
  }

  if (observation.component?.length) {
    return observation.component
      .map((component) => {
        const label = formatCodeableConcept({ coding: component.code?.coding, text: component.code?.text });
        const value = component.valueQuantity?.value !== undefined
          ? `${component.valueQuantity.value}${component.valueQuantity.unit ? ` ${component.valueQuantity.unit}` : ''}`
          : component.valueString ?? formatCodeableConcept(component.valueCodeableConcept);
        return label && value ? `${label}: ${value}` : value;
      })
      .filter(Boolean)
      .join(' · ');
  }

  return 'No value';
}

function renderList<T>(items: T[] | undefined, renderItem: (item: T, index: number) => ReactNode, fallback: string): JSX.Element {
  if (!items?.length) {
    return <Text fz={13} c={colors.textMuted}>{fallback}</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, index) => (
        <div
          key={(item as { id?: string }).id ?? index}
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            background: 'rgba(250,250,250,0.02)',
            padding: '14px 16px',
          }}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

interface OverviewCardProps {
  title: string;
  eyebrow?: string;
  icon: JSX.Element;
  children: ReactNode;
}

function OverviewCard({ title, eyebrow, icon, children }: OverviewCardProps): JSX.Element {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: 20,
        minHeight: 220,
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
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          {eyebrow && (
            <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              {eyebrow}
            </Text>
          )}
          <Text fz={18} fw={600} c={colors.textPrimary} mt={eyebrow ? 4 : 0}>
            {title}
          </Text>
        </div>
      </div>
      {children}
    </section>
  );
}

export function OverviewPanel({ patientId, fixtureData }: OverviewPanelProps): JSX.Element {
  if (fixtureData) {
    return (
      <OverviewPanelView
        patientId={patientId}
        conditions={fixtureData.conditions}
        vitals={fixtureData.vitals}
        labs={fixtureData.labs}
        medications={fixtureData.medications}
        tasks={fixtureData.tasks}
        allergies={fixtureData.allergies}
        isLoading={false}
      />
    );
  }

  return <LiveOverviewPanel patientId={patientId} />;
}

function LiveOverviewPanel({ patientId }: { patientId: string }): JSX.Element {
  const patientRef = `Patient/${patientId}`;
  const [conditions, conditionsLoading] = useSearchResources('Condition', `patient=${patientRef}&_count=5`);
  const [vitals, vitalsLoading] = useSearchResources('Observation', `patient=${patientRef}&category=vital-signs&_sort=-date&_count=4`);
  const [labs, labsLoading] = useSearchResources('Observation', `patient=${patientRef}&category=laboratory&_sort=-date&_count=4`);
  const [medications, medicationsLoading] = useSearchResources('MedicationRequest', `patient=${patientRef}&_count=5`);
  const [tasks, tasksLoading] = useSearchResources('Task', `patient=${patientRef}&_sort=-authored-on&_count=5`);
  const [allergies, allergiesLoading] = useSearchResources('AllergyIntolerance', `patient=${patientRef}&_count=3`);

  return (
    <OverviewPanelView
      patientId={patientId}
      conditions={conditions}
      vitals={vitals}
      labs={labs}
      medications={medications}
      tasks={tasks}
      allergies={allergies}
      isLoading={conditionsLoading || vitalsLoading || labsLoading || medicationsLoading || tasksLoading || allergiesLoading}
    />
  );
}

function OverviewPanelView({
  patientId,
  conditions,
  vitals,
  labs,
  medications,
  tasks,
  allergies,
  isLoading,
}: {
  patientId: string;
  conditions: Condition[] | undefined;
  vitals: Observation[] | undefined;
  labs: Observation[] | undefined;
  medications: MedicationRequest[] | undefined;
  tasks: Task[] | undefined;
  allergies: { id?: string }[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const fixtureMode = isShellFixtureMode(location.search);
  const gapFlags: string[] = [];

  if (!allergies?.length) {
    gapFlags.push('Allergy list not documented');
  }
  if (!vitals?.length) {
    gapFlags.push('No recent vitals returned');
  }
  if (!labs?.length) {
    gapFlags.push('No recent labs returned');
  }
  if (!tasks?.length) {
    gapFlags.push('No active tasks returned');
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Loader color={colors.accent} size="sm" />
      </div>
    );
  }

  return (
    <div data-testid="overview-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(24,24,27,0.98) 58%, rgba(24,24,27,0.98) 100%)',
          padding: '22px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Default chart entry
            </Text>
            <Text fz={26} fw={600} c={colors.textPrimary} mt={8}>
              Overview
            </Text>
            <Text fz={13} c={colors.textSecondary} mt={8}>
              High-signal patient state, immediate gaps, and recent activity.
            </Text>
          </div>
          <Badge variant="light" color="cyan" radius="sm" size="lg" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Medplum-backed
          </Badge>
        </div>
      </div>

      <SimpleGrid cols={{ base: 1, lg: 4 }} spacing={12}>
        <SummaryPill label="Problems" value={conditions?.length ?? 0} />
        <SummaryPill label="Recent vitals" value={vitals?.length ?? 0} />
        <SummaryPill label="Recent labs" value={labs?.length ?? 0} />
        <SummaryPill label="Open tasks" value={tasks?.length ?? 0} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={20} verticalSpacing={20}>
        <OverviewCard title="Active problems" eyebrow="Clinical state" icon={<IconStethoscope size={18} />}>
          {renderList<Condition>(
            conditions,
            (condition) => (
              <>
                <Text fz={14} fw={600} c={colors.textPrimary}>
                  {formatCodeableConcept(condition.code) || 'Unnamed condition'}
                </Text>
                <Text fz={12} c={colors.textSecondary} mt={6}>
                  {condition.clinicalStatus?.coding?.[0]?.code ?? 'status unknown'}
                </Text>
              </>
            ),
            'No active problems returned.',
          )}
        </OverviewCard>

        <OverviewCard title="Latest vitals" eyebrow="Immediate snapshot" icon={<IconHeartbeat size={18} />}>
          {renderList<Observation>(
            vitals,
            (observation) => (
              <>
                <Text fz={14} fw={600} c={colors.textPrimary}>
                  {formatCodeableConcept(observation.code) || 'Observation'}
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={6}>
                  {resolveObservationValue(observation)}
                </Text>
                <Text ff="monospace" fz={11} c={colors.textMuted} mt={8}>
                  {formatDateTime(observation.effectiveDateTime) || 'time unavailable'}
                </Text>
              </>
            ),
            'No recent vital signs returned.',
          )}
        </OverviewCard>

        <OverviewCard title="Critical labs / recent results" eyebrow="Trend review" icon={<IconChartDots3 size={18} />}>
          {renderList<Observation>(
            labs,
            (observation) => (
              <>
                <Text fz={14} fw={600} c={colors.textPrimary}>
                  {formatCodeableConcept(observation.code) || 'Lab result'}
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={6}>
                  {resolveObservationValue(observation)}
                </Text>
                <Text ff="monospace" fz={11} c={colors.textMuted} mt={8}>
                  {formatDateTime(observation.effectiveDateTime) || 'time unavailable'}
                </Text>
              </>
            ),
            'No recent laboratory results returned.',
          )}
        </OverviewCard>

        <OverviewCard title="Current medications / due work" eyebrow="Medication queue" icon={<IconPill size={18} />}>
          {renderList<MedicationRequest>(
            medications,
            (medication) => (
              <>
                <Text fz={14} fw={600} c={colors.textPrimary}>
                  {formatReferenceString(medication.medicationReference) || formatCodeableConcept(medication.medicationCodeableConcept) || 'Medication'}
                </Text>
                <Text fz={12} c={colors.textSecondary} mt={6}>
                  {medication.status ?? 'status unknown'}
                </Text>
              </>
            ),
            'No medication requests returned.',
          )}
        </OverviewCard>

        <OverviewCard title="Review queue" eyebrow="Agent review spine" icon={<IconClipboardCheck size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Text fz={13} c={colors.textSecondary}>
              Task is the nurse-facing review primitive. Draft artifacts and agent work should surface here before any final chart truth.
            </Text>
            <TaskQueueSummary tasks={tasks} />
            <TaskWorklist
              tasks={tasks}
              emptyMessage="No patient-scoped review tasks returned."
              compact
              onSelectTask={(task) => {
                const taskId = task.id;
                const path = taskId ? `/Patient/${patientId}/tasks?reviewTask=${taskId}` : `/Patient/${patientId}/tasks`;
                navigate(withShellFixture(path, fixtureMode));
              }}
              testIdPrefix="overview-review-queue"
            />
          </div>
        </OverviewCard>

        <OverviewCard title="Known data gaps" eyebrow="Coverage check" icon={<IconAlertTriangle size={18} />}>
          {gapFlags.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gapFlags.map((flag) => (
                <div
                  key={flag}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    background: 'rgba(234, 179, 8, 0.08)',
                  }}
                >
                  <Text fz={13} c={colors.textPrimary}>
                    {flag}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <Text fz={13} c={colors.textSecondary}>
              Core overview surfaces returned data for this patient.
            </Text>
          )}
        </OverviewCard>
      </SimpleGrid>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        padding: '14px 16px',
      }}
    >
      <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text fz={24} fw={600} c={colors.textPrimary} mt={8}>
        {value}
      </Text>
    </div>
  );
}
