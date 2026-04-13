import type { TimelineEntry, TrendSummary, ObservationEntry } from './types.js';
import type { Observation } from '../fhir/types.js';
import { compactDisplayName, getLoincName } from '../fhir/loinc-map.js';

// Compute relative minutes from a reference timestamp
export function computeRelativeMinutes(timestamp: string, referenceTimestamp: string): number {
  const ref = new Date(referenceTimestamp).getTime();
  const ts = new Date(timestamp).getTime();
  return Math.round((ref - ts) / 60000); // minutes before reference
}

// Format relative minutes as human-readable string
export function formatRelativeTime(minutes: number): string {
  if (minutes <= 0) return 'T-0m';
  if (minutes < 60) return `T-${minutes}m`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `T-${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  return `T-${days}d`;
}

// Find the most recent timestamp across all entries
export function findMostRecentTimestamp(timestamps: string[]): string {
  if (!timestamps.length) return new Date().toISOString();

  let latest = timestamps[0];
  let latestMs = new Date(latest).getTime();

  for (let i = 1; i < timestamps.length; i++) {
    const ms = new Date(timestamps[i]).getTime();
    if (ms > latestMs) {
      latestMs = ms;
      latest = timestamps[i];
    }
  }

  return latest;
}

// Sort timeline entries by relativeMinutes (most recent first)
export function sortTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => a.relativeMinutes - b.relativeMinutes);
}

// Determine observation subtype from FHIR category
export function classifyObservation(obs: Observation): 'vital' | 'lab' | 'survey' | 'unknown' {
  const categories = obs.category ?? [];
  for (const cat of categories) {
    for (const coding of cat.coding ?? []) {
      const code = coding.code?.toLowerCase();
      if (code === 'vital-signs') return 'vital';
      if (code === 'laboratory') return 'lab';
      if (code === 'survey') return 'survey';
    }
  }
  return 'unknown';
}

// Compute trends for all LOINC codes with 3+ data points (ordinal position, not absolute time)
export function computeTrends(observations: ObservationEntry[]): TrendSummary[] {
  // Group by LOINC code
  const byCode = new Map<string, ObservationEntry[]>();

  for (const obs of observations) {
    const code = obs.resource.code?.coding?.[0]?.code;
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(obs);
  }

  const trends: TrendSummary[] = [];

  for (const [code, entries] of byCode) {
    // Need at least 3 data points
    if (entries.length < 3) continue;

    // Sort by relativeMinutes (most recent first)
    const sorted = entries.sort((a, b) => a.relativeMinutes - b.relativeMinutes);
    const recent3 = sorted.slice(0, 3);

    // Extract numeric values
    const values = recent3
      .map(e => ({
        value: extractNumericValue(e.resource),
        relativeTime: e.relativeTime,
      }))
      .filter((v): v is { value: number; relativeTime: string } => v.value !== null);

    if (values.length < 3) continue;

    // Determine direction from ordinal position (newest to oldest)
    // values[0] is most recent, values[2] is oldest
    const newest = values[0].value;
    const oldest = values[2].value;
    const range = Math.abs(oldest) * 0.05 || 1; // 5% threshold for "stable"
    const delta = newest - oldest;

    let direction: 'rising' | 'falling' | 'stable';
    if (delta > range) direction = 'rising';
    else if (delta < -range) direction = 'falling';
    else direction = 'stable';

    trends.push({
      loincCode: code,
      name: compactDisplayName(getLoincName(code) ?? code),
      direction,
      values,
    });
  }

  return trends;
}

function extractNumericValue(obs: Observation): number | null {
  if (obs.valueQuantity?.value != null) return obs.valueQuantity.value;

  // Blood pressure: check components
  if (obs.component?.length) {
    const systolic = obs.component.find(c =>
      c.code?.coding?.some(cd => cd.code === '8480-6'),
    );
    if (systolic?.valueQuantity?.value != null) return systolic.valueQuantity.value;
  }

  return null;
}
