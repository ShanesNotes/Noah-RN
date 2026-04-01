import { Loader, Text } from '@mantine/core';
import { useMemo } from 'react';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import type { medplum } from '../medplum';

type MedicationRequest = Awaited<ReturnType<typeof medplum.searchResources<'MedicationRequest'>>>[number];
type MedicationAdministration = Awaited<ReturnType<typeof medplum.searchResources<'MedicationAdministration'>>>[number];

function getMedName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text
    || med.medicationCodeableConcept?.coding?.[0]?.display
    || 'Unknown';
}

function getMedAdminName(ma: MedicationAdministration): string {
  return (ma as any).medicationCodeableConcept?.text
    || (ma as any).medicationCodeableConcept?.coding?.[0]?.display
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

interface MedRow {
  id: string;
  name: string;
  status?: string;
  dose: string;
  date?: string;
  source: 'Rx' | 'Admin';
}

interface MedsPanelProps {
  patientId: string;
}

export function MedsPanel({ patientId }: MedsPanelProps) {
  const { data: meds, loading: reqLoading, error: reqError } = useFhirSearch(
    'MedicationRequest',
    `patient=${patientId}&_sort=-authoredOn&_count=30&_elements=medicationCodeableConcept,status,dosageInstruction,authoredOn`,
  );

  const { data: administrations, loading: adminLoading, error: adminError } = useFhirSearch(
    'MedicationAdministration',
    `patient=${patientId}&_sort=-date&_count=30&_elements=medicationCodeableConcept,status,dosage,effectiveDateTime`,
  );

  const loading = reqLoading || adminLoading;
  const error = reqError || adminError;

  const rows = useMemo<MedRow[]>(() => {
    const rxRows: MedRow[] = meds.map(med => ({
      id: med.id ?? '',
      name: getMedName(med),
      status: med.status,
      dose: med.dosageInstruction?.[0]?.text ?? '—',
      date: med.authoredOn,
      source: 'Rx',
    }));

    const adminRows: MedRow[] = administrations.map(ma => ({
      id: (ma as any).id ?? '',
      name: getMedAdminName(ma),
      status: (ma as any).status,
      dose: (ma as any).dosage?.text ?? '—',
      date: (ma as any).effectiveDateTime,
      source: 'Admin',
    }));

    return [...rxRows, ...adminRows].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [meds, administrations]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (rows.length === 0) return <Text fz="sm" c={colors.textMuted}>No medications</Text>;

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
            {['SRC', 'MEDICATION', 'STATUS', 'DOSE', 'DATE'].map(h => (
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
          {rows.map((row, i) => {
            const srcColor = row.source === 'Rx' ? colors.info : colors.normal;
            return (
              <tr
                key={row.id || i}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = colors.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: srcColor,
                    background: srcColor + '18',
                    border: `1px solid ${srcColor}30`,
                  }}>
                    {row.source}
                  </span>
                </td>
                <td style={{ padding: '8px 16px', color: colors.textPrimary }}>
                  {row.name}
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
                    color: statusColor(row.status),
                    background: statusColor(row.status) + '18',
                    border: `1px solid ${statusColor(row.status)}30`,
                  }}>
                    {(row.status ?? '—').toUpperCase()}
                  </span>
                </td>
                <td style={{
                  padding: '8px 16px',
                  color: colors.textSecondary,
                  fontSize: 11,
                }}>
                  {row.dose}
                </td>
                <td style={{
                  padding: '8px 16px',
                  color: colors.textSecondary,
                  fontSize: 11,
                }}>
                  {formatDate(row.date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
