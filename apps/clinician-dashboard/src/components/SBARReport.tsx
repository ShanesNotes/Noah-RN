import { useState, useMemo } from 'react';
import { Loader, Text, Button, Textarea, CopyButton } from '@mantine/core';
import { colors } from '../theme';
import { useFhirSearch } from '../hooks/useFhirSearch';
import { VITAL_CODES_STRING } from '../lib/vitals';
import type { Patient, Observation, Condition, MedicationRequest, AllergyIntolerance } from '../fhir/types';

function formatName(patient: Patient): string {
  return patient.name?.[0]?.given?.join(' ') ?? patient.name?.[0]?.family ?? `Patient ${patient.id?.slice(0, 8)}`;
}

interface SBARReportProps {
  patient: Patient;
}

export function SBARReport({ patient }: SBARReportProps) {
  const [notes, setNotes] = useState('');

  const age = useMemo(() => {
    if (!patient.birthDate) return '?';
    return String(Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  }, [patient.birthDate]);

  const { data: vitals, loading: vitalsLoading } = useFhirSearch<Observation>(
    'Observation',
    `patient=${patient.id}&code=${VITAL_CODES_STRING}&_sort=-date&_count=10&_elements=code,valueQuantity,valueString,component,effectiveDateTime`,
  );

  const { data: conditions, loading: conditionsLoading } = useFhirSearch<Condition>(
    'Condition',
    `patient=${patient.id}&_sort=-onset-date&_count=10&_elements=code,onsetDateTime,clinicalStatus`,
  );

  const { data: meds, loading: medsLoading } = useFhirSearch<MedicationRequest>(
    'MedicationRequest',
    `patient=${patient.id}&status=active&_count=20&_elements=medicationCodeableConcept,dosageInstruction,authoredOn`,
  );

  const { data: allergies, loading: allergiesLoading } = useFhirSearch<AllergyIntolerance>(
    'AllergyIntolerance',
    `patient=${patient.id}&_count=10&_elements=code,reaction`,
  );

  const { data: labs, loading: labsLoading } = useFhirSearch<Observation>(
    'Observation',
    `patient=${patient.id}&category=laboratory&_sort=-date&_count=10&_elements=code,valueQuantity,valueString,referenceRange,effectiveDateTime`,
  );

  const loading = vitalsLoading || conditionsLoading || medsLoading || allergiesLoading || labsLoading;

  const latestVitals = useMemo(() => {
    const map = new Map<string, { value: string; time?: string }>();
    for (const v of vitals) {
      const code = v.code?.coding?.[0]?.code ?? '';
      if (!map.has(code)) {
        let value = '—';
        if (code === '55284-4') {
          const sys = v.component?.find((c: { code?: { coding?: { code?: string }[] } }) => c.code?.coding?.some((x: { code?: string }) => x.code === '8480-6'));
          const dia = v.component?.find((c: { code?: { coding?: { code?: string }[] } }) => c.code?.coding?.some((x: { code?: string }) => x.code === '8462-4'));
          if (sys?.valueQuantity?.value != null && dia?.valueQuantity?.value != null) {
            value = `${sys.valueQuantity.value}/${dia.valueQuantity.value}`;
          }
        } else if (v.valueQuantity?.value != null) {
          value = `${v.valueQuantity.value} ${v.valueQuantity.unit ?? ''}`.trim();
        } else if (v.valueString) {
          value = v.valueString;
        }
        map.set(code, { value, time: v.effectiveDateTime });
      }
    }
    return map;
  }, [vitals]);

  const activeMeds = useMemo(() =>
    meds.map(m => {
      const name = m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? '?';
      const dose = m.dosageInstruction?.[0]?.text ?? '';
      return dose ? `${name} — ${dose}` : name;
    }),
    [meds],
  );

  const activeAllergies = useMemo(() =>
    allergies.map(a => a.code?.coding?.[0]?.display ?? a.code?.text ?? 'Unknown'),
    [allergies],
  );

  const activeConditions = useMemo(() =>
    conditions.map(c => c.code?.coding?.[0]?.display ?? c.code?.text ?? 'Unknown'),
    [conditions],
  );

  const latestLabs = useMemo(() =>
    labs.slice(0, 5).map(l => {
      const name = l.code?.coding?.[0]?.display ?? l.code?.text ?? 'Unknown';
      let value = '—';
      if (l.valueQuantity?.value != null) {
        value = `${l.valueQuantity.value} ${l.valueQuantity.unit ?? ''}`.trim();
      } else if (l.valueString) {
        value = l.valueString;
      }
      return `${name}: ${value}`;
    }),
    [labs],
  );

  const sbarText = useMemo(() => {
    const name = formatName(patient);
    const gender = patient.gender ?? 'unknown';

    const hr = latestVitals.get('8867-4')?.value ?? '—';
    const bp = latestVitals.get('55284-4')?.value ?? '—';
    const rr = latestVitals.get('9279-1')?.value ?? '—';
    const spo2 = latestVitals.get('2708-6')?.value ?? '—';
    const temp = latestVitals.get('8310-5')?.value ?? '—';

    return [
      `S — SITUATION`,
      `Patient: ${name}, ${age}yo ${gender}`,
      `ID: ${patient.id}`,
      ``,
      activeConditions.length > 0
        ? `Active diagnoses: ${activeConditions.join(', ')}`
        : 'No active diagnoses recorded',
      ``,
      `B — BACKGROUND`,
      `Allergies: ${activeAllergies.length > 0 ? activeAllergies.join(', ') : 'NKDA'}`,
      ``,
      `Current medications (${activeMeds.length}):`,
      activeMeds.length > 0 ? activeMeds.map(m => `  • ${m}`).join('\n') : '  None active',
      ``,
      `A — ASSESSMENT`,
      `Vitals:`,
      `  HR: ${hr}  BP: ${bp}  RR: ${rr}  SpO2: ${spo2}%  Temp: ${temp}`,
      ``,
      latestLabs.length > 0 ? `Recent labs:\n${latestLabs.map(l => `  • ${l}`).join('\n')}` : 'No recent labs',
      ``,
      `R — RECOMMENDATION`,
      notes ? notes : '[Add handoff notes here]',
    ].join('\n');
  }, [patient, latestVitals, activeConditions, activeAllergies, activeMeds, latestLabs, notes, age]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        padding: 16,
      }}>
        <Text fz={11} c={colors.textMuted} ff="monospace" fw={600}
          style={{ letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
          Handoff Notes
        </Text>
        <Textarea
          placeholder="Add recommendations, concerns, or follow-up items..."
          value={notes}
          onChange={e => setNotes(e.currentTarget.value)}
          minRows={3}
          styles={{
            input: {
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
            },
          }}
        />
      </div>

      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text fz={11} c={colors.textMuted} ff="monospace" fw={600}
            style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            SBAR Report
          </Text>
          <CopyButton value={sbarText} timeout={2000}>
            {({ copied, copy }) => (
              <Button
                size="xs"
                variant="subtle"
                color={copied ? colors.normal : colors.info}
                onClick={copy}
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}
              >
                {copied ? 'COPIED' : 'COPY'}
              </Button>
            )}
          </CopyButton>
        </div>
        <pre style={{
          padding: 16,
          margin: 0,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          color: colors.textPrimary,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 500,
          overflowY: 'auto',
        }}>
          {sbarText}
        </pre>
      </div>
    </div>
  );
}
