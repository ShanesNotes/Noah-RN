import { describe, it, expect } from 'vitest';
import {
  hillEquation,
  onsetDelay,
  fluidBolusResponse,
  ar1Noise,
  baroReflexHR,
  createSeededRng,
} from '../src/reference/pharmacokinetics.js';

describe('hillEquation', () => {
  it('returns 0 for dose 0', () => {
    expect(hillEquation(0, 35, 0.08, 2)).toBe(0);
  });

  it('returns ~50% Emax at ED50', () => {
    const result = hillEquation(0.08, 35, 0.08, 2);
    expect(result).toBeCloseTo(17.5, 0);
  });

  it('approaches Emax at high doses', () => {
    const result = hillEquation(1.0, 35, 0.08, 2);
    expect(result).toBeGreaterThan(34);
  });

  it('shows sigmoid behavior: diminishing returns at high doses', () => {
    const lowDelta = hillEquation(0.08, 35, 0.08, 2) - hillEquation(0.04, 35, 0.08, 2);
    const highDelta = hillEquation(0.30, 35, 0.08, 2) - hillEquation(0.26, 35, 0.08, 2);
    expect(lowDelta).toBeGreaterThan(highDelta);
  });
});

describe('onsetDelay', () => {
  it('returns 0 at time 0', () => {
    expect(onsetDelay(20, 0, 4)).toBe(0);
  });

  it('reaches ~63% at one time constant', () => {
    const result = onsetDelay(20, 4, 4);
    expect(result).toBeCloseTo(20 * 0.632, 0);
  });

  it('approaches target at large times', () => {
    const result = onsetDelay(20, 60, 4);
    expect(result).toBeCloseTo(20, 0);
  });
});

describe('fluidBolusResponse', () => {
  it('returns peak at time 0', () => {
    expect(fluidBolusResponse(12, 0, 30)).toBe(12);
  });

  it('returns ~50% at half-life', () => {
    const result = fluidBolusResponse(12, 30, 30);
    expect(result).toBeCloseTo(6, 0);
  });

  it('approaches 0 at large times', () => {
    const result = fluidBolusResponse(12, 300, 30);
    expect(result).toBeLessThan(0.1);
  });
});

describe('ar1Noise', () => {
  it('produces bounded noise', () => {
    const rng = createSeededRng(42);
    let noise = 0;
    for (let i = 0; i < 100; i++) {
      noise = ar1Noise(noise, rng);
      expect(Math.abs(noise)).toBeLessThanOrEqual(8);
    }
  });

  it('produces consistent values with same seed', () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const n1 = ar1Noise(0, rng1);
    const n2 = ar1Noise(0, rng2);
    expect(n1).toBe(n2);
  });
});

describe('baroReflexHR', () => {
  it('increases HR when MAP is below setpoint', () => {
    const hr = baroReflexHR(80, 50);
    expect(hr).toBeGreaterThan(80);
  });

  it('decreases HR when MAP is above setpoint', () => {
    const hr = baroReflexHR(80, 90);
    expect(hr).toBeLessThan(80);
  });

  it('clamps to physiologic range', () => {
    const hrLow = baroReflexHR(45, 200);
    expect(hrLow).toBeGreaterThanOrEqual(40);
    const hrHigh = baroReflexHR(155, 20);
    expect(hrHigh).toBeLessThanOrEqual(160);
  });
});
