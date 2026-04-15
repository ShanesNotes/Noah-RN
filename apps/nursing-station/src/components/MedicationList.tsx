import { Text } from '@mantine/core';
import { colors } from '../theme';

/**
 * Defines the shape of a MedicationRequest, based on a minimal
 * FHIR resource structure.
 */
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

/**
 * Props for the MedicationList component.
 */
export interface MedicationListProps {
  medications: MedicationRequest[];
}

const getStatusColor = (status?: string): string => {
  if (status === 'active') return colors.medActive;
  if (status === 'stopped') return colors.medStopped;
  return colors.medDraft; // for draft and any other status
};

const MedicationRow = ({ med }: { med: MedicationRequest }) => {
  const statusColor = getStatusColor(med.status);
  const drugName = med.medicationCodeableConcept?.text || med.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown Medication';
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
};

/**
 * A component to display a list of medications, grouped by status (Active/Inactive)
 * according to the "Pi Minimalism" design system.
 */
export const MedicationList = ({ medications }: MedicationListProps) => {
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
        <section>
          <Text component="h2" style={{
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: '0.05em',
            marginBottom: 8,
            fontFamily: 'Outfit',
            fontWeight: 400,
            textTransform: 'uppercase',
          }}>
            Active ({activeMeds.length})
          </Text>
          <div>
            {activeMeds.map((med, index) => (
              <MedicationRow key={med.id || `active-${index}`} med={med} />
            ))}
          </div>
        </section>
      )}

      {activeMeds.length > 0 && inactiveMeds.length > 0 && (
          <div style={{ height: 32 }} />
      )}

      {inactiveMeds.length > 0 && (
        <section>
          <Text component="h2" style={{
            fontSize: 12,
            color: colors.textMuted,
            letterSpacing: '0.05em',
            marginBottom: 8,
            fontFamily: 'Outfit',
            fontWeight: 400,
            textTransform: 'uppercase',
          }}>
            Inactive ({inactiveMeds.length})
          </Text>
          <div>
            {inactiveMeds.map((med, index) => (
              <MedicationRow key={med.id || `inactive-${index}`} med={med} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
