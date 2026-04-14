import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ReferencePkEngineAdapter } from '../src/reference/adapter.js';
import type { EngineTick } from '../src/engine-adapter.js';

function tickAt(currentTimeMs: number, deltaMs: number): EngineTick {
  return {
    previousTimeMs: currentTimeMs - deltaMs,
    currentTimeMs,
    deltaMs,
  };
}

describe('ReferencePkEngineAdapter', () => {
  it('accepts interventions and returns emergent vitals through the adapter boundary', () => {
    const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
    const engine = adapter.create({
      encounterId: 'encounter-1',
      baselineMAP: 52,
      baselineHR: 98,
      initialDrugs: [{ name: 'norepinephrine', dose: 0.08, unit: 'mcg/kg/min' }],
    });

    engine.tick(tickAt(60_000, 60_000));
    const before = engine.getAgentProjection();

    engine.applyIntervention({ kind: 'medication', name: 'norepinephrine', dose: 0.16, unit: 'mcg/kg/min' });
    engine.tick(tickAt(120_000, 60_000));
    engine.tick(tickAt(180_000, 60_000));
    const afterPressor = engine.getAgentProjection();

    engine.applyIntervention({ kind: 'fluid-bolus', volumeMl: 500 });
    engine.tick(tickAt(240_000, 60_000));
    const afterBolus = engine.getAgentProjection();

    expect(afterPressor.vitals.map).toBeGreaterThan(before.vitals.map);
    expect(afterBolus.vitals.map).toBeGreaterThanOrEqual(afterPressor.vitals.map - 4);
    expect(afterBolus.activeInterventions.map(drug => drug.name)).toContain('norepinephrine');
  });

  it('accepts insults and reflects them in emergent vitals until they expire', () => {
    const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
    const engine = adapter.create({
      encounterId: 'encounter-2',
      baselineMAP: 65,
      baselineHR: 88,
    });

    engine.tick(tickAt(60_000, 60_000));
    const baseline = engine.getAgentProjection();

    engine.applyInsult({ kind: 'hemodynamic-shift', name: 'hemorrhage', mapDelta: -20, hrDelta: 12, durationMs: 120_000 });
    engine.tick(tickAt(120_000, 60_000));
    const duringInsult = engine.getAgentProjection();

    engine.tick(tickAt(180_000, 60_000));
    engine.tick(tickAt(240_000, 60_000));
    const afterExpiry = engine.getAgentProjection();

    expect(duringInsult.vitals.map).toBeLessThan(baseline.vitals.map);
    expect(duringInsult.vitals.hr).toBeGreaterThanOrEqual(baseline.vitals.hr);
    expect(afterExpiry.vitals.map).toBeGreaterThan(duringInsult.vitals.map);
    expect(afterExpiry.activeInsults).toHaveLength(0);
  });

  it('keeps L0 internals out of the agent-facing projection while preserving them for eval snapshots', () => {
    const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
    const engine = adapter.create({
      encounterId: 'encounter-3',
      baselineMAP: 52,
      baselineHR: 98,
      initialDrugs: [{ name: 'norepinephrine', dose: 0.08, unit: 'mcg/kg/min' }],
    });

    engine.tick(tickAt(60_000, 60_000));

    const agentProjection = engine.getAgentProjection() as unknown as Record<string, unknown>;
    const evalSnapshot = engine.getEvalSnapshot() as unknown as Record<string, unknown>;

    expect(agentProjection).not.toHaveProperty('physiology');
    expect(agentProjection).not.toHaveProperty('baselineMAP');
    expect(agentProjection).not.toHaveProperty('previousNoise');
    expect(evalSnapshot).toHaveProperty('physiology');
    expect(evalSnapshot).toHaveProperty('baselineMAP');
  });

  it('emits waveform frames from the engine boundary rather than synthesizing them at the agent surface', () => {
    const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
    const engine = adapter.create({
      encounterId: 'encounter-waveform',
      baselineMAP: 65,
      baselineHR: 88,
    });

    const result = engine.tick(tickAt(60_000, 60_000));

    expect(result.waveformFrame.sampleRateHz).toBe(125);
    expect(result.waveformFrame.startTimeMs).toBe(0);
    expect(result.waveformFrame.endTimeMs).toBe(60_000);
    expect(Object.keys(result.waveformFrame.leads)).toEqual(
      expect.arrayContaining(['II', 'pleth', 'art', 'etco2']),
    );
    expect(result.waveformFrame.leads.II.length).toBeGreaterThan(100);

    const latest = engine.getLatestWaveformFrame();
    expect(latest.sampleRateHz).toBe(result.waveformFrame.sampleRateHz);
    expect(latest.startTimeMs).toBe(result.waveformFrame.startTimeMs);
    expect(latest.endTimeMs).toBe(result.waveformFrame.endTimeMs);
    expect(latest.leads.II.length).toBe(result.waveformFrame.leads.II.length);
  });

  it('keeps simulation-relevant wall-clock reads confined to the clock module', () => {
    const files = [
      resolve(import.meta.dirname, '../src/engine-adapter.ts'),
      resolve(import.meta.dirname, '../src/reference/adapter.ts'),
      resolve(import.meta.dirname, '../src/reference/pharmacokinetics.ts'),
      resolve(import.meta.dirname, '../src/scenario/controller.ts'),
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/\bDate\.now\s*\(/);
      expect(source).not.toMatch(/\bperformance\.now\s*\(/);
    }
  });
});
