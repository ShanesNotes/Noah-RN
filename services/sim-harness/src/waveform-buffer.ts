/**
 * Per-encounter, per-lead ring buffer for waveform samples.
 *
 * Contract requirement: retain at least the last 60 seconds of samples per active lead.
 */
export class WaveformBuffer {
  readonly sampleRateHz: number;
  readonly retentionSeconds: number;
  private readonly _maxSamples: number;
  private readonly _buffers = new Map<string, Float64Array>();
  /** Write head position per lead (next index to write to). */
  private readonly _heads = new Map<string, number>();
  /** Total samples written per lead (may exceed _maxSamples — used for read math). */
  private readonly _totals = new Map<string, number>();

  constructor(sampleRateHz = 250, retentionSeconds = 60) {
    this.sampleRateHz = sampleRateHz;
    this.retentionSeconds = retentionSeconds;
    this._maxSamples = sampleRateHz * retentionSeconds;
  }

  /** Append samples for a lead. Oldest samples are evicted when the buffer is full. */
  push(lead: string, samples: number[]): void {
    if (!this._buffers.has(lead)) {
      this._buffers.set(lead, new Float64Array(this._maxSamples));
      this._heads.set(lead, 0);
      this._totals.set(lead, 0);
    }
    const buf = this._buffers.get(lead)!;
    let head = this._heads.get(lead)!;
    const total = this._totals.get(lead)!;

    for (const sample of samples) {
      buf[head % this._maxSamples] = sample;
      head++;
    }
    this._heads.set(lead, head % this._maxSamples);
    this._totals.set(lead, total + samples.length);
  }

  /**
   * Read samples for a lead over a time window.
   *
   * @param lead - Lead identifier (e.g. "II", "V1")
   * @param seconds - Duration to read (capped at available data)
   * @param offsetSeconds - Offset from the most recent sample (0 = most recent window)
   * @returns Array of voltage samples, or empty array if lead has no data
   */
  read(lead: string, seconds: number, offsetSeconds = 0): number[] {
    const total = this._totals.get(lead);
    if (total === undefined || total === 0) return [];

    const requestedSamples = Math.round(seconds * this.sampleRateHz);
    const offsetSamples = Math.round(offsetSeconds * this.sampleRateHz);
    const available = Math.min(total, this._maxSamples);

    // Can't read beyond what's available
    if (offsetSamples >= available) return [];
    const count = Math.min(requestedSamples, available - offsetSamples);

    const buf = this._buffers.get(lead)!;
    const head = this._heads.get(lead)!;

    // The most recent sample is at head - 1 (mod _maxSamples).
    // With offset, the end of our read window is (offset) samples back from head.
    // The start is (offset + count) samples back from head.
    const result = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      const idx =
        (head - available + (available - offsetSamples - count) + i + this._maxSamples * 2) %
        this._maxSamples;
      result[i] = buf[idx];
    }
    return result;
  }

  /** Read samples for multiple leads at once (matches SimWaveformSamplesResponse.leads shape). */
  readMulti(
    leads: string[],
    seconds: number,
    offsetSeconds = 0,
  ): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const lead of leads) {
      result[lead] = this.read(lead, seconds, offsetSeconds);
    }
    return result;
  }

  /** List all leads that have data. */
  leads(): string[] {
    return [...this._buffers.keys()];
  }

  /** Total samples available for a lead (capped at retention). */
  available(lead: string): number {
    const total = this._totals.get(lead);
    if (total === undefined) return 0;
    return Math.min(total, this._maxSamples);
  }

  /** Clear all data. */
  clear(): void {
    this._buffers.clear();
    this._heads.clear();
    this._totals.clear();
  }
}
