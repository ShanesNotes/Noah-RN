/**
 * Simulation clock authority for Contract 3.
 *
 * Owns simulation time and emits tick / mode-change events. Consumers read
 * simulation time from here; they do not derive it from ambient wall-clock APIs.
 */
export type SimulationClockMode =
  | { kind: 'wall-clock' }
  | { kind: 'accelerated'; speed: number }
  | { kind: 'frozen' }
  | { kind: 'skip-ahead' };

export interface SimulationClockTick {
  previousTimeMs: number;
  currentTimeMs: number;
  deltaMs: number;
  mode: SimulationClockMode['kind'];
}

export interface SimulationClockModeChange {
  previousMode: SimulationClockMode;
  nextMode: SimulationClockMode;
  atTimeMs: number;
}

export interface SimulationClockScheduler {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof globalThis.setTimeout>;
  clearTimeout(handle: ReturnType<typeof globalThis.setTimeout>): void;
}

export interface SimulationClockOptions {
  startTimeMs?: number;
  tickIntervalMs?: number;
  mode?: Extract<SimulationClockMode, { kind: 'wall-clock' | 'accelerated' | 'frozen' }>;
  scheduler?: SimulationClockScheduler;
}

const defaultScheduler: SimulationClockScheduler = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: handle => globalThis.clearTimeout(handle),
};

function cloneMode(mode: SimulationClockMode): SimulationClockMode {
  return { ...mode };
}

export class SimulationClock {
  private readonly tickIntervalMs: number;
  private readonly scheduler: SimulationClockScheduler;
  private currentTimeMs: number;
  private mode: SimulationClockMode;
  private nextTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private readonly tickListeners = new Set<(tick: SimulationClockTick) => void>();
  private readonly modeListeners = new Set<(change: SimulationClockModeChange) => void>();

  constructor(options: SimulationClockOptions = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.currentTimeMs = options.startTimeMs ?? 0;
    this.mode = cloneMode(options.mode ?? { kind: 'frozen' });
    this.ensureModeIsValid(this.mode);
    this.syncTimer();
  }

  getTime(): number {
    return this.currentTimeMs;
  }

  getTickIntervalMs(): number {
    return this.tickIntervalMs;
  }

  getMode(): SimulationClockMode {
    return cloneMode(this.mode);
  }

  subscribe(listener: (tick: SimulationClockTick) => void): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  onModeChange(listener: (change: SimulationClockModeChange) => void): () => void {
    this.modeListeners.add(listener);
    return () => this.modeListeners.delete(listener);
  }

  setMode(nextMode: Extract<SimulationClockMode, { kind: 'wall-clock' | 'accelerated' | 'frozen' }>): void {
    this.ensureModeIsValid(nextMode);
    const previousMode = this.getMode();
    this.mode = cloneMode(nextMode);
    this.emitModeChange(previousMode, this.mode);
    this.syncTimer();
  }

  advanceBy(deltaMs: number): void {
    if (this.mode.kind !== 'frozen') {
      throw new Error('advanceBy is only allowed in frozen mode');
    }
    if (deltaMs < 0) {
      throw new Error('advanceBy requires a non-negative delta');
    }
    this.advanceInTicks(deltaMs, 'frozen');
  }

  advanceTo(targetTimeMs: number): void {
    if (targetTimeMs < this.currentTimeMs) {
      throw new Error(`advanceTo cannot move backward (${targetTimeMs} < ${this.currentTimeMs})`);
    }
    this.advanceBy(targetTimeMs - this.currentTimeMs);
  }

  skipAheadTo(targetTimeMs: number): void {
    if (targetTimeMs < this.currentTimeMs) {
      throw new Error(`skipAheadTo cannot move backward (${targetTimeMs} < ${this.currentTimeMs})`);
    }

    const previousMode = this.getMode();
    this.stopTimer();
    this.mode = { kind: 'skip-ahead' };
    this.emitModeChange(previousMode, this.mode);
    this.advanceInTicks(targetTimeMs - this.currentTimeMs, 'skip-ahead');
    const skipMode = this.getMode();
    this.mode = { kind: 'frozen' };
    this.emitModeChange(skipMode, this.mode);
    this.syncTimer();
  }

  dispose(): void {
    this.stopTimer();
    this.tickListeners.clear();
    this.modeListeners.clear();
  }

  private ensureModeIsValid(mode: SimulationClockMode): void {
    if (mode.kind === 'accelerated' && mode.speed <= 0) {
      throw new Error(`accelerated mode requires speed > 0 (received ${mode.speed})`);
    }
  }

  private syncTimer(): void {
    this.stopTimer();
    if (this.mode.kind === 'frozen' || this.mode.kind === 'skip-ahead') {
      return;
    }
    this.scheduleNextTick();
  }

  private stopTimer(): void {
    if (this.nextTimer != null) {
      this.scheduler.clearTimeout(this.nextTimer);
      this.nextTimer = null;
    }
  }

  private scheduleNextTick(): void {
    const delayMs = this.mode.kind === 'accelerated'
      ? this.tickIntervalMs / this.mode.speed
      : this.tickIntervalMs;

    this.nextTimer = this.scheduler.setTimeout(() => {
      this.nextTimer = null;
      const activeMode = this.mode.kind;
      this.emitTick(this.tickIntervalMs, activeMode);
      if (this.mode.kind === 'wall-clock' || this.mode.kind === 'accelerated') {
        this.scheduleNextTick();
      }
    }, delayMs);
  }

  private advanceInTicks(totalDeltaMs: number, mode: SimulationClockTick['mode']): void {
    let remaining = totalDeltaMs;
    while (remaining > 0) {
      const step = Math.min(this.tickIntervalMs, remaining);
      this.emitTick(step, mode);
      remaining -= step;
    }
  }

  private emitTick(deltaMs: number, mode: SimulationClockTick['mode']): void {
    if (deltaMs === 0) {
      return;
    }

    const previousTimeMs = this.currentTimeMs;
    this.currentTimeMs += deltaMs;

    const tick: SimulationClockTick = {
      previousTimeMs,
      currentTimeMs: this.currentTimeMs,
      deltaMs,
      mode,
    };

    for (const listener of this.tickListeners) {
      listener(tick);
    }
  }

  private emitModeChange(previousMode: SimulationClockMode, nextMode: SimulationClockMode): void {
    const change: SimulationClockModeChange = {
      previousMode: cloneMode(previousMode),
      nextMode: cloneMode(nextMode),
      atTimeMs: this.currentTimeMs,
    };

    for (const listener of this.modeListeners) {
      listener(change);
    }
  }
}
