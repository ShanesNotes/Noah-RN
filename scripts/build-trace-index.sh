#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRACES_DIR="$REPO_ROOT/evals/product/traces"
OUTPUT_FILE="$TRACES_DIR/index.json"

mkdir -p "$TRACES_DIR"

python3 - <<'PY' "$TRACES_DIR" "$OUTPUT_FILE"
import json, os, statistics, sys
from datetime import datetime

traces_dir, output_file = sys.argv[1], sys.argv[2]
records = []

for name in sorted(os.listdir(traces_dir)):
    path = os.path.join(traces_dir, name)
    if not os.path.isdir(path):
        continue
    envelope_path = os.path.join(path, "trace-envelope.json")
    input_path = os.path.join(path, "input-context.json")
    timing_path = os.path.join(path, "timing.json")
    hook_path = os.path.join(path, "hook-results.json")
    output_path = os.path.join(path, "skill-output.txt")

    envelope = None
    if os.path.exists(envelope_path):
        try:
            with open(envelope_path) as f:
                envelope = json.load(f)
        except Exception:
            envelope = None

    if envelope is None:
        input_payload = None
        timing_payload = None
        hook_payload = None
        try:
            if os.path.exists(input_path):
                with open(input_path) as f:
                    input_payload = json.load(f)
        except Exception:
            input_payload = None
        try:
            if os.path.exists(timing_path):
                with open(timing_path) as f:
                    timing_payload = json.load(f)
        except Exception:
            timing_payload = None
        try:
            if os.path.exists(hook_path):
                with open(hook_path) as f:
                    hook_payload = json.load(f)
        except Exception:
            hook_payload = None
        envelope = {
            "trace_id": name,
            "skill": (input_payload or {}).get("skill") or (timing_payload or {}).get("skill") or "unknown",
            "timestamp": (timing_payload or {}).get("start") or (input_payload or {}).get("timestamp"),
            "tags": {
                "token_spend": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cache_read_tokens": 0,
                    "cache_write_tokens": 0,
                    "context_ratio": 0,
                    "categories": {},
                },
                "latency": {
                    "total_ms": (timing_payload or {}).get("duration_ms", 0),
                    "stages": (timing_payload or {}).get("stages", {}),
                },
                "clinical_safety": {
                    "status": "warn" if hook_payload else "pass",
                    "veto_triggered": False,
                    "warnings": [],
                },
            },
            "context_assembly": {
                "patient_bundle_tokens": 0,
                "knowledge_assets_selected": [],
                "compression_strategy": "legacy",
                "gap_markers": [],
                "fhir_queries_fired": 0,
            },
            "routing_decision": {
                "input_classification": "unknown",
                "candidates_considered": [],
                "selected_workflow": (input_payload or {}).get("context", {}).get("workflow", "unknown"),
                "confidence": 0,
                "rationale": "legacy trace without envelope",
            },
            "safety_gates": [],
        }

    token_spend = envelope.get("tags", {}).get("token_spend", {})
    latency = envelope.get("tags", {}).get("latency", {})
    clinical_safety = envelope.get("tags", {}).get("clinical_safety", {})
    eval_scores = envelope.get("eval_scores") or {}
    records.append({
        "id": name,
        "trace_id": envelope.get("trace_id", name),
        "skill": envelope.get("skill", "unknown"),
        "status": clinical_safety.get("status", "pass").upper(),
        "timestamp": envelope.get("timestamp"),
        "started_at": envelope.get("timestamp"),
        "duration_ms": latency.get("total_ms", 0),
        "input_tokens": token_spend.get("input_tokens", 0),
        "output_tokens": token_spend.get("output_tokens", 0),
        "context_ratio": token_spend.get("context_ratio", 0),
        "token_total": token_spend.get("input_tokens", 0) + token_spend.get("output_tokens", 0),
        "safety_status": clinical_safety.get("status", "pass"),
        "veto_triggered": clinical_safety.get("veto_triggered", False),
        "weighted_score": eval_scores.get("weighted_score"),
        "has_output": os.path.exists(output_path),
    })

durations = [item["duration_ms"] for item in records if isinstance(item["duration_ms"], (int, float))]
tokens = [item["token_total"] for item in records if isinstance(item["token_total"], (int, float))]
payload = {
    "generated_at": datetime.now(__import__("datetime").timezone.utc).isoformat(),
    "summary": {
        "total_traces": len(records),
        "date_range": {
            "first": min((item["timestamp"] for item in records if item["timestamp"]), default=None),
            "last": max((item["timestamp"] for item in records if item["timestamp"]), default=None),
        },
        "avg_latency_ms": round(sum(durations) / len(durations), 2) if durations else 0,
        "avg_token_spend": round(sum(tokens) / len(tokens), 2) if tokens else 0,
        "per_skill_counts": {
            skill: sum(1 for item in records if item["skill"] == skill)
            for skill in sorted(set(item["skill"] for item in records))
        },
    },
    "traces": records,
}

with open(output_file, "w") as f:
    json.dump(payload, f, indent=2)
print(json.dumps(payload, indent=2))
PY
