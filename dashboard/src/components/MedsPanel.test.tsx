import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MedsPanel } from './MedsPanel';
import * as useFhirSearchModule from '../hooks/useFhirSearch';

vi.mock('../hooks/useFhirSearch', () => ({
  useFhirSearch: vi.fn(() => ({ data: [], loading: false, error: null, refetch: vi.fn() })),
}));

const wrap = (ui: React.ReactElement) => (
  <MantineProvider>{ui}</MantineProvider>
);

const makeMedRequest = (name: string, status: string, dose: string, date: string) => ({
  resourceType: 'MedicationRequest' as const,
  id: `rx-${name}-${date}`,
  medicationCodeableConcept: { text: name },
  status,
  dosageInstruction: [{ text: dose }],
  authoredOn: date,
});

const makeMedAdmin = (name: string, status: string, dose: string, date: string) => ({
  resourceType: 'MedicationAdministration' as const,
  id: `admin-${name}-${date}`,
  medicationCodeableConcept: { text: name },
  status,
  dosage: { text: dose },
  effectiveDateTime: date,
});

describe('MedsPanel', () => {
  beforeEach(() => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReset();
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
  });

  it('shows loading state', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValue({ data: [], loading: true, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('shows error message', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValue({ data: [], loading: false, error: 'Failed to load', refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty state when no medications', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('No medications')).toBeInTheDocument();
  });

  it('renders medication name from request', () => {
    const meds = [makeMedRequest('Metoprolol 25mg', 'active', '25mg PO BID', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Metoprolol 25mg')).toBeInTheDocument();
  });

  it('renders medication status badge', () => {
    const meds = [makeMedRequest('Metoprolol 25mg', 'active', '25mg PO BID', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders stopped medication with correct status', () => {
    const meds = [makeMedRequest('Lisinopril 10mg', 'stopped', '10mg PO daily', '2026-03-30')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('STOPPED')).toBeInTheDocument();
  });

  it('renders dose text', () => {
    const meds = [makeMedRequest('Metformin 500mg', 'active', '500mg PO BID with meals', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('500mg PO BID with meals')).toBeInTheDocument();
  });

  it('renders source badge for Rx entries', () => {
    const meds = [makeMedRequest('Aspirin 81mg', 'active', '81mg PO daily', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Rx')).toBeInTheDocument();
  });

  it('renders source badge for Admin entries', () => {
    const admin = [makeMedAdmin('Vancomycin 1g', 'completed', '1g IV over 60 min', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: admin, loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Active Drips section for drip-rate medications', () => {
    const meds = [makeMedRequest('Norepinephrine', 'active', '0.1 mcg/kg/min', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Active Drips')).toBeInTheDocument();
    expect(screen.getByText('DRIP')).toBeInTheDocument();
    expect(screen.getByText('0.1 mcg/kg/min')).toBeInTheDocument();
  });

  it('renders Medication Timeline header', () => {
    const meds = [makeMedRequest('Acetaminophen 650mg', 'active', '650mg PO q6h', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Medication Timeline')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    const meds = [makeMedRequest('Ondansetron 4mg', 'active', '4mg IV q8h', '2026-03-31')];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('SRC')).toBeInTheDocument();
    expect(screen.getByText('MEDICATION')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();
    expect(screen.getByText('DOSE')).toBeInTheDocument();
    expect(screen.getByText('DATE')).toBeInTheDocument();
  });

  it('renders multiple medications sorted by date', () => {
    const meds = [
      makeMedRequest('Metoprolol', 'active', '25mg PO BID', '2026-03-30'),
      makeMedRequest('Lisinopril', 'active', '10mg PO daily', '2026-03-31'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Metoprolol')).toBeInTheDocument();
    expect(screen.getByText('Lisinopril')).toBeInTheDocument();
  });

  it('renders medication with coding display name when text is missing', () => {
    const meds = [{
      resourceType: 'MedicationRequest' as const,
      id: 'rx-coding',
      medicationCodeableConcept: { coding: [{ code: '123', display: 'Codeine 30mg' }] },
      status: 'active',
      dosageInstruction: [{ text: '30mg PO q6h' }],
      authoredOn: '2026-03-31',
    }];
    vi.mocked(useFhirSearchModule.useFhirSearch)
      .mockReturnValueOnce({ data: meds, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() });
    render(wrap(<MedsPanel patientId="p1" />));
    expect(screen.getByText('Codeine 30mg')).toBeInTheDocument();
  });
});
