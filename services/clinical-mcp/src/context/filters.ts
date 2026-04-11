import type { TimelineEntry, ObservationEntry, ConditionEntry, MedicationEntry, EncounterEntry } from './types.js';

// On-demand utility functions for skills that need type-specific queries.
// These filter the timeline — they do NOT pre-materialize category arrays.

export function filterObservations(timeline: TimelineEntry[], subtype?: 'vital' | 'lab' | 'survey'): ObservationEntry[] {
  return timeline.filter((e): e is ObservationEntry => {
    if (e.type !== 'observation') return false;
    if (subtype && e.subtype !== subtype) return false;
    return true;
  });
}

export function filterConditions(timeline: TimelineEntry[]): ConditionEntry[] {
  return timeline.filter((e): e is ConditionEntry => e.type === 'condition');
}

export function filterMedications(timeline: TimelineEntry[]): MedicationEntry[] {
  return timeline.filter((e): e is MedicationEntry => e.type === 'medication');
}

export function filterEncounters(timeline: TimelineEntry[]): EncounterEntry[] {
  return timeline.filter((e): e is EncounterEntry => e.type === 'encounter');
}

// Filter by LOINC code (for specific lab/vital lookups)
export function filterByLoinc(timeline: TimelineEntry[], loincCode: string): ObservationEntry[] {
  return timeline.filter((e): e is ObservationEntry => {
    if (e.type !== 'observation') return false;
    return e.resource.code?.coding?.some(c => c.code === loincCode) ?? false;
  });
}
