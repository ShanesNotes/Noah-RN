import { Text } from '@mantine/core';
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
  }[];
  authoredOn?: string;
}

export interface MedicationListProps {
  medications: MedicationRequest[];
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'active': return colors.medActive;
    case 'stopped': return colors.medStopped;
    default: return colors.medDraft;
  }
}

function getDrugName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text 
    || med.medicationCodeableConcept?.coding?.[0]?.display 
    || 'Unknown Medication';
}

const sectionHeadingStyle = {
  fontSize: 12,
  color: colors.textMuted,
  letterSpacing: '0.05em',
  marginBottom: 8,
  fontFamily: 'Outfit',
  fontWeight: 400,
  textTransform: 'uppercase',
} as const;

function MedicationRow({ med }: { med: MedicationRequest }): JSX.Element {
  const statusColor = getStatusColor(med.status);
  const drugName = getDrugName(med);
  const dosage = med.dosageInstruction?.[0]?.text || 'No dosage information';
  const authoredDate = med.authoredOn?.substring(0, 10) || '–';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '12px 0',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexGrow: 1, minWidth: 0 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: statusColor,
          marginTop: 5,
          flexShrink: 0,
        }} />
        <div style={{ minWidth: 0 }}>
          <Text style={{
            fontSize: 14,
            fontFamily: 'Outfit',
            color: colors.textPrimary,
            lineHeight: 1.4,
          }}>
            {drugName}
          </Text>
          <Text style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono',
            color: colors.textSecondary,
            marginTop: 4,
          }}>
            {dosage}
          </Text>
        </div>
      </div>
      <Text style={{
        fontSize: 11,
        fontFamily: 'JetBrains Mono',
        color: colors.textMuted,
        whiteSpace: 'nowrap',
        paddingLeft: 16,
        paddingTop: 1,
      }}>
        {authoredDate}
      </Text>
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
    <section>
      <Text component="h2" style={sectionHeadingStyle}>
        {title} ({medications.length})
      </Text>
      <div>
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
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Text style={{ fontFamily: 'Outfit', fontSize: 14, color: colors.textSecondary }}>
          No medications prescribed.
        </Text>
      </div>
    );
  }

  const activeMeds = medications.filter(m => m.status === 'active');
  const inactiveMeds = medications.filter(m => m.status !== 'active');

  return (
    <div style={{ width: '100%' }}>
      {activeMeds.length > 0 && (
        <MedicationSection title="Active" medications={activeMeds} keyPrefix="active" />
      )}

      {activeMeds.length > 0 && inactiveMeds.length > 0 && (
          <div style={{ height: 32 }} />
      )}

      {inactiveMeds.length > 0 && (
        <MedicationSection title="Inactive" medications={inactiveMeds} keyPrefix="inactive" />
      )}
    </div>
  );
}
