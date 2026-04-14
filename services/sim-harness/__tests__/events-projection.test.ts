import { describe, expect, it } from 'vitest';
import { ScenarioEventReleaseBuffer } from '../src/projections/events.js';

describe('ScenarioEventReleaseBuffer', () => {
  it('requires both L0 eligibility and controller release time before emitting L2 events', () => {
    const buffer = new ScenarioEventReleaseBuffer();

    buffer.markEligible({
      key: 'lactate-1',
      kind: 'lab-result',
      eligibleAtMs: 5 * 60_000,
      releaseAtMs: 20 * 60_000,
      payload: { test: 'lactate', mmol_per_l: 4.2 },
    });

    expect(buffer.releaseReady(10 * 60_000)).toEqual([]);
    expect(buffer.getPending()).toHaveLength(1);

    const released = buffer.releaseReady(20 * 60_000);
    expect(released).toHaveLength(1);
    expect(released[0].eligibleAtMs).toBe(5 * 60_000);
    expect(released[0].releasedAtMs).toBe(20 * 60_000);
    expect(buffer.getPending()).toHaveLength(0);
  });

  it('releases simultaneous events in release-time order and only once', () => {
    const buffer = new ScenarioEventReleaseBuffer();

    buffer.markEligible({
      key: 'abg',
      kind: 'lab-result',
      eligibleAtMs: 8 * 60_000,
      releaseAtMs: 18 * 60_000,
      payload: { test: 'abg' },
    });
    buffer.markEligible({
      key: 'cxr',
      kind: 'imaging-result',
      eligibleAtMs: 4 * 60_000,
      releaseAtMs: 12 * 60_000,
      payload: { study: 'portable chest x-ray' },
    });

    const first = buffer.releaseReady(12 * 60_000);
    expect(first.map(event => event.key)).toEqual(['cxr']);

    const second = buffer.releaseReady(18 * 60_000);
    expect(second.map(event => event.key)).toEqual(['abg']);

    expect(buffer.releaseReady(60 * 60_000)).toEqual([]);
    expect(buffer.getReleased().map(event => event.key)).toEqual(['cxr', 'abg']);
  });
});
