import { useMemo } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import { VITAL_CODES_SET } from '../lib/vitals';
import { TimeSeriesChart } from './TimeSeriesChart';
import type { Observation } from '../fhir/types';

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

function getRateOfChangeArrow(current: number, previous: number): { arrow: string; color: string; pct: string } {
  if (previous === 0) return { arrow: '→', color: colors.textMuted, pct: '—' };
  const pctChange = ((current - previous) / previous) * 100;
  const absPct = Math.abs(pctChange).toFixed(1);
  if (pctChange > 0) return { arrow: '↑', color: colors.critical, pct: `+${absPct}%` };
  if (pctChange < 0) return { arrow: '↓', color: colors.normal, pct: `${absPct}%` };
  return { arrow: '→', color: colors.textMuted, pct: '0%' };
}

interface LabGroup {
  code: string;
  name: string;
  unit: string;
  observations: Observation[];
  latest: Observation;
  previous: Observation | null;
  rateOfChange: { arrow: string; color: string; pct: string } | null;
  chartData: { value: number; timestamp: number; time: string }[];
}

interface LabsPanelProps {
  patientId: string;
}

export function LabsPanel({ patientId }: LabsPanelProps) {
  const { data, loading, error } = useFhirSearch<Observation>(
    'Observation',
    `patient=${patientId}&_sort=-date&_count=50&_elements=code,valueQuantity,valueString,referenceRange,effectiveDateTime`,
  );

  const labs = useMemo(
    () => data.filter(obs => !VITAL_CODES_SET.has(obs.code?.coding?.[0]?.code ?? '')),
    [data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const obs of labs) {
      const code = obs.code?.coding?.[0]?.code ?? obs.code?.text ?? 'unknown';
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(obs);
    }

    const groups: LabGroup[] = [];
    for (const [code, observations] of map.entries()) {
      const sorted = [...observations].sort((a, b) => {
        const da = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
        const db = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
        return db - da;
      });
      const latest = sorted[0];
      const previous = sorted.length > 1 ? sorted[1] : null;

      const latestVal = latest.valueQuantity?.value;
      const prevVal = previous?.valueQuantity?.value;
      const rateOfChange = (latestVal != null && prevVal != null)
        ? getRateOfChangeArrow(latestVal, prevVal)
        : null;

      const chartData = sorted
        .map(o => {
          const val = o.valueQuantity?.value;
          if (val == null || !o.effectiveDateTime) return null;
          return { value: val, timestamp: new Date(o.effectiveDateTime).getTime(), time: '' };
        })
        .filter((d): d is { value: number; timestamp: number; time: string } => d !== null)
        .reverse();

      groups.push({
        code,
        name: latest.code?.coding?.[0]?.display ?? latest.code?.text ?? 'Unknown',
        unit: latest.valueQuantity?.unit ?? '',
        observations,
        latest,
        previous,
        rateOfChange,
        chartData,
      });
    }
    return groups;
  }, [labs]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (grouped.length === 0) return <Text fz="sm" c={colors.textMuted}>No lab results</Text>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {grouped.map(group => (
        <div key={group.code} style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Text fz={12} fw={600} c={colors.textPrimary}>
              {group.name}
            </Text>
            {group.rateOfChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: group.rateOfChange.color,
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {group.rateOfChange.arrow}
                </span>
                <span style={{
                  fontSize: 10,
                  color: group.rateOfChange.color,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 600,
                }}>
                  {group.rateOfChange.pct}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: 16 }}>
            {group.chartData.length >= 2 ? (
              <TimeSeriesChart
                data={group.chartData}
                color={group.rateOfChange?.color ?? colors.info}
                label={group.name}
                unit={group.unit}
                height={140}
              />
            ) : (
              <Text fz={11} c={colors.textMuted}>Insufficient data for trend</Text>
            )}
          </div>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: '"Outfit", sans-serif',
            fontSize: 12,
            borderTop: `1px solid ${colors.border}`,
          }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['VALUE', 'RANGE', 'TIME'].map(h => (
                  <th key={h} style={{
                    padding: '8px 16px',
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
              {group.observations.slice(0, 5).map((obs, i) => (
                <tr
                  key={obs.id ?? i}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = colors.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
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
      ))}
    </div>
  );
}
