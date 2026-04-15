import { describe, it, expect } from "vitest";
import { WaveformInterpolator } from "../waveform-interpolator.js";
import { loadRhythmTemplate } from "../waveforms/rhythms/schema.js";

describe("WaveformInterpolator", () => {
  const nsr = loadRhythmTemplate("nsr.json");
  const vtach = loadRhythmTemplate("vtach.json");

  it("generates correct sample count for 1 second", () => {
    const interp = new WaveformInterpolator(nsr, 250);
    const result = interp.generate(72, 1000);
    expect(result["II"].length).toBe(250);
    expect(result["V1"].length).toBe(250);
  });

  it("generates correct sample count for 10 seconds", () => {
    const interp = new WaveformInterpolator(nsr, 250);
    const result = interp.generate(72, 10_000);
    expect(result["II"].length).toBe(2500);
  });

  it("produces more cycles at higher HR", () => {
    const interp = new WaveformInterpolator(nsr, 250);

    // At 60 bpm: 1 cycle per second, R-R = 1000ms
    const slow = interp.generate(60, 2000);
    // At 120 bpm: 2 cycles per second, R-R = 500ms
    const fast = interp.generate(120, 2000);

    // Count peaks (samples above 0.8 mV in Lead II — R wave threshold)
    const countPeaks = (data: number[], threshold: number) => {
      let peaks = 0;
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          peaks++;
        }
      }
      return peaks;
    };

    const slowPeaks = countPeaks(slow["II"], 0.8);
    const fastPeaks = countPeaks(fast["II"], 0.8);
    // 120 bpm should have roughly 2× the peaks of 60 bpm
    expect(fastPeaks).toBeGreaterThan(slowPeaks);
    expect(fastPeaks).toBeGreaterThanOrEqual(slowPeaks * 1.5);
  });

  it("generates VTach with expected characteristics", () => {
    const interp = new WaveformInterpolator(vtach, 250);
    const result = interp.generate(180, 1000);
    expect(result["II"].length).toBe(250);

    // VTach should have high amplitude (>1.5 mV peak)
    const maxAmplitude = Math.max(...result["II"].map(Math.abs));
    expect(maxAmplitude).toBeGreaterThan(1.5);
  });

  it("can switch rhythms mid-stream", () => {
    const interp = new WaveformInterpolator(nsr, 250);
    const beforeSwitch = interp.generate(72, 1000);

    interp.setRhythm(vtach);
    const afterSwitch = interp.generate(180, 1000);

    // VTach should have higher peak amplitude than NSR
    const nsrMax = Math.max(...beforeSwitch["II"].map(Math.abs));
    const vtachMax = Math.max(...afterSwitch["II"].map(Math.abs));
    expect(vtachMax).toBeGreaterThan(nsrMax);
  });

  it("returns empty object for zero duration", () => {
    const interp = new WaveformInterpolator(nsr);
    expect(interp.generate(72, 0)).toEqual({});
  });

  it("throws for invalid HR", () => {
    const interp = new WaveformInterpolator(nsr);
    expect(() => interp.generate(0, 1000)).toThrow(RangeError);
    expect(() => interp.generate(-1, 1000)).toThrow(RangeError);
  });

  it("generateWithCycleCount reports correct cycle count", () => {
    const interp = new WaveformInterpolator(nsr, 250);
    // 72 bpm = 1.2 bps, in 5 seconds = 6 complete cycles
    const { samples, completeCycles } = interp.generateWithCycleCount(72, 5000);
    expect(completeCycles).toBe(6);
    expect(samples["II"].length).toBe(1250);
  });
});
