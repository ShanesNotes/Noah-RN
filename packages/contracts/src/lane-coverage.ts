// Canonical lane vocabulary used by every product and by the context-bundle /
// renderer / observability contracts. Extensions are permitted but must be
// namespaced (e.g. `ext:telemetry/smart-pump`) and are not part of v1.0.0.

export const LANE_VOCABULARY = [
  'ehr/chart',
  'memory',
  'clinical-resources',
  'patient-monitor/simulation',
] as const;

export type LaneName = (typeof LANE_VOCABULARY)[number];

export type LaneCoverageState = 'present' | 'partial' | 'missing' | 'not-assembled';

export type LaneCoverage = Partial<Record<LaneName, LaneCoverageState>>;

export function isKnownLane(value: string): value is LaneName {
  return (LANE_VOCABULARY as readonly string[]).includes(value);
}
