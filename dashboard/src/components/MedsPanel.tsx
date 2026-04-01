import { useEffect, useState } from 'react';
import { Loader, Text, Table } from '@mantine/core';
import { medplum } from '../medplum';

type MedicationRequest = Awaited<ReturnType<typeof medplum.searchResources<'MedicationRequest'>>>[number];

// Only handles inline CodeableConcept; MedicationReference requires async resolution (not implemented)
function getMedName(med: MedicationRequest): string {
  return med.medicationCodeableConcept?.text
    || med.medicationCodeableConcept?.coding?.[0]?.display
    || 'Unknown';
}

interface MedsPanelProps {
  patientId: string;
}

export function MedsPanel({ patientId }: MedsPanelProps) {
  const [meds, setMeds] = useState<MedicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    medplum.searchResources(
      'MedicationRequest',
      `patient=${patientId}&_sort=-authoredOn&_count=30&_elements=medicationCodeableConcept,status,dosageInstruction,authoredOn`
    )
      .then(results => {
        if (!cancelled) setMeds([...results]);
      })
      .catch(err => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return <Loader />;
  if (error) return <Text c="red">{error}</Text>;
  if (meds.length === 0) return <Text c="dimmed">No medications found</Text>;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Medication</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Dose</Table.Th>
          <Table.Th>Date</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {meds.map((med, i) => (
          <Table.Tr key={med.id ?? i}>
            <Table.Td>{getMedName(med)}</Table.Td>
            <Table.Td>{med.status ?? '—'}</Table.Td>
            <Table.Td>{med.dosageInstruction?.[0]?.text ?? '—'}</Table.Td>
            <Table.Td>{med.authoredOn?.split('T')[0] ?? '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
