import { describe, expect, it } from 'vitest';
import { WaveformRingBuffer, projectMonitorSnapshot } from '../src/projections/monitor.js';
import { ReferencePkEngineAdapter } from '../src/reference/adapter.js';

function createProjection() {
  const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
  const engine = adapter.create({
    encounterId: 'encounter-monitor',
    baselineMAP: 52,
    baselineHR: 98,
    initialDrugs: [{ name: 'norepinephrine', dose: 0.08, unit: 'mcg/kg/min' }],
  });

  engine.tick({ previousTimeMs: 0, currentTimeMs: 60_000, deltaMs: 60_000 });
  return engine.getAgentProjection();
}

describe('projectMonitorSnapshot', () => {
  it('produces a deterministic L1 snapshot for the same L0 frame', () => {
    const projection = createProjection();

    const first = projectMonitorSnapshot(projection);
    const second = projectMonitorSnapshot(projection);

    expect(second).toEqual(first);
  });

  it('keeps rhythm labels but makes numeric telemetry lossy relative to L0', () => {
    const projection = createProjection();
    const monitor = projectMonitorSnapshot(projection);

    expect(monitor.rhythm_label).toBe(projection.vitals.rhythmLabel);

    const differsFromL0 =
      monitor.map !== projection.vitals.map ||
      monitor.hr !== projection.vitals.hr ||
      monitor.sbp !== projection.vitals.sbp ||
      monitor.dbp !== projection.vitals.dbp;

    expect(differsFromL0).toBe(true);
  });

  it('records simulation time rather than wall time', () => {
    const projection = createProjection();
    const monitor = projectMonitorSnapshot(projection, {
      mapNoise: 0,
      hrNoise: 0,
      sbpNoise: 0,
      dbpNoise: 0,
      rrNoise: 0,
      spo2Noise: 0,
      etco2Noise: 0,
      tempNoise: 0,
    });

    expect(monitor.captured_at).toBe(new Date(60_000).toISOString());
    expect(monitor.scenario_minutes_elapsed).toBe(1);
  });
});

describe('WaveformRingBuffer', () => {
  it('retains only the configured rolling window and serves waveform samples by simulation time', () => {
    const buffer = new WaveformRingBuffer({ retentionSeconds: 60 });

    buffer.ingest({
      encounterId: 'encounter-monitor',
      physiologySource: 'fallback',
      sampleRateHz: 2,
      startTimeMs: 0,
      endTimeMs: 30_000,
      leads: {
        II: Array.from({ length: 60 }, (_, i) => i),
      },
    });
    buffer.ingest({
      encounterId: 'encounter-monitor',
      physiologySource: 'fallback',
      sampleRateHz: 2,
      startTimeMs: 30_000,
      endTimeMs: 90_000,
      leads: {
        II: Array.from({ length: 120 }, (_, i) => i + 100),
      },
    });

    const latest = buffer.readWindow({
      encounterId: 'encounter-monitor',
      leads: ['II'],
      seconds: 10,
    });
    const historical = buffer.readWindow({
      encounterId: 'encounter-monitor',
      leads: ['II'],
      seconds: 10,
      startOffsetSeconds: 50,
    });

    expect(latest.leads.II).toHaveLength(20);
    expect(historical.leads.II).toHaveLength(20);
    expect(historical.start_time).toBe(new Date(30_000).toISOString());
    expect(buffer.getRetentionSeconds()).toBe(60);
  });
});
