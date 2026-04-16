// Shared cross-product trace envelope v1.0.0.
//
// Every product — Product A (harness), Product B (nursing EHR), Product C
// (clinical simulation), and subordinate lanes (clinical-resources,
// memory, observability) — emits traces conforming to this shape so the
// dashboard can render cross-product invocations coherently.
//
// Product-specific trace schemas (e.g. packages/agent-harness/src/telemetry-schema.ts)
// MAY add product-specific fields. Those fields MUST be additive and MUST
// not conflict with the shared fields defined here.
//
// Cross-product call chains are reconstructed via `parent_trace_id` — for
// example, a harness invocation of five-rights-verification emits one
// trace with `product: 'harness'`, then the Product B MCP tool calls
// (get_patient_context, get_medication_list, lookup_drug, queue_draft_task)
// emit child traces with `parent_trace_id` set to the harness trace.

import type { LaneCoverage } from './lane-coverage.js';

export type TraceProduct = 'harness' | 'ehr' | 'sim' | 'resources';

export type PhiRisk = 'none' | 'de-identified' | 'limited';

export interface TraceTokenSpend {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  context_ratio?: number;
  categories?: Record<string, number>;
}

export interface TraceLatency {
  total_ms: number;
  stages?: Record<string, number>;
}

export interface TraceSafetyGate {
  gate_name: string;
  result: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface TraceEnvelopeV1 {
  // ----- Identity + lineage -----
  trace_id: string;
  parent_trace_id?: string;
  product: TraceProduct;
  operation: string;

  // ----- Timing -----
  timestamp_start: string;
  timestamp_end?: string;
  latency?: TraceLatency;

  // ----- Content references (full payloads land in companion trace bodies, not here) -----
  inputs_digest?: string;
  outputs_digest?: string;

  // ----- Cross-product concepts -----
  lane_coverage?: LaneCoverage;
  provenance_refs?: string[];

  // ----- Operational health -----
  safety_gates?: TraceSafetyGate[];
  token_spend?: TraceTokenSpend;
  phi_risk?: PhiRisk;

  // ----- Optional product-specific identifiers -----
  workflow?: string;
  tool?: string;
  scenario?: string;
  resource?: string;
}

// Back-compat: the minimal v0 shape from Phase 3 is still a valid subset.
export type TraceEnvelopeV0 = Pick<
  TraceEnvelopeV1,
  | 'trace_id'
  | 'parent_trace_id'
  | 'product'
  | 'operation'
  | 'timestamp_start'
  | 'timestamp_end'
  | 'lane_coverage'
  | 'provenance_refs'
>;

// Default alias for callers that want the current envelope without the
// version suffix.
export type TraceEnvelope = TraceEnvelopeV1;
