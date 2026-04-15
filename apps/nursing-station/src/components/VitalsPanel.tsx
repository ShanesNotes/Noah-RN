import React, { useMemo } from 'react';
import { Text } from '@mantine/core';
import { colors } from '../theme';

// Minimal FHIR R4 Observation shape as specified
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

// Configuration for each vital sign based on LOINC codes
const VITAL_CONFIGS: Record<string, { name: string; color: string; unit: string; normalMin?: number; normalMax?: number; isBp?: boolean }> = {
  '8867-4': { name: 'Heart Rate', color: colors.hr, unit: 'bpm', normalMin: 60, normalMax: 100 },
  '55284-4': { name: 'Blood Pressure', color: colors.bp, unit: 'mmHg', isBp: true },
  '9279-1': { name: 'Respiratory Rate', color: colors.rr, unit: '/min', normalMin: 12, normalMax: 20 },
  '2708-6': { name: 'SpO2', color: colors.spo2, unit: '%', normalMin: 95, normalMax: 100 },
  '8310-5': { name: 'Temperature', color: colors.temp, unit: '°F', normalMin: 97.0, normalMax: 99.5 },
};

const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';

/**
 * Generates SVG polyline points for a simple sparkline.
 * @param data - Array of numerical data points.
 * @param width - The width of the SVG canvas.
 * @param height - The height of the SVG canvas.
 * @returns A string of points for the `points` attribute of a polyline.
 */
const generateSparklinePoints = (data: number[], width: number, height: number): string => {
  if (data.length < 2) return '';

  const values = data.slice(-12); // Use up to the last 12 values
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const yPadding = 4;
  const effectiveHeight = height - yPadding * 2;

  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = effectiveHeight - (range > 0 ? ((value - min) / range) * effectiveHeight : effectiveHeight / 2);
    return `${x.toFixed(2)},${(y + yPadding).toFixed(2)}`;
  }).join(' ');
};

export const VitalsPanel: React.FC<VitalsPanelProps> = ({ observations }) => {
  const processedVitals = useMemo(() => {
    const grouped: Record<string, Observation[]> = {};

    for (const obs of observations) {
      const code = obs.code?.coding?.[0]?.code;
      if (code && VITAL_CONFIGS[code]) {
        if (!grouped[code]) {
          grouped[code] = [];
        }
        grouped[code].push(obs);
      }
    }

    return Object.keys(VITAL_CONFIGS).map(code => {
      const config = VITAL_CONFIGS[code];
      const obsGroup = grouped[code];

      if (!obsGroup || obsGroup.length === 0) {
        return { code, config, displayValue: '--', isAbnormal: false, history: [] };
      }

      obsGroup.sort((a, b) => new Date(b.effectiveDateTime || 0).getTime() - new Date(a.effectiveDateTime || 0).getTime());
      
      const latestObs = obsGroup[0];
      
      if (config.isBp) {
        const systolic = latestObs.component?.find(c => c.code?.coding?.[0]?.code === SYSTOLIC_CODE)?.valueQuantity?.value;
        const diastolic = latestObs.component?.find(c => c.code?.coding?.[0]?.code === DIASTOLIC_CODE)?.valueQuantity?.value;
        const history = obsGroup
          .map(o => o.component?.find(c => c.code?.coding?.[0]?.code === SYSTOLIC_CODE)?.valueQuantity?.value)
          .filter((v): v is number => v !== undefined && v !== null)
          .reverse();

        return {
          code,
          config,
          displayValue: (systolic && diastolic) ? `${Math.round(systolic)}/${Math.round(diastolic)}` : '--',
          isAbnormal: systolic ? systolic > 140 || systolic < 90 || (diastolic ? diastolic > 90 || diastolic < 60 : false) : false,
          history,
        };
      } else {
        const value = latestObs.valueQuantity?.value;
        const history = obsGroup
            .map(o => o.valueQuantity?.value)
            .filter((v): v is number => v !== undefined && v !== null)
            .reverse();
        
        const isAbnormal = (value !== undefined && config.normalMin !== undefined && config.normalMax !== undefined)
          ? value < config.normalMin || value > config.normalMax
          : false;

        return {
          code,
          config,
          displayValue: value !== undefined ? value.toFixed(code === '8310-5' ? 1 : 0) : '--',
          isAbnormal,
          history,
        };
      }
    });
  }, [observations]);

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {processedVitals.map(vital => (
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
                  {vital.config.unit}
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
};
