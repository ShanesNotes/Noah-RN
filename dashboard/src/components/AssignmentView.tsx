import { useMemo } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import { VITAL_CODES_STRING } from '../lib/vitals';
import type { Patient, Observation, MedicationRequest } from '../fhir/types';

function formatName(patient: Patient): string {
  return patient.name?.[0]?.given?.join(' ') ?? patient.name?.[0]?.family ?? `Patient ${patient.id?.slice(0, 8)}`;
}

function getAge(birthDate?: string): string {
  if (!birthDate) return '?';
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age}y`;
}

interface AssignmentViewProps {
  patients: Patient[];
}

export function AssignmentView({ patients }: AssignmentViewProps) {
  const patientIds = patients.map(p => p.id).join(',');

  const { data: vitals, loading: vitalsLoading } = useFhirSearch<Observation>(
    'Observation',
    `patient=${patientIds}&code=${VITAL_CODES_STRING}&_sort=-date&_count=200&_elements=patient,code,valueQuantity,valueString,component,effectiveDateTime`,
    patients.length > 0,
  );

  const { data: meds, loading: medsLoading } = useFhirSearch<MedicationRequest>(
    'MedicationRequest',
    `patient=${patientIds}&_sort=-authoredOn&_count=200&_elements=patient,medicationCodeableConcept,status,dosageInstruction,authoredOn`,
    patients.length > 0,
  );

  const loading = vitalsLoading || medsLoading;

  const patientData = useMemo(() => {
    return patients.map(patient => {
      const pid = patient.id;
      const patientVitals = vitals.filter(v => v.subject?.reference === `Patient/${pid}`);
      const patientMeds = meds.filter(m => m.subject?.reference === `Patient/${pid}`);

      const latestVitals = new Map<string, string>();
      for (const v of patientVitals) {
        const code = v.code?.coding?.[0]?.code ?? '';
        if (!latestVitals.has(code)) {
          let value = '—';
          if (code === '55284-4') {
            const sys = v.component?.find((c: { code?: { coding?: { code?: string }[] } }) => c.code?.coding?.some((x: { code?: string }) => x.code === '8480-6'));
            const dia = v.component?.find((c: { code?: { coding?: { code?: string }[] } }) => c.code?.coding?.some((x: { code?: string }) => x.code === '8462-4'));
            if (sys?.valueQuantity?.value != null && dia?.valueQuantity?.value != null) {
              value = `${sys.valueQuantity.value}/${dia.valueQuantity.value}`;
            }
          } else if (v.valueQuantity?.value != null) {
            value = String(v.valueQuantity.value);
          }
          latestVitals.set(code, value);
        }
      }

      const activeMeds = patientMeds
        .filter(m => m.status === 'active')
        .slice(0, 3)
        .map(m => m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? '?')
        .join(', ');

      return {
        patient,
        latestVitals,
        activeMeds: activeMeds || 'None',
        vitalsCount: patientVitals.length,
        medsCount: patientMeds.length,
      };
    });
  }, [patients, vitals, meds]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
    }}>
      {patientData.map(({ patient, latestVitals, activeMeds, vitalsCount, medsCount }) => (
        <div key={patient.id} style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text fz={13} fw={700} c={colors.textPrimary} ff="monospace">
              {formatName(patient)}
            </Text>
            <Text fz={10} c={colors.textMuted}>
              {[patient.gender, getAge(patient.birthDate)].filter(Boolean).join(' · ')}
            </Text>
          </div>

          <div style={{ padding: '12px 16px' }}>
            <Text fz={10} c={colors.textMuted} ff="monospace" fw={600}
              style={{ letterSpacing: '0.1em', marginBottom: 6 }}>
              VITALS ({vitalsCount} records)
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {[
                { code: '8867-4', label: 'HR' },
                { code: '55284-4', label: 'BP' },
                { code: '9279-1', label: 'RR' },
                { code: '2708-6', label: 'SpO2' },
                { code: '8310-5', label: 'Temp' },
              ].map(v => (
                <div key={v.code} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text fz={10} c={colors.textMuted}>{v.label}</Text>
                  <Text fz={11} c={colors.textPrimary} ff="monospace">
                    {latestVitals.get(v.code) ?? '—'}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '12px 16px',
            borderTop: `1px solid ${colors.border}`,
          }}>
            <Text fz={10} c={colors.textMuted} ff="monospace" fw={600}
              style={{ letterSpacing: '0.1em', marginBottom: 6 }}>
              MEDS ({medsCount} records)
            </Text>
            <Text fz={11} c={colors.textSecondary} style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {activeMeds}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}
