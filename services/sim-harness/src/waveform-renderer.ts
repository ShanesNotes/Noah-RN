import type { SimWaveformFormat, SimWaveformImageResponse } from "./index.js";

export interface RenderOptions {
  /** Sweep speed in mm/s. Default: 25 (standard ECG). */
  sweepSpeedMmPerS?: number;
  /** Amplitude scale in mm/mV. Default: 10 (standard ECG). */
  amplitudeMmPerMv?: number;
  /** Show grid. Default: true. */
  grid?: boolean;
  /** Height per lead row in mm. Default: 25. */
  heightMmPerLead?: number;
  /** Pixels per mm for SVG rendering. Default: 4. */
  pxPerMm?: number;
}

const DEFAULTS: Required<RenderOptions> = {
  sweepSpeedMmPerS: 25,
  amplitudeMmPerMv: 10,
  grid: true,
  heightMmPerLead: 25,
  pxPerMm: 4,
};

/**
 * Renders waveform samples as an SVG strip image matching clinical ECG paper conventions.
 *
 * - 25 mm/s sweep speed (standard)
 * - 10 mm/mV amplitude (standard)
 * - Grid: 1mm minor lines, 5mm major lines (standard ECG paper)
 */
export class WaveformRenderer {
  /**
   * Render waveform samples to an SVG string.
   *
   * @param samples - Voltage samples (mV) per lead
   * @param sampleRateHz - Sample rate of the input data
   * @param opts - Rendering options
   */
  renderSvg(
    samples: Record<string, number[]>,
    sampleRateHz: number,
    opts: RenderOptions = {},
  ): string {
    const o = { ...DEFAULTS, ...opts };
    const leads = Object.keys(samples);
    if (leads.length === 0) return "<svg></svg>";

    const maxSamples = Math.max(...leads.map((l) => samples[l].length));
    const durationS = maxSamples / sampleRateHz;

    // Dimensions in mm
    const widthMm = durationS * o.sweepSpeedMmPerS;
    const totalHeightMm = leads.length * o.heightMmPerLead;

    // Convert to pixels
    const widthPx = Math.ceil(widthMm * o.pxPerMm);
    const heightPx = Math.ceil(totalHeightMm * o.pxPerMm);
    const leadHeightPx = o.heightMmPerLead * o.pxPerMm;

    const parts: string[] = [];
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`,
    );

    // Background
    parts.push(
      `<rect width="${widthPx}" height="${heightPx}" fill="#fff8f0"/>`,
    );

    // Grid
    if (o.grid) {
      parts.push(this._renderGrid(widthPx, heightPx, o.pxPerMm));
    }

    // Waveform traces
    for (let li = 0; li < leads.length; li++) {
      const lead = leads[li];
      const data = samples[lead];
      const baselineY = (li + 0.5) * leadHeightPx; // center of lead row

      // Lead label
      parts.push(
        `<text x="4" y="${baselineY - leadHeightPx * 0.35}" font-family="monospace" font-size="12" fill="#333">${lead}</text>`,
      );

      // Build polyline points
      const points: string[] = [];
      for (let i = 0; i < data.length; i++) {
        const x = (i / sampleRateHz) * o.sweepSpeedMmPerS * o.pxPerMm;
        // Voltage: positive = upward deflection
        const y = baselineY - data[i] * o.amplitudeMmPerMv * o.pxPerMm;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }

      parts.push(
        `<polyline points="${points.join(" ")}" fill="none" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/>`,
      );

      // Baseline reference (thin dashed)
      parts.push(
        `<line x1="0" y1="${baselineY}" x2="${widthPx}" y2="${baselineY}" stroke="#ccc" stroke-width="0.5" stroke-dasharray="4,4"/>`,
      );
    }

    parts.push("</svg>");
    return parts.join("\n");
  }

  /**
   * Render and return a SimWaveformImageResponse-shaped object.
   */
  renderToResponse(
    samples: Record<string, number[]>,
    sampleRateHz: number,
    opts: RenderOptions = {},
  ): SimWaveformImageResponse {
    const o = { ...DEFAULTS, ...opts };
    const svg = this.renderSvg(samples, sampleRateHz, opts);
    const imageBytes = Buffer.from(svg, "utf-8").toString("base64");

    return {
      image_bytes: imageBytes,
      format: "svg" as SimWaveformFormat,
      sweep_speed_mm_per_s: o.sweepSpeedMmPerS,
      amplitude_mm_per_mv: o.amplitudeMmPerMv,
      grid: o.grid,
      leads: Object.keys(samples),
      captured_at: new Date().toISOString(),
    };
  }

  private _renderGrid(
    widthPx: number,
    heightPx: number,
    pxPerMm: number,
  ): string {
    const lines: string[] = [];
    lines.push('<g class="grid">');

    // Minor grid: 1mm
    const minorStep = pxPerMm;
    for (let x = 0; x <= widthPx; x += minorStep) {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${heightPx}" stroke="#f0d0d0" stroke-width="0.3"/>`,
      );
    }
    for (let y = 0; y <= heightPx; y += minorStep) {
      lines.push(
        `<line x1="0" y1="${y}" x2="${widthPx}" y2="${y}" stroke="#f0d0d0" stroke-width="0.3"/>`,
      );
    }

    // Major grid: 5mm
    const majorStep = 5 * pxPerMm;
    for (let x = 0; x <= widthPx; x += majorStep) {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${heightPx}" stroke="#e0a0a0" stroke-width="0.6"/>`,
      );
    }
    for (let y = 0; y <= heightPx; y += majorStep) {
      lines.push(
        `<line x1="0" y1="${y}" x2="${widthPx}" y2="${y}" stroke="#e0a0a0" stroke-width="0.6"/>`,
      );
    }

    lines.push("</g>");
    return lines.join("\n");
  }
}
