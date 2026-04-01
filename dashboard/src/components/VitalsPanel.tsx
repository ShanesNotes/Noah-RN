import { useEffect, useState } from 'react';
import { Loader, Text, Table } from '@mantine/core';
import { medplum } from '../medplum';

type Observation = Awaited<ReturnType<typeof medplum.searchResources<'Observation'>>>[number];

const VITAL_LABELS: Record<string, string> = {
  '8867-4': 'Heart Rate',
  '55284-4': 'Blood Pressure',
  '9279-1': 'Resp Rate',
  '2708-6': 'SpO2',
  '8310-5': 'Temperature',
};

function getVitalName(obs: Observation): string {
  const code = obs.code?.coding?.[0]?.code ?? '';
  return VITAL_LABELS[code] ?? obs.code?.coding?.[0]?.display ?? obs.code?.text ?? 'Unknown';
}

type ObsComponent = NonNullable<Observation['component']>[number];
type ObsCoding = NonNullable<NonNullable<ObsComponent['code']>['coding']>[number];

function getBPValue(obs: Observation): string {
  const systolic = obs.component?.find(
    (c: ObsComponent) => c.code?.coding?.some((coding: ObsCoding) => coding.code === '8480-6')
  );
  const diastolic = obs.component?.find(
    (c: ObsComponent) => c.code?.coding?.some((coding: ObsCoding) => coding.code === '8462-4')
  );
  const sys = systolic?.valueQuantity?.value;
  const dia = diastolic?.valueQuantity?.value;
  if (sys !== undefined && dia !== undefined) return `${sys}/${dia} mmHg`;
  return '—';
}

function getVitalValue(obs: Observation): string {
  const code = obs.code?.coding?.[0]?.code ?? '';
  if (code === '55284-4') return getBPValue(obs);
  if (obs.valueQuantity?.value != null) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
  }
  return obs.valueString ?? '—';
}

interface VitalsPanelProps {
  patientId: string;
}

export function VitalsPanel({ patientId }: VitalsPanelProps) {
  const [vitals, setVitals] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    medplum.searchResources(
      'Observation',
      `patient=${patientId}&code=8867-4,55284-4,9279-1,2708-6,8310-5&_sort=-date&_count=20&_elements=code,valueQuantity,valueString,component,effectiveDateTime`
    )
      .then(results => {
        if (!cancelled) setVitals([...results]);
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
  if (vitals.length === 0) return <Text c="dimmed">No vitals found</Text>;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Vital</Table.Th>
          <Table.Th>Value</Table.Th>
          <Table.Th>Time</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {vitals.map((obs, i) => (
          <Table.Tr key={obs.id ?? i}>
            <Table.Td>{getVitalName(obs)}</Table.Td>
            <Table.Td>{getVitalValue(obs)}</Table.Td>
            <Table.Td>{obs.effectiveDateTime?.split('T')[0] ?? '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
