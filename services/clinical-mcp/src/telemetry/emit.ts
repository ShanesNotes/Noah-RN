// Product B telemetry emission.
//
// Creates cross-product TraceEnvelopeV1 records for every MCP tool call
// and every FHIR draft write. Emission is backed by an injectable sink
// so tests can capture envelopes without hitting disk; the default sink
// writes to the evals/ trace directory (via the shared tools/trace/
// shell surface) in a future wiring pass.
//
// Phase 7 scope: define the emission shape and provide the hook. Wiring
// into every tool call is a small follow-up.

import { randomUUID } from 'node:crypto';
import type {
  TraceEnvelopeV1,
  TraceProduct,
  TraceSafetyGate,
  TraceTokenSpend,
} from '@noah-rn/contracts/trace-envelope';
import type { LaneCoverage } from '@noah-rn/contracts/lane-coverage';

export type TraceSink = (envelope: TraceEnvelopeV1) => void | Promise<void>;

const captures: TraceEnvelopeV1[] = [];

function defaultSink(envelope: TraceEnvelopeV1): void {
  // v1: buffer in-memory for later retrieval. A durable sink lands in
  // Phase 7b once the trace-directory emission path is unified with the
  // existing tools/trace/trace.sh harness surface.
  captures.push(envelope);
}

let currentSink: TraceSink = defaultSink;

export function setTraceSink(sink: TraceSink): void {
  currentSink = sink;
}

export function resetTraceSink(): void {
  currentSink = defaultSink;
  captures.length = 0;
}

export function getCapturedEnvelopes(): ReadonlyArray<TraceEnvelopeV1> {
  return [...captures];
}

export interface BuildMcpToolTraceInput {
  tool: string;
  parent_trace_id?: string;
  operation?: string;
  inputs_digest?: string;
  outputs_digest?: string;
  lane_coverage?: LaneCoverage;
  provenance_refs?: string[];
  safety_gates?: TraceSafetyGate[];
  token_spend?: TraceTokenSpend;
  phi_risk?: TraceEnvelopeV1['phi_risk'];
  timestamp_start?: string;
  timestamp_end?: string;
  latency_ms?: number;
}

export function buildMcpToolTrace(input: BuildMcpToolTraceInput): TraceEnvelopeV1 {
  const start = input.timestamp_start ?? new Date().toISOString();
  const envelope: TraceEnvelopeV1 = {
    trace_id: randomUUID(),
    parent_trace_id: input.parent_trace_id,
    product: 'ehr' satisfies TraceProduct,
    operation: input.operation ?? `mcp-tool:${input.tool}`,
    tool: input.tool,
    timestamp_start: start,
    timestamp_end: input.timestamp_end,
    inputs_digest: input.inputs_digest,
    outputs_digest: input.outputs_digest,
    lane_coverage: input.lane_coverage,
    provenance_refs: input.provenance_refs,
    safety_gates: input.safety_gates,
    token_spend: input.token_spend,
    phi_risk: input.phi_risk ?? 'limited',
    ...(typeof input.latency_ms === 'number'
      ? { latency: { total_ms: input.latency_ms } }
      : {}),
  };
  return envelope;
}

export async function emitTrace(envelope: TraceEnvelopeV1): Promise<void> {
  await currentSink(envelope);
}
