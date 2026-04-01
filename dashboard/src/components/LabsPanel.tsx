import { useEffect, useState } from 'react';
import { Loader, Text, Table } from '@mantine/core';
import { medplum } from '../medplum';

type Observation = Awaited<ReturnType<typeof medplum.searchResources<'Observation'>>>[number];

const VITALS_CODES = new Set(['8867-4', '55284-4', '9279-1', '2708-6', '8310-5']);

function isVital(obs: Observation): boolean {
  const code = obs.code?.coding?.[0]?.code ?? '';
  return VITALS_CODES.has(code);
}

function getLabValue(obs: Observation): string {
  if (obs.valueQuantity?.value != null) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
  }
  return obs.valueString ?? '—';
}

interface LabsPanelProps {
  patientId: string;
}

export function LabsPanel({ patientId }: LabsPanelProps) {
  const [labs, setLabs] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    medplum.searchResources(
      'Observation',
      `patient=${patientId}&_sort=-date&_count=30&_elements=code,valueQuantity,valueString,referenceRange,effectiveDateTime`
    )
      .then(results => {
        if (!cancelled) setLabs([...results].filter(obs => !isVital(obs)));
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
  if (labs.length === 0) return <Text c="dimmed">No labs found</Text>;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Test</Table.Th>
          <Table.Th>Value</Table.Th>
          <Table.Th>Range</Table.Th>
          <Table.Th>Time</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {labs.map((obs, i) => (
          <Table.Tr key={obs.id ?? i}>
            <Table.Td>{obs.code?.coding?.[0]?.display ?? obs.code?.text ?? 'Unknown'}</Table.Td>
            <Table.Td>{getLabValue(obs)}</Table.Td>
            <Table.Td>{obs.referenceRange?.[0]?.text ?? '—'}</Table.Td>
            <Table.Td>{obs.effectiveDateTime?.split('T')[0] ?? '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
