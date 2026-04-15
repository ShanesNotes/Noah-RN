import { Text } from '@mantine/core';
import type { CSSProperties, JSX } from 'react';
import { colors } from '../theme';

// Minimal FHIR-like Observation shape
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
  referenceRange?: {
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
  }[];
  effectiveDateTime?: string;
  interpretation?: {
    coding?: {
      code?: string;
    }[];
  }[];
  category?: {
    coding?: {
      code?: string;
      display?: string;
    }[];
  }[];
}

interface LabResultsPanelProps {
  observations: Observation[];
}

const mainContainerStyle: CSSProperties = {
  padding: '0',
  fontFamily: 'Outfit, sans-serif',
};

const tableHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  paddingBottom: '8px',
  borderBottom: `1px solid ${colors.borderLight}`,
  fontSize: '11px',
  color: colors.textSecondary,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: `1px solid ${colors.border}`,
};

const cellStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
};

const testNameStyle: CSSProperties = {
  ...cellStyle,
  flex: '3 1 0%',
  fontSize: '13px',
  color: colors.textPrimary,
};

const valueStyle: CSSProperties = {
  ...cellStyle,
  flex: '1.5 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '13px',
};

const unitStyle: CSSProperties = {
  ...cellStyle,
  flex: '0.75 1 0%',
  justifyContent: 'flex-start',
  paddingLeft: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textMuted,
};

const rangeStyle: CSSProperties = {
  ...cellStyle,
  flex: '1.5 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textSecondary,
};

const timeStyle: CSSProperties = {
  ...cellStyle,
  flex: '1 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textMuted,
};

const monoValueTextStyle: CSSProperties = {
  fontSize: '13px',
  fontFamily: 'JetBrains Mono, monospace',
};

const monoMetaTextStyle: CSSProperties = {
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
};

function getInterpretationStyle(obs: Observation): CSSProperties {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code;
  if (code) {
    switch (code) {
      case 'HH': return { color: colors.critical, fontWeight: 700 };
      case 'H': return { color: colors.critical };
      case 'LL': return { color: colors.warning, fontWeight: 700 };
      case 'L': return { color: colors.warning };
      case 'N': return { color: colors.textPrimary };
    }
  }

  const value = obs.valueQuantity?.value;
  const range = obs.referenceRange?.[0];
  if (value !== undefined && range) {
    if (range.high?.value !== undefined && value > range.high.value) {
      return { color: colors.critical };
    }
    if (range.low?.value !== undefined && value < range.low.value) {
      return { color: colors.warning };
    }
  }

  return { color: colors.textPrimary };
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'N/A';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds >= 31536000) return `${Math.floor(seconds / 31536000)}y ago`;
  if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)}mo ago`;
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ago`;

  return 'Just now';
}

function getTestName(observation: Observation): string {
  return observation.code?.text || observation.code?.coding?.[0]?.display || 'Unknown Test';
}

function getRangeString(observation: Observation): string {
  const range = observation.referenceRange?.[0];
  if (range?.low?.value === undefined || range?.high?.value === undefined) {
    return 'N/A';
  }

  return `${range.low.value} - ${range.high.value}`;
}

export function LabResultsPanel({ observations }: LabResultsPanelProps): JSX.Element {
  if (observations.length === 0) {
    return (
      <div style={mainContainerStyle}>
        <Text style={{ color: colors.textMuted, fontSize: '13px' }}>
          No laboratory results available.
        </Text>
      </div>
    );
  }

  const sortedObservations = [...observations].sort((a, b) => {
    const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
    const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div style={mainContainerStyle}>
      <div style={tableHeaderStyle}>
        <div style={{ ...testNameStyle, ...tableHeaderStyle }}>Test</div>
        <div style={{ ...valueStyle, ...tableHeaderStyle }}>Value</div>
        <div style={{ ...unitStyle, ...tableHeaderStyle }}>Unit</div>
        <div style={{ ...rangeStyle, ...tableHeaderStyle }}>Reference</div>
        <div style={{ ...timeStyle, ...tableHeaderStyle }}>Collected</div>
      </div>
      <div>
        {sortedObservations.map((observation, index) => {
          const interpretationStyle = getInterpretationStyle(observation);
          const value = observation.valueQuantity?.value?.toFixed(2) ?? 'N/A';
          const unit = observation.valueQuantity?.unit ?? '';

          return (
            <div
              key={observation.id || `obs-${index}`}
              style={{
                ...rowStyle,
                borderBottom:
                  index === sortedObservations.length - 1 ? 'none' : rowStyle.borderBottom,
              }}
            >
              <div style={testNameStyle}>
                <Text component="span" style={{ fontSize: '13px' }}>
                  {getTestName(observation)}
                </Text>
              </div>
              <div style={{ ...valueStyle, ...interpretationStyle }}>
                <Text component="span" style={{ ...monoValueTextStyle, ...interpretationStyle }}>
                  {value}
                </Text>
              </div>
              <div style={unitStyle}>
                <Text component="span" style={monoMetaTextStyle}>
                  {unit}
                </Text>
              </div>
              <div style={rangeStyle}>
                <Text component="span" style={monoMetaTextStyle}>
                  {getRangeString(observation)}
                </Text>
              </div>
              <div style={timeStyle}>
                <Text component="span" style={monoMetaTextStyle}>
                  {formatRelativeTime(observation.effectiveDateTime)}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
