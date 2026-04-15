import { describe, it, expect } from "vitest";
import { WaveformBuffer } from "../waveform-buffer.js";

describe("WaveformBuffer", () => {
  it("stores and reads back samples", () => {
    const buf = new WaveformBuffer(250, 60);
    buf.push("II", [1, 2, 3, 4, 5]);
    const out = buf.read("II", 1); // 1 second = 250 samples, but only 5 available
    expect(out).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns empty array for unknown lead", () => {
    const buf = new WaveformBuffer(250, 60);
    expect(buf.read("II", 1)).toEqual([]);
  });

  it("lists active leads", () => {
    const buf = new WaveformBuffer(250, 60);
    buf.push("II", [1]);
    buf.push("V1", [2]);
    expect(buf.leads().sort()).toEqual(["II", "V1"]);
  });

  it("respects retention limit (evicts old samples)", () => {
    // Small buffer: 10 Hz, 2 second retention = 20 sample capacity
    const buf = new WaveformBuffer(10, 2);
    // Push 30 samples (exceeds 20 capacity)
    const data = Array.from({ length: 30 }, (_, i) => i);
    buf.push("II", data);

    expect(buf.available("II")).toBe(20);
    const out = buf.read("II", 2);
    // Should have the last 20 samples: [10..29]
    expect(out).toEqual(Array.from({ length: 20 }, (_, i) => i + 10));
  });

  it("handles offset reads correctly", () => {
    const buf = new WaveformBuffer(10, 10);
    // Push 50 samples: [0..49]
    buf.push("II", Array.from({ length: 50 }, (_, i) => i));
    // Available: 50 (under 100 capacity)
    // Read 1 second (10 samples) offset by 1 second (10 samples back from end)
    const out = buf.read("II", 1, 1);
    // Last 10 samples are [40..49], offset 1s back means [30..39]
    expect(out).toEqual([30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
  });

  it("readMulti returns data for multiple leads", () => {
    const buf = new WaveformBuffer(10, 10);
    buf.push("II", [1, 2, 3]);
    buf.push("V1", [4, 5, 6]);
    const multi = buf.readMulti(["II", "V1"], 1);
    expect(multi["II"]).toEqual([1, 2, 3]);
    expect(multi["V1"]).toEqual([4, 5, 6]);
  });

  it("clear removes all data", () => {
    const buf = new WaveformBuffer(10, 10);
    buf.push("II", [1, 2, 3]);
    buf.clear();
    expect(buf.leads()).toEqual([]);
    expect(buf.read("II", 1)).toEqual([]);
  });

  it("reports correct available count", () => {
    const buf = new WaveformBuffer(250, 60);
    // 250 * 60 = 15000 max
    buf.push("II", new Array(1000).fill(0.5));
    expect(buf.available("II")).toBe(1000);
    // Push to overflow
    buf.push("II", new Array(15000).fill(0.5));
    expect(buf.available("II")).toBe(15000); // capped at max
  });

  it("handles incremental pushes correctly", () => {
    const buf = new WaveformBuffer(10, 2); // 20 sample capacity
    buf.push("II", [1, 2, 3, 4, 5]);
    buf.push("II", [6, 7, 8, 9, 10]);
    const out = buf.read("II", 1); // 10 samples
    expect(out).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
