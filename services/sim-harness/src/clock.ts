import type { SimulationClockContract } from "./index.js";

export type ClockMode = SimulationClockContract["mode"];

export interface ClockModeDescriptorBase {
  kind: ClockMode | "skip-ahead";
}

export interface ClockAcceleratedModeDescriptor extends ClockModeDescriptorBase {
  kind: "accelerated";
  speed: number;
}

export interface ClockSimpleModeDescriptor extends ClockModeDescriptorBase {
  kind: "wall-clock" | "frozen" | "skip-ahead";
}

export type ClockModeDescriptor =
  | ClockAcceleratedModeDescriptor
  | ClockSimpleModeDescriptor;

export interface ClockOptions {
  mode: ClockMode | ClockModeDescriptor;
  accelerationFactor?: number;
  tickIntervalMs?: number;
  startTimeMs?: number;
}

export interface ClockTick {
  previousTimeMs: number;
  currentTimeMs: number;
  deltaMs: number;
}

export interface ClockModeChange {
  previousMode: ClockModeDescriptor;
  nextMode: ClockModeDescriptor;
}

/**
 * Encounter-scoped simulation clock.
 *
 * This clock supports two compatibility surfaces:
 * - continuous mode: simple wall-clock/accelerated/frozen semantics used by the
 *   engine tests and runtime helpers
 * - stepped mode: quantized tick emission used by the scenario controller and
 *   replay/skip-ahead tests
 */
export class SimulationClock {
  private readonly tickIntervalMs?: number;
  private readonly steppedMode: boolean;
  private readonly subscribers = new Set<(tick: ClockTick) => void>();
  private readonly modeListeners = new Set<(change: ClockModeChange) => void>();

  private currentMode: ClockModeDescriptor;
  private elapsed = 0;
  private active = false;
  private lastWallMs: number | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(options: ClockOptions) {
    this.tickIntervalMs = options.tickIntervalMs;
    this.steppedMode = options.tickIntervalMs != null || typeof options.mode !== "string";
    this.currentMode = normalizeMode(options.mode, options.accelerationFactor);
    this.elapsed = options.startTimeMs ?? 0;

    if (this.steppedMode) {
      this.active = this.currentMode.kind !== "frozen";
      if (this.active) {
        this.startSteppedTimer();
      }
      return;
    }

    this.active = false;
  }

  get mode(): ClockMode {
    return this.currentMode.kind === "skip-ahead" ? "frozen" : this.currentMode.kind;
  }

  get running(): boolean {
    return this.active;
  }

  get elapsedMs(): number {
    if (this.steppedMode) {
      return this.elapsed;
    }
    return this.elapsed + this.pendingWallMs();
  }

  get elapsedMinutes(): number {
    return this.elapsedMs / 60_000;
  }

  start(): void {
    if (this.active) return;
    this.active = true;

    if (this.steppedMode) {
      if (this.currentMode.kind !== "frozen") {
        this.startSteppedTimer();
      }
      return;
    }

    if (this.currentMode.kind !== "frozen") {
      this.lastWallMs = Date.now();
    }
  }

  pause(): void {
    if (!this.active) return;

    if (this.steppedMode) {
      this.active = false;
      this.stopSteppedTimer();
      return;
    }

    this.elapsed += this.pendingWallMs();
    this.active = false;
    this.lastWallMs = null;
  }

  reset(): void {
    if (!this.steppedMode) {
      this.elapsed = 0;
      this.active = false;
      this.lastWallMs = null;
      return;
    }

    this.elapsed = 0;
    this.active = this.currentMode.kind !== "frozen";
    if (this.active) {
      this.startSteppedTimer();
    } else {
      this.stopSteppedTimer();
    }
  }

  tick(deltaMs: number): number {
    if (deltaMs < 0) throw new RangeError("tick deltaMs must be non-negative");

    if (this.steppedMode) {
      this.advanceBy(deltaMs);
      return deltaMs;
    }

    this.elapsed += deltaMs;
    return deltaMs;
  }

  sync(): number {
    if (this.steppedMode) {
      return 0;
    }

    const pending = this.pendingWallMs();
    this.elapsed += pending;
    if (this.active && this.currentMode.kind !== "frozen") {
      this.lastWallMs = Date.now();
    }
    return pending;
  }

  subscribe(listener: (tick: ClockTick) => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  onModeChange(listener: (change: ClockModeChange) => void): () => void {
    this.modeListeners.add(listener);
    return () => {
      this.modeListeners.delete(listener);
    };
  }

  setMode(mode: ClockMode | ClockModeDescriptor): void {
    const nextMode = normalizeMode(mode);
    const previousMode = this.currentMode;
    this.currentMode = nextMode;
    this.emitModeChange(previousMode, nextMode);

    if (this.steppedMode) {
      this.active = nextMode.kind !== "frozen";
      if (this.active) {
        this.startSteppedTimer();
      } else {
        this.stopSteppedTimer();
      }
      return;
    }

    if (nextMode.kind === "frozen") {
      this.elapsed += this.pendingWallMs();
      this.lastWallMs = null;
      return;
    }

    if (this.active) {
      this.lastWallMs = Date.now();
    }
  }

  getTime(): number {
    return this.elapsedMs;
  }

  advanceBy(deltaMs: number): void {
    if (deltaMs < 0) throw new RangeError("advanceBy deltaMs must be non-negative");
    if (deltaMs === 0) return;

    if (!this.steppedMode) {
      this.tick(deltaMs);
      return;
    }
    this.emitTick(deltaMs);
  }

  skipAheadTo(targetTimeMs: number): void {
    if (targetTimeMs < this.elapsed) {
      throw new RangeError("skipAheadTo target must be >= current time");
    }

    const previousMode = this.currentMode;
    const skipMode: ClockModeDescriptor = { kind: "skip-ahead" };
    this.currentMode = skipMode;
    this.emitModeChange(previousMode, skipMode);

    const deltaMs = targetTimeMs - this.elapsed;
    const interval = this.tickIntervalMs ?? deltaMs;
    let remaining = deltaMs;
    while (remaining > 0) {
      const step = Math.min(interval, remaining);
      this.emitTick(step);
      remaining -= step;
    }

    const frozenMode: ClockModeDescriptor = { kind: "frozen" };
    this.currentMode = frozenMode;
    this.emitModeChange(skipMode, frozenMode);
    this.active = false;
    this.stopSteppedTimer();
  }

  dispose(): void {
    this.stopSteppedTimer();
    this.subscribers.clear();
    this.modeListeners.clear();
    this.active = false;
    this.lastWallMs = null;
  }

  toContract(): SimulationClockContract {
    return {
      mode: this.mode,
      encounterScopedStateIsolation: true,
    };
  }

  private pendingWallMs(): number {
    if (
      this.steppedMode ||
      this.currentMode.kind === "frozen" ||
      !this.active ||
      this.lastWallMs === null
    ) {
      return 0;
    }

    const wallDelta = Date.now() - this.lastWallMs;
    const factor = this.currentMode.kind === "accelerated" ? this.currentMode.speed : 1;
    return wallDelta * factor;
  }

  private startSteppedTimer(): void {
    this.stopSteppedTimer();
    if (this.tickIntervalMs == null || this.currentMode.kind === "frozen") {
      return;
    }

    const wallIntervalMs =
      this.currentMode.kind === "accelerated"
        ? this.tickIntervalMs / this.currentMode.speed
        : this.tickIntervalMs;

    this.intervalHandle = setInterval(() => {
      if (!this.active) return;
      this.emitTick(this.tickIntervalMs!);
    }, wallIntervalMs);
  }

  private stopSteppedTimer(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private emitTick(deltaMs: number): void {
    const previousTimeMs = this.elapsed;
    this.elapsed += deltaMs;
    const tick: ClockTick = {
      previousTimeMs,
      currentTimeMs: this.elapsed,
      deltaMs,
    };

    for (const subscriber of this.subscribers) {
      subscriber(tick);
    }
  }

  private emitModeChange(previousMode: ClockModeDescriptor, nextMode: ClockModeDescriptor): void {
    const change: ClockModeChange = { previousMode, nextMode };
    for (const listener of this.modeListeners) {
      listener(change);
    }
  }
}

function normalizeMode(
  mode: ClockMode | ClockModeDescriptor,
  accelerationFactor?: number,
): ClockModeDescriptor {
  if (typeof mode !== "string") {
    if (mode.kind === "accelerated") {
      return { kind: "accelerated", speed: mode.speed };
    }
    return { kind: mode.kind };
  }

  if (mode === "accelerated") {
    return { kind: "accelerated", speed: accelerationFactor ?? 1 };
  }

  return { kind: mode };
}
