/**
 * Scenario controller.
 *
 * @layer L2 (scheduling + event release) with L0 engine invocation
 *
 * Owns scenario lifecycle: load, advance, reset. This controller routes
 * interventions through the Lane A engine-adapter boundary, advances that
 * engine on the Lane A simulation clock, and acts as the release authority
 * for authored L2 events.
 */
import { SimulationClock } from '../clock.js';
import { WaveformRingBuffer, projectMonitorSnapshot } from '../projections/monitor.js';
import { ScenarioEventReleaseBuffer } from '../projections/events.js';
import { ReferencePkEngineAdapter } from '../reference/adapter.js';
import type { SimulationEngine } from '../engine-adapter.js';
import type { ReferencePkSerializedState } from '../reference/adapter.js';
import type {
  ScenarioDefinition,
  ScenarioHistoryEntry,
  AdvanceAction,
  ScenarioReleasedEvent,
  ScenarioResponse,
} from './types.js';
import type { SimWaveformSamplesResponse } from '../index.js';
import { pressorTitration } from '../../scenarios/pressor-titration.js';
import { fluidResponsive } from '../../scenarios/fluid-responsive.js';
import { hyporesponsive } from '../../scenarios/hyporesponsive.js';

const scenarios = new Map<string, ScenarioDefinition>([
  ['pressor-titration', pressorTitration],
  ['fluid-responsive', fluidResponsive],
  ['hyporesponsive', hyporesponsive],
]);

const adapter = new ReferencePkEngineAdapter({ tickIntervalMs: 60_000 });
const liveScenarios = new Map<string, ScenarioRuntime>();
const ADVANCE_MINUTES = 5;

interface ScenarioRuntime {
  definition: ScenarioDefinition;
  clock: SimulationClock;
  engine: SimulationEngine<ReferencePkSerializedState>;
  history: ScenarioHistoryEntry[];
  eventBuffer: ScenarioEventReleaseBuffer;
  waveformBuffer: WaveformRingBuffer;
  releasedEvents: ScenarioReleasedEvent[];
  eligibleKeys: Set<string>;
}

function initRuntime(definition: ScenarioDefinition): ScenarioRuntime {
  const clock = new SimulationClock({
    startTimeMs: definition.initialState.totalMinutesElapsed * 60_000,
    tickIntervalMs: adapter.tickIntervalMs,
    mode: { kind: 'frozen' },
  });

  const engine = adapter.create({
    encounterId: definition.id,
    baselineMAP: definition.initialState.baselineMAP,
    baselineHR: definition.initialState.baselineHR,
    weightKg: definition.patientWeight,
    initialDrugs: definition.initialState.activeDrugs.map(drug => ({
      name: drug.name,
      dose: drug.currentDose,
      unit: drug.unit,
      minutesSinceLastChange: drug.minutesSinceLastChange,
    })),
  });

  for (const bolus of definition.initialState.fluidBoluses) {
    engine.applyIntervention({ kind: 'fluid-bolus', volumeMl: bolus.volumeMl });
  }

  const waveformBuffer = new WaveformRingBuffer({ retentionSeconds: 60 });
  waveformBuffer.ingest(engine.getLatestWaveformFrame());

  clock.subscribe(tick => {
    const result = engine.tick(tick);
    waveformBuffer.ingest(result.waveformFrame);
  });

  const runtime: ScenarioRuntime = {
    definition,
    clock,
    engine,
    history: [],
    eventBuffer: new ScenarioEventReleaseBuffer(),
    waveformBuffer,
    releasedEvents: [],
    eligibleKeys: new Set(),
  };

  refreshEventState(runtime);
  return runtime;
}

function getOrInitRuntime(scenarioId: string): ScenarioRuntime {
  if (liveScenarios.has(scenarioId)) {
    return liveScenarios.get(scenarioId)!;
  }

  const definition = scenarios.get(scenarioId);
  if (!definition) {
    throw new Error(`Unknown scenario: ${scenarioId}. Available: ${[...scenarios.keys()].join(', ')}`);
  }

  const runtime = initRuntime(definition);
  liveScenarios.set(scenarioId, runtime);
  return runtime;
}

function actionLabel(action: AdvanceAction): string {
  return `${action.action}${action.medication ? ` ${action.medication}` : ''}${action.new_dose != null ? ` → ${action.new_dose}` : ''}${action.volume_ml ? ` ${action.volume_ml}mL` : ''}`;
}

function buildScenarioResponse(runtime: ScenarioRuntime): ScenarioResponse {
  const projection = runtime.engine.getAgentProjection();
  const monitor = projectMonitorSnapshot(projection);
  const snapshot = runtime.engine.getEvalSnapshot();

  return {
    id: runtime.definition.id,
    name: runtime.definition.name,
    description: runtime.definition.description,
    patientWeight: runtime.definition.patientWeight,
    basePatientId: runtime.definition.basePatientId,
    currentState: {
      map: monitor.map,
      hr: monitor.hr,
      activeDrugs: snapshot.physiology.activeDrugs,
      fluidBoluses: snapshot.physiology.fluidBoluses.length,
      minutesElapsed: projection.timeMs / 60_000,
    },
    history: runtime.history,
    releasedEvents: runtime.releasedEvents,
    upcomingVisibleEvents: (runtime.definition.scheduledEvents ?? [])
      .filter(event => event.visibleToAgent && event.releaseMinute > projection.timeMs / 60_000)
      .map(event => ({ minute: event.releaseMinute, event: event.event })),
  };
}

function applyAction(runtime: ScenarioRuntime, action: AdvanceAction): void {
  switch (action.action) {
    case 'titrate': {
      if (!action.medication || action.new_dose == null) {
        throw new Error('titrate requires medication and new_dose');
      }

      const activeDrug = runtime.engine.getEvalSnapshot().physiology.activeDrugs.find(
        drug => drug.name === action.medication,
      );

      if (!activeDrug) {
        throw new Error(`Drug "${action.medication}" not active in this scenario. Active: ${runtime.engine.getEvalSnapshot().physiology.activeDrugs.map(d => d.name).join(', ')}`);
      }

      runtime.engine.applyIntervention({
        kind: 'medication',
        name: action.medication,
        dose: action.new_dose,
        unit: activeDrug.unit,
      });
      return;
    }

    case 'bolus': {
      runtime.engine.applyIntervention({
        kind: 'fluid-bolus',
        volumeMl: action.volume_ml ?? 500,
      });
      return;
    }

    case 'add_medication': {
      if (!action.medication) throw new Error('add_medication requires medication name');
      if (runtime.engine.getEvalSnapshot().physiology.activeDrugs.some(d => d.name === action.medication)) {
        throw new Error(`${action.medication} is already active — use titrate to adjust dose`);
      }

      runtime.engine.applyIntervention({
        kind: 'medication',
        name: action.medication,
        dose: action.new_dose ?? 0.01,
        unit: action.medication === 'vasopressin' ? 'units/min' : 'mcg/kg/min',
      });
    }
  }
}

function refreshEventState(runtime: ScenarioRuntime): void {
  const currentTimeMs = runtime.clock.getTime();

  for (const event of runtime.definition.scheduledEvents ?? []) {
    const eligibleAtMs = event.minute * 60_000;
    if (eligibleAtMs > currentTimeMs || runtime.eligibleKeys.has(event.key)) {
      continue;
    }

    runtime.eventBuffer.markEligible({
      key: event.key,
      kind: event.kind,
      eligibleAtMs,
      releaseAtMs: event.releaseMinute * 60_000,
      payload: event.payload ?? {},
    });
    runtime.eligibleKeys.add(event.key);
  }

  const released = runtime.eventBuffer.releaseReady(currentTimeMs);
  for (const event of released) {
    const definition = runtime.definition.scheduledEvents?.find(candidate => candidate.key === event.key);
    if (!definition) {
      continue;
    }
    runtime.releasedEvents.push({
      key: definition.key,
      minute: definition.minute,
      releaseMinute: definition.releaseMinute,
      kind: definition.kind,
      event: definition.event,
      payload: event.payload,
    });
  }
}

export async function getScenario(scenarioId: string): Promise<ScenarioResponse> {
  const runtime = getOrInitRuntime(scenarioId);
  refreshEventState(runtime);
  return buildScenarioResponse(runtime);
}

export async function advanceScenario(scenarioId: string, action: AdvanceAction): Promise<ScenarioResponse> {
  const runtime = getOrInitRuntime(scenarioId);
  const mapBefore = runtime.engine.getAgentProjection().vitals.map;

  applyAction(runtime, action);
  runtime.clock.advanceBy(ADVANCE_MINUTES * 60_000);
  refreshEventState(runtime);

  runtime.history.push({
    action: actionLabel(action),
    minutesElapsed: runtime.clock.getTime() / 60_000,
    mapBefore,
    mapAfter: runtime.engine.getAgentProjection().vitals.map,
  });

  return buildScenarioResponse(runtime);
}

export async function getScenarioWaveformSamples(
  scenarioId: string,
  params: { leads: string[]; seconds: number; startOffsetSeconds?: number },
): Promise<SimWaveformSamplesResponse> {
  const runtime = getOrInitRuntime(scenarioId);
  return runtime.waveformBuffer.readWindow({
    encounterId: runtime.definition.id,
    leads: params.leads,
    seconds: params.seconds,
    startOffsetSeconds: params.startOffsetSeconds,
  });
}

export async function resetScenario(scenarioId: string): Promise<void> {
  const runtime = liveScenarios.get(scenarioId);
  runtime?.clock.dispose();
  liveScenarios.delete(scenarioId);

  if (!scenarios.has(scenarioId)) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
}
