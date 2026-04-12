import type { Task } from '@medplum/fhirtypes';
import { SearchControl } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';

export function TaskListPage(): JSX.Element {
  const navigate = useNavigate();

  return (
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
  );
}
