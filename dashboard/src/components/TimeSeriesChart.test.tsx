import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeSeriesChart } from './TimeSeriesChart';

// recharts uses ResizeObserver which is not in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseData = [
  { value: 80, timestamp: Date.now() - 3600000, time: '10:00' },
  { value: 85, timestamp: Date.now() - 1800000, time: '10:30' },
  { value: 90, timestamp: Date.now(), time: '11:00' },
];

describe('TimeSeriesChart', () => {
  it('renders chart when data has 2+ points', () => {
    render(
      <TimeSeriesChart data={baseData} color="#00b4d8" label="Heart Rate" unit="bpm" />
    );
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders nothing when data has fewer than 2 points', () => {
    const { container } = render(
      <TimeSeriesChart data={[baseData[0]]} color="#00b4d8" label="Heart Rate" unit="bpm" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for empty data', () => {
    const { container } = render(
      <TimeSeriesChart data={[]} color="#00b4d8" label="Heart Rate" unit="bpm" />
    );
    expect(container.firstChild).toBeNull();
  });
});
