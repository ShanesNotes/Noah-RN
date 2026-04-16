// Product C telemetry emission.
//
// Creates cross-product TraceEnvelopeV1 records for scenario advances,
// alarm fires, and device-stream writes. Mirrors the emission surface in
// services/clinical-mcp/src/telemetry/emit.ts so both products follow
// the same shape.
//
// Phase 7 scope: define the emission shape and provide the hook. Full
// wiring into controller.ts and device-bridge.ts lands alongside Phase 8
// sim-MCP work.

import { randomUUID } from 'node:crypto';
import type {
  TraceEnvelopeV1,
  TraceProduct,
  TraceSafetyGate,
} from '@noah-rn/contracts/trace-envelope';
import type { LaneCoverage } from '@noah-rn/contracts/lane-coverage';

export type TraceSink = (envelope: TraceEnvelopeV1) => void | Promise<void>;

const captures: TraceEnvelopeV1[] = [];

function defaultSink(envelope: TraceEnvelopeV1): void {
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

export interface BuildSimTraceInput {
  operation: string;
  parent_trace_id?: string;
  scenario?: string;
  inputs_digest?: string;
  outputs_digest?: string;
  lane_coverage?: LaneCoverage;
  provenance_refs?: string[];
  safety_gates?: TraceSafetyGate[];
  timestamp_start?: string;
  timestamp_end?: string;
  latency_ms?: number;
}

export function buildSimTrace(input: BuildSimTraceInput): TraceEnvelopeV1 {
  const start = input.timestamp_start ?? new Date().toISOString();
  const envelope: TraceEnvelopeV1 = {
    trace_id: randomUUID(),
    parent_trace_id: input.parent_trace_id,
    product: 'sim' satisfies TraceProduct,
    operation: input.operation,
    scenario: input.scenario,
    timestamp_start: start,
    timestamp_end: input.timestamp_end,
    inputs_digest: input.inputs_digest,
    outputs_digest: input.outputs_digest,
    lane_coverage: input.lane_coverage,
    provenance_refs: input.provenance_refs,
    safety_gates: input.safety_gates,
    phi_risk: 'de-identified',
    ...(typeof input.latency_ms === 'number'
      ? { latency: { total_ms: input.latency_ms } }
      : {}),
  };
  return envelope;
}

export async function emitTrace(envelope: TraceEnvelopeV1): Promise<void> {
  await currentSink(envelope);
}
