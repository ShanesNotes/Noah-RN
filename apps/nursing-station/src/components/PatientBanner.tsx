import { Text } from '@mantine/core';
import type { JSX } from 'react';
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

function formatPatientName(name?: Patient['name']): string {
  if (!name?.length) return 'Unknown Patient';
  const [{ text, given, family }] = name;
  if (text) return text;
  return [given?.join(' '), family].filter(Boolean).join(' ');
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getCodeStatusColor(status?: string): string {
  if (!status) return colors.info;
  return status === 'Full Code' ? colors.accent : colors.critical;
}

function formatBirthDate(birthDate?: string): string {
  if (!birthDate) return 'N/A';

  return new Date(birthDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function StatusIndicator({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
      <Text style={{ fontFamily: 'Outfit', fontSize: '12px', color: colors.textSecondary }}>
        {label}
      </Text>
    </div>
  );
}

export function PatientBanner({ patient, statusFlags, onBack }: PatientBannerProps): JSX.Element {
  const age = calculateAge(patient.birthDate);
  const formattedName = formatPatientName(patient.name);
  
  const dob = formatBirthDate(patient.birthDate);

  const codeStatusColor = getCodeStatusColor(statusFlags?.codeStatus);

  return (
    <div style={{ padding: '16px', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {onBack && (
        <button
          aria-label="Go back"
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
            <StatusIndicator color={codeStatusColor} label={statusFlags.codeStatus.toUpperCase()} />
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
}
