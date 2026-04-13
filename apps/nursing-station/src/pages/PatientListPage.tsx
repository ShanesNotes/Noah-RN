import { SearchControl } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { Text } from '@mantine/core';
import { colors } from '../theme';

export function PatientListPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '48px', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <Text fz={20} fw={500} c={colors.textPrimary}>My Patients</Text>
        <Text fz={13} c={colors.textSecondary} mt={4}>Select a patient to view their chart and run workflows.</Text>
      </div>
      <SearchControl
        search={{ resourceType: 'Patient', fields: ['name', 'birthDate', 'gender'], count: 20 }}
        onClick={(e) => navigate(`/Patient/${e.resource.id}`)}
        hideFilters
        hideToolbar
      />
    </div>
  );
}
