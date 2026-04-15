import { Loader } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { PatientTimeline, SearchControl } from '@medplum/react';
import { useResource, useSearchResources } from '@medplum/react-hooks';
import { useState } from 'react';
import type { JSX } from 'react';
import { useParams, useNavigate } from 'react-router';
import { colors } from '../theme';
import { PatientBanner } from '../components/PatientBanner';
import { VitalsPanel } from '../components/VitalsPanel';
import { LabResultsPanel } from '../components/LabResultsPanel';
import { MedicationList } from '../components/MedicationList';

export function PatientChartPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });
  
  const [vitals] = useSearchResources('Observation', { patient: `Patient/${id}`, category: 'vital-signs', _sort: '-date', _count: '50' });
  const [labs] = useSearchResources('Observation', { patient: `Patient/${id}`, category: 'laboratory', _sort: '-date', _count: '50' });
  const [meds] = useSearchResources('MedicationRequest', { patient: `Patient/${id}`, _sort: '-date', _count: '50' });

  const [activeTab, setActiveTab] = useState('timeline');

  if (!patient) {
    return <div style={{ padding: 48 }}><Loader color={colors.accent} size="sm" /></div>;
  }

  const tabs = [
    { id: 'timeline', label: 'TIMELINE' },
    { id: 'vitals', label: 'VITALS' },
    { id: 'labs', label: 'LABS' },
    { id: 'meds', label: 'MEDICATIONS' },
    { id: 'tasks', label: 'TASKS' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Patient Header */}
      <div style={{
        padding: '16px 32px 0 32px',
        borderBottom: `1px solid ${colors.borderLight}`,
        background: colors.bg,
      }}>
        <PatientBanner patient={patient} onBack={() => navigate('/')} />

        {/* Minimal Tabs */}
        <div style={{ display: 'flex', gap: 32, padding: '0 16px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'transparent',
                color: activeTab === t.id ? colors.textPrimary : colors.textSecondary,
                border: 'none',
                borderBottom: activeTab === t.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                padding: '0 0 12px 0',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12,
                fontWeight: activeTab === t.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
        {activeTab === 'timeline' && <PatientTimeline patient={patient} />}
        
        {activeTab === 'vitals' && <VitalsPanel observations={vitals ?? []} />}

        {activeTab === 'labs' && <LabResultsPanel observations={labs ?? []} />}

        {activeTab === 'meds' && <MedicationList medications={meds ?? []} />}

        {activeTab === 'tasks' && (
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
        )}
      </div>
    </div>
  );
}
