import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { VitalsPanel } from './VitalsPanel';
import * as useFhirSearchModule from '../hooks/useFhirSearch';

vi.mock('../hooks/useFhirSearch', () => ({
  useFhirSearch: vi.fn(() => ({ data: [], loading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const wrap = (ui: React.ReactElement) => (
  <MantineProvider>{ui}</MantineProvider>
);

const makeObservation = (code: string, value: number, date: string) => ({
  resourceType: 'Observation' as const,
  id: `obs-${code}-${value}`,
  code: { coding: [{ code, display: 'test' }] },
  valueQuantity: { value, unit: 'unit' },
  effectiveDateTime: date,
});

const makeBPObservation = (sys: number, dia: number, date: string) => ({
  resourceType: 'Observation' as const,
  id: `obs-bp-${sys}-${dia}`,
  code: { coding: [{ code: '55284-4', display: 'Blood Pressure' }] },
  component: [
    { code: { coding: [{ code: '8480-6' }] }, valueQuantity: { value: sys } },
    { code: { coding: [{ code: '8462-4' }] }, valueQuantity: { value: dia } },
  ],
  effectiveDateTime: date,
});

describe('VitalsPanel', () => {
  beforeEach(() => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReset();
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: false, error: null, refetch: vi.fn(),
    });
  });

  it('shows loading state', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: true, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('shows error message', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: false, error: 'Network error', refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('shows empty state when no vitals', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('No vitals recorded')).toBeInTheDocument();
  });

  it('renders heart rate vital card', () => {
    const vitals = [makeObservation('8867-4', 82, '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('renders blood pressure with systolic/diastolic', () => {
    const vitals = [makeBPObservation(120, 80, '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('BP')).toBeInTheDocument();
    expect(screen.getByText('120/80')).toBeInTheDocument();
  });

  it('renders resp rate vital', () => {
    const vitals = [makeObservation('9279-1', 18, '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('RR')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('renders SpO2 vital', () => {
    const vitals = [makeObservation('2708-6', 98, '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('98')).toBeInTheDocument();
  });

  it('renders temperature vital', () => {
    const vitals = [makeObservation('8310-5', 98.6, '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('98.6')).toBeInTheDocument();
  });

  it('renders multiple vital types together', () => {
    const vitals = [
      makeObservation('8867-4', 75, '2026-03-31T10:00:00Z'),
      makeObservation('9279-1', 16, '2026-03-31T10:00:00Z'),
      makeObservation('2708-6', 99, '2026-03-31T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('RR')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('shows sparkline when multiple readings exist', () => {
    const vitals = [
      makeObservation('8867-4', 80, '2026-03-31T08:00:00Z'),
      makeObservation('8867-4', 85, '2026-03-31T09:00:00Z'),
      makeObservation('8867-4', 90, '2026-03-31T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    const { container } = render(wrap(<VitalsPanel patientId="p1" />));
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders trends view toggle button', () => {
    const vitals = [
      makeObservation('8867-4', 80, '2026-03-31T08:00:00Z'),
      makeObservation('8867-4', 85, '2026-03-31T09:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('cards')).toBeInTheDocument();
    expect(screen.getByText('trends')).toBeInTheDocument();
  });

  it('renders historical readings under latest value', () => {
    const vitals = [
      makeObservation('8867-4', 90, '2026-03-31T10:00:00Z'),
      makeObservation('8867-4', 85, '2026-03-31T09:00:00Z'),
      makeObservation('8867-4', 80, '2026-03-31T08:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: vitals, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<VitalsPanel patientId="p1" />));
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });
});
