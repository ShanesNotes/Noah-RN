// Shared cross-product trace envelope. This is the minimum v0 shape required
// by every product — Phase 7 of the three-product alignment plan expands it
// with cost, safety gates, eval scores, and full context-assembly traces.
//
// Every product (harness, ehr, sim, resources) must be able to emit traces
// conforming to this envelope so the dashboard can render cross-product
// invocations coherently.

import type { LaneCoverage } from './lane-coverage.js';

export type TraceProduct = 'harness' | 'ehr' | 'sim' | 'resources';

export interface TraceEnvelopeV0 {
  trace_id: string;
  parent_trace_id?: string;
  product: TraceProduct;
  operation: string;
  timestamp_start: string;
  timestamp_end?: string;
  lane_coverage?: LaneCoverage;
  provenance_refs?: string[];
}
