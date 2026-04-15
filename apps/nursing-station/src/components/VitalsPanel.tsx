import { Text } from '@mantine/core';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { colors } from '../theme';

interface Observation {
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

  const values = data.slice(-12); // Use up to the last 12 values
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const yPadding = 4;
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

function getBloodPressureValues(
  observation: Observation,
): { systolic?: number; diastolic?: number } {
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

export function VitalsPanel({ observations }: VitalsPanelProps): JSX.Element {
  const processedVitals = useMemo(() => {
    const grouped: Record<string, Observation[]> = {};

    for (const obs of observations) {
      const code = getObservationCode(obs);
      if (code && VITAL_CONFIGS[code]) {
        if (!grouped[code]) grouped[code] = [];
        grouped[code].push(obs);
      }
    }

    return Object.entries(VITAL_CONFIGS).map(([code, config]) => {
      const obsGroup = grouped[code];

      if (!obsGroup || obsGroup.length === 0) {
        return {
          code,
          config,
          displayValue: '--',
          displayUnit: config.unit,
          isAbnormal: false,
          history: [],
        };
      }

      obsGroup.sort(sortObservationsByDate);
      const latestObs = obsGroup[0];
      
      if (config.isBp) {
        const { systolic, diastolic } = getBloodPressureValues(latestObs);
        const hasBloodPressure = systolic !== undefined && diastolic !== undefined;

        return {
          code,
          config,
          displayValue: hasBloodPressure ? `${Math.round(systolic)}/${Math.round(diastolic)}` : '--',
          displayUnit: config.unit,
          isAbnormal: checkBpAbnormal(systolic, diastolic),
          history: getBloodPressureHistory(obsGroup),
        };
      }

      const value = latestObs.valueQuantity?.value;
      return {
        code,
        config,
        displayValue: value !== undefined ? value.toFixed(code === '8310-5' ? 1 : 0) : '--',
        displayUnit: getDisplayUnit(code, latestObs, config.unit),
        isAbnormal: checkAbnormal(value, config.normalMin, config.normalMax),
        history: getNumericHistory(obsGroup),
      };
    });
  }, [observations]);

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {processedVitals.map((vital) => (
          <div 
            key={vital.code} 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '120px 1fr 120px', 
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <Text 
              style={{ 
                fontSize: 12, 
                fontFamily: 'Outfit, sans-serif', 
                color: colors.textSecondary,
              }}
            >
              {vital.config.name}
            </Text>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <Text style={{
                  fontSize: 28,
                  fontFamily: '"JetBrains Mono", monospace',
                  color: vital.isAbnormal ? colors.critical : colors.textPrimary,
                  lineHeight: 1,
              }}>
                  {vital.displayValue}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                fontFamily: '"JetBrains Mono", monospace', 
                color: colors.textMuted,
              }}>
                  {vital.displayUnit}
              </Text>
            </div>
            
            <div style={{ width: 120, height: 32, justifySelf: 'end' }}>
              {vital.history.length > 1 && (
                <svg width="120" height="32" viewBox="0 0 120 32">
                  <polyline
                    fill="none"
                    stroke={vital.config.color}
                    strokeWidth="2"
                    points={generateSparklinePoints(vital.history, 120, 32)}
                  />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
