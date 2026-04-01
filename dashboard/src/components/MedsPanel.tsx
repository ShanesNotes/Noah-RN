import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import type { medplum } from '../medplum';

type MedicationRequest = Awaited<ReturnType<typeof medplum.searchResources<'MedicationRequest'>>>[number];

function getMedName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text
    || med.medicationCodeableConcept?.coding?.[0]?.display
    || 'Unknown';
}

function statusColor(status?: string): string {
  switch (status) {
    case 'active': return colors.medActive;
    case 'stopped': case 'cancelled': return colors.medStopped;
    case 'draft': return colors.medDraft;
    default: return colors.textSecondary;
  }
}

function formatDate(dt?: string): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface MedsPanelProps {
  patientId: string;
}

export function MedsPanel({ patientId }: MedsPanelProps) {
  const { data: meds, loading, error } = useFhirSearch(
    'MedicationRequest',
    `patient=${patientId}&_sort=-authoredOn&_count=30&_elements=medicationCodeableConcept,status,dosageInstruction,authoredOn`,
  );

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (meds.length === 0) return <Text fz="sm" c={colors.textMuted}>No medications</Text>;

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: '"Outfit", sans-serif',
        fontSize: 12,
      }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            {['MEDICATION', 'STATUS', 'DOSE', 'DATE'].map(h => (
              <th key={h} style={{
                padding: '10px 16px',
                textAlign: 'left',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: colors.textMuted,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meds.map((med, i) => (
            <tr
              key={med.id ?? i}
              style={{
                borderBottom: `1px solid ${colors.border}`,
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '8px 16px', color: colors.textPrimary }}>
                {getMedName(med)}
              </td>
              <td style={{ padding: '8px 16px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: statusColor(med.status),
                  background: statusColor(med.status) + '18',
                  border: `1px solid ${statusColor(med.status)}30`,
                }}>
                  {(med.status ?? '—').toUpperCase()}
                </span>
              </td>
              <td style={{
                padding: '8px 16px',
                color: colors.textSecondary,
                fontSize: 11,
              }}>
                {med.dosageInstruction?.[0]?.text ?? '—'}
              </td>
              <td style={{
                padding: '8px 16px',
                color: colors.textSecondary,
                fontSize: 11,
              }}>
                {formatDate(med.authoredOn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
