/** Eval scores file schema (from eval-harness.sh output) */
export interface EvalScores {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  pass_rate: number;
  safety_failures: number;
  safety_veto_cases: number;
  schema_v2_cases: number;
  dynamic_skip: number;
  health: 'PASS' | 'WARNING' | 'FAIL';
  categories: Record<string, CategoryScore>;
}

export interface CategoryScore {
  total: number;
  pass: number;
  fail: number;
  safety_veto: number;
  pass_rate: number;
}

/** Parsed eval run with timestamp extracted from filename */
export interface EvalRun {
  filename: string;
  timestamp: Date;
  scores: EvalScores;
}

export interface CaseScore {
  case_id: string;
  status?: 'pass' | 'fail' | 'skip';
  score?: number;
  weighted_score?: number;
  safety_veto?: boolean;
  confidence_tier?: number;
  notes?: string[];
  failure_bucket?: FailureBucket;
}

export type FailureBucket = 'corpus_schema_config' | 'skill_contract' | 'harness_output' | 'unknown';

export type BranchRecommendation = 'corpus-first' | 'top-cluster-harness-first' | 'mixed-investigate' | 'unknown';

export interface FailureBucketCounts {
  corpus_schema_config: number;
  skill_contract: number;
  harness_output: number;
  unknown?: number;
}

export interface FailureTaxonomySummary {
  bucket_counts: FailureBucketCounts;
  branch_recommendation?: BranchRecommendation;
  dominant_bucket?: FailureBucket;
  normalized_cases?: number;
  legacy_cases?: number;
}

export interface ExtendedEvalScores extends EvalScores {
  weighted_score?: number;
  veto_triggered?: boolean;
  calibration_error?: number;
  per_case_scores?: CaseScore[];
  failure_bucket_counts?: FailureBucketCounts;
  branch_recommendation?: BranchRecommendation;
  failure_taxonomy?: FailureTaxonomySummary;
  veto_details?: Array<{
    case_id: string;
    missing_item: string;
  }>;
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
  patient_bundle_tokens?: number;
  knowledge_assets_selected?: string[];
  compression_strategy?: string;
  gap_markers?: string[];
  fhir_queries_fired?: number;
}

export interface RoutingDecisionTrace {
  input_classification?: string;
  candidates_considered?: string[];
  selected_workflow?: string;
  confidence?: number;
  rationale?: string;
}

export interface SafetyGateTrace {
  gate_name: string;
  result: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface EvalScoreTrace {
  golden_case_id?: string;
  clinical_correctness?: number;
  completeness?: number;
  safety_veto?: boolean;
  confidence_calibration?: number;
  format_compliance?: number;
  provenance_accuracy?: number;
  omission_detection?: number;
  weighted_score?: number;
}

export interface TraceEnvelopeUI {
  trace_id: string;
  skill: string;
  candidate_id?: string;
  timestamp: string;
  tags?: {
    phi_risk?: 'none' | 'de-identified' | 'limited';
    token_spend?: TokenSpend;
    latency?: LatencyBreakdown;
    clinical_safety?: {
      status?: 'pass' | 'fail' | 'warn';
      summary?: string;
    };
    user_action?: string | null;
    downstream_system?: string | null;
  };
  context_assembly?: ContextAssemblyTrace;
  routing_decision?: RoutingDecisionTrace;
  safety_gates?: SafetyGateTrace[];
  eval_scores?: EvalScoreTrace;
}

export interface TraceIndexEntry {
  id: string;
  status: string;
  skill: string;
  duration_ms: number | null;
  started_at: string;
  has_output: boolean;
  envelope?: TraceEnvelopeUI | null;
}

export interface TraceIndexManifest {
  traces: TraceIndexEntry[];
  summary?: {
    total_traces?: number;
    avg_latency_ms?: number;
    avg_token_spend?: number;
    per_skill_counts?: Record<string, number>;
    date_range?: {
      start?: string;
      end?: string;
    };
  };
}

export interface GoldenCase {
  test_id: string;
  skill: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  safety_veto: boolean;
  description: string;
  user_query: string;
  clinical_context: string;
  scoring_rubric: {
    critical_items: string[];
    important_items: string[];
    nice_to_have: string[];
  };
  latest_result?: 'pass' | 'fail' | 'skip';
  latest_score?: number;
  confidence_tier?: number;
  history?: Array<{
    candidate_id: string;
    result: 'pass' | 'fail' | 'skip';
    score?: number;
  }>;
}

export interface CandidateRecord {
  id: string;
  timestamp: string;
  scores: ExtendedEvalScores;
  rationale_summary: string;
  status: 'proposed' | 'accepted' | 'rejected';
  proposer_model?: string;
  diff_summary?: string;
  diff_files?: string[];
}

export interface OptimizationTrendPoint {
  iteration: number;
  weighted_score: number;
  veto_count: number;
}

export interface OptimizationLogEntry {
  date: string;
  candidate_id: string;
  proposer_model?: string;
  score_delta?: number;
  decision?: 'accepted' | 'rejected' | 'pending';
  notes?: string;
}

export interface OptimizationState {
  phase: 'A' | 'B' | 'C' | 'D' | 'unknown';
  last_cycle?: string;
  cadence: string;
  proposer_model?: string;
  acceptance_rate?: number;
  iterations_completed: number;
  convergence_trend: OptimizationTrendPoint[];
  log_entries?: OptimizationLogEntry[];
  failure_bucket_counts?: FailureBucketCounts;
  branch_recommendation?: BranchRecommendation;
  failure_taxonomy?: FailureTaxonomySummary;
}
