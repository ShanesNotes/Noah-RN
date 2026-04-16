/**
 * Scenario definition and response types.
 *
 * @layer L2 (scenario controller) with L0 initial state
 *
 * These types describe the scenario-director surface (Contract 6). A
 * ScenarioDefinition is authored data; a ScenarioResponse is the
 * controller-produced snapshot exposed to callers.
 */
import type { ActiveDrug, PhysiologyState } from '../reference/pharmacokinetics.js';

export type ScenarioArtifactPhase = 'pre-shift' | 'in-shift';
export type ScenarioAuthoredBy =
  | 'historical-seed'
  | 'device-auto'
  | 'nurse'
  | 'provider'
  | 'noah'
  | 'scenario-director';
export type ScenarioChartState = 'seeded-final' | 'withheld' | 'preliminary' | 'final';
export type ScenarioObligationPriority = 'high' | 'medium' | 'low';
export type ScenarioObligationStatus = 'scheduled' | 'active' | 'overdue' | 'resolved';

export interface ScenarioScheduledEvent {
  key: string;
  minute: number;
  releaseMinute: number;
  kind: string;
  event: string;
  visibleToAgent?: boolean;
  payload?: Record<string, unknown>;
  sourcePhase?: ScenarioArtifactPhase;
  authoredBy?: ScenarioAuthoredBy;
  chartState?: ScenarioChartState;
  releaseChannel?: 'monitor' | 'chart' | 'task';
  preliminary?: boolean;
}

export interface ScenarioObligationDefinition {
  key: string;
  label: string;
  startMinute: number;
  dueMinute: number;
  priority: ScenarioObligationPriority;
  ownedBy: 'nurse' | 'provider' | 'noah';
  resolveByActions?: AdvanceAction['action'][];
  triggeredByEventKey?: string;
}

export interface ScenarioAuthorityArtifact {
  key: string;
  event: string;
  minute: number;
  releaseMinute: number;
  sourcePhase: ScenarioArtifactPhase;
  authoredBy: ScenarioAuthoredBy;
  chartState: ScenarioChartState;
  preliminary: boolean;
}

export interface ScenarioObligation {
  key: string;
  label: string;
  priority: ScenarioObligationPriority;
  ownedBy: 'nurse' | 'provider' | 'noah';
  status: ScenarioObligationStatus;
  startMinute: number;
  dueMinute: number;
  triggeredByEventKey?: string;
  resolvedAtMinute?: number;
  resolvedByAction?: string;
}

export interface ScenarioAuthoritySnapshot {
  scenarioId: string;
  currentMinute: number;
  preShiftSeededArtifacts: ScenarioAuthorityArtifact[];
  withheldInShiftArtifacts: ScenarioAuthorityArtifact[];
  releasedArtifacts: ScenarioAuthorityArtifact[];
  obligations: ScenarioObligation[];
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  basePatientId: string;
  patientWeight: number;
  initialState: Omit<PhysiologyState, 'rng'>;
  scheduledEvents?: ScenarioScheduledEvent[];
  obligations?: ScenarioObligationDefinition[];
}

export interface ScenarioHistoryEntry {
  action: string;
  minutesElapsed: number;
  mapBefore: number;
  mapAfter: number;
}

export interface ScenarioReleasedEvent {
  key: string;
  minute: number;
  releaseMinute: number;
  kind: string;
  event: string;
  payload: Record<string, unknown>;
  sourcePhase: ScenarioArtifactPhase;
  authoredBy: ScenarioAuthoredBy;
  chartState: ScenarioChartState;
  preliminary: boolean;
}

export interface AdvanceAction {
  action: 'titrate' | 'bolus' | 'add_medication';
  medication?: string;
  new_dose?: number;
  volume_ml?: number;
}

export interface ScenarioResponse {
  id: string;
  name: string;
  description: string;
  patientWeight: number;
  basePatientId: string;
  currentState: {
    map: number;
    hr: number;
    activeDrugs: ActiveDrug[];
    fluidBoluses: number;
    minutesElapsed: number;
  };
  history: ScenarioHistoryEntry[];
  releasedEvents: ScenarioReleasedEvent[];
  upcomingVisibleEvents: Array<{ minute: number; event: string }>;
}
