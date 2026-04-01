import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

function App() {
  return (
    <MantineProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <aside style={{ width: 300, borderRight: '1px solid #eee', overflowY: 'auto' }}>
          {/* PatientList goes here */}
          <p>Patient list</p>
        </aside>
        <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* PatientDetail goes here */}
          <p>Select a patient</p>
        </main>
      </div>
    </MantineProvider>
  );
}

export default App;
