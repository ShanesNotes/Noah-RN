import React from 'react';
import { Text } from '@mantine/core';
import { colors } from '../theme';

export interface Patient {
  id?: string;
  name?: { given?: string[]; family?: string; text?: string }[];
  birthDate?: string;
  gender?: string;
}

export interface StatusFlags {
  codeStatus?: 'Full Code' | 'DNR' | 'DNR/DNI' | 'Comfort Care';
  isolation?: string | null;
  allergyAlert?: boolean;
  fallRisk?: boolean;
}

interface PatientBannerProps {
  patient: Patient;
  statusFlags?: StatusFlags;
  onBack?: () => void;
}

const formatPatientName = (name: Patient['name']): string => {
  if (!name || name.length === 0) {
    return 'Unknown Patient';
  }
  const primaryName = name[0];
  if (primaryName.text) {
    return primaryName.text;
  }
  const given = primaryName.given?.join(' ') || '';
  const family = primaryName.family || '';
  return [given, family].filter(Boolean).join(' ');
};

const calculateAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const StatusIndicator: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
    <Text style={{ fontFamily: 'Outfit', fontSize: '12px', color: colors.textSecondary }}>
      {label}
    </Text>
  </div>
);

export const PatientBanner: React.FC<PatientBannerProps> = ({ patient, statusFlags, onBack }) => {
  const age = calculateAge(patient.birthDate);
  const formattedName = formatPatientName(patient.name);
  
  const dob = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) : 'N/A';

  const getCodeStatusColor = () => {
      if (!statusFlags?.codeStatus) return colors.info;
      return statusFlags.codeStatus === 'Full Code' ? colors.accent : colors.critical;
  };

  return (
    <div style={{ padding: '16px', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: 1,
            alignSelf: 'flex-start',
            padding: '0 8px 0 0',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
        >
          ←
        </button>
      )}
      
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <Text style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 500, color: colors.textPrimary }}>
            {formattedName}
          </Text>
          <Text style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: colors.textSecondary, transform: 'translateY(-2px)' }}>
            {`ID: ${patient.id || 'N/A'}`}
          </Text>
        </div>

        <Text style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
          {`${patient.gender || 'N/A'} · DOB: ${dob} (${age !== null ? `${age}y` : 'N/A'})`}
        </Text>
      </div>

      {statusFlags && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
          {statusFlags.codeStatus && (
            <StatusIndicator color={getCodeStatusColor()} label={statusFlags.codeStatus.toUpperCase()} />
          )}
          {statusFlags.isolation && (
            <StatusIndicator color={colors.warning} label={statusFlags.isolation.toUpperCase()} />
          )}
          {statusFlags.allergyAlert && (
            <StatusIndicator color={colors.critical} label="ALLERGY ALERT" />
          )}
          {statusFlags.fallRisk && (
            <StatusIndicator color={colors.warning} label="FALL RISK" />
          )}
        </div>
      )}
    </div>
  );
};
