import { Badge, Text } from '@mantine/core';
import { formatDate, formatDateTime, formatHumanName, formatReferenceString } from '@medplum/core';
import type { AllergyIntolerance, Encounter, Patient } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import { IconArrowLeft } from '@tabler/icons-react';
import type { JSX } from 'react';
import type { ChartSectionItem } from './ChartSectionNav';
import { colors } from '../theme';

interface PatientHeaderProps {
  patient: Patient;
  patientId: string;
  activeSection: string;
  sections: ChartSectionItem[];
  onBack: () => void;
  onSelectSection: (section: string) => void;
}

function summarizeAllergies(allergies: AllergyIntolerance[] | undefined): string {
  if (!allergies?.length) {
    return 'NONE DOCUMENTED';
  }

  const labels = allergies
    .map((allergy) => allergy.code?.text ?? allergy.code?.coding?.[0]?.display)
    .filter(Boolean) as string[];

  if (!labels.length) {
    return `${allergies.length} DOCUMENTED`;
  }

  return labels.slice(0, 2).join(' · ');
}

function deriveLocation(encounter: Encounter | undefined): string {
  return encounter?.location?.[0]?.location?.display ?? '—';
}

function deriveAttendingService(encounter: Encounter | undefined): string {
  const service = encounter?.serviceType?.text ?? encounter?.serviceType?.coding?.[0]?.display;
  const participant = encounter?.participant?.[0]?.individual?.display;

  if (service && participant) {
    return `${service} · ${participant}`;
  }

  return service ?? participant ?? '—';
}

function Field({ label, value, testId }: { label: string; value: string; testId: string }): JSX.Element {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Text
        ff="monospace"
        fz={11}
        fw={600}
        c={colors.textMuted}
        tt="uppercase"
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
      </Text>
      <Text fz={13} fw={500} c={colors.textPrimary}>
        {value}
      </Text>
    </div>
  );
}

export function PatientHeader({
  patient,
  patientId,
  activeSection,
  sections,
  onBack,
  onSelectSection,
}: PatientHeaderProps): JSX.Element {
  const patientRef = `Patient/${patientId}`;
  const [allergies] = useSearchResources('AllergyIntolerance', `patient=${patientRef}&_count=3`);
  const [encounters] = useSearchResources('Encounter', `patient=${patientRef}&_sort=-date&_count=1`);
  const [latestVitals] = useSearchResources('Observation', `patient=${patientRef}&category=vital-signs&_sort=-date&_count=1`);

  const encounter = encounters?.[0];
  const latestVital = latestVitals?.[0];

  const name = patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown Patient';
  const dob = patient.birthDate ? formatDate(patient.birthDate) : '—';
  const demographics = [
    patient.gender ? patient.gender.toUpperCase() : 'UNKNOWN',
    dob !== '—' ? `DOB: ${dob}` : 'DOB: —',
  ].join(' · ');

  return (
    <div
      data-testid="patient-header"
      style={{
        padding: '24px 48px 0 48px',
        borderBottom: `1px solid ${colors.borderLight}`,
        background: colors.bg,
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconArrowLeft size={18} />
        </button>
        <Text fz={12} c={colors.textSecondary} style={{ letterSpacing: '0.05em' }}>
          BACK TO PATIENTS
        </Text>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Text data-testid="patient-name" fz={30} fw={500} c={colors.textPrimary}>
              {name}
            </Text>
            <Badge variant="light" color="gray" radius="sm" size="md" data-testid="patient-id">
              {patientId}
            </Badge>
          </div>
          <Text data-testid="patient-demographics" fz={13} c={colors.textSecondary} ff="monospace" mt={8}>
            {demographics}
          </Text>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px 24px',
            flex: '1 1 560px',
          }}
        >
          <Field label="Location" value={deriveLocation(encounter)} testId="patient-location" />
          <Field label="Code Status" value="UNKNOWN" testId="code-status" />
          <Field label="Allergies" value={summarizeAllergies(allergies)} testId="allergy-list" />
          <Field label="Attending / Service" value={deriveAttendingService(encounter)} testId="attending-service" />
          <Field
            label="Last Vitals"
            value={latestVital?.effectiveDateTime ? formatDateTime(latestVital.effectiveDateTime) : '—'}
            testId="timestamp"
          />
          <Field
            label="MRN / ID"
            value={patient.identifier?.[0]?.value ?? formatReferenceString({ reference: patientRef }) ?? patientId}
            testId="patient-mrn"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, overflowX: 'auto' }}>
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelectSection(section.id)}
            style={{
              background: 'transparent',
              color: activeSection === section.id ? colors.textPrimary : colors.textSecondary,
              border: 'none',
              borderBottom: activeSection === section.id ? `2px solid ${colors.accent}` : '2px solid transparent',
              padding: '0 0 12px 0',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              fontWeight: activeSection === section.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
