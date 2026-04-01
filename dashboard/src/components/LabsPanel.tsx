import { useMemo } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import type { medplum } from '../medplum';

type Observation = Awaited<ReturnType<typeof medplum.searchResources<'Observation'>>>[number];

const VITAL_CODES = new Set(['8867-4', '55284-4', '9279-1', '2708-6', '8310-5']);

function getLabValue(obs: Observation): string {
  if (obs.valueQuantity?.value != null) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
  }
  return obs.valueString ?? '—';
}

function formatTime(dt?: string): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface LabsPanelProps {
  patientId: string;
}

export function LabsPanel({ patientId }: LabsPanelProps) {
  const { data, loading, error } = useFhirSearch(
    'Observation',
    `patient=${patientId}&_sort=-date&_count=50&_elements=code,valueQuantity,valueString,referenceRange,effectiveDateTime`,
  );

  const labs = useMemo(
    () => data.filter(obs => !VITAL_CODES.has(obs.code?.coding?.[0]?.code ?? '')),
    [data],
  );

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (labs.length === 0) return <Text fz="sm" c={colors.textMuted}>No lab results</Text>;

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
            {['TEST', 'VALUE', 'RANGE', 'TIME'].map(h => (
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
          {labs.map((obs, i) => (
            <tr
              key={obs.id ?? i}
              style={{
                borderBottom: `1px solid ${colors.border}`,
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '8px 16px', color: colors.textPrimary }}>
                {obs.code?.coding?.[0]?.display ?? obs.code?.text ?? 'Unknown'}
              </td>
              <td style={{
                padding: '8px 16px',
                fontFamily: '"JetBrains Mono", monospace',
                color: colors.textPrimary,
                fontWeight: 500,
              }}>
                {getLabValue(obs)}
              </td>
              <td style={{
                padding: '8px 16px',
                fontFamily: '"JetBrains Mono", monospace',
                color: colors.textMuted,
                fontSize: 11,
              }}>
                {obs.referenceRange?.[0]?.text ?? '—'}
              </td>
              <td style={{
                padding: '8px 16px',
                color: colors.textSecondary,
                fontSize: 11,
              }}>
                {formatTime(obs.effectiveDateTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
