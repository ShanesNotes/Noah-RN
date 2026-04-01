import { useMemo } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import type { medplum } from '../medplum';

type MedicationRequest = Awaited<ReturnType<typeof medplum.searchResources<'MedicationRequest'>>>[number];

interface MedAdmin {
  id?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: { code?: string; display?: string }[];
  };
  status?: string;
  dosage?: { text?: string };
  effectiveDateTime?: string;
}

function getMedName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text
    || med.medicationCodeableConcept?.coding?.[0]?.display
    || 'Unknown';
}

function getMedAdminName(ma: MedAdmin): string {
  return ma.medicationCodeableConcept?.text
    || ma.medicationCodeableConcept?.coding?.[0]?.display
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

function formatTime(dt?: string): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function parseDoseRate(doseText?: string): { rate?: string; dose?: string } {
  if (!doseText) return {};
  const rateMatch = doseText.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|units|mL|g)\s*(\/\s*hr|\/\s*min|\/\s*kg\/min|\/\s*kg\/hr)/i);
  if (rateMatch) {
    return { rate: rateMatch[0].trim() };
  }
  return { dose: doseText };
}

interface MedRow {
  id: string;
  name: string;
  status?: string;
  dose: string;
  date?: string;
  source: 'Rx' | 'Admin';
  rate?: string;
}

interface TimelineEntry {
  id: string;
  name: string;
  status?: string;
  dose: string;
  date?: string;
  source: 'Rx' | 'Admin';
  rate?: string;
  timestamp: number;
  isDrip: boolean;
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
    'MedicationAdministration' as Parameters<typeof medplum.searchResources>[0],
    `patient=${patientId}&_sort=-date&_count=30&_elements=medicationCodeableConcept,status,dosage,effectiveDateTime`,
  );

  const typedAdministrations = administrations as unknown as MedAdmin[];

  const loading = reqLoading || adminLoading;
  const error = reqError || adminError;

  const rows = useMemo<MedRow[]>(() => {
    const rxRows: MedRow[] = meds.map(med => {
      const doseText = med.dosageInstruction?.[0]?.text;
      const { rate } = parseDoseRate(doseText);
      return {
        id: med.id ?? '',
        name: getMedName(med),
        status: med.status,
        dose: doseText ?? '—',
        date: med.authoredOn,
        source: 'Rx',
        rate,
      };
    });

    const adminRows: MedRow[] = typedAdministrations.map(ma => {
      const doseText = ma.dosage?.text;
      const { rate } = parseDoseRate(doseText);
      return {
        id: ma.id ?? '',
        name: getMedAdminName(ma),
        status: ma.status,
        dose: doseText ?? '—',
        date: ma.effectiveDateTime,
        source: 'Admin',
        rate,
      };
    });

    return [...rxRows, ...adminRows].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [meds, administrations]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    return rows.map(row => ({
      ...row,
      timestamp: row.date ? new Date(row.date).getTime() : 0,
      isDrip: !!row.rate,
    }));
  }, [rows]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (rows.length === 0) return <Text fz="sm" c={colors.textMuted}>No medications</Text>;

  const drips = timelineEntries.filter(e => e.isDrip);
  const nonDrips = timelineEntries.filter(e => !e.isDrip);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {drips.length > 0 && (
        <div>
          <Text fz={11} c={colors.textMuted} ff="monospace" fw={600}
            style={{ letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
            Active Drips
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {drips.map(entry => (
              <div key={entry.id} style={{
                background: colors.surface,
                border: `1px solid ${colors.medActive}40`,
                borderLeft: `3px solid ${colors.medActive}`,
                borderRadius: 4,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <Text fz={13} fw={600} c={colors.textPrimary}>
                    {entry.name}
                  </Text>
                  <Text fz={11} c={colors.medActive} ff="monospace" mt={2}>
                    {entry.rate}
                  </Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text fz={10} c={colors.textMuted} ff="monospace">
                    {formatTime(entry.date)}
                  </Text>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 600,
                    color: colors.medActive,
                    background: colors.medActive + '18',
                    border: `1px solid ${colors.medActive}30`,
                    marginTop: 4,
                  }}>
                    DRIP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Text fz={11} c={colors.textMuted} ff="monospace" fw={600}
          style={{ letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
          Medication Timeline
        </Text>
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
              {nonDrips.map((row, i) => {
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
      </div>
    </div>
  );
}
