// Product A (Noah RN Agent Harness) trace schema.
// Extends the cross-product envelope from @noah-rn/contracts/trace-envelope
// with harness-specific fields (skill, routing decision, eval scores).
//
// Every harness invocation SHOULD emit both a TraceEnvelope (harness
// schema) and a cross-product TraceEnvelopeV1 for the dashboard to render
// cross-product call chains. The two shapes are structurally compatible —
// the harness envelope is a superset of the v1 envelope's required fields.

import type { TraceTokenSpend, TraceLatency } from '@noah-rn/contracts/trace-envelope';

export type { TraceEnvelopeV1, TraceProduct, PhiRisk, TraceSafetyGate } from '@noah-rn/contracts/trace-envelope';

export interface TraceEnvelope {
  trace_id: string;
  parent_trace_id?: string; // cross-product lineage (v1 envelope alignment)
  skill: string;
  candidate_id?: string;
  timestamp: string;
  tags: {
    phi_risk: "none" | "de-identified" | "limited";
    token_spend: TokenSpend;
    latency: LatencyBreakdown;
    clinical_safety: SafetyOutcome;
    user_action: string | null;
    downstream_system: string | null;
  };
  context_assembly: ContextAssemblyTrace;
  routing_decision: RoutingDecisionTrace;
  safety_gates: SafetyGateTrace[];
  eval_scores?: EvalScoreTrace;
}

// Harness-local aliases for the cross-product shapes from @noah-rn/contracts.
// Kept as interfaces rather than type aliases so existing code that widens
// them (e.g. adding required fields) continues to work.
export interface TokenSpend extends TraceTokenSpend {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  context_ratio: number;
  categories: Record<string, number>;
}

export interface LatencyBreakdown extends TraceLatency {
  total_ms: number;
  stages: Record<string, number>;
}

export interface ContextAssemblyTrace {
  patient_bundle_tokens: number;
  knowledge_assets_selected: string[];
  compression_strategy: string;
  gap_markers: string[];
  fhir_queries_fired: number;
}

export interface RoutingDecisionTrace {
  input_classification: string;
  candidates_considered: string[];
  selected_workflow: string;
  confidence: number;
  rationale: string;
}

export interface SafetyGateTrace {
  gate_name: string;
  result: "pass" | "fail" | "warn";
  detail: string;
}

export interface EvalScoreTrace {
  golden_case_id?: string;
  clinical_correctness: number;
  completeness: number;
  safety_veto: boolean;
  confidence_calibration: number;
  format_compliance: number;
  provenance_accuracy: number;
  omission_detection: number;
  weighted_score: number;
}

export interface SafetyOutcome {
  status: "pass" | "warn" | "fail";
  veto_triggered: boolean;
  warnings: string[];
}
