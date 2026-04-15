import { describe, it, expect } from "vitest";
import { WaveformRenderer } from "../waveform-renderer.js";
import { WaveformInterpolator } from "../waveform-interpolator.js";
import { loadRhythmTemplate } from "../waveforms/rhythms/schema.js";

describe("WaveformRenderer", () => {
  const renderer = new WaveformRenderer();
  const nsr = loadRhythmTemplate("nsr.json");
  const vtach = loadRhythmTemplate("vtach.json");

  function generateSamples(templateId: string, hrBpm: number, durationMs: number) {
    const template = templateId === "nsr" ? nsr : vtach;
    const interp = new WaveformInterpolator(template, 250);
    return interp.generate(hrBpm, durationMs);
  }

  it("produces valid SVG", () => {
    const samples = generateSamples("nsr", 72, 5000);
    const svg = renderer.renderSvg(samples, 250);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
  });

  it("includes grid lines when grid is enabled", () => {
    const samples = generateSamples("nsr", 72, 2000);
    const svg = renderer.renderSvg(samples, 250, { grid: true });
    expect(svg).toContain('class="grid"');
  });

  it("omits grid lines when grid is disabled", () => {
    const samples = generateSamples("nsr", 72, 2000);
    const svg = renderer.renderSvg(samples, 250, { grid: false });
    expect(svg).not.toContain('class="grid"');
  });

  it("includes lead labels", () => {
    const samples = generateSamples("nsr", 72, 2000);
    const svg = renderer.renderSvg(samples, 250);
    expect(svg).toContain(">II<");
    expect(svg).toContain(">V1<");
  });

  it("has correct width for duration at 25mm/s", () => {
    const samples = generateSamples("nsr", 72, 10_000);
    const svg = renderer.renderSvg(samples, 250, { pxPerMm: 4 });
    // 10 seconds × 25 mm/s = 250mm × 4 px/mm = 1000px
    expect(svg).toContain('width="1000"');
  });

  it("scales height per lead", () => {
    const samples = generateSamples("nsr", 72, 2000);
    // 2 leads × 25mm × 4 px/mm = 200px
    const svg = renderer.renderSvg(samples, 250, {
      heightMmPerLead: 25,
      pxPerMm: 4,
    });
    expect(svg).toContain('height="200"');
  });

  it("renders VTach samples without error", () => {
    const samples = generateSamples("vtach", 180, 5000);
    const svg = renderer.renderSvg(samples, 250);
    expect(svg).toContain("<svg");
    expect(svg).toContain("<polyline");
  });

  it("renderToResponse returns correct shape", () => {
    const samples = generateSamples("nsr", 72, 3000);
    const response = renderer.renderToResponse(samples, 250);
    expect(response.format).toBe("svg");
    expect(response.sweep_speed_mm_per_s).toBe(25);
    expect(response.amplitude_mm_per_mv).toBe(10);
    expect(response.grid).toBe(true);
    expect(response.leads).toEqual(["II", "V1"]);
    expect(response.captured_at).toBeTruthy();
    // base64 encoded SVG
    const decoded = Buffer.from(response.image_bytes, "base64").toString("utf-8");
    expect(decoded).toContain("<svg");
  });

  it("handles empty samples gracefully", () => {
    const svg = renderer.renderSvg({}, 250);
    expect(svg).toBe("<svg></svg>");
  });
});
