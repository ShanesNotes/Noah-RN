#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$REPO_ROOT/evals/product/results"

mkdir -p "$RESULTS_DIR"

find "$RESULTS_DIR" -maxdepth 1 -type f -name 'scores-*.json' -printf '%f\n' \
  | sort \
  > "$RESULTS_DIR/index.txt"

python3 - <<'PY' "$RESULTS_DIR"
import json, os, sys
results_dir = sys.argv[1]
files = sorted(name for name in os.listdir(results_dir) if name.startswith("scores-") and name.endswith(".json"))
runs = []
for name in files:
    path = os.path.join(results_dir, name)
    try:
        with open(path) as f:
            payload = json.load(f)
    except Exception:
        continue
    runs.append({
        "filename": name,
        "timestamp": name.replace("scores-", "").replace(".json", ""),
        "health": payload.get("health", "UNKNOWN"),
        "pass_rate": payload.get("pass_rate", 0),
        "weighted_score": payload.get("weighted_score", 0),
        "veto_triggered": payload.get("veto_triggered", False),
    })

summary = {
    "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "total_runs": len(runs),
    "latest": runs[-1] if runs else None,
    "runs": runs,
}
with open(os.path.join(results_dir, "index.json"), "w") as f:
    json.dump(summary, f, indent=2)
print(json.dumps(summary, indent=2))
PY
