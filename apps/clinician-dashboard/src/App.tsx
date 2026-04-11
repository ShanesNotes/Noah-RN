import { useState, useCallback } from 'react';
import { MantineProvider, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme, colors } from './theme';
import { formatPatientName } from './fhir/client';
import type { Patient } from './fhir/types';
import { PatientList } from './components/PatientList';
import { VitalsPanel } from './components/VitalsPanel';
import { LabsPanel } from './components/LabsPanel';
import { MedsPanel } from './components/MedsPanel';
import { AssignmentView } from './components/AssignmentView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContextInspector } from './components/ContextInspector';
import { SkillPanel } from './components/SkillPanel';
import { OrderSetsPanel } from './components/OrderSetsPanel';

type TabKey = 'vitals' | 'labs' | 'meds' | 'context' | 'noah' | 'orders';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'vitals', label: 'VITALS' },
  { key: 'labs', label: 'LABS' },
  { key: 'meds', label: 'MEDS' },
  { key: 'orders', label: 'ORDERS' },
  { key: 'context', label: 'CONTEXT' },
  { key: 'noah', label: 'NOAH' },
];

function App() {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('vitals');
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  const handleSelect = useCallback((p: Patient) => {
    setSelected(p);
    setActiveTab('vitals');
  }, []);

  const handleLoadAll = useCallback((patients: Patient[]) => {
    setAllPatients(patients);
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div style={{
        display: 'flex',
        height: '100vh',
        background: colors.bg,
        color: colors.textPrimary,
        fontFamily: '"Outfit", sans-serif',
      }}>
        {/* Sidebar */}
        <aside style={{
          width: 280,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
        }}>
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <Text ff="monospace" fz="xs" fw={700} c={colors.info} style={{ letterSpacing: '0.15em' }}>
              NOAH RN
            </Text>
            <Text fz={10} c={colors.textMuted} mt={2}>
              Clinical Decision Support
            </Text>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            <PatientList onSelect={handleSelect} selectedId={selected?.id} onLoadAll={handleLoadAll} />
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selected ? (
            <>
              {/* Patient header + tabs */}
              <div style={{
                padding: '12px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: colors.surface,
              }}>
                <div style={{ flex: 1 }}>
                  <Text ff="monospace" fw={700} fz="sm">
                    {formatPatientName(selected) || `Patient ${selected.id?.slice(0, 8)}`}
                  </Text>
                  <Text fz={11} c={colors.textSecondary}>
                    {[selected.gender, selected.birthDate].filter(Boolean).join(' · ')}
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: 0 }}>
                  {TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      style={{
                        background: activeTab === t.key ? colors.border : 'transparent',
                        color: activeTab === t.key ? colors.textPrimary : colors.textSecondary,
                        border: 'none',
                        padding: '6px 16px',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        borderRadius: 4,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {activeTab === 'vitals' && selected.id && <ErrorBoundary panel="Vitals"><VitalsPanel patientId={selected.id} /></ErrorBoundary>}
                {activeTab === 'labs' && selected.id && <ErrorBoundary panel="Labs"><LabsPanel patientId={selected.id} /></ErrorBoundary>}
                {activeTab === 'meds' && selected.id && <ErrorBoundary panel="Meds"><MedsPanel patientId={selected.id} /></ErrorBoundary>}
                {activeTab === 'orders' && <ErrorBoundary panel="Orders"><OrderSetsPanel /></ErrorBoundary>}
                {activeTab === 'context' && selected.id && <ErrorBoundary panel="Context"><ContextInspector patientId={selected.id} /></ErrorBoundary>}
                {activeTab === 'noah' && selected.id && <ErrorBoundary panel="Noah"><SkillPanel patientId={selected.id} patientName={formatPatientName(selected)} /></ErrorBoundary>}
              </div>
            </>
          ) : (
            allPatients.length > 0 ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <AssignmentView patients={allPatients} />
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
              }}>
                <Text ff="monospace" fz="lg" c={colors.textMuted}>—</Text>
                <Text fz="sm" c={colors.textSecondary}>Select a patient</Text>
              </div>
            )
          )}
        </main>
      </div>
    </MantineProvider>
  );
}

export default App;
