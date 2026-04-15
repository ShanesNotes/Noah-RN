import type { SimulationClockContract } from "./index.js";

export type ClockMode = SimulationClockContract["mode"];

export interface ClockOptions {
  mode: ClockMode;
  /** Multiplier for accelerated mode (e.g. 10 = 10× real-time). Ignored for other modes. */
  accelerationFactor?: number;
}

/**
 * Encounter-scoped simulation clock.
 *
 * - **wall-clock**: elapsed time tracks real wall-clock time between start/pause.
 * - **accelerated**: elapsed time = wall-clock × accelerationFactor.
 * - **frozen**: time only advances via explicit `tick(deltaMs)` calls. Deterministic.
 */
export class SimulationClock {
  private _mode: ClockMode;
  private _accelerationFactor: number;
  private _elapsedMs = 0;
  private _running = false;
  private _lastWallMs: number | null = null;

  constructor(options: ClockOptions) {
    this._mode = options.mode;
    this._accelerationFactor =
      options.mode === "accelerated" ? (options.accelerationFactor ?? 1) : 1;
  }

  get mode(): ClockMode {
    return this._mode;
  }

  get running(): boolean {
    return this._running;
  }

  /** Total elapsed simulated time in milliseconds. */
  get elapsedMs(): number {
    return this._elapsedMs + this._pendingWallMs();
  }

  /** Total elapsed simulated time in minutes (convenience for scenario_minutes_elapsed). */
  get elapsedMinutes(): number {
    return this.elapsedMs / 60_000;
  }

  /** Start or resume the clock. No-op if already running. */
  start(): void {
    if (this._running) return;
    this._running = true;
    if (this._mode !== "frozen") {
      this._lastWallMs = Date.now();
    }
  }

  /** Pause the clock. Captures any pending wall-clock delta. No-op if not running. */
  pause(): void {
    if (!this._running) return;
    this._elapsedMs += this._pendingWallMs();
    this._running = false;
    this._lastWallMs = null;
  }

  /** Reset to zero elapsed time and stop. */
  reset(): void {
    this._elapsedMs = 0;
    this._running = false;
    this._lastWallMs = null;
  }

  /**
   * Advance the clock by an explicit delta. Always works in frozen mode.
   * In wall-clock / accelerated modes, this is additive on top of real-time tracking.
   */
  tick(deltaMs: number): void {
    if (deltaMs < 0) throw new RangeError("tick deltaMs must be non-negative");
    this._elapsedMs += deltaMs;
  }

  /**
   * Synchronize wall-clock modes: flushes any pending real-time delta into elapsed.
   * Call this at the top of a tick loop for wall-clock / accelerated modes.
   * No-op for frozen mode.
   */
  sync(): number {
    const pending = this._pendingWallMs();
    this._elapsedMs += pending;
    if (this._running && this._mode !== "frozen") {
      this._lastWallMs = Date.now();
    }
    return pending;
  }

  /** Returns the contract shape for this clock instance. */
  toContract(): SimulationClockContract {
    return {
      mode: this._mode,
      encounterScopedStateIsolation: true,
    };
  }

  private _pendingWallMs(): number {
    if (
      this._mode === "frozen" ||
      !this._running ||
      this._lastWallMs === null
    ) {
      return 0;
    }
    const wallDelta = Date.now() - this._lastWallMs;
    return wallDelta * this._accelerationFactor;
  }
}
