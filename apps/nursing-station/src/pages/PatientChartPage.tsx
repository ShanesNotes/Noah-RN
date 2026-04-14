import { Loader } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { PatientTimeline, SearchControl } from '@medplum/react';
import { useResource } from '@medplum/react-hooks';
import type { JSX } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChartSectionNav, type ChartSectionItem } from '../components/ChartSectionNav';
import { OverviewPanel } from '../components/OverviewPanel';
import { PatientHeader } from '../components/PatientHeader';
import { colors } from '../theme';

export function PatientChartPage(): JSX.Element {
  const { id, section } = useParams();
  const navigate = useNavigate();
  const patient = useResource<Patient>({ reference: `Patient/${id}` });

  if (!patient) {
    return <div style={{ padding: 48 }}><Loader color={colors.accent} size="sm" /></div>;
  }

  const tabs: ChartSectionItem[] = [
    { id: 'overview', label: 'OVERVIEW', detail: 'High-signal patient state and current gaps.' },
    { id: 'timeline', label: 'TIMELINE', detail: 'Longitudinal chart activity and events.' },
    { id: 'vitals', label: 'VITALS', detail: 'Recent vital-sign observations.' },
    { id: 'labs', label: 'LABS', detail: 'Recent laboratory observations.' },
    { id: 'meds', label: 'MEDICATIONS', detail: 'Active medication requests and related work.' },
    { id: 'tasks', label: 'TASKS', detail: 'Patient-scoped workflow tasks.' },
  ];
  const activeTab = tabs.some((tab) => tab.id === section) ? section ?? 'overview' : 'overview';

  return (
    <div data-testid="patient-chart-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PatientHeader
        patient={patient}
        patientId={id ?? patient.id ?? 'unknown'}
        activeSection={activeTab}
        sections={tabs}
        onBack={() => navigate('/')}
        onSelectSection={(nextSection) => navigate(`/Patient/${id}/${nextSection}`)}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ChartSectionNav
          items={tabs}
          activeSection={activeTab}
          onSelect={(nextSection) => navigate(`/Patient/${id}/${nextSection}`)}
        />

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          {activeTab === 'overview' && id && <OverviewPanel patientId={id} />}

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
    </div>
  );
}
