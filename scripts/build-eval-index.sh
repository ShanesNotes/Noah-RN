#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_PUBLIC="$REPO_ROOT/apps/clinician-dashboard/public"

mkdir -p "$DASHBOARD_PUBLIC/evals" "$DASHBOARD_PUBLIC/traces"

# Build eval scores index
ls "$REPO_ROOT/evals/product/results"/scores-*.json 2>/dev/null \
  | xargs -I{} basename {} \
  | sort \
  > "$DASHBOARD_PUBLIC/evals/index.txt"

# Copy score files (small JSON, safe to copy)
cp "$REPO_ROOT/evals/product/results"/scores-*.json "$DASHBOARD_PUBLIC/evals/" 2>/dev/null || true

# Build trace index with metadata
echo "[" > "$DASHBOARD_PUBLIC/traces/index.json"
first=true
for dir in "$REPO_ROOT/evals/product/traces"/*/; do
  [ -d "$dir" ] || continue
  id=$(basename "$dir")
  status="UNKNOWN"
  [ -f "$dir/hook-results.json" ] && status=$(head -1 "$dir/hook-results.json" 2>/dev/null || echo "UNKNOWN")
  skill="unknown"
  # Try timing.json first, fall back to input-context.json
  if [ -f "$dir/timing.json" ]; then
    skill=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['skill'])" "$dir/timing.json" 2>/dev/null || echo "unknown")
  fi
  if [ "$skill" = "unknown" ] && [ -f "$dir/input-context.json" ]; then
    skill=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('skill','unknown'))" "$dir/input-context.json" 2>/dev/null || echo "unknown")
  fi
  duration="null"
  [ -f "$dir/timing.json" ] && duration=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('duration_ms','null'))" "$dir/timing.json" 2>/dev/null || echo "null")
  start=""
  [ -f "$dir/timing.json" ] && start=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('start',''))" "$dir/timing.json" 2>/dev/null || echo "")
  has_output=false
  [ -f "$dir/skill-output.txt" ] && has_output=true

  if [ "$first" = true ]; then first=false; else echo "," >> "$DASHBOARD_PUBLIC/traces/index.json"; fi
  cat >> "$DASHBOARD_PUBLIC/traces/index.json" <<ENTRY
  {"id":"$id","status":"$status","skill":"$skill","duration_ms":$duration,"started_at":"$start","has_output":$has_output}
ENTRY
done
echo "]" >> "$DASHBOARD_PUBLIC/traces/index.json"

# Copy trace files for detail views
for dir in "$REPO_ROOT/evals/product/traces"/*/; do
  [ -d "$dir" ] || continue
  id=$(basename "$dir")
  mkdir -p "$DASHBOARD_PUBLIC/traces/$id"
  cp "$dir"/*.json "$DASHBOARD_PUBLIC/traces/$id/" 2>/dev/null || true
  cp "$dir"/skill-output.txt "$DASHBOARD_PUBLIC/traces/$id/" 2>/dev/null || true
done

echo "Eval index built: $(wc -l < "$DASHBOARD_PUBLIC/evals/index.txt") score files, $(python3 -c "import json; print(len(json.load(open('$DASHBOARD_PUBLIC/traces/index.json'))))" 2>/dev/null || echo '?') traces"
