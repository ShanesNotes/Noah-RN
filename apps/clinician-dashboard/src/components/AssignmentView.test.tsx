import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AssignmentView } from './AssignmentView';

vi.mock('../hooks/useFhirSearch', () => ({
  useFhirSearch: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
}));

const makePatient = (id: string, given: string, family: string) => ({
  resourceType: 'Patient' as const,
  id,
  name: [{ given: [given], family }],
  birthDate: '1970-01-01',
  gender: 'male' as const,
});

describe('AssignmentView', () => {
  const wrap = (ui: React.ReactElement) => (
    <MantineProvider>{ui}</MantineProvider>
  );

  it('renders patient given names', () => {
    // formatName() uses given[0] only — component does not concat family
    const patients = [makePatient('p1', 'Jane', 'Smith'), makePatient('p2', 'John', 'Doe')];
    render(wrap(<AssignmentView patients={patients} />));
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('renders without crashing for empty patient list', () => {
    const { container } = render(wrap(<AssignmentView patients={[]} />));
    expect(container).toBeInTheDocument();
  });

  it('falls back to patient id prefix when no name', () => {
    const patients = [{ resourceType: 'Patient' as const, id: 'abcd1234' }];
    render(wrap(<AssignmentView patients={patients} />));
    expect(screen.getByText(/Patient abcd1234/i)).toBeInTheDocument();
  });
});
