#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$REPO_ROOT/apps/clinician-dashboard/public"

bash "$REPO_ROOT/scripts/build-eval-index.sh" >/dev/null
bash "$REPO_ROOT/scripts/build-trace-index.sh" >/dev/null
bash "$REPO_ROOT/scripts/build-golden-suite-index.sh" >/dev/null
bash "$REPO_ROOT/scripts/build-candidates-index.sh" >/dev/null

mkdir -p \
  "$PUBLIC_DIR/evals" \
  "$PUBLIC_DIR/traces" \
  "$PUBLIC_DIR/golden-suite" \
  "$PUBLIC_DIR/candidates" \
  "$PUBLIC_DIR/optimization"

cp "$REPO_ROOT/evals/product/results"/scores-*.json "$PUBLIC_DIR/evals/" 2>/dev/null || true
cp "$REPO_ROOT/evals/product/results/index.txt" "$PUBLIC_DIR/evals/index.txt" 2>/dev/null || true
cp "$REPO_ROOT/evals/product/results/index.json" "$PUBLIC_DIR/evals/index.json" 2>/dev/null || true
cp "$REPO_ROOT/evals/product/traces/index.json" "$PUBLIC_DIR/traces/index.json" 2>/dev/null || true
cp -R "$REPO_ROOT/evals/product/traces/." "$PUBLIC_DIR/traces/" 2>/dev/null || true
cp "$REPO_ROOT/evals/product/golden-suite-index.json" "$PUBLIC_DIR/golden-suite/index.json" 2>/dev/null || true
cp "$REPO_ROOT/evals/product/golden-suite-index.json" "$PUBLIC_DIR/golden-suite-index.json" 2>/dev/null || true
cp "$REPO_ROOT/optimization/product/candidates-index.json" "$PUBLIC_DIR/candidates/index.json" 2>/dev/null || true
cp "$REPO_ROOT/optimization/product/candidates-index.json" "$PUBLIC_DIR/candidates-index.json" 2>/dev/null || true
cp "$REPO_ROOT/optimization/OPTIMIZATION-LOG.md" "$PUBLIC_DIR/optimization/OPTIMIZATION-LOG.md" 2>/dev/null || true
cp "$REPO_ROOT/optimization/OPTIMIZATION-LOG.md" "$PUBLIC_DIR/optimization-log.md" 2>/dev/null || true
cp "$REPO_ROOT/optimization/product/analysis/"*.json "$PUBLIC_DIR/optimization/" 2>/dev/null || true
cp "$REPO_ROOT/optimization/product/analysis/"*.md "$PUBLIC_DIR/optimization/" 2>/dev/null || true
cp "$REPO_ROOT/optimization/product/analysis/failure-modes.md" "$PUBLIC_DIR/failure-modes.md" 2>/dev/null || true

python3 - <<'PY' "$REPO_ROOT/optimization/product/candidates-index.json" "$PUBLIC_DIR/optimization-state.json" "$REPO_ROOT/evals/product/results"
import json, os, sys
candidates_path, output_path, results_dir = sys.argv[1], sys.argv[2], sys.argv[3]
state = {
    "phase": "B",
    "cadence": "manual",
    "iterations_completed": 0,
    "convergence_trend": [],
}
if os.path.exists(candidates_path):
    with open(candidates_path) as f:
        candidates = json.load(f)
    def normalize(score):
        return score * 100 if isinstance(score, (int, float)) and score <= 1 else score or 0
    state["iterations_completed"] = len(candidates)
    state["convergence_trend"] = [
        {
            "iteration": index + 1,
            "weighted_score": normalize(candidate.get("scores", {}).get("weighted_score", candidate.get("scores", {}).get("pass_rate", 0))),
            "veto_count": candidate.get("scores", {}).get("safety_failures", 0),
        }
        for index, candidate in enumerate(candidates)
    ]
    if candidates:
        state["last_cycle"] = candidates[-1].get("timestamp")
        latest_scores = candidates[-1].get("scores", {})
        state["failure_buckets"] = latest_scores.get("failure_buckets", {})
        state["branch_recommendation"] = latest_scores.get("branch_recommendation")
if os.path.isdir(results_dir):
    score_files = sorted(
        name for name in os.listdir(results_dir)
        if name.startswith("scores-") and name.endswith(".json")
    )
    if score_files:
        with open(os.path.join(results_dir, score_files[-1])) as f:
            latest_eval = json.load(f)
        if not state.get("failure_buckets"):
            state["failure_buckets"] = latest_eval.get("failure_buckets", {})
        if state.get("failure_buckets"):
            dominant = max(state["failure_buckets"], key=lambda key: state["failure_buckets"].get(key, 0))
            state["branch_recommendation"] = "corpus-first" if dominant == "corpus_schema_config" else "top-cluster-harness-first"
        elif not state.get("branch_recommendation"):
            state["branch_recommendation"] = latest_eval.get("branch_recommendation")
with open(output_path, "w") as f:
    json.dump(state, f, indent=2)
PY

python3 - <<'PY' "$REPO_ROOT/optimization/product/candidates-index.json" "$REPO_ROOT/scripts/diff-candidates.sh" "$PUBLIC_DIR/candidate-diffs.json"
import itertools, json, os, subprocess, sys
candidates_path, diff_script, output_path = sys.argv[1], sys.argv[2], sys.argv[3]
payload = {}
if os.path.exists(candidates_path):
    with open(candidates_path) as f:
        candidates = json.load(f)
    ids = [candidate.get("id") for candidate in candidates if candidate.get("id")]
    for left, right in itertools.permutations(ids, 2):
        try:
            raw = subprocess.check_output(["bash", diff_script, left, right], text=True)
            payload[f"{left}::{right}"] = json.loads(raw)
        except Exception:
            continue
with open(output_path, "w") as f:
    json.dump(payload, f, indent=2)
PY

printf 'dashboard-data ready: %s\n' "$PUBLIC_DIR"
