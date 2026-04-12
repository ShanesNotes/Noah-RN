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

