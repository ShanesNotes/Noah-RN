import type { Task } from '@medplum/fhirtypes';
import { SearchControl } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { Text } from '@mantine/core';
import { colors } from '../theme';

export function TaskListPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '48px', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <Text fz={20} fw={500} c={colors.textPrimary}>Active Tasks</Text>
        <Text fz={13} c={colors.textSecondary} mt={4}>Clinical workflow execution tasks and pending actions.</Text>
      </div>
      <SearchControl
        search={{
          resourceType: 'Task',
          fields: ['code', 'status', 'for', 'authoredOn'],
          sortRules: [{ code: '-authored-on' }],
          count: 20,
        }}
        onClick={(e) => {
          const task = e.resource as Task;
          const patientRef = task.for?.reference;
          if (patientRef) {
            navigate(`/${patientRef}`);
          }
        }}
        hideFilters
        hideToolbar
      />
    </div>
  );
}
