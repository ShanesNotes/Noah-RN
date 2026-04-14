/**
 * L0→L1 monitor projection for Contract 2 / Contract 4.
 *
 * Produces a lossy, agent-visible numeric telemetry frame from engine output,
 * and maintains the monitor-side waveform ring buffer required by the waveform
 * vision contract. The monitor is intentionally not a perfect mirror of L0
 * truth: values are quantized and perturbed with bounded deterministic noise so
 * L1 can diverge from hidden patient truth without breaking reproducibility in
 * tests.
 */
import type { EngineAgentProjection, EngineWaveformFrame } from '../engine-adapter.js';
import type { SimLiveVitalsSnapshot, SimWaveformSamplesResponse } from '../index.js';
import { createSeededRng } from '../reference/pharmacokinetics.js';

export interface MonitorProjectionOptions {
  mapNoise?: number;
  sbpNoise?: number;
  dbpNoise?: number;
  hrNoise?: number;
  rrNoise?: number;
  spo2Noise?: number;
  etco2Noise?: number;
  tempNoise?: number;
}

export interface WaveformRingBufferOptions {
  retentionSeconds?: number;
}

const defaultOptions: Required<MonitorProjectionOptions> = {
  mapNoise: 2,
  sbpNoise: 3,
  dbpNoise: 2,
  hrNoise: 2,
  rrNoise: 1,
  spo2Noise: 1,
  etco2Noise: 1,
  tempNoise: 0.1,
};

export class WaveformRingBuffer {
  private readonly retentionMs: number;
  private physiologySource: EngineWaveformFrame['physiologySource'] | null = null;
  private sampleRateHz: number | null = null;
  private latestEndTimeMs = 0;
  private readonly leads = new Map<string, Array<{ timeMs: number; value: number }>>();

  constructor(options: WaveformRingBufferOptions = {}) {
    this.retentionMs = (options.retentionSeconds ?? 60) * 1000;
  }

  ingest(frame: EngineWaveformFrame): void {
    this.physiologySource = frame.physiologySource;
    this.sampleRateHz = frame.sampleRateHz;
    this.latestEndTimeMs = Math.max(this.latestEndTimeMs, frame.endTimeMs);

    for (const [lead, values] of Object.entries(frame.leads)) {
      const buffer = this.leads.get(lead) ?? [];
      const stepMs = 1000 / frame.sampleRateHz;
      for (let index = 0; index < values.length; index += 1) {
        buffer.push({
          timeMs: frame.startTimeMs + index * stepMs,
          value: values[index],
        });
      }
      this.trim(buffer);
      this.leads.set(lead, buffer);
    }
  }

  readWindow(params: {
    encounterId: string;
    leads: string[];
    seconds: number;
    startOffsetSeconds?: number;
  }): SimWaveformSamplesResponse {
    if (this.sampleRateHz == null || this.physiologySource == null) {
      throw new Error('waveform buffer is empty');
    }

    const endTimeMs = this.latestEndTimeMs - (params.startOffsetSeconds ?? 0) * 1000;
    const startTimeMs = endTimeMs - params.seconds * 1000;
    const responseLeads: Record<string, number[]> = {};

    for (const lead of params.leads) {
      const buffer = this.leads.get(lead) ?? [];
      responseLeads[lead] = buffer
        .filter(sample => sample.timeMs >= startTimeMs && sample.timeMs < endTimeMs)
        .map(sample => sample.value);
    }

    return {
      sample_rate_hz: this.sampleRateHz,
      leads: responseLeads,
      start_time: new Date(startTimeMs).toISOString(),
      end_time: new Date(endTimeMs).toISOString(),
      physiology_source: this.physiologySource,
    };
  }

  getRetentionSeconds(): number {
    return this.retentionMs / 1000;
  }

  private trim(buffer: Array<{ timeMs: number; value: number }>): void {
    const cutoff = this.latestEndTimeMs - this.retentionMs;
    while (buffer.length && buffer[0].timeMs < cutoff) {
      buffer.shift();
    }
  }
}

export function projectMonitorSnapshot(
  projection: EngineAgentProjection,
  options: MonitorProjectionOptions = {},
): SimLiveVitalsSnapshot {
  const noise = { ...defaultOptions, ...options };
  const rng = createSeededRng(seedForProjection(projection));

  return {
    hr: clampInt(withNoise(projection.vitals.hr, noise.hrNoise, rng), 20, 240),
    rr: clampInt(withNoise(projection.vitals.rr, noise.rrNoise, rng), 4, 60),
    spo2: clampInt(withNoise(projection.vitals.spo2, noise.spo2Noise, rng), 40, 100),
    etco2: clampInt(withNoise(projection.vitals.etco2, noise.etco2Noise, rng), 0, 80),
    map: clampInt(withNoise(projection.vitals.map, noise.mapNoise, rng), 20, 180),
    sbp: clampInt(withNoise(projection.vitals.sbp, noise.sbpNoise, rng), 30, 260),
    dbp: clampInt(withNoise(projection.vitals.dbp, noise.dbpNoise, rng), 10, 180),
    temp_c: roundToTenth(withNoise(projection.vitals.temp_c, noise.tempNoise, rng)),
    rhythm_label: projection.vitals.rhythmLabel,
    captured_at: new Date(projection.timeMs).toISOString(),
    scenario_minutes_elapsed: projection.timeMs / 60_000,
  };
}

function seedForProjection(projection: EngineAgentProjection): number {
  let hash = Math.trunc(projection.timeMs) || 1;
  for (const char of projection.encounterId) {
    hash = (hash * 31 + char.charCodeAt(0)) & 0x7fffffff;
  }
  return Math.max(1, hash);
}

function withNoise(value: number, amplitude: number, rng: () => number): number {
  if (amplitude === 0) {
    return value;
  }
  return value + (rng() * 2 - 1) * amplitude;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
