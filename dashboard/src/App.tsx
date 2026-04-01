import { useState } from 'react';
import { MantineProvider, Title, Tabs } from '@mantine/core';
import '@mantine/core/styles.css';
import { medplum } from './medplum';
import { PatientList } from './components/PatientList';
import { VitalsPanel } from './components/VitalsPanel';
import { LabsPanel } from './components/LabsPanel';
import { MedsPanel } from './components/MedsPanel';

type Patient = Awaited<ReturnType<typeof medplum.searchResources<'Patient'>>>[number];

function App() {
  const [selected, setSelected] = useState<Patient | null>(null);

  return (
    <MantineProvider>
        <div style={{ display: 'flex', height: '100vh' }}>
          <aside style={{ width: 300, borderRight: '1px solid #eee', overflowY: 'auto', padding: 8 }}>
            <Title order={5} mb="sm">Patients</Title>
            <PatientList onSelect={setSelected} selectedId={selected?.id} />
          </aside>
          <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {selected ? (
              <>
                <Title order={4} mb="md">
                  Patient {selected.id}
                </Title>
                <Tabs defaultValue="vitals">
                  <Tabs.List>
                    <Tabs.Tab value="vitals">Vitals</Tabs.Tab>
                    <Tabs.Tab value="labs">Labs</Tabs.Tab>
                    <Tabs.Tab value="meds">Medications</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="vitals" pt="md">
                    <VitalsPanel patientId={selected.id!} />
                  </Tabs.Panel>
                  <Tabs.Panel value="labs" pt="md">
                    <LabsPanel patientId={selected.id!} />
                  </Tabs.Panel>
                  <Tabs.Panel value="meds" pt="md">
                    <MedsPanel patientId={selected.id!} />
                  </Tabs.Panel>
                </Tabs>
              </>
            ) : (
              <p>Select a patient from the left panel.</p>
            )}
          </main>
        </div>
    </MantineProvider>
  );
}

export default App;
