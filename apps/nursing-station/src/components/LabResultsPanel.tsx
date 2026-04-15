import React from 'react';
import { Text } from '@mantine/core';
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

const mainContainerStyle: React.CSSProperties = {
  padding: '0',
  fontFamily: 'Outfit, sans-serif',
};

const tableHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  paddingBottom: '8px',
  borderBottom: `1px solid ${colors.borderLight}`,
  fontSize: '11px',
  color: colors.textSecondary,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: `1px solid ${colors.border}`,
};

const cellStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
};

const testNameStyle: React.CSSProperties = {
  ...cellStyle,
  flex: '3 1 0%',
  fontSize: '13px',
  color: colors.textPrimary,
};

const valueStyle: React.CSSProperties = {
  ...cellStyle,
  flex: '1.5 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '13px',
};

const unitStyle: React.CSSProperties = {
  ...cellStyle,
  flex: '0.75 1 0%',
  justifyContent: 'flex-start',
  paddingLeft: '8px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textMuted,
};

const rangeStyle: React.CSSProperties = {
  ...cellStyle,
  flex: '1.5 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textSecondary,
};

const timeStyle: React.CSSProperties = {
  ...cellStyle,
  flex: '1 1 0%',
  justifyContent: 'flex-end',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  color: colors.textMuted,
};

const getInterpretationStyle = (obs: Observation): React.CSSProperties => {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code;
  if (code) {
    switch (code) {
      case 'HH': return { color: colors.critical, fontWeight: 700 };
      case 'H': return { color: colors.critical };
      case 'LL': return { color: colors.warning, fontWeight: 700 };
      case 'L': return { color: colors.warning };
      case 'N': return { color: colors.textPrimary };
      default: break;
    }
  }

  const value = obs.valueQuantity?.value;
  const range = obs.referenceRange?.[0];
  if (typeof value !== 'undefined' && range) {
    if (typeof range.high?.value !== 'undefined' && value > range.high.value) {
      return { color: colors.critical };
    }
    if (typeof range.low?.value !== 'undefined' && value < range.low.value) {
      return { color: colors.warning };
    }
  }

  return { color: colors.textPrimary };
};

const formatRelativeTime = (isoDate?: string): string => {
  if (!isoDate) return 'N/A';
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
  } catch (e) {
    return 'Invalid date';
  }
};

export const LabResultsPanel: React.FC<LabResultsPanelProps> = ({ observations }) => {
  if (!observations || observations.length === 0) {
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
        {sortedObservations.map((obs, index) => {
          const testName = obs.code?.text || obs.code?.coding?.[0]?.display || 'Unknown Test';
          const value = obs.valueQuantity?.value?.toFixed(2) ?? 'N/A';
          const unit = obs.valueQuantity?.unit ?? '';
          const range = obs.referenceRange?.[0];
          const rangeString = range && typeof range.low?.value !== 'undefined' && typeof range.high?.value !== 'undefined'
            ? `${range.low.value} - ${range.high.value}`
            : 'N/A';

          return (
            <div key={obs.id || `obs-${index}`} style={{ ...rowStyle, borderBottom: index === sortedObservations.length - 1 ? 'none' : rowStyle.borderBottom }}>
              <div style={testNameStyle}>
                <Text component="span" style={{ fontSize: '13px' }}>{testName}</Text>
              </div>
              <div style={{...valueStyle, ...getInterpretationStyle(obs)}}>
                <Text component="span" style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', ...getInterpretationStyle(obs) }}>
                  {value}
                </Text>
              </div>
              <div style={unitStyle}>
                <Text component="span" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>{unit}</Text>
              </div>
              <div style={rangeStyle}>
                <Text component="span" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>{rangeString}</Text>
              </div>
              <div style={timeStyle}>
                <Text component="span" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatRelativeTime(obs.effectiveDateTime)}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
