import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface Props {
  samples: number[];
  sampleRateHz: number;
}

// Scrolls the 10 s window left-to-right. uplot handles the canvas; we only
// rebuild data arrays on incoming samples. Grid styling approximates a
// 25 mm/s ECG sweep: we tick the x-axis at 200 ms intervals (5 small
// divisions per 1 s) so an eyeballed QRS stays recognizable.
export function EcgStrip({ samples, sampleRateHz }: Props): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const opts: uPlot.Options = {
      width: ref.current.clientWidth || 800,
      height: 200,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: false },
        y: { auto: true },
      },
      axes: [
        {
          stroke: '#6b8091',
          grid: { stroke: '#1b2a36', width: 1 },
          ticks: { show: true },
          values: (_, ticks) => ticks.map((t) => `${t.toFixed(1)}s`),
          splits: (_u, _axis, scaleMin, scaleMax) => {
            const splits: number[] = [];
            for (let t = Math.ceil(scaleMin); t <= scaleMax; t += 1) splits.push(t);
            return splits;
          },
        },
        {
          stroke: '#6b8091',
          grid: { stroke: '#1b2a36', width: 1 },
          ticks: { show: false },
        },
      ],
      series: [
        {},
        {
          stroke: '#7ee787',
          width: 1.5,
          points: { show: false },
        },
      ],
      padding: [8, 12, 8, 12],
    };
    const p = new uPlot(opts, [[0], [0]], ref.current);
    plotRef.current = p;

    const onResize = () => {
      if (ref.current) p.setSize({ width: ref.current.clientWidth, height: 200 });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      p.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    const p = plotRef.current;
    if (!p) return;
    if (!samples.length || !sampleRateHz) return;
    const xs: number[] = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) xs[i] = i / sampleRateHz;
    p.setData([xs, samples]);
  }, [samples, sampleRateHz]);

  return (
    <div
      style={{
        background: '#0f161d',
        border: '1px solid #1b2a36',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: '0.1em', color: '#6b8091' }}>
          ECG LEAD III
        </span>
        <span style={{ fontSize: 11, color: '#6b8091' }}>
          {sampleRateHz} Hz · {samples.length} samples
        </span>
      </div>
      <div ref={ref} style={{ width: '100%', height: 200 }} />
    </div>
  );
}
