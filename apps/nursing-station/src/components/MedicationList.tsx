import { Badge, Text } from '@mantine/core';
import { IconClockHour4, IconPill } from '@tabler/icons-react';
import type { JSX } from 'react';
import { colors } from '../theme';

export interface MedicationRequest {
  id?: string;
  status?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: { display?: string; code?: string }[];
  };
  dosageInstruction?: {
    text?: string;
    route?: { text?: string };
    timing?: { code?: { text?: string } };
    asNeededBoolean?: boolean;
  }[];
  authoredOn?: string;
}

export interface MedicationListProps {
  medications: MedicationRequest[];
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'active':
      return colors.medActive;
    case 'stopped':
      return colors.medStopped;
    default:
      return colors.medDraft;
  }
}

function getStatusTone(status?: string): 'green' | 'gray' | 'yellow' {
  switch (status) {
    case 'active':
      return 'green';
    case 'stopped':
      return 'gray';
    default:
      return 'yellow';
  }
}

function getDrugName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text
    || med.medicationCodeableConcept?.coding?.[0]?.display
    || 'Unknown Medication';
}

function getRouteAndTiming(med: MedicationRequest): string {
  const route = med.dosageInstruction?.[0]?.route?.text;
  const timing = med.dosageInstruction?.[0]?.timing?.code?.text;
  const items = [route, timing].filter(Boolean);
  return items.length ? items.join(' · ') : 'Route/timing unavailable';
}

function isPrnMedication(med: MedicationRequest): boolean {
  return Boolean(med.dosageInstruction?.[0]?.asNeededBoolean || med.dosageInstruction?.[0]?.text?.toLowerCase().includes('prn'));
}

function formatAuthoredDate(authoredOn?: string): string {
  if (!authoredOn) return 'Date unavailable';
  return authoredOn.substring(0, 10);
}

function MedicationRow({ med }: { med: MedicationRequest }): JSX.Element {
  const statusColor = getStatusColor(med.status);
  const statusTone = getStatusTone(med.status);
  const drugName = getDrugName(med);
  const dosage = med.dosageInstruction?.[0]?.text || 'No dosage information';
  const authoredDate = formatAuthoredDate(med.authoredOn);
  const prn = isPrnMedication(med);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '6px minmax(0, 1fr) auto',
        gap: 14,
        alignItems: 'flex-start',
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        overflow: 'hidden',
      }}
    >
      <div style={{ background: statusColor, minHeight: '100%' }} />

      <div style={{ padding: '16px 0 16px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Text fz={15} fw={600} c={colors.textPrimary}>
            {drugName}
          </Text>
          <Badge variant="light" color={statusTone} radius="sm" size="sm">
            {(med.status ?? 'unknown').toUpperCase()}
          </Badge>
          {prn && (
            <Badge variant="light" color="violet" radius="sm" size="sm">
              PRN
            </Badge>
          )}
        </div>

        <Text fz={13} c={colors.textSecondary} mt={8} lh={1.5}>
          {dosage}
        </Text>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPill size={14} color={colors.textMuted} />
            <Text ff="monospace" fz={11} c={colors.textMuted}>
              {getRouteAndTiming(med)}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconClockHour4 size={14} color={colors.textMuted} />
            <Text ff="monospace" fz={11} c={colors.textMuted}>
              {authoredDate}
            </Text>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 16px 0' }}>
        <div
          style={{
            minWidth: 110,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            background: 'rgba(250,250,250,0.02)',
            padding: '10px 12px',
            textAlign: 'right',
          }}
        >
          <Text ff="monospace" fz={10} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Order state
          </Text>
          <Text fz={12} fw={600} c={colors.textPrimary} mt={6}>
            {med.status ?? 'unknown'}
          </Text>
        </div>
      </div>
    </div>
  );
}

function MedicationSection({
  title,
  medications,
  keyPrefix,
}: {
  title: string;
  medications: MedicationRequest[];
  keyPrefix: string;
}): JSX.Element {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Text component="h2" ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          {title}
        </Text>
        <Badge variant="outline" color="gray" radius="sm">
          {medications.length}
        </Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {medications.map((med, index) => (
          <MedicationRow key={med.id || `${keyPrefix}-${index}`} med={med} />
        ))}
      </div>
    </section>
  );
}

export function MedicationList({ medications }: MedicationListProps): JSX.Element {
  if (!medications || medications.length === 0) {
    return (
      <div
        style={{
          border: `1px dashed ${colors.borderLight}`,
          borderRadius: 18,
          padding: '48px 24px',
          textAlign: 'center',
          background: colors.surface,
        }}
      >
        <Text fz={14} c={colors.textSecondary}>
          No medications prescribed.
        </Text>
      </div>
    );
  }

  const activeMeds = medications.filter((m) => m.status === 'active');
  const inactiveMeds = medications.filter((m) => m.status !== 'active');

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {activeMeds.length > 0 && (
        <MedicationSection title="Active medications" medications={activeMeds} keyPrefix="active" />
      )}

      {inactiveMeds.length > 0 && (
        <MedicationSection title="Inactive / draft medications" medications={inactiveMeds} keyPrefix="inactive" />
      )}
    </div>
  );
}
