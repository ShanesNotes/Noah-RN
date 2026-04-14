import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulationClock } from '../src/clock.js';
import { ReferencePkEngineAdapter } from '../src/reference/adapter.js';

function createSeed() {
  return {
    encounterId: 'encounter-1',
    baselineMAP: 52,
    baselineHR: 98,
    initialDrugs: [{ name: 'norepinephrine', dose: 0.08, unit: 'mcg/kg/min' }],
  } as const;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('SimulationClock', () => {
  it('advances in wall-clock mode at 1:1 tick cadence', async () => {
    vi.useFakeTimers();

    const clock = new SimulationClock({ tickIntervalMs: 100, mode: { kind: 'wall-clock' } });
    await vi.advanceTimersByTimeAsync(350);

    expect(clock.getTime()).toBe(300);
    clock.dispose();
  });

  it('advances faster in accelerated mode and can switch to frozen without losing state', async () => {
    vi.useFakeTimers();

    const clock = new SimulationClock({ tickIntervalMs: 100, mode: { kind: 'accelerated', speed: 4 } });
    await vi.advanceTimersByTimeAsync(125);

    expect(clock.getTime()).toBe(500);

    clock.setMode({ kind: 'frozen' });
    const frozenAt = clock.getTime();
    await vi.advanceTimersByTimeAsync(500);

    expect(clock.getTime()).toBe(frozenAt);

    clock.advanceBy(250);
    expect(clock.getTime()).toBe(frozenAt + 250);
    clock.dispose();
  });

  it('emits mode-change notifications including skip-ahead transitions', () => {
    const clock = new SimulationClock({ tickIntervalMs: 100, mode: { kind: 'frozen' } });
    const changes: string[] = [];

    clock.onModeChange(change => {
      changes.push(`${change.previousMode.kind}->${change.nextMode.kind}`);
    });

    clock.setMode({ kind: 'wall-clock' });
    clock.setMode({ kind: 'frozen' });
    clock.skipAheadTo(500);

    expect(changes).toEqual([
      'frozen->wall-clock',
      'wall-clock->frozen',
      'frozen->skip-ahead',
      'skip-ahead->frozen',
    ]);
    clock.dispose();
  });

  it('skip-ahead produces the same final engine state as ticking wall-clock to the same target time', async () => {
    vi.useFakeTimers();

    const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 1000 });

    const wallClock = new SimulationClock({ tickIntervalMs: 1000, mode: { kind: 'wall-clock' } });
    const wallEngine = adapter.create(createSeed());
    wallClock.subscribe(tick => {
      wallEngine.tick(tick);
    });

    const skipClock = new SimulationClock({ tickIntervalMs: 1000, mode: { kind: 'frozen' } });
    const skipEngine = adapter.create(createSeed());
    skipClock.subscribe(tick => {
      skipEngine.tick(tick);
    });

    await vi.advanceTimersByTimeAsync(10_000);
    skipClock.skipAheadTo(10_000);

    expect(wallClock.getTime()).toBe(10_000);
    expect(skipClock.getTime()).toBe(10_000);
    expect(skipEngine.getEvalSnapshot()).toEqual(wallEngine.getEvalSnapshot());

    wallClock.dispose();
    skipClock.dispose();
  });
});
