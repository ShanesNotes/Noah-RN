import { Badge, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { colors } from '../theme';

interface Observation {
  id?: string;
  code?: {
    coding?: {
      code?: string;
      display?: string;
    }[];
    text?: string;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
  };
  component?: {
    code?: {
      coding?: {
        code?: string;
        display?: string;
      }[];
    };
    valueQuantity?: {
      value?: number;
      unit?: string;
    };
  }[];
  effectiveDateTime?: string;
}

interface VitalsPanelProps {
  observations: Observation[];
}

interface VitalConfig {
  name: string;
  color: string;
  unit: string;
  normalMin?: number;
  normalMax?: number;
  isBp?: boolean;
}

interface ProcessedVital {
  code: string;
  config: VitalConfig;
  displayValue: string;
  displayUnit: string;
  isAbnormal: boolean;
  history: number[];
  deltaText: string;
  freshnessText: string;
  trend: 'up' | 'down' | 'flat';
}

const VITAL_CONFIGS: Record<string, VitalConfig> = {
  '8867-4': { name: 'Heart Rate', color: colors.hr, unit: 'bpm', normalMin: 60, normalMax: 100 },
  '55284-4': { name: 'Blood Pressure', color: colors.bp, unit: 'mmHg', isBp: true },
  '9279-1': { name: 'Respiratory Rate', color: colors.rr, unit: '/min', normalMin: 12, normalMax: 20 },
  '2708-6': { name: 'SpO2', color: colors.spo2, unit: '%', normalMin: 95, normalMax: 100 },
  '8310-5': { name: 'Temperature', color: colors.temp, unit: '°F', normalMin: 97.0, normalMax: 99.5 },
};

const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';

function generateSparklinePoints(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';

  const values = data.slice(-12);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const yPadding = 5;
  const effectiveHeight = height - yPadding * 2;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y =
        effectiveHeight -
        (range > 0 ? ((value - min) / range) * effectiveHeight : effectiveHeight / 2);

      return `${x.toFixed(2)},${(y + yPadding).toFixed(2)}`;
    })
    .join(' ');
}

function getObservationCode(observation: Observation): string | undefined {
  return observation.code?.coding?.[0]?.code;
}

function sortObservationsByDate(a: Observation, b: Observation): number {
  return new Date(b.effectiveDateTime || 0).getTime() - new Date(a.effectiveDateTime || 0).getTime();
}

function getNumericHistory(observations: Observation[]): number[] {
  return observations
    .map((obs) => obs.valueQuantity?.value)
    .filter((val): val is number => val !== undefined && val !== null)
    .reverse();
}

function getBloodPressureValues(observation: Observation): { systolic?: number; diastolic?: number } {
  const systolic = observation.component?.find(
    (component) => component.code?.coding?.[0]?.code === SYSTOLIC_CODE,
  )?.valueQuantity?.value;
  const diastolic = observation.component?.find(
    (component) => component.code?.coding?.[0]?.code === DIASTOLIC_CODE,
  )?.valueQuantity?.value;

  return { systolic, diastolic };
}

function getBloodPressureHistory(observations: Observation[]): number[] {
  return observations
    .map((obs) => getBloodPressureValues(obs).systolic)
    .filter((val): val is number => val !== undefined && val !== null)
    .reverse();
}

function getDisplayUnit(code: string, observation: Observation, fallbackUnit: string): string {
  return code === '8310-5' ? observation.valueQuantity?.unit || fallbackUnit : fallbackUnit;
}

function checkBpAbnormal(systolic?: number, diastolic?: number): boolean {
  if (systolic !== undefined && (systolic > 140 || systolic < 90)) return true;
  if (diastolic !== undefined && (diastolic > 90 || diastolic < 60)) return true;
  return false;
}

function checkAbnormal(value?: number, min?: number, max?: number): boolean {
  if (value === undefined || min === undefined || max === undefined) return false;
  return value < min || value > max;
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'No recent value';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'No recent value';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ago`;
  return 'Just now';
}

function getDeltaText(values: number[]): string {
  if (values.length < 2) {
    return 'No prior value';
  }

  const previous = values[values.length - 2];
  const latest = values[values.length - 1];
  const delta = latest - previous;

  if (delta === 0) {
    return 'Stable';
  }

  const prefix = delta > 0 ? '+' : '';
  const rounded = Math.round(delta * 10) / 10;
  return `${prefix}${rounded}`;
}

function getTrend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) {
    return 'flat';
  }

  const previous = values[values.length - 2];
  const latest = values[values.length - 1];
  if (latest > previous) return 'up';
  if (latest < previous) return 'down';
  return 'flat';
}

function processVitals(observations: Observation[]): ProcessedVital[] {
  const grouped: Record<string, Observation[]> = {};

  for (const observation of observations) {
    const code = getObservationCode(observation);
    if (code && VITAL_CONFIGS[code]) {
      if (!grouped[code]) {
        grouped[code] = [];
      }
      grouped[code].push(observation);
    }
  }

  return Object.entries(VITAL_CONFIGS).map(([code, config]) => {
    const observationGroup = grouped[code];

    if (!observationGroup?.length) {
      return {
        code,
        config,
        displayValue: '--',
        displayUnit: config.unit,
        isAbnormal: false,
        history: [],
        deltaText: 'No prior value',
        freshnessText: 'No recent value',
        trend: 'flat',
      };
    }

    observationGroup.sort(sortObservationsByDate);
    const latestObservation = observationGroup[0];

    if (config.isBp) {
      const { systolic, diastolic } = getBloodPressureValues(latestObservation);
      const history = getBloodPressureHistory(observationGroup);

      return {
        code,
        config,
        displayValue:
          systolic !== undefined && diastolic !== undefined
            ? `${Math.round(systolic)}/${Math.round(diastolic)}`
            : '--',
        displayUnit: config.unit,
        isAbnormal: checkBpAbnormal(systolic, diastolic),
        history,
        deltaText: getDeltaText(history),
        freshnessText: formatRelativeTime(latestObservation.effectiveDateTime),
        trend: getTrend(history),
      };
    }

    const value = latestObservation.valueQuantity?.value;
    const history = getNumericHistory(observationGroup);

    return {
      code,
      config,
      displayValue: value !== undefined ? value.toFixed(code === '8310-5' ? 1 : 0) : '--',
      displayUnit: getDisplayUnit(code, latestObservation, config.unit),
      isAbnormal: checkAbnormal(value, config.normalMin, config.normalMax),
      history,
      deltaText: getDeltaText(history),
      freshnessText: formatRelativeTime(latestObservation.effectiveDateTime),
      trend: getTrend(history),
    };
  });
}

function TrendGlyph({ trend, tone }: { trend: 'up' | 'down' | 'flat'; tone: string }): JSX.Element {
  if (trend === 'up') {
    return <IconArrowUpRight size={14} color={tone} />;
  }

  if (trend === 'down') {
    return <IconArrowDownRight size={14} color={tone} />;
  }

  return <IconMinus size={14} color={tone} />;
}

export function VitalsPanel({ observations }: VitalsPanelProps): JSX.Element {
  const processedVitals = useMemo(() => processVitals(observations), [observations]);

  return (
    <div data-testid="vitals-trend-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          borderRadius: 18,
          padding: '18px 20px',
        }}
      >
        <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Physiologic snapshot
        </Text>
        <Text fz={13} c={colors.textSecondary} mt={10} lh={1.55}>
          Trending vitals emphasize recent drift, recency, and abnormal signals at a glance.
        </Text>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {processedVitals.map((vital) => {
          const tone = vital.isAbnormal ? colors.critical : vital.config.color;
          return (
            <div
              key={vital.code}
              data-testid={`vitals-trend-row-${vital.code}`}
              style={{
                border: `1px solid ${vital.isAbnormal ? 'rgba(225, 29, 72, 0.28)' : colors.border}`,
                borderRadius: 18,
                background: vital.isAbnormal ? 'rgba(225, 29, 72, 0.08)' : colors.surface,
                padding: '18px 18px 16px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 1.1fr) 170px',
                  gap: 18,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text fz={13} fw={600} c={colors.textPrimary}>
                      {vital.config.name}
                    </Text>
                    <Badge variant="light" color={vital.isAbnormal ? 'red' : 'gray'} radius="sm" size="sm">
                      {vital.isAbnormal ? 'Out of range' : 'Stable range'}
                    </Badge>
                  </div>
                  <Text ff="monospace" fz={11} c={colors.textMuted} mt={8}>
                    {vital.freshnessText}
                  </Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <Text ff="monospace" fz={30} fw={700} c={vital.isAbnormal ? colors.critical : colors.textPrimary} lh={1}>
                      {vital.displayValue}
                    </Text>
                    <Text ff="monospace" fz={12} c={colors.textMuted}>
                      {vital.displayUnit}
                    </Text>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Badge
                      variant="light"
                      color={vital.isAbnormal ? 'red' : 'gray'}
                      radius="sm"
                      data-testid={`vitals-delta-${vital.code}`}
                      leftSection={<TrendGlyph trend={vital.trend} tone={tone} />}
                    >
                      {vital.deltaText}
                    </Badge>
                  </div>
                </div>

                <div style={{ width: 170, justifySelf: 'end' }}>
                  {vital.history.length > 1 ? (
                    <svg width="170" height="42" viewBox="0 0 170 42" data-testid={`vitals-sparkline-${vital.code}`}>
                      <polyline
                        fill="none"
                        stroke={vital.config.color}
                        strokeWidth="2.5"
                        points={generateSparklinePoints(vital.history, 170, 42)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <Text ff="monospace" fz={11} c={colors.textMuted} ta="right">
                      Trend unavailable
                    </Text>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
