// Shared renderer-input shape between Product A's renderer and Product B's
// worker. The worker builds this input from assembled context + lane
// coverage; the harness renderer consumes it and produces markdown.

export interface ShiftReportRendererInput<TCandidate = unknown, TContext = unknown> {
  candidate: TCandidate;
  patientId: string;
  context: TContext;
  laneCoverage?: Record<string, string>;
}
