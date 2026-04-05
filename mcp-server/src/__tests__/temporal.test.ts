import { describe, it, expect } from 'vitest';
import {
  computeRelativeMinutes, formatRelativeTime, findMostRecentTimestamp,
  sortTimeline, classifyObservation, computeTrends,
} from '../context/temporal.js';
import type { ObservationEntry } from '../context/types.js';
import type { Observation } from '../fhir/types.js';

describe('computeRelativeMinutes', () => {
  it('returns 0 for same timestamp', () => {
    const ts = '2187-01-01T12:00:00Z';
    expect(computeRelativeMinutes(ts, ts)).toBe(0);
  });

  it('returns positive minutes for older timestamps', () => {
    const ref = '2187-01-01T12:00:00Z';
    const older = '2187-01-01T08:00:00Z';
    expect(computeRelativeMinutes(older, ref)).toBe(240); // 4 hours
  });
});

describe('formatRelativeTime', () => {
  it('formats minutes', () => {
    expect(formatRelativeTime(30)).toBe('T-30m');
  });

  it('formats hours (floor)', () => {
    expect(formatRelativeTime(120)).toBe('T-2h');
    expect(formatRelativeTime(89)).toBe('T-1h');  // floor: 89/60 = 1.48 -> 1
    expect(formatRelativeTime(90)).toBe('T-1h');  // floor: 90/60 = 1.5 -> 1
  });

  it('formats days (floor)', () => {
    expect(formatRelativeTime(2880)).toBe('T-2d');
    expect(formatRelativeTime(1500)).toBe('T-1d');  // floor: 1500/1440 = 1.04 -> 1
  });

  it('formats zero', () => {
    expect(formatRelativeTime(0)).toBe('T-0m');
  });
});

describe('findMostRecentTimestamp', () => {
  it('finds the latest timestamp', () => {
    const timestamps = [
      '2187-01-01T08:00:00Z',
      '2187-01-01T12:00:00Z',
      '2187-01-01T10:00:00Z',
    ];
    expect(findMostRecentTimestamp(timestamps)).toBe('2187-01-01T12:00:00Z');
  });

  it('returns current time for empty array', () => {
    const result = findMostRecentTimestamp([]);
    expect(result).toBeDefined();
  });
});

describe('sortTimeline', () => {
  it('sorts by relativeMinutes ascending (most recent first)', () => {
    const entries = [
      { relativeMinutes: 60 },
      { relativeMinutes: 0 },
      { relativeMinutes: 30 },
    ] as any[];
    const sorted = sortTimeline(entries);
    expect(sorted[0].relativeMinutes).toBe(0);
    expect(sorted[2].relativeMinutes).toBe(60);
  });
});

describe('classifyObservation', () => {
  it('classifies vital-signs', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      code: { coding: [{ code: '8867-4' }] },
      category: [{ coding: [{ code: 'vital-signs' }] }],
    };
    expect(classifyObservation(obs)).toBe('vital');
  });

  it('classifies laboratory', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      code: { coding: [{ code: '2160-0' }] },
      category: [{ coding: [{ code: 'laboratory' }] }],
    };
    expect(classifyObservation(obs)).toBe('lab');
  });

  it('returns unknown for uncategorized', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      code: { coding: [{ code: 'xyz' }] },
    };
    expect(classifyObservation(obs)).toBe('unknown');
  });
});

describe('computeTrends', () => {
  function makeObs(code: string, value: number, relMin: number): ObservationEntry {
    return {
      type: 'observation',
      subtype: 'lab',
      resource: {
        resourceType: 'Observation',
        code: { coding: [{ code }] },
        valueQuantity: { value },
      },
      timestamp: '',
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    };
  }

  it('detects rising trend', () => {
    const obs = [
      makeObs('2160-0', 2.1, 0),   // newest: 2.1
      makeObs('2160-0', 1.8, 60),
      makeObs('2160-0', 1.5, 120),  // oldest: 1.5
    ];
    const trends = computeTrends(obs);
    expect(trends).toHaveLength(1);
    expect(trends[0].direction).toBe('rising');
  });

  it('detects falling trend', () => {
    const obs = [
      makeObs('2160-0', 1.0, 0),
      makeObs('2160-0', 1.5, 60),
      makeObs('2160-0', 2.0, 120),
    ];
    const trends = computeTrends(obs);
    expect(trends[0].direction).toBe('falling');
  });

  it('detects stable trend', () => {
    const obs = [
      makeObs('2160-0', 1.5, 0),
      makeObs('2160-0', 1.5, 60),
      makeObs('2160-0', 1.5, 120),
    ];
    const trends = computeTrends(obs);
    expect(trends[0].direction).toBe('stable');
  });

  it('requires 3+ data points', () => {
    const obs = [
      makeObs('2160-0', 1.5, 0),
      makeObs('2160-0', 1.8, 60),
    ];
    const trends = computeTrends(obs);
    expect(trends).toHaveLength(0);
  });
});
