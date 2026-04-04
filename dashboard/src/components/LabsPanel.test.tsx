import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { LabsPanel } from './LabsPanel';
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

const makeLabObservation = (code: string, display: string, value: number, unit: string, date: string) => ({
  resourceType: 'Observation' as const,
  id: `lab-${code}-${value}`,
  code: { coding: [{ code, display }] },
  valueQuantity: { value, unit },
  effectiveDateTime: date,
});

describe('LabsPanel', () => {
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
    render(wrap(<LabsPanel patientId="p1" />));
    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('shows error message', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: false, error: 'API failed', refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('API failed')).toBeInTheDocument();
  });

  it('shows empty state when no labs', () => {
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data: [], loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('No lab results')).toBeInTheDocument();
  });

  it('excludes vital signs from lab results', () => {
    const data = [
      makeLabObservation('8867-4', 'Heart Rate', 80, '/min', '2026-03-31T10:00:00Z'),
      makeLabObservation('55284-4', 'Blood Pressure', 120, 'mmHg', '2026-03-31T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('No lab results')).toBeInTheDocument();
  });

  it('renders a lab result with display name', () => {
    const data = [makeLabObservation('2345-7', 'Glucose', 95, 'mg/dL', '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('Glucose')).toBeInTheDocument();
  });

  it('renders lab value and unit in table', () => {
    const data = [makeLabObservation('2160-0', 'Creatinine', 1.2, 'mg/dL', '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('1.2 mg/dL')).toBeInTheDocument();
  });

  it('renders rate of change arrow when multiple readings exist', () => {
    const data = [
      makeLabObservation('718-7', 'Hemoglobin', 14.0, 'g/dL', '2026-03-31T10:00:00Z'),
      makeLabObservation('718-7', 'Hemoglobin', 12.0, 'g/dL', '2026-03-30T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('+16.7%')).toBeInTheDocument();
  });

  it('renders downward arrow for decreasing values', () => {
    const data = [
      makeLabObservation('718-7', 'Hemoglobin', 10.0, 'g/dL', '2026-03-31T10:00:00Z'),
      makeLabObservation('718-7', 'Hemoglobin', 13.0, 'g/dL', '2026-03-30T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    const data = [makeLabObservation('2345-7', 'Glucose', 95, 'mg/dL', '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('VALUE')).toBeInTheDocument();
    expect(screen.getByText('RANGE')).toBeInTheDocument();
    expect(screen.getByText('TIME')).toBeInTheDocument();
  });

  it('renders reference range when available', () => {
    const data = [{
      ...makeLabObservation('2345-7', 'Glucose', 95, 'mg/dL', '2026-03-31T10:00:00Z'),
      referenceRange: [{ text: '70-100 mg/dL' }],
    }];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('70-100 mg/dL')).toBeInTheDocument();
  });

  it('renders multiple different lab types', () => {
    const data = [
      makeLabObservation('2345-7', 'Glucose', 95, 'mg/dL', '2026-03-31T10:00:00Z'),
      makeLabObservation('2160-0', 'Creatinine', 1.2, 'mg/dL', '2026-03-31T10:00:00Z'),
      makeLabObservation('718-7', 'Hemoglobin', 13.5, 'g/dL', '2026-03-31T10:00:00Z'),
    ];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('Glucose')).toBeInTheDocument();
    expect(screen.getByText('Creatinine')).toBeInTheDocument();
    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
  });

  it('shows "Insufficient data for trend" when single reading', () => {
    const data = [makeLabObservation('2345-7', 'Glucose', 95, 'mg/dL', '2026-03-31T10:00:00Z')];
    vi.mocked(useFhirSearchModule.useFhirSearch).mockReturnValue({
      data, loading: false, error: null, refetch: vi.fn(),
    });
    render(wrap(<LabsPanel patientId="p1" />));
    expect(screen.getByText('Insufficient data for trend')).toBeInTheDocument();
  });
});
