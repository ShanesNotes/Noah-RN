#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPT_DIR="$REPO_ROOT/optimization/product"
ANALYSIS_DIR="$OPT_DIR/analysis"
CANDIDATES_DIR="$OPT_DIR/candidates"

mkdir -p "$ANALYSIS_DIR"

python3 - <<'PY' "$CANDIDATES_DIR" "$ANALYSIS_DIR" "$REPO_ROOT/evals/product/results"
import json, os, sys
from collections import defaultdict

candidates_dir, analysis_dir, results_dir = sys.argv[1], sys.argv[2], sys.argv[3]
matrix = {}
improvement = defaultdict(list)
failure_counts = defaultdict(int)
bucket_counts = defaultdict(int)
latest_candidate = None
latest_payload = None

if os.path.isdir(candidates_dir):
    for candidate_id in sorted(os.listdir(candidates_dir)):
        scores_path = os.path.join(candidates_dir, candidate_id, "scores.json")
        if not os.path.exists(scores_path):
            continue
        try:
            with open(scores_path) as f:
                payload = json.load(f)
        except Exception:
            continue
        latest_candidate = candidate_id
        latest_payload = payload
        case_scores = payload.get("per_case_scores", [])
        matrix[candidate_id] = {entry["test_id"]: entry["status"] for entry in case_scores}
        for entry in case_scores:
            if entry["status"] != "pass":
                failure_counts[entry["test_id"]] += 1
                bucket_counts[entry.get("failure_bucket", "unknown")] += 1
            else:
                improvement[entry["test_id"]].append(candidate_id)

if (latest_payload is None or not latest_payload.get("failure_buckets")) and os.path.isdir(results_dir):
    score_files = sorted(
        name for name in os.listdir(results_dir)
        if name.startswith("scores-") and name.endswith(".json")
    )
    if score_files:
        latest_candidate = score_files[-1]
        with open(os.path.join(results_dir, score_files[-1])) as f:
            latest_payload = json.load(f)
        bucket_counts = defaultdict(int, latest_payload.get("failure_buckets", {}))

failure_lines = ["# Failure Modes", ""]
derived_branch = None
if latest_payload and latest_payload.get("failure_buckets"):
    buckets = latest_payload.get("failure_buckets", {})
    dominant = max(buckets, key=lambda key: buckets.get(key, 0))
    derived_branch = "corpus-first" if dominant == "corpus_schema_config" else "top-cluster-harness-first"
failure_lines.append(f"- latest_candidate: {latest_candidate or 'none'}")
if latest_payload:
    failure_lines.append(f"- branch_recommendation: {derived_branch or latest_payload.get('branch_recommendation', 'unknown')}")
    failure_lines.append("- failure_bucket_counts:")
    for key in ("corpus_schema_config", "skill_contract", "harness_output"):
        failure_lines.append(f"  - {key}: {latest_payload.get('failure_buckets', {}).get(key, 0)}")
failure_lines.append("")
failure_lines.append("## Top failing cases")
for test_id, count in sorted(failure_counts.items(), key=lambda item: (-item[1], item[0])):
    failure_lines.append(f"- {test_id}: failed in {count} candidate runs")

with open(os.path.join(analysis_dir, "failure-modes.md"), "w") as f:
    f.write("\n".join(failure_lines) + "\n")
with open(os.path.join(analysis_dir, "regression-matrix.json"), "w") as f:
    json.dump(matrix, f, indent=2)
with open(os.path.join(analysis_dir, "improvement-map.json"), "w") as f:
    json.dump({k: v for k, v in improvement.items()}, f, indent=2)
print(json.dumps({
    "failure_modes": len(failure_counts),
    "candidates": len(matrix),
    "bucket_counts": dict(bucket_counts),
    "branch_recommendation": derived_branch or (latest_payload or {}).get("branch_recommendation"),
}, indent=2))
PY
