import type { RhythmTemplate } from "./waveforms/rhythms/schema.js";

/**
 * Generates a continuous sample stream from a rhythm template at a target heart rate.
 *
 * The canonical cycle in the template is stretched/compressed to match the R-R interval
 * for the requested HR, then resampled to the output sample rate via linear interpolation.
 */
export class WaveformInterpolator {
  private _template: RhythmTemplate;
  private _outputRateHz: number;

  constructor(template: RhythmTemplate, outputRateHz = 250) {
    this._template = template;
    this._outputRateHz = outputRateHz;
  }

  get template(): RhythmTemplate {
    return this._template;
  }

  get outputRateHz(): number {
    return this._outputRateHz;
  }

  /** Switch to a different rhythm template (e.g. NSR → VTach). */
  setRhythm(template: RhythmTemplate): void {
    this._template = template;
  }

  /**
   * Generate waveform samples for all leads in the template.
   *
   * @param hrBpm - Target heart rate in beats per minute
   * @param durationMs - Duration of output in milliseconds
   * @returns Voltage samples per lead
   */
  generate(hrBpm: number, durationMs: number): Record<string, number[]> {
    if (hrBpm <= 0) throw new RangeError("hrBpm must be positive");
    if (durationMs <= 0) return {};

    const totalOutputSamples = Math.round(
      (durationMs / 1000) * this._outputRateHz,
    );

    // R-R interval at target HR in seconds
    const rrSeconds = 60 / hrBpm;
    // How many output samples per cardiac cycle at target HR
    const samplesPerCycle = rrSeconds * this._outputRateHz;

    const result: Record<string, number[]> = {};

    for (const [lead, templateSamples] of Object.entries(
      this._template.leads,
    )) {
      const output = new Array<number>(totalOutputSamples);

      for (let i = 0; i < totalOutputSamples; i++) {
        // Position within the current cardiac cycle (0..1)
        const cyclePos = (i % samplesPerCycle) / samplesPerCycle;

        // Map to template sample index (fractional)
        const templateIdx = cyclePos * (templateSamples.length - 1);
        const lo = Math.floor(templateIdx);
        const hi = Math.min(lo + 1, templateSamples.length - 1);
        const frac = templateIdx - lo;

        // Linear interpolation
        output[i] = templateSamples[lo] * (1 - frac) + templateSamples[hi] * frac;
      }

      result[lead] = output;
    }

    return result;
  }

  /**
   * Generate samples and return the count of complete cardiac cycles produced.
   * Useful for verification.
   */
  generateWithCycleCount(
    hrBpm: number,
    durationMs: number,
  ): { samples: Record<string, number[]>; completeCycles: number } {
    const samples = this.generate(hrBpm, durationMs);
    const rrMs = 60_000 / hrBpm;
    const completeCycles = Math.floor(durationMs / rrMs);
    return { samples, completeCycles };
  }
}
