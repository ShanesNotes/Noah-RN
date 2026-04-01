import { useMemo } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors, vitalColor } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import { Sparkline } from './Sparkline';
import type { medplum } from '../medplum';

type Observation = Awaited<ReturnType<typeof medplum.searchResources<'Observation'>>>[number];
type ObsComponent = NonNullable<Observation['component']>[number];
type ObsCoding = NonNullable<NonNullable<ObsComponent['code']>['coding']>[number];

const VITAL_CODES = '8867-4,55284-4,9279-1,2708-6,8310-5';

const VITAL_META: Record<string, { label: string; unit: string; short: string }> = {
  '8867-4': { label: 'Heart Rate', unit: 'bpm', short: 'HR' },
  '55284-4': { label: 'Blood Pressure', unit: 'mmHg', short: 'BP' },
  '9279-1': { label: 'Resp Rate', unit: '/min', short: 'RR' },
  '2708-6': { label: 'SpO\u2082', unit: '%', short: 'SpO\u2082' },
  '8310-5': { label: 'Temperature', unit: '\u00B0F', short: 'TEMP' },
};

function extractValue(obs: Observation): string {
  const code = obs.code?.coding?.[0]?.code ?? '';
  if (code === '55284-4') {
    const sys = obs.component?.find(
      (c: ObsComponent) => c.code?.coding?.some((x: ObsCoding) => x.code === '8480-6')
    );
    const dia = obs.component?.find(
      (c: ObsComponent) => c.code?.coding?.some((x: ObsCoding) => x.code === '8462-4')
    );
    const s = sys?.valueQuantity?.value;
    const d = dia?.valueQuantity?.value;
    if (s != null && d != null) return `${s}/${d}`;
    return '\u2014';
  }
  if (obs.valueQuantity?.value != null) return String(obs.valueQuantity.value);
  return obs.valueString ?? '\u2014';
}

function extractNumeric(obs: Observation): number | null {
  const code = obs.code?.coding?.[0]?.code ?? '';
  if (code === '55284-4') {
    const sys = obs.component?.find(
      (c: ObsComponent) => c.code?.coding?.some((x: ObsCoding) => x.code === '8480-6')
    );
    return sys?.valueQuantity?.value ?? null;
  }
  return obs.valueQuantity?.value ?? null;
}

function formatTime(dt?: string): string {
  if (!dt) return '\u2014';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface VitalCardProps {
  code: string;
  observations: Observation[];
}

function VitalCard({ code, observations }: VitalCardProps) {
  const meta = VITAL_META[code] ?? { label: 'Unknown', unit: '', short: '?' };
  const color = vitalColor[code] ?? colors.info;
  const latest = observations[0];
  const value = latest ? extractValue(latest) : '\u2014';
  const time = latest ? formatTime(latest.effectiveDateTime) : '';
  const sparkValues = observations
    .map(extractNumeric)
    .filter((v): v is number => v !== null)
    .reverse();

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 6,
      padding: '16px 20px',
      minWidth: 180,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: color,
        opacity: 0.7,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Text fz={10} c={colors.textMuted} ff="monospace" fw={600}
            style={{ letterSpacing: '0.12em' }}>
            {meta.short}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <Text fz={28} fw={700} ff="monospace" c={color} lh={1}>
              {value}
            </Text>
            <Text fz={10} c={colors.textMuted}>
              {meta.unit}
            </Text>
          </div>
        </div>
        {sparkValues.length >= 2 && (
          <div style={{ marginTop: 12 }}>
            <Sparkline values={sparkValues} color={color} width={72} height={28} />
          </div>
        )}
      </div>

      <Text fz={9} c={colors.textMuted} mt={8} ff="monospace">
        {time}
      </Text>

      {observations.length > 1 && (
        <div style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: `1px solid ${colors.border}`,
        }}>
          {observations.slice(1, 4).map((obs, i) => (
            <div key={obs.id ?? i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
            }}>
              <Text fz={10} ff="monospace" c={colors.textSecondary}>
                {extractValue(obs)}
              </Text>
              <Text fz={9} c={colors.textMuted}>
                {formatTime(obs.effectiveDateTime)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface VitalsPanelProps {
  patientId: string;
}

export function VitalsPanel({ patientId }: VitalsPanelProps) {
  const { data: vitals, loading, error } = useFhirSearch(
    'Observation',
    `patient=${patientId}&code=${VITAL_CODES}&_sort=-date&_count=50&_elements=code,valueQuantity,valueString,component,effectiveDateTime`,
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const code of Object.keys(VITAL_META)) map.set(code, []);
    for (const obs of vitals) {
      const code = obs.code?.coding?.[0]?.code ?? '';
      const arr = map.get(code);
      if (arr) arr.push(obs);
    }
    return map;
  }, [vitals]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (error) return <Text fz="sm" c={colors.critical}>{error}</Text>;
  if (vitals.length === 0) return <Text fz="sm" c={colors.textMuted}>No vitals recorded</Text>;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {[...grouped.entries()]
        .filter(([, obs]) => obs.length > 0)
        .map(([code, obs]) => (
          <VitalCard key={code} code={code} observations={obs} />
        ))
      }
    </div>
  );
}
