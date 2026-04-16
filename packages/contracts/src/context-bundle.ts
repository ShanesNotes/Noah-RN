import type { LaneCoverage } from './lane-coverage.js';

// Shape of the patient context bundle returned by clinical-MCP contract v1's
// `get_patient_context` tool. Implementations (e.g. Product B) may use a
// narrower, more specific internal type — but the cross-product boundary
// uses this shape.

export interface PatientIdentity {
  id: string;
  name: string;
  dob: string;
  gender: string;
}

export type TimelineEntryType =
  | 'observation'
  | 'condition'
  | 'medication'
  | 'medicationAdministration'
  | 'encounter'
  | 'note'
  | 'device';

export interface TimelineEntryBase {
  type: TimelineEntryType;
  resource: unknown;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface TrendSummary {
  loincCode: string;
  name: string;
  direction: 'rising' | 'falling' | 'stable';
  values: Array<{ value: number; relativeTime: string }>;
}

export interface PatientContextBundle<TTimelineEntry extends TimelineEntryBase = TimelineEntryBase> {
  patient: PatientIdentity;
  timeline: TTimelineEntry[];
  trends: TrendSummary[];
  gaps: string[];
  assembledAt: string;
  sources: string[];
  tokenEstimate: number;
  budgetTruncated: boolean;
  truncatedCount: number;
  laneCoverage?: LaneCoverage;
}
