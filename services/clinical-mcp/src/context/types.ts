import type {
  Observation,
  Condition,
  MedicationRequest,
  MedicationAdministration,
  Encounter,
  DocumentReference,
  Device,
} from '../fhir/types.js';

// Discriminated union for timeline entries — the single canonical data structure
export type TimelineEntry =
  | ObservationEntry
  | ConditionEntry
  | MedicationEntry
  | MedicationAdministrationEntry
  | NoteEntry
  | EncounterEntry
  | DeviceEntry;

export interface ObservationEntry {
  type: 'observation';
  subtype: 'vital' | 'lab' | 'survey' | 'unknown';
  resource: Observation;
  timestamp: string;       // original FHIR effectiveDateTime
  relativeTime: string;    // normalized: T-0h, T-4h, T-12h, T-3d
  relativeMinutes: number; // minutes before most recent observation (for sorting)
}

export interface ConditionEntry {
  type: 'condition';
  resource: Condition;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface MedicationEntry {
  type: 'medication';
  resource: MedicationRequest;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface EncounterEntry {
  type: 'encounter';
  resource: Encounter;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface MedicationAdministrationEntry {
  type: 'medicationAdministration';
  resource: MedicationAdministration;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface NoteEntry {
  type: 'note';
  resource: DocumentReference;
  timestamp: string;
  relativeTime: string;
  relativeMinutes: number;
}

export interface DeviceEntry {
  type: 'device';
  resource: Device;
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

export interface PatientContext {
  patient: {
    id: string;
    name: string;
    dob: string;
    gender: string;
  };
  timeline: TimelineEntry[];
  trends: TrendSummary[];
  gaps: string[];
  assembledAt: string;
  sources: string[];
  tokenEstimate: number;
  budgetTruncated: boolean;
  truncatedCount: number;
}
