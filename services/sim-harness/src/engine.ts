import { SimulationClock, type ClockOptions } from "./clock.js";
import { WaveformBuffer } from "./waveform-buffer.js";
import { WaveformInterpolator } from "./waveform-interpolator.js";
import { WaveformRenderer } from "./waveform-renderer.js";
import { loadRhythmTemplate, loadAllTemplates } from "./waveforms/rhythms/schema.js";
import type { RhythmTemplate } from "./waveforms/rhythms/schema.js";
import type { Scenario, ScenarioEvent, VitalsTarget } from "./scenario.js";
import type {
  SimLiveVitalsSnapshot,
  SimEncounterView,
  SimScheduledEvent,
  SimScenarioStateDescription,
  SimWaveformSamplesResponse,
  SimWaveformImageResponse,
  PhysiologySource,
} from "./index.js";

export interface EngineOptions {
  clockOptions: ClockOptions;
  sampleRateHz?: number;
  bufferRetentionSeconds?: number;
  encounterId?: string;
}

interface VitalsState {
  hr: number;
  rr: number;
  spo2: number;
  etco2: number;
  sbp: number;
  dbp: number;
  map: number;
  temp_c: number;
}

interface VitalsTransition {
  from: VitalsState | null; // null = capture on first apply
  to: Partial<VitalsTarget>;
  startMinute: number;
  endMinute: number;
}

/**
 * SimulationEngine manages a single encounter.
 *
 * It ties together the clock, waveform buffer, interpolator, and scenario timeline
 * into a tickable simulation that produces vitals snapshots, waveform data, and
 * encounter views conforming to the sim-harness contract types.
 */
export class SimulationEngine {
  readonly encounterId: string;
  readonly scenario: Scenario;
  readonly clock: SimulationClock;
  readonly buffer: WaveformBuffer;
  readonly renderer: WaveformRenderer;

  private _interpolator: WaveformInterpolator;
  private _vitals: VitalsState;
  private _rhythmId: string;
  private _rhythmTemplates: Map<string, RhythmTemplate>;
  private _nextEventIndex = 0;
  private _firedEvents: Array<{ minute: number; label: string }> = [];
  private _activeDrugs: Array<{ name: string; dose: number; unit: string }> = [];
  private _activeInterventions: string[] = [];
  private _activeTransitions: VitalsTransition[] = [];
  private _lastTickMinute = 0;
  private _sampleRateHz: number;

  constructor(scenario: Scenario, options: EngineOptions) {
    this.scenario = scenario;
    this.encounterId = options.encounterId ?? `enc-${scenario.id}-${Date.now()}`;
    this._sampleRateHz = options.sampleRateHz ?? 250;

    this.clock = new SimulationClock(options.clockOptions);
    this.buffer = new WaveformBuffer(
      this._sampleRateHz,
      options.bufferRetentionSeconds ?? 60,
    );
    this.renderer = new WaveformRenderer();

    // Load rhythm templates
    this._rhythmTemplates = loadAllTemplates();
    this._rhythmId = scenario.starting_rhythm_id;
    const startingRhythm = this._rhythmTemplates.get(this._rhythmId);
    if (!startingRhythm) {
      throw new Error(`Unknown starting rhythm: ${this._rhythmId}`);
    }
    this._interpolator = new WaveformInterpolator(startingRhythm, this._sampleRateHz);

    // Initialize vitals from scenario
    this._vitals = { ...scenario.starting_vitals };
  }

  /** Start the simulation clock. */
  start(): void {
    this.clock.start();
  }

  /** Pause the simulation clock. */
  pause(): void {
    this.clock.pause();
  }

  /** Reset the simulation to initial state. */
  reset(): void {
    this.clock.reset();
    this.buffer.clear();
    this._vitals = { ...this.scenario.starting_vitals };
    this._rhythmId = this.scenario.starting_rhythm_id;
    const rhythm = this._rhythmTemplates.get(this._rhythmId)!;
    this._interpolator = new WaveformInterpolator(rhythm, this._sampleRateHz);
    this._nextEventIndex = 0;
    this._firedEvents = [];
    this._activeDrugs = [];
    this._activeInterventions = [];
    this._activeTransitions = [];
    this._lastTickMinute = 0;
  }

  /**
   * Advance the simulation by deltaMs.
   *
   * Processes scenario events, updates vitals transitions, generates waveform samples.
   * In frozen mode, you must call this explicitly. In wall-clock/accelerated mode,
   * call it from your tick loop.
   */
  tick(deltaMs: number): void {
    this.clock.tick(deltaMs);
    const currentMinute = this.clock.elapsedMinutes;

    // 1. Fire due scenario events
    this._processEvents(currentMinute);

    // 2. Apply vitals transitions (smooth interpolation)
    this._applyTransitions(currentMinute);

    // 3. Generate waveform samples for the delta
    const samples = this._interpolator.generate(this._vitals.hr, deltaMs);
    for (const [lead, data] of Object.entries(samples)) {
      this.buffer.push(lead, data);
    }

    this._lastTickMinute = currentMinute;
  }

  /** Get current vital signs snapshot. */
  getVitals(): SimLiveVitalsSnapshot {
    return {
      hr: Math.round(this._vitals.hr),
      rr: Math.round(this._vitals.rr),
      spo2: Math.round(this._vitals.spo2 * 10) / 10,
      etco2: Math.round(this._vitals.etco2),
      map: Math.round(this._vitals.map),
      sbp: Math.round(this._vitals.sbp),
      dbp: Math.round(this._vitals.dbp),
      temp_c: Math.round(this._vitals.temp_c * 10) / 10,
      rhythm_label: this._rhythmTemplates.get(this._rhythmId)?.rhythm_label ?? this._rhythmId,
      captured_at: new Date().toISOString(),
      scenario_minutes_elapsed: Math.round(this.clock.elapsedMinutes * 100) / 100,
    };
  }

  /** Get the full encounter view. */
  getEncounterView(): SimEncounterView {
    const visibleUpcoming = this.scenario.timeline
      .filter(
        (e, i) =>
          i >= this._nextEventIndex && e.visible_to_agent === true,
      )
      .map((e) => ({ minute: e.minute, event: e.label }));

    return {
      encounter_id: this.encounterId,
      scenario_id: this.scenario.id,
      scenario_name: this.scenario.name,
      scenario_minutes_elapsed: Math.round(this.clock.elapsedMinutes * 100) / 100,
      physiology_source: "infirmary-integrated-template" as PhysiologySource,
      active_drugs: [...this._activeDrugs],
      active_interventions: [...this._activeInterventions],
      upcoming_scheduled_events_visible_to_agent:
        visibleUpcoming.length > 0 ? visibleUpcoming : null,
    };
  }

  /** Get a human-readable scenario state description. */
  getScenarioState(): SimScenarioStateDescription {
    const lines: string[] = [
      `## ${this.scenario.name}`,
      "",
      this.scenario.description,
      "",
      `**Elapsed:** ${this.clock.elapsedMinutes.toFixed(1)} minutes`,
      `**Rhythm:** ${this._rhythmTemplates.get(this._rhythmId)?.rhythm_label ?? this._rhythmId}`,
      "",
      "### Event History",
    ];

    for (const e of this._firedEvents) {
      lines.push(`- **t=${e.minute.toFixed(1)}min:** ${e.label}`);
    }

    if (this._firedEvents.length === 0) {
      lines.push("- *(no events fired yet)*");
    }

    return {
      summary_markdown: lines.join("\n"),
      event_history: this._firedEvents.map((e) => ({
        minute: e.minute,
        event: e.label,
      })),
    };
  }

  /** Get waveform samples from buffer. */
  getWaveformSamples(
    leads: string[],
    seconds: number,
    offsetSeconds = 0,
  ): SimWaveformSamplesResponse {
    const leadsData = this.buffer.readMulti(leads, seconds, offsetSeconds);
    return {
      sample_rate_hz: this._sampleRateHz,
      leads: leadsData,
      start_time: new Date(
        Date.now() - (seconds + offsetSeconds) * 1000,
      ).toISOString(),
      end_time: new Date(Date.now() - offsetSeconds * 1000).toISOString(),
      physiology_source: "infirmary-integrated-template" as PhysiologySource,
    };
  }

  /** Render waveform strip image. */
  getWaveformImage(
    leads: string[],
    seconds: number,
    offsetSeconds = 0,
  ): SimWaveformImageResponse {
    const samplesData = this.buffer.readMulti(leads, seconds, offsetSeconds);
    return this.renderer.renderToResponse(samplesData, this._sampleRateHz);
  }

  /** Get current rhythm label. */
  get rhythmId(): string {
    return this._rhythmId;
  }

  /** Get raw vitals state (for testing). */
  get vitalsState(): Readonly<VitalsState> {
    return this._vitals;
  }

  // --- Internal ---

  private _processEvents(currentMinute: number): void {
    while (this._nextEventIndex < this.scenario.timeline.length) {
      const event = this.scenario.timeline[this._nextEventIndex];
      if (event.minute > currentMinute) break;

      this._fireEvent(event, currentMinute);
      this._firedEvents.push({ minute: event.minute, label: event.label });
      this._nextEventIndex++;
    }
  }

  private _fireEvent(event: ScenarioEvent, _currentMinute: number): void {
    const action = event.action;

    switch (action.type) {
      case "set_vitals": {
        if (event.transition_minutes && event.transition_minutes > 0) {
          // Smooth transition — from is lazily captured on first apply
          this._activeTransitions.push({
            from: null,
            to: action.vitals,
            startMinute: event.minute,
            endMinute: event.minute + event.transition_minutes,
          });
        } else {
          // Instant change
          this._applyVitalsTarget(action.vitals);
        }
        break;
      }
      case "set_rhythm": {
        const template = this._rhythmTemplates.get(action.rhythm_id);
        if (template) {
          this._rhythmId = action.rhythm_id;
          this._interpolator.setRhythm(template);
        }
        break;
      }
      case "administer_medication": {
        this._activeDrugs.push({
          name: action.medication,
          dose: action.dose,
          unit: action.unit,
        });
        break;
      }
      case "apply_insult":
      case "narrative":
        // These are informational — no state change beyond event history
        break;
    }
  }

  private _applyTransitions(currentMinute: number): void {
    const completed: number[] = [];

    for (let i = 0; i < this._activeTransitions.length; i++) {
      const t = this._activeTransitions[i];
      if (currentMinute >= t.endMinute) {
        // Lazily capture from-state if not yet captured
        if (t.from === null) t.from = { ...this._vitals };
        // Transition complete — apply final values
        this._applyVitalsTarget(t.to);
        completed.push(i);
      } else if (currentMinute > t.startMinute) {
        // Lazily capture from-state on first application
        if (t.from === null) t.from = { ...this._vitals };
        // In progress — linear interpolation
        const progress =
          (currentMinute - t.startMinute) / (t.endMinute - t.startMinute);
        this._applyVitalsLerp(t.from, t.to, progress);
      }
    }

    // Remove completed transitions (reverse order to preserve indices)
    for (let i = completed.length - 1; i >= 0; i--) {
      this._activeTransitions.splice(completed[i], 1);
    }
  }

  private _applyVitalsTarget(target: Partial<VitalsTarget>): void {
    if (target.hr !== undefined) this._vitals.hr = target.hr;
    if (target.rr !== undefined) this._vitals.rr = target.rr;
    if (target.spo2 !== undefined) this._vitals.spo2 = target.spo2;
    if (target.etco2 !== undefined) this._vitals.etco2 = target.etco2;
    if (target.sbp !== undefined) this._vitals.sbp = target.sbp;
    if (target.dbp !== undefined) this._vitals.dbp = target.dbp;
    if (target.map !== undefined) this._vitals.map = target.map;
    if (target.temp_c !== undefined) this._vitals.temp_c = target.temp_c;
  }

  private _applyVitalsLerp(
    from: VitalsState,
    to: Partial<VitalsTarget>,
    progress: number,
  ): void {
    const lerp = (a: number, b: number | undefined) =>
      b !== undefined ? a + (b - a) * progress : a;

    this._vitals.hr = lerp(from.hr, to.hr);
    this._vitals.rr = lerp(from.rr, to.rr);
    this._vitals.spo2 = lerp(from.spo2, to.spo2);
    this._vitals.etco2 = lerp(from.etco2, to.etco2);
    this._vitals.sbp = lerp(from.sbp, to.sbp);
    this._vitals.dbp = lerp(from.dbp, to.dbp);
    this._vitals.map = lerp(from.map, to.map);
    this._vitals.temp_c = lerp(from.temp_c, to.temp_c);
  }
}
