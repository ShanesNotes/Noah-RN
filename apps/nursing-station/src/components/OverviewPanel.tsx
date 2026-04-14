import { Badge, Loader, SimpleGrid, Text } from '@mantine/core';
import { formatCodeableConcept, formatDateTime, formatReferenceString } from '@medplum/core';
import type { Condition, MedicationRequest, Observation, Task } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import type { JSX, ReactNode } from 'react';
import { colors } from '../theme';

interface OverviewPanelProps {
  patientId: string;
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
          key={index}
          style={{
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 10,
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
  children: ReactNode;
}

function OverviewCard({ title, eyebrow, children }: OverviewCardProps): JSX.Element {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        padding: 20,
        minHeight: 200,
      }}
    >
      {eyebrow && (
        <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          {eyebrow}
        </Text>
      )}
      <Text fz={18} fw={500} c={colors.textPrimary} mt={eyebrow ? 8 : 0} mb={14}>
        {title}
      </Text>
      {children}
    </section>
  );
}

export function OverviewPanel({ patientId }: OverviewPanelProps): JSX.Element {
  const patientRef = `Patient/${patientId}`;
  const [conditions, conditionsLoading] = useSearchResources('Condition', `patient=${patientRef}&_count=5`);
  const [vitals, vitalsLoading] = useSearchResources('Observation', `patient=${patientRef}&category=vital-signs&_sort=-date&_count=4`);
  const [labs, labsLoading] = useSearchResources('Observation', `patient=${patientRef}&category=laboratory&_sort=-date&_count=4`);
  const [medications, medicationsLoading] = useSearchResources('MedicationRequest', `patient=${patientRef}&_count=5`);
  const [tasks, tasksLoading] = useSearchResources('Task', `patient=${patientRef}&_sort=-authored-on&_count=5`);
  const [allergies, allergiesLoading] = useSearchResources('AllergyIntolerance', `patient=${patientRef}&_count=3`);

  const isLoading = conditionsLoading || vitalsLoading || labsLoading || medicationsLoading || tasksLoading || allergiesLoading;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Default Chart Entry
          </Text>
          <Text fz={24} fw={500} c={colors.textPrimary} mt={8}>
            Overview
          </Text>
          <Text fz={13} c={colors.textSecondary} mt={6}>
            High-signal patient state, immediate gaps, and recent activity.
          </Text>
        </div>
        <Badge variant="light" color="cyan" radius="sm" size="lg" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Medplum-backed
        </Badge>
      </div>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={20} verticalSpacing={20}>
        <OverviewCard title="Active Problems" eyebrow="Clinical State">
          {renderList<Condition>(
            conditions,
            (condition) => (
              <>
                <Text fz={14} fw={500} c={colors.textPrimary}>
                  {formatCodeableConcept(condition.code) || 'Unnamed condition'}
                </Text>
                <Text fz={12} c={colors.textSecondary} mt={4}>
                  {condition.clinicalStatus?.coding?.[0]?.code ?? 'status unknown'}
                </Text>
              </>
            ),
            'No active problems returned.'
          )}
        </OverviewCard>

        <OverviewCard title="Latest Vitals" eyebrow="Immediate Snapshot">
          {renderList<Observation>(
            vitals,
            (observation) => (
              <>
                <Text fz={14} fw={500} c={colors.textPrimary}>
                  {formatCodeableConcept(observation.code) || 'Observation'}
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  {resolveObservationValue(observation)}
                </Text>
                <Text fz={12} c={colors.textMuted} mt={4}>
                  {formatDateTime(observation.effectiveDateTime) || 'time unavailable'}
                </Text>
              </>
            ),
            'No recent vital signs returned.'
          )}
        </OverviewCard>

        <OverviewCard title="Critical Labs / Recent Results" eyebrow="Trend Review">
          {renderList<Observation>(
            labs,
            (observation) => (
              <>
                <Text fz={14} fw={500} c={colors.textPrimary}>
                  {formatCodeableConcept(observation.code) || 'Lab result'}
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  {resolveObservationValue(observation)}
                </Text>
                <Text fz={12} c={colors.textMuted} mt={4}>
                  {formatDateTime(observation.effectiveDateTime) || 'time unavailable'}
                </Text>
              </>
            ),
            'No recent laboratory results returned.'
          )}
        </OverviewCard>

        <OverviewCard title="Current Medications / Due Work" eyebrow="Medication Queue">
          {renderList<MedicationRequest>(
            medications,
            (medication) => (
              <>
                <Text fz={14} fw={500} c={colors.textPrimary}>
                  {formatReferenceString(medication.medicationReference) || formatCodeableConcept(medication.medicationCodeableConcept) || 'Medication'}
                </Text>
                <Text fz={12} c={colors.textSecondary} mt={4}>
                  {medication.status ?? 'status unknown'}
                </Text>
              </>
            ),
            'No medication requests returned.'
          )}
        </OverviewCard>

        <OverviewCard title="Pending Tasks" eyebrow="Operational Work">
          {renderList<Task>(
            tasks,
            (task) => (
              <>
                <Text fz={14} fw={500} c={colors.textPrimary}>
                  {formatCodeableConcept(task.code) || 'Task'}
                </Text>
                <Text fz={12} c={colors.textSecondary} mt={4}>
                  {task.status ?? 'status unknown'}
                </Text>
              </>
            ),
            'No patient-scoped tasks returned.'
          )}
        </OverviewCard>

        <OverviewCard title="Known Data Gaps" eyebrow="Coverage Check">
          {gapFlags.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gapFlags.map((flag) => (
                <Text key={flag} fz={13} c={colors.textSecondary}>
                  {flag}
                </Text>
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
