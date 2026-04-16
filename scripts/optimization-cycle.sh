#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPT_DIR="$REPO_ROOT/optimization/product"
CANDIDATES_DIR="$OPT_DIR/candidates"
ANALYSIS_DIR="$OPT_DIR/analysis"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    *) shift ;;
  esac
done

mkdir -p "$CANDIDATES_DIR" "$ANALYSIS_DIR"

candidate_id="baseline"
if [[ -d "$CANDIDATES_DIR/$candidate_id" ]]; then
  candidate_id="candidate-$(date -u +%Y%m%dT%H%M%SZ)"
fi
candidate_dir="$CANDIDATES_DIR/$candidate_id"
mkdir -p "$candidate_dir"

cp -R "$REPO_ROOT/packages/agent-harness" "$candidate_dir/skills" 2>/dev/null || true
printf 'Initial state\n' > "$candidate_dir/RATIONALE.md"

eval_args=(--mode dynamic)
if [[ "$DRY_RUN" == "true" ]]; then
  eval_args+=(--dry-run)
fi

previous_scores="$(find "$REPO_ROOT/evals/product/results" -maxdepth 1 -type f -name 'scores-*.json' | sort | tail -1)"
eval_ok=false
if bash "$REPO_ROOT/evals/product/eval-harness.sh" "${eval_args[@]}"; then
  eval_ok=true
fi
latest_scores="$(find "$REPO_ROOT/evals/product/results" -maxdepth 1 -type f -name 'scores-*.json' | sort | tail -1)"

if [[ -n "$latest_scores" && -f "$latest_scores" && ( "$eval_ok" == "true" || "$latest_scores" != "$previous_scores" ) ]]; then
  cp "$latest_scores" "$candidate_dir/scores.json"
else
  printf '{"status":"eval_failed","copied_scores":false}\n' > "$candidate_dir/scores.json"
fi

bash "$REPO_ROOT/scripts/analyze-failures.sh" >/dev/null || true

python3 - <<'PY' "$candidate_id" "$candidate_dir/scores.json" "$OPT_DIR/analysis/failure-modes.md"
import json, os, sys
candidate_id, scores_path, failure_modes_path = sys.argv[1], sys.argv[2], sys.argv[3]
scores = {}
if os.path.exists(scores_path):
    with open(scores_path) as f:
        scores = json.load(f)
failure_modes = []
if os.path.exists(failure_modes_path):
    failure_modes = [line.strip() for line in open(failure_modes_path) if line.startswith("- ")]
print(json.dumps({
    "candidate_id": candidate_id,
    "weighted_score": scores.get("weighted_score"),
    "health": scores.get("health"),
    "top_failure_modes": failure_modes[:3],
}, indent=2))
PY
