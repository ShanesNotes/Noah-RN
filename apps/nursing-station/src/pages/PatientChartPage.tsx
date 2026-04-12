import { Loader, Stack, Tabs, Title } from '@mantine/core';
import { formatHumanName } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { PatientTimeline, SearchControl } from '@medplum/react';
import { useResource } from '@medplum/react-hooks';
import type { JSX } from 'react';
import { useParams } from 'react-router';

export function PatientChartPage(): JSX.Element {
  const { id } = useParams();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  if (!patient) {
    return <Loader />;
  }

  const name = patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown';

  return (
    <Stack>
      <Title order={3}>{name}</Title>
      <Tabs defaultValue="timeline">
        <Tabs.List>
          <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
          <Tabs.Tab value="vitals">Vitals</Tabs.Tab>
          <Tabs.Tab value="labs">Labs</Tabs.Tab>
          <Tabs.Tab value="meds">Medications</Tabs.Tab>
          <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="timeline" pt="md">
          <PatientTimeline patient={patient} />
        </Tabs.Panel>

        <Tabs.Panel value="vitals" pt="md">
          <SearchControl
            search={{
              resourceType: 'Observation',
              filters: [
                { code: 'patient', operator: 'eq', value: `Patient/${id}` },
                { code: 'category', operator: 'eq', value: 'vital-signs' },
              ],
              sortRules: [{ code: '-date' }],
              count: 25,
            }}
            hideFilters
            hideToolbar
          />
        </Tabs.Panel>

        <Tabs.Panel value="labs" pt="md">
          <SearchControl
            search={{
              resourceType: 'Observation',
              filters: [
                { code: 'patient', operator: 'eq', value: `Patient/${id}` },
                { code: 'category', operator: 'eq', value: 'laboratory' },
              ],
              sortRules: [{ code: '-date' }],
              count: 25,
            }}
            hideFilters
            hideToolbar
          />
        </Tabs.Panel>

        <Tabs.Panel value="meds" pt="md">
          <SearchControl
            search={{
              resourceType: 'MedicationRequest',
              filters: [
                { code: 'patient', operator: 'eq', value: `Patient/${id}` },
              ],
              sortRules: [{ code: '-date' }],
              count: 25,
            }}
            hideFilters
            hideToolbar
          />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="md">
          <SearchControl
            search={{
              resourceType: 'Task',
              filters: [
                { code: 'patient', operator: 'eq', value: `Patient/${id}` },
              ],
              sortRules: [{ code: '-date' }],
              count: 25,
            }}
            hideFilters
            hideToolbar
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
