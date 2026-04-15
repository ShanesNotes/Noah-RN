import { describe, it, expect } from "vitest";
import { SimulationClock } from "../clock.js";
import { WaveformBuffer } from "../waveform-buffer.js";
import { WaveformInterpolator } from "../waveform-interpolator.js";
import { WaveformRenderer } from "../waveform-renderer.js";
import { loadRhythmTemplate } from "../waveforms/rhythms/schema.js";

describe("Integration: clock → interpolator → buffer → renderer", () => {
  const nsr = loadRhythmTemplate("nsr.json");
  const vtach = loadRhythmTemplate("vtach.json");
  const RATE = 250;

  it("full pipeline produces valid SVG strip from 10 seconds of NSR", () => {
    // 1. Clock in frozen mode
    const clock = new SimulationClock({ mode: "frozen" });

    // 2. Interpolator with NSR at 72 bpm
    const interp = new WaveformInterpolator(nsr, RATE);

    // 3. Buffer
    const buffer = new WaveformBuffer(RATE, 60);

    // 4. Tick clock 10 seconds
    const durationMs = 10_000;
    clock.tick(durationMs);
    expect(clock.elapsedMs).toBe(durationMs);

    // 5. Generate samples
    const samples = interp.generate(72, durationMs);

    // 6. Push into buffer
    for (const [lead, data] of Object.entries(samples)) {
      buffer.push(lead, data);
    }

    // 7. Read back
    const readBack = buffer.readMulti(["II", "V1"], 10);
    expect(readBack["II"].length).toBe(2500); // 10s × 250 Hz
    expect(readBack["V1"].length).toBe(2500);

    // 8. Render
    const renderer = new WaveformRenderer();
    const svg = renderer.renderSvg(readBack, RATE);

    // 9. Validate
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain(">II<");
    expect(svg).toContain(">V1<");
    expect(svg).toContain("<polyline");

    // Width: 10s × 25mm/s × 4px/mm = 1000px
    expect(svg).toContain('width="1000"');
  });

  it("rhythm switch: NSR → VTach mid-stream", () => {
    const clock = new SimulationClock({ mode: "frozen" });
    const interp = new WaveformInterpolator(nsr, RATE);
    const buffer = new WaveformBuffer(RATE, 60);

    // 5 seconds of NSR
    clock.tick(5000);
    const nsrSamples = interp.generate(72, 5000);
    for (const [lead, data] of Object.entries(nsrSamples)) {
      buffer.push(lead, data);
    }

    // Switch to VTach
    interp.setRhythm(vtach);

    // 5 seconds of VTach
    clock.tick(5000);
    const vtachSamples = interp.generate(180, 5000);
    for (const [lead, data] of Object.entries(vtachSamples)) {
      buffer.push(lead, data);
    }

    expect(clock.elapsedMs).toBe(10_000);

    // Read the full 10 seconds
    const full = buffer.readMulti(["II", "V1"], 10);
    expect(full["II"].length).toBe(2500);

    // First half (NSR) should have lower peak amplitude than second half (VTach)
    const firstHalf = full["II"].slice(0, 1250);
    const secondHalf = full["II"].slice(1250);
    const nsrPeak = Math.max(...firstHalf.map(Math.abs));
    const vtachPeak = Math.max(...secondHalf.map(Math.abs));
    expect(vtachPeak).toBeGreaterThan(nsrPeak);

    // Render the combined strip
    const renderer = new WaveformRenderer();
    const svg = renderer.renderSvg(full, RATE);
    expect(svg).toContain("<svg");
  });

  it("buffer eviction: 70 seconds retains only last 60", () => {
    const buffer = new WaveformBuffer(RATE, 60);
    const interp = new WaveformInterpolator(nsr, RATE);

    // Generate 70 seconds of data
    const samples = interp.generate(72, 70_000);
    for (const [lead, data] of Object.entries(samples)) {
      buffer.push(lead, data);
    }

    // Buffer should cap at 60 seconds = 15000 samples
    expect(buffer.available("II")).toBe(15_000);

    // Reading 60 seconds should return exactly 15000 samples
    const read = buffer.read("II", 60);
    expect(read.length).toBe(15_000);

    // Reading 70 seconds should still return only 60 seconds
    const readMore = buffer.read("II", 70);
    expect(readMore.length).toBe(15_000);
  });

  it("renderToResponse produces contract-shaped output", () => {
    const interp = new WaveformInterpolator(nsr, RATE);
    const samples = interp.generate(72, 5000);
    const renderer = new WaveformRenderer();
    const response = renderer.renderToResponse(samples, RATE);

    expect(response.format).toBe("svg");
    expect(response.sweep_speed_mm_per_s).toBe(25);
    expect(response.amplitude_mm_per_mv).toBe(10);
    expect(response.grid).toBe(true);
    expect(response.leads).toContain("II");
    expect(response.leads).toContain("V1");
    expect(typeof response.image_bytes).toBe("string");
    expect(response.image_bytes.length).toBeGreaterThan(0);
  });
});
