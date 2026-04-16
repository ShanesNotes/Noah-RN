import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface Props {
  label: string;
  unit: string;
  value: number | null | undefined;
  accent: string;
  history: number[];
}

export function VitalsTile({ label, unit, value, accent, history }: Props): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const xs = history.map((_, i) => i);
    const opts: uPlot.Options = {
      width: ref.current.clientWidth || 200,
      height: 40,
      cursor: { show: false },
      legend: { show: false },
      scales: { x: { time: false }, y: { auto: true } },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {},
        { stroke: accent, width: 1.25, points: { show: false } },
      ],
      padding: [2, 2, 2, 2],
    };
    const p = new uPlot(opts, [xs, history], ref.current);
    plotRef.current = p;
    return () => {
      p.destroy();
      plotRef.current = null;
    };
  }, [accent]);

  useEffect(() => {
    const p = plotRef.current;
    if (!p) return;
    const xs = history.map((_, i) => i);
    p.setData([xs, history]);
  }, [history]);

  const display = value == null || Number.isNaN(value) ? '—' : value.toFixed(value > 50 ? 0 : 1);

  return (
    <div
      style={{
        background: '#0f161d',
        border: '1px solid #1b2a36',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.1em', color: '#6b8091' }}>
          {label.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: '#6b8091' }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 600, color: accent, lineHeight: 1 }}>
          {display}
        </span>
      </div>
      <div ref={ref} style={{ width: '100%', height: 40 }} />
    </div>
  );
}
