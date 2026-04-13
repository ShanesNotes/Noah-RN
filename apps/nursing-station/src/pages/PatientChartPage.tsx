import { Loader, Text } from '@mantine/core';
import { formatHumanName } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { PatientTimeline, SearchControl } from '@medplum/react';
import { useResource } from '@medplum/react-hooks';
import { useState } from 'react';
import type { JSX } from 'react';
import { useParams, useNavigate } from 'react-router';
import { IconArrowLeft } from '@tabler/icons-react';
import { colors } from '../theme';

export function PatientChartPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });
  const [activeTab, setActiveTab] = useState('timeline');

  if (!patient) {
    return <div style={{ padding: 48 }}><Loader color={colors.accent} size="sm" /></div>;
  }

  const name = patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown';
  const dob = patient.birthDate ? patient.birthDate : 'N/A';
  const gender = patient.gender ? patient.gender : 'Unknown';

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
        padding: '32px 48px 0 48px',
        borderBottom: `1px solid ${colors.borderLight}`,
        background: colors.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: colors.textSecondary, padding: 0, display: 'flex', alignItems: 'center'
            }}
          >
            <IconArrowLeft size={18} />
          </button>
          <Text fz={12} c={colors.textSecondary} style={{ letterSpacing: '0.05em' }}>BACK TO PATIENTS</Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 32 }}>
          <Text fz={28} fw={500} c={colors.textPrimary}>{name}</Text>
          <Text fz={13} c={colors.textSecondary} ff="monospace">{id}</Text>
          <Text fz={13} c={colors.textSecondary} ff="monospace">{gender.toUpperCase()} · DOB: {dob}</Text>
        </div>

        {/* Minimal Tabs */}
        <div style={{ display: 'flex', gap: 32 }}>
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
        
        {activeTab === 'vitals' && (
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
        )}

        {activeTab === 'labs' && (
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
        )}

        {activeTab === 'meds' && (
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
        )}

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
