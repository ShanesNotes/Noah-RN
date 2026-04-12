import { SearchControl } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';

export function PatientListPage(): JSX.Element {
  const navigate = useNavigate();

  return (
    <SearchControl
      search={{ resourceType: 'Patient', fields: ['name', 'birthDate', 'gender'], count: 20 }}
      onClick={(e) => navigate(`/Patient/${e.resource.id}`)}
      hideFilters
      hideToolbar
    />
  );
}
