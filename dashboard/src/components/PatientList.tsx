import { useEffect, useState } from 'react';
import { formatHumanName } from '@medplum/core';
import { Loader, Text, NavLink, Stack } from '@mantine/core';
import { medplum } from '../medplum';

type Patient = Awaited<ReturnType<typeof medplum.searchResources<'Patient'>>>[number];

interface PatientListProps {
  onSelect: (patient: Patient) => void;
  selectedId?: string;
}

export function PatientList({ onSelect, selectedId }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    medplum.searchResources('Patient', '_count=100&_elements=id,name,birthDate,gender')
      .then(results => {
        if (!cancelled) setPatients([...results]);
      })
      .catch(err => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <Text c="red">{error}</Text>;
  }

  return (
    <Stack gap={0}>
      {patients.map((patient) => (
        <NavLink
          key={patient.id}
          label={formatHumanName(patient.name?.[0]) || 'Unknown patient'}
          description={[patient.birthDate, patient.gender].filter(Boolean).join(' · ')}
          active={patient.id === selectedId}
          onClick={() => onSelect(patient)}
        />
      ))}
    </Stack>
  );
}
