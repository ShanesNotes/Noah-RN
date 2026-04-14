/**
 * L0 eligibility → L2 release projection for Contract 2 / Contract 6.
 *
 * L0 crossing a threshold only makes an event eligible. The scenario controller
 * remains the release authority and can hold that event until the configured
 * simulation-time release moment.
 */
export interface EligibleEvent {
  key: string;
  kind: string;
  eligibleAtMs: number;
  releaseAtMs: number;
  payload: Record<string, unknown>;
}

export interface ReleasedEvent {
  key: string;
  kind: string;
  eligibleAtMs: number;
  releasedAtMs: number;
  payload: Record<string, unknown>;
}

export class ScenarioEventReleaseBuffer {
  private readonly eligible = new Map<string, EligibleEvent>();
  private readonly released: ReleasedEvent[] = [];

  markEligible(event: EligibleEvent): void {
    const existing = this.eligible.get(event.key);
    if (existing || this.released.some(released => released.key === event.key)) {
      return;
    }
    this.eligible.set(event.key, { ...event, payload: structuredClone(event.payload) });
  }

  releaseReady(currentTimeMs: number): ReleasedEvent[] {
    const ready = [...this.eligible.values()]
      .filter(event => event.releaseAtMs <= currentTimeMs)
      .sort((a, b) => a.releaseAtMs - b.releaseAtMs);

    for (const event of ready) {
      this.eligible.delete(event.key);
      this.released.push({
        key: event.key,
        kind: event.kind,
        eligibleAtMs: event.eligibleAtMs,
        releasedAtMs: event.releaseAtMs,
        payload: structuredClone(event.payload),
      });
    }

    return ready.map(event => ({
      key: event.key,
      kind: event.kind,
      eligibleAtMs: event.eligibleAtMs,
      releasedAtMs: event.releaseAtMs,
      payload: structuredClone(event.payload),
    }));
  }

  getPending(): EligibleEvent[] {
    return [...this.eligible.values()].sort((a, b) => a.releaseAtMs - b.releaseAtMs);
  }

  getReleased(): ReleasedEvent[] {
    return this.released.map(event => ({ ...event, payload: structuredClone(event.payload) }));
  }
}
