export interface TraceEnvelope {
  trace_id: string;
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

export interface TokenSpend {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  context_ratio: number;
  categories: Record<string, number>;
}

export interface LatencyBreakdown {
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
