import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { colors } from '../theme';

interface DataPoint {
  time: string;
  value: number;
  timestamp: number;
}

interface TimeSeriesChartProps {
  data: DataPoint[];
  color: string;
  label: string;
  unit: string;
  height?: number;
}

function formatXAxis(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function TimeSeriesChart({ data, color, label, unit, height = 240 }: TimeSeriesChartProps) {
  const chartData = useMemo(() =>
    data.map(d => ({
      time: formatXAxis(d.timestamp),
      value: d.value,
      timestamp: d.timestamp,
    })).sort((a, b) => a.timestamp - b.timestamp),
    [data],
  );

  if (chartData.length < 2) return null;

  const yMin = Math.floor(Math.min(...chartData.map(d => d.value)) * 0.9);
  const yMax = Math.ceil(Math.max(...chartData.map(d => d.value)) * 1.1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: colors.textMuted, fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={false}
          tickLine={false}
          unit={unit}
        />
        <Tooltip
          contentStyle={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
          }}
          labelStyle={{ color: colors.textMuted }}
          itemStyle={{ color: color }}
          formatter={(value: unknown) => [`${value} ${unit}`, label]}
          labelFormatter={(_, payload) =>
            payload[0]?.payload?.timestamp ? formatTooltipTime(payload[0].payload.timestamp) : ''
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
