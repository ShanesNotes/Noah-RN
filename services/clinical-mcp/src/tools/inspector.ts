import { assemblePatientContext } from '../context/assembler.js';
import type { TimelineEntry } from '../context/types.js';

export interface ContextInspection {
  patientId: string;
  queriesExecuted: string[];
  recordCounts: Record<string, number>;
  temporalRange: { earliest: string; latest: string } | null;
  gaps: string[];
  tokenEstimate: number;
  timelineLength: number;
  trendCount: number;
}

export async function inspectContext(patientId: string): Promise<ContextInspection> {
  const ctx = await assemblePatientContext(patientId);

  // Count records by type
  const recordCounts: Record<string, number> = {};
  for (const entry of ctx.timeline) {
    const key = entry.type === 'observation' ? `observation:${entry.subtype}` : entry.type;
    recordCounts[key] = (recordCounts[key] ?? 0) + 1;
  }

  // Find temporal range
  let temporalRange: { earliest: string; latest: string } | null = null;
  if (ctx.timeline.length) {
    const sorted = [...ctx.timeline].sort((a, b) => a.relativeMinutes - b.relativeMinutes);
    temporalRange = {
      latest: sorted[0].relativeTime,
      earliest: sorted[sorted.length - 1].relativeTime,
    };
  }

  return {
    patientId,
    queriesExecuted: ctx.sources,
    recordCounts,
    temporalRange,
    gaps: ctx.gaps,
    tokenEstimate: ctx.tokenEstimate,
    timelineLength: ctx.timeline.length,
    trendCount: ctx.trends.length,
  };
}
