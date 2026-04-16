#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CASES_DIR="$REPO_ROOT/tests/clinical/cases"
OUTPUT_FILE="$REPO_ROOT/evals/product/golden-suite-index.json"

python3 - <<'PY' "$CASES_DIR" "$OUTPUT_FILE" "$REPO_ROOT/evals/product/results" "$REPO_ROOT/optimization/product/analysis/regression-matrix.json"
import glob, json, os, sys, yaml
from collections import defaultdict

cases_dir, output_file, results_dir, matrix_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
cases = []
latest_scores = {}
if os.path.isdir(results_dir):
    score_files = sorted(glob.glob(os.path.join(results_dir, "scores-*.json")))
    if score_files:
        with open(score_files[-1]) as f:
            payload = json.load(f)
        latest_scores = {item.get("case_id") or item.get("test_id"): item for item in payload.get("per_case_scores", [])}

matrix = {}
if os.path.exists(matrix_path):
    with open(matrix_path) as f:
        matrix = json.load(f)

for path in sorted(glob.glob(os.path.join(cases_dir, "*.yaml"))):
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    skill = data.get("skill", "unknown")
    severity = data.get("severity", "unknown")
    test_id = data.get("test_id")
    latest = latest_scores.get(test_id, {})
    history = []
    for candidate_id, candidate_cases in matrix.items():
        if test_id in candidate_cases:
            history.append({
                "candidate_id": candidate_id,
                "result": candidate_cases[test_id],
            })
    cases.append({
        "test_id": test_id,
        "skill": skill,
        "severity": severity,
        "safety_veto": bool(data.get("safety_veto", False)),
        "description": data.get("description"),
        "user_query": data.get("user_query") or data.get("input", {}).get("user_query"),
        "clinical_context": data.get("input", {}).get("clinical_context") or data.get("clinical_context"),
        "scoring_rubric": data.get("expected", {}).get("scoring_rubric") or {},
        "expected_confidence_tier": data.get("expected", {}).get("expected_confidence_tier"),
        "expected_routing": data.get("expected", {}).get("expected_routing") or {},
        "latest_result": latest.get("status"),
        "latest_score": latest.get("weighted_score"),
        "confidence_tier": latest.get("expected_confidence_tier"),
        "history": history,
    })
with open(output_file, "w") as f:
    json.dump(cases, f, indent=2)
print(json.dumps(cases, indent=2))
PY
