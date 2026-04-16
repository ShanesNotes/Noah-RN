import { Badge, Text } from '@mantine/core';
import { glassHeaderStyle, iconButtonStyle, sectionEyebrowStyle } from '@noah-rn/ui';
import { colors } from '@noah-rn/ui-tokens';
import { IconAlertTriangle, IconArrowLeft, IconClockHour4, IconMapPin, IconShield } from '@tabler/icons-react';
import { formatDate, formatDateTime, formatHumanName, formatReferenceString } from '@medplum/core';
import type { AllergyIntolerance, Encounter, Patient } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import type { JSX } from 'react';

interface PatientHeaderFixtureData {
  allergies?: AllergyIntolerance[];
  encounter?: Encounter;
  latestVital?: { effectiveDateTime?: string };
}

interface PatientHeaderProps {
  patient: Patient;
  patientId: string;
  onBack: () => void;
  fixtureData?: PatientHeaderFixtureData;
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

function deriveCodeStatus(patient: Patient, encounter: Encounter | undefined): string {
  const encounterStatus = encounter?.hospitalization?.dietPreference?.[0]?.text;
  const patientStatus = patient.extension?.find((extension) => extension.url?.toLowerCase().includes('code-status'))?.valueCodeableConcept?.text;
  return patientStatus ?? encounterStatus ?? 'Full code';
}

function Field({ label, value, testId }: { label: string; value: string; testId: string }): JSX.Element {
  return (
    <div data-testid={testId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Text style={sectionEyebrowStyle}>
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
  onBack,
  fixtureData,
}: PatientHeaderProps): JSX.Element {
  if (fixtureData) {
    return (
      <PatientHeaderView
        patient={patient}
        patientId={patientId}
        onBack={onBack}
        allergies={fixtureData.allergies}
        encounter={fixtureData.encounter}
        latestVitalTime={fixtureData.latestVital?.effectiveDateTime}
      />
    );
  }

  return <LivePatientHeader patient={patient} patientId={patientId} onBack={onBack} />;
}

function LivePatientHeader({
  patient,
  patientId,
  onBack,
}: PatientHeaderProps): JSX.Element {
  const patientRef = `Patient/${patientId}`;
  const [allergies] = useSearchResources('AllergyIntolerance', `patient=${patientRef}&_count=3`);
  const [encounters] = useSearchResources('Encounter', `patient=${patientRef}&_sort=-date&_count=1`);
  const [latestVitals] = useSearchResources('Observation', `patient=${patientRef}&category=vital-signs&_sort=-date&_count=1`);

  return (
    <PatientHeaderView
      patient={patient}
      patientId={patientId}
      onBack={onBack}
      allergies={allergies}
      encounter={encounters?.[0]}
      latestVitalTime={latestVitals?.[0]?.effectiveDateTime}
    />
  );
}

function PatientHeaderView({
  patient,
  patientId,
  onBack,
  allergies,
  encounter,
  latestVitalTime,
}: {
  patient: Patient;
  patientId: string;
  onBack: () => void;
  allergies: AllergyIntolerance[] | undefined;
  encounter: Encounter | undefined;
  latestVitalTime?: string;
}): JSX.Element {
  const name = patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown Patient';
  const dob = patient.birthDate ? formatDate(patient.birthDate) : '—';
  const demographics = [
    patient.gender ? patient.gender.toUpperCase() : 'UNKNOWN',
    dob !== '—' ? `DOB: ${dob}` : 'DOB: —',
  ].join(' · ');
  const allergyCount = allergies?.length ?? 0;
  const codeStatus = deriveCodeStatus(patient, encounter);

  return (
    <div
      data-testid="patient-header"
      style={{
        ...glassHeaderStyle,
        padding: '20px 48px 18px 48px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          aria-label="Back to patient worklist"
          onClick={onBack}
          style={{
            ...iconButtonStyle,
            cursor: 'pointer',
          }}
        >
          <IconArrowLeft size={18} />
        </button>
        <Text fz={12} c={colors.textSecondary} style={{ letterSpacing: '0.05em' }}>
          BACK TO PATIENTS
        </Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Badge variant="light" color="cyan" radius="sm" leftSection={<IconMapPin size={12} />}>
          {deriveLocation(encounter)}
        </Badge>
        <Badge variant="light" color={codeStatus.toLowerCase().includes('full') ? 'blue' : 'red'} radius="sm" leftSection={<IconShield size={12} />}>
          {codeStatus}
        </Badge>
        <Badge variant="light" color={allergyCount > 0 ? 'red' : 'gray'} radius="sm" leftSection={<IconAlertTriangle size={12} />}>
          {allergyCount > 0 ? `${allergyCount} allerg${allergyCount === 1 ? 'y' : 'ies'}` : 'No allergies listed'}
        </Badge>
        <Badge variant="outline" color="gray" radius="sm" leftSection={<IconClockHour4 size={12} />}>
          {latestVitalTime ? `Vitals ${formatDateTime(latestVitalTime)}` : 'No recent vitals'}
        </Badge>
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
            minWidth: 'min(100%, 420px)',
          }}
        >
          <Field label="Location" value={deriveLocation(encounter)} testId="patient-location" />
          <Field label="Code Status" value={codeStatus} testId="code-status" />
          <Field label="Allergies" value={summarizeAllergies(allergies)} testId="allergy-list" />
          <Field label="Attending / Service" value={deriveAttendingService(encounter)} testId="attending-service" />
          <Field
            label="Last Vitals"
            value={latestVitalTime ? formatDateTime(latestVitalTime) : '—'}
            testId="timestamp"
          />
          <Field
            label="MRN / ID"
            value={patient.identifier?.[0]?.value ?? formatReferenceString({ reference: `Patient/${patientId}` }) ?? patientId}
            testId="patient-mrn"
          />
        </div>
      </div>
    </div>
  );
}
