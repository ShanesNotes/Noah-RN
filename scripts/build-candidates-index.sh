#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRIMARY_DIR="$REPO_ROOT/optimization/product/candidates"
FALLBACK_DIR="$REPO_ROOT/evals/product/candidates"
OUTPUT_FILE="$REPO_ROOT/optimization/product/candidates-index.json"

python3 - <<'PY' "$PRIMARY_DIR" "$FALLBACK_DIR" "$OUTPUT_FILE"
import json, os, sys

primary_dir, fallback_dir, output_file = sys.argv[1], sys.argv[2], sys.argv[3]
candidates_dir = primary_dir if os.path.isdir(primary_dir) else fallback_dir
os.makedirs(os.path.dirname(output_file), exist_ok=True)

records = []
if os.path.isdir(candidates_dir):
    for name in sorted(os.listdir(candidates_dir)):
        path = os.path.join(candidates_dir, name)
        if not os.path.isdir(path):
            continue
        scores = {}
        rationale = ""
        scores_path = os.path.join(path, "scores.json")
        rationale_path = os.path.join(path, "RATIONALE.md")
        if os.path.exists(scores_path):
            try:
                with open(scores_path) as f:
                    scores = json.load(f)
            except Exception:
                scores = {}
        if not scores:
            continue
        if os.path.exists(rationale_path):
            rationale = open(rationale_path).read()
        timestamp = __import__("datetime").datetime.fromtimestamp(
            os.path.getmtime(path),
            __import__("datetime").timezone.utc,
        ).isoformat()
        records.append({
            "id": name,
            "timestamp": timestamp,
            "scores": scores,
            "rationale_summary": rationale.splitlines()[0] if rationale else "",
            "status": "accepted" if name == "baseline" else "proposed",
            "path": os.path.relpath(path, os.path.dirname(output_file)),
        })
with open(output_file, "w") as f:
    json.dump(records, f, indent=2)
print(json.dumps(records, indent=2))
PY
