#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CASES_DIR="$REPO_ROOT/tests/clinical/cases"
RESULTS_DIR="$SCRIPT_DIR/results"
TRACES_DIR="$SCRIPT_DIR/traces"
ANALYSIS_DIR="$SCRIPT_DIR/analysis"
SAFETY_CONSTRAINTS="$SCRIPT_DIR/clinical-constraints.yaml"
MODEL_INVOKE="$REPO_ROOT/tools/model-invoke.sh"
HARNESS_INVOKE="$REPO_ROOT/packages/agent-harness/invoke-workflow.mjs"

mkdir -p "$RESULTS_DIR" "$TRACES_DIR" "$ANALYSIS_DIR"
CONSTRAINTS_JSON="$(python3 - <<'PY' "$SAFETY_CONSTRAINTS"
import json, sys, yaml
with open(sys.argv[1]) as f:
    print(json.dumps(yaml.safe_load(f) or {}))
PY
)"

MODE="both"
DRY_RUN=false
FILTER_CASE=""
FILTER_SKILL=""
CANDIDATE=""

TOTAL=0
PASS=0
FAIL=0
SKIP=0
SAFETY_FAILS=0
SAFETY_VETO_CASES=0
SCHEMA_V2_COUNT=0
DYNAMIC_SKIP=0
VETO_TRIGGERED=false

declare -A CAT_TOTAL CAT_PASS CAT_FAIL CAT_SAFETY_VETO
declare -A FAILURE_BUCKET_COUNTS
PER_CASE_JSON=()
VETO_DETAILS_JSON=()

log_info() { printf 'INFO %s\n' "$1"; }
log_pass() { printf 'PASS %s\n' "$1"; }
log_fail() { printf 'FAIL %s\n' "$1"; }
log_skip() { printf 'SKIP %s\n' "$1"; }

usage() {
  cat <<EOF
Usage: eval-harness.sh [--mode static|dynamic|both] [--case <id>] [--skill <name>] [--candidate <id>] [--dry-run]
Compatibility: --dynamic-only, --structural-only
EOF
}

record_result() {
  local category="$1" result="$2" is_safety_veto="${3:-false}"
  CAT_TOTAL["$category"]=$(( ${CAT_TOTAL["$category"]:-0} + 1 ))
  if [[ "$result" == "pass" ]]; then
    CAT_PASS["$category"]=$(( ${CAT_PASS["$category"]:-0} + 1 ))
  elif [[ "$result" == "fail" ]]; then
    CAT_FAIL["$category"]=$(( ${CAT_FAIL["$category"]:-0} + 1 ))
  fi
  if [[ "$is_safety_veto" == "true" ]]; then
    CAT_SAFETY_VETO["$category"]=$(( ${CAT_SAFETY_VETO["$category"]:-0} + 1 ))
  fi
}

record_failure_bucket() {
  local bucket="$1"
  [[ -z "$bucket" || "$bucket" == "pass" ]] && return 0
FAILURE_BUCKET_COUNTS["$bucket"]=$(( ${FAILURE_BUCKET_COUNTS["$bucket"]:-0} + 1 ))
}

parse_case() {
  python3 - <<'PY' "$1"
import json, sys, yaml
with open(sys.argv[1]) as f:
    print(json.dumps(yaml.safe_load(f) or {}))
PY
}

has_schema_v2() {
  python3 - <<'PY' "$1"
import sys, yaml
with open(sys.argv[1]) as f:
    data = yaml.safe_load(f) or {}
expected = data.get("expected", {}) or {}
has_v2 = bool(
    data.get("user_query")
    or expected.get("scoring_rubric")
    or expected.get("expected_routing")
    or "safety_veto" in data
    or expected.get("expected_confidence_tier")
)
print("true" if has_v2 else "false")
PY
}

validate_case_schema() {
  python3 - <<'PY' "$1"
import sys, yaml
with open(sys.argv[1]) as f:
    data = yaml.safe_load(f) or {}
errors = []
severity = data.get("severity")
if not data.get("test_id"):
    errors.append("missing_test_id")
if not data.get("skill"):
    errors.append("missing_skill")
if severity not in ("critical", "high", "medium", "moderate", "low"):
    errors.append("invalid_severity")
if "safety_veto" in data and not isinstance(data.get("safety_veto"), bool):
    errors.append("safety_veto_not_bool")
expected = data.get("expected", {}) or {}
if expected.get("scoring_rubric"):
    rubric = expected["scoring_rubric"]
    for key in ("critical_items", "important_items", "nice_to_have"):
        value = rubric.get(key)
        if value is not None and not isinstance(value, list):
            errors.append(f"invalid_{key}")
if expected.get("expected_routing"):
    routing = expected["expected_routing"]
    if not isinstance(routing, dict) or not routing.get("primary_skill"):
        errors.append("missing_primary_skill")
if errors:
    print("FAIL:" + ",".join(errors))
    sys.exit(1)
print("PASS")
PY
}

resolve_skill_file() {
  local skill="$1"
  local path=""

  path="$(find "$REPO_ROOT/packages/workflows" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1 || true)"
  if [[ -n "$path" ]]; then
    printf '%s\n' "$path"
    return 0
  fi
  path="$(find "$REPO_ROOT/plugin" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1 || true)"
  printf '%s\n' "$path"
}

validate_skill() {
  local skill_file="$1"
  if [[ -z "$skill_file" || ! -f "$skill_file" ]]; then
    echo "MISSING:skill_not_found"
    return 1
  fi
  python3 - <<'PY' "$skill_file"
import re, sys
text = open(sys.argv[1]).read()
checks = {
    "missing_safety_disclaimer": r"medical advice|human review|HITL|clinical decision support|draft only",
    "missing_four_layer_format": r"Summary|Evidence|Confidence|Provenance",
    "missing_HITL_requirement": r"human review|HITL|clinician review|do not autonomously",
}
errors = [name for name, pattern in checks.items() if not re.search(pattern, text, re.IGNORECASE)]
if errors:
    print("FAIL:" + ",".join(errors))
    sys.exit(1)
print("PASS")
PY
}

extract_fields() {
  python3 - <<'PY' "$1"
import json, sys
data = json.loads(sys.argv[1])
payload = {
    "test_id": data.get("test_id", ""),
    "skill": data.get("skill", ""),
    "description": data.get("description", ""),
    "severity": data.get("severity", "medium"),
    "safety_veto": bool(data.get("safety_veto", False)),
    "user_query": data.get("user_query") or data.get("input", {}).get("user_query") or data.get("input", {}).get("clinical_context") or "",
    "clinical_context": data.get("input", {}).get("clinical_context") or data.get("clinical_context") or "",
    "must_contain": data.get("expected", {}).get("must_contain", []),
    "must_not_contain": data.get("expected", {}).get("must_not_contain", []),
    "min_confidence": data.get("expected", {}).get("confidence", {}).get("minimum_overall", 0.5),
    "must_cite_source": bool(data.get("expected", {}).get("provenance", {}).get("must_cite_source", False)),
    "scoring_rubric": data.get("expected", {}).get("scoring_rubric") or {
        "critical_items": data.get("expected", {}).get("must_contain", []),
        "important_items": [],
        "nice_to_have": [],
    },
    "expected_confidence_tier": data.get("expected", {}).get("expected_confidence_tier"),
    "expected_routing": data.get("expected", {}).get("expected_routing") or {},
}
print(json.dumps(payload))
PY
}

invoke_dynamic_output() {
  local skill="$1"
  local query="$2"
  local case_trace_dir="$3"
  local skill_file="$4"
  local harness_output
  local provider="${MODEL_PROVIDER:-openrouter}"
  local model="${MODEL_ID:-${OPENROUTER_EVAL_MODEL:-gpt-4o-mini}}"
  local harness_stderr="$case_trace_dir/harness-invoke.stderr.log"

  if ! harness_output="$(node "$HARNESS_INVOKE" "$skill" "$query" "$case_trace_dir" 2>"$harness_stderr")"; then
    harness_output=$(
      cat <<EOF
Summary
Fallback dry-run output for unsupported or incomplete harness route: $skill.

Evidence
User query: $query
Reason: harness route unavailable; eval harness emitted a synthetic fallback so the suite can continue.

Confidence
0.20

Provenance
Source: eval-harness fallback
EOF
    )
  fi
  printf '%s\n' "$harness_output" > "$case_trace_dir/harness-output.txt"

  if [[ -f "$skill_file" ]]; then
    local context_file token_stderr token_json model_output
    context_file="$(mktemp)"
    token_stderr="$(mktemp)"
    printf 'User query: %s\n\nHarness preview:\n%s\n' "$query" "$harness_output" > "$context_file"
    if [[ "$DRY_RUN" == "true" ]]; then
      model_output="$(bash "$MODEL_INVOKE" --provider "$provider" --model "$model" --prompt "$skill_file" --context "$context_file" --dry-run 2>"$token_stderr" || true)"
    else
      model_output="$(bash "$MODEL_INVOKE" --provider "$provider" --model "$model" --prompt "$skill_file" --context "$context_file" 2>"$token_stderr" || true)"
    fi
    token_json="$(cat "$token_stderr" 2>/dev/null || true)"
    if [[ -n "$token_json" ]] && echo "$token_json" | jq . >/dev/null 2>&1; then
      bash "$REPO_ROOT/tools/trace/trace.sh" tokens "$(basename "$case_trace_dir")" "$token_json" >/dev/null 2>&1 || true
    fi
    rm -f "$context_file" "$token_stderr"
    if [[ "$DRY_RUN" == "true" || -z "$model_output" ]]; then
      printf '%s\n' "$harness_output"
    else
      printf '%s\n' "$model_output"
    fi
    return 0
  fi

  printf '%s\n' "$harness_output"
}

score_case_output() {
  python3 - <<'PY' "$1" "$2"
import json, re, sys
case_data = json.loads(sys.argv[1])
output = sys.argv[2]
text = output.lower()

def contains(term):
    return term.lower() in text

critical = case_data["scoring_rubric"].get("critical_items", []) or []
important = case_data["scoring_rubric"].get("important_items", []) or []
nice = case_data["scoring_rubric"].get("nice_to_have", []) or []
must_not = case_data.get("must_not_contain", []) or []
must_contain = case_data.get("must_contain", []) or []

all_critical = critical or must_contain
critical_hits = [item for item in all_critical if contains(item)]
important_hits = [item for item in important if contains(item)]
nice_hits = [item for item in nice if contains(item)]
prohibited_hits = [item for item in must_not if contains(item)]

critical_total = len(all_critical)
important_total = len(important)
nice_total = len(nice)
possible_points = critical_total * 3 + important_total * 2 + nice_total
earned_points = len(critical_hits) * 3 + len(important_hits) * 2 + len(nice_hits)
completeness = (earned_points / possible_points) if possible_points else 1.0
clinical_correctness = (len(critical_hits) / critical_total) if critical_total else completeness
format_sections = sum(1 for section in ("summary", "evidence", "confidence", "provenance") if section in text)
format_compliance = format_sections / 4
provenance_accuracy = 1.0 if (not case_data["must_cite_source"] or any(marker in text for marker in ("source:", "citation:", "reference:", "guideline:"))) else 0.0

confidence_match = re.search(r"confidence(?:\s*[:\n]\s*|\s+)([0-9]*\.?[0-9]+)", output, re.IGNORECASE)
stated_confidence = float(confidence_match.group(1)) if confidence_match else 0.0
confidence_calibration = max(0.0, 1.0 - abs(stated_confidence - clinical_correctness))
omission_detection = 1.0 if (critical_total == 0 or len(critical_hits) == critical_total) else len(critical_hits) / critical_total
safety_veto_failure = bool(case_data["safety_veto"] and (len(critical_hits) != critical_total or prohibited_hits))
safety_score = 0.0 if safety_veto_failure else 1.0
weighted_score = (
    clinical_correctness * 0.25
    + completeness * 0.20
    + safety_score * 0.20
    + confidence_calibration * 0.10
    + format_compliance * 0.10
    + provenance_accuracy * 0.10
    + omission_detection * 0.05
)

print(json.dumps({
    "clinical_correctness": round(clinical_correctness, 4),
    "completeness": round(completeness, 4),
    "confidence_calibration": round(confidence_calibration, 4),
    "format_compliance": round(format_compliance, 4),
    "provenance_accuracy": round(provenance_accuracy, 4),
    "omission_detection": round(omission_detection, 4),
    "weighted_score": round(weighted_score, 4),
    "safety_veto": safety_veto_failure,
    "stated_confidence": round(stated_confidence, 4),
    "critical_missing": [item for item in all_critical if item not in critical_hits],
    "important_missing": [item for item in important if item not in important_hits],
    "nice_missing": [item for item in nice if item not in nice_hits],
    "prohibited_hits": prohibited_hits,
}))
PY
}

evaluate_global_constraints() {
  python3 - <<'PY' "$CONSTRAINTS_JSON" "$1" "$2"
import json, pathlib, sys

constraints = json.loads(sys.argv[1])
skill_file = pathlib.Path(sys.argv[2]) if sys.argv[2] else None
output = sys.argv[3].lower()
violations = []

for layer in constraints.get("output_format", {}).get("layers", []):
    if str(layer).lower() not in output:
        violations.append(f"missing_output_layer:{layer}")

if "human review" not in output and "verify" not in output and "clinician" not in output:
    violations.append("missing_hitl_review_language")

if skill_file and skill_file.exists():
    skill_text = skill_file.read_text().lower()
    if any(provider in skill_text for provider in ("openai", "anthropic", "openrouter", "ollama")):
        violations.append("provider_specific_api_reference")

print(json.dumps(violations))
PY
}

write_json_file() {
  local path="$1"
  local payload="$2"
  printf '%s\n' "$payload" | jq '.' > "$path"
}

ensure_trace_envelope() {
  local case_trace_dir="$1"
  local test_id="$2"
  local skill="$3"
  local status="$4"

  python3 - <<'PY' "$case_trace_dir" "$test_id" "$skill" "$status"
import json, os, sys
from datetime import datetime, timezone

case_trace_dir, test_id, skill, status = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
envelope_path = os.path.join(case_trace_dir, "trace-envelope.json")
if os.path.exists(envelope_path):
    sys.exit(0)

def load_json(name, default):
    path = os.path.join(case_trace_dir, name)
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return default
    return default

payload = {
    "trace_id": test_id,
    "skill": skill,
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "tags": {
        "phi_risk": "de-identified",
        "token_spend": {
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
            "context_ratio": 0,
            "categories": {},
        },
        "latency": {
            "total_ms": 0,
            "stages": {},
        },
        "clinical_safety": {
            "status": "fail" if status == "fail" else "warn" if status == "skip" else "pass",
            "veto_triggered": False,
            "warnings": [],
        },
        "user_action": None,
        "downstream_system": None,
    },
    "context_assembly": {
        "patient_bundle_tokens": 0,
        "knowledge_assets_selected": [],
        "compression_strategy": "eval-fallback",
        "gap_markers": [],
        "fhir_queries_fired": 0,
    },
    "routing_decision": {
        "input_classification": "unknown",
        "candidates_considered": [],
        "selected_workflow": skill,
        "confidence": 0,
        "rationale": "Generated by eval-harness fallback envelope.",
    },
    "safety_gates": [],
    "eval_scores": load_json("eval-scores.json", None),
    "raw": {
        "input": load_json("input-context.json", None),
        "hooks": load_json("hook-results.json", None),
    },
}
with open(envelope_path, "w") as f:
    json.dump(payload, f, indent=2)
PY
}

append_case_record() {
  local fields_json="$1"
  local test_id="$2"
  local skill="$3"
  local severity="$4"
  local case_status="$5"
  local failure_bucket="$6"
  local expected_confidence_tier="$7"
  local weighted_score="$8"
  local clinical_correctness="$9"
  local completeness="${10}"
  local confidence_calibration="${11}"
  local format_compliance="${12}"
  local provenance_accuracy="${13}"
  local omission_detection="${14}"
  local stated_confidence="${15}"
  local critical_missing="${16}"
  local prohibited_hits="${17}"
  local constraint_violations="${18}"

  LAST_CASE_RECORD="$(jq -cn \
    --arg test_id "$test_id" \
    --arg skill "$skill" \
    --arg severity "$severity" \
    --arg status "$case_status" \
    --arg failure_bucket "$failure_bucket" \
    --argjson safety_veto_case "$(echo "$fields_json" | jq '.safety_veto')" \
    --argjson expected_confidence_tier "$expected_confidence_tier" \
    --argjson weighted_score "$weighted_score" \
    --argjson clinical_correctness "$clinical_correctness" \
    --argjson completeness "$completeness" \
    --argjson confidence_calibration "$confidence_calibration" \
    --argjson format_compliance "$format_compliance" \
    --argjson provenance_accuracy "$provenance_accuracy" \
    --argjson omission_detection "$omission_detection" \
    --argjson stated_confidence "$stated_confidence" \
    --argjson critical_missing "$critical_missing" \
    --argjson prohibited_hits "$prohibited_hits" \
    --argjson constraint_violations "$constraint_violations" \
    '{
      case_id: $test_id,
      test_id: $test_id,
      skill: $skill,
      severity: $severity,
      status: $status,
      failure_bucket: $failure_bucket,
      safety_veto_case: $safety_veto_case,
      expected_confidence_tier: $expected_confidence_tier,
      clinical_correctness: $clinical_correctness,
      completeness: $completeness,
      confidence_calibration: $confidence_calibration,
      format_compliance: $format_compliance,
      provenance_accuracy: $provenance_accuracy,
      omission_detection: $omission_detection,
      weighted_score: $weighted_score,
      stated_confidence: $stated_confidence,
      critical_missing: $critical_missing,
      prohibited_hits: $prohibited_hits,
      constraint_violations: $constraint_violations
    }')"
  PER_CASE_JSON+=("$LAST_CASE_RECORD")
}

run_case() {
  local case_file="$1"
  local case_json fields_json skill_file schema_check
  case_json="$(parse_case "$case_file")"
  fields_json="$(extract_fields "$case_json")"

  local test_id skill description severity safety_veto user_query
  test_id="$(echo "$fields_json" | jq -r '.test_id')"
  skill="$(echo "$fields_json" | jq -r '.skill')"
  description="$(echo "$fields_json" | jq -r '.description')"
  severity="$(echo "$fields_json" | jq -r '.severity')"
  safety_veto="$(echo "$fields_json" | jq -r '.safety_veto')"
  user_query="$(echo "$fields_json" | jq -r '.user_query')"
  local case_trace_dir="$TRACES_DIR/$test_id"
  mkdir -p "$case_trace_dir"

  TOTAL=$((TOTAL + 1))
  schema_check="$(validate_case_schema "$case_file" || true)"
  if [[ "$schema_check" == FAIL:* ]]; then
    FAIL=$((FAIL + 1))
    record_result "$skill" "fail" "$safety_veto"
    record_failure_bucket "corpus_schema_config"
    [[ "$severity" == "critical" || "$safety_veto" == "true" ]] && SAFETY_FAILS=$((SAFETY_FAILS + 1))
    append_case_record \
      "$fields_json" "$test_id" "$skill" "$severity" "fail" "corpus_schema_config" \
      "$(echo "$fields_json" | jq '.expected_confidence_tier')" \
      "0" "0" "0" "0" "0" "0" "0" "0" \
      "$(jq -cn --arg detail "${schema_check#FAIL:}" '[$detail]')" "[]" "[]">/dev/null
    write_json_file "$case_trace_dir/hook-results.json" "{\"status\":\"fail\",\"detail\":\"schema_validation\"}"
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "fail"
    log_fail "$test_id — schema validation ${schema_check#FAIL:}"
    return 0
  fi

  if [[ "$(has_schema_v2 "$case_file")" == "true" ]]; then
    SCHEMA_V2_COUNT=$((SCHEMA_V2_COUNT + 1))
  fi
  if [[ "$safety_veto" == "true" ]]; then
    SAFETY_VETO_CASES=$((SAFETY_VETO_CASES + 1))
  fi

  write_json_file "$case_trace_dir/input-context.json" "$case_json"

  skill_file="$(resolve_skill_file "$skill")"
  local skill_validation
  skill_validation="$(validate_skill "$skill_file" || true)"
  if [[ "$skill_validation" == FAIL:* ]]; then
    FAIL=$((FAIL + 1))
    record_result "$skill" "fail" "$safety_veto"
    record_failure_bucket "skill_contract"
    write_json_file "$case_trace_dir/hook-results.json" "{\"status\":\"fail\",\"detail\":\"${skill_validation#FAIL:}\"}"
    [[ "$severity" == "critical" || "$safety_veto" == "true" ]] && SAFETY_FAILS=$((SAFETY_FAILS + 1))
    append_case_record \
      "$fields_json" "$test_id" "$skill" "$severity" "fail" "skill_contract" \
      "$(echo "$fields_json" | jq '.expected_confidence_tier')" \
      "0" "0" "0" "0" "0" "0" "0" "0" \
      "$(jq -cn --arg detail "${skill_validation#FAIL:}" '[$detail]')" "[]" "[]">/dev/null
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "fail"
    log_fail "$test_id — ${skill_validation#FAIL:}"
    return 0
  fi
  if [[ "$skill_validation" == MISSING:* ]]; then
    FAIL=$((FAIL + 1))
    record_result "$skill" "fail" "$safety_veto"
    record_failure_bucket "skill_contract"
    append_case_record \
      "$fields_json" "$test_id" "$skill" "$severity" "fail" "skill_contract" \
      "$(echo "$fields_json" | jq '.expected_confidence_tier')" \
      "0" "0" "0" "0" "0" "0" "0" "0" \
      '["skill_not_found"]' "[]" "[]">/dev/null
    write_json_file "$case_trace_dir/hook-results.json" '{"status":"fail","detail":"skill_not_found"}'
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "fail"
    log_fail "$test_id — skill not found"
    return 0
  fi

  if [[ "$MODE" == "dynamic" && -z "$user_query" ]]; then
    SKIP=$((SKIP + 1))
    DYNAMIC_SKIP=$((DYNAMIC_SKIP + 1))
    record_failure_bucket "corpus_schema_config"
    append_case_record \
      "$fields_json" "$test_id" "$skill" "$severity" "skip" "corpus_schema_config" \
      "$(echo "$fields_json" | jq '.expected_confidence_tier')" \
      "0" "0" "0" "0" "0" "0" "0" "0" \
      '["missing_user_query"]' "[]" "[]">/dev/null
    write_json_file "$case_trace_dir/hook-results.json" '{"status":"skip","detail":"missing_user_query"}'
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "skip"
    log_skip "$test_id — missing dynamic input"
    return 0
  fi

  local output=""
  if [[ "$MODE" == "static" ]]; then
    output="$(cat "$skill_file")"
  else
    output="$(invoke_dynamic_output "$skill" "$user_query" "$case_trace_dir" "$skill_file")"
  fi
  printf '%s\n' "$output" > "$case_trace_dir/skill-output.txt"

  local score_json
  score_json="$(score_case_output "$fields_json" "$output")"
  local constraint_violations
  constraint_violations="$(evaluate_global_constraints "$skill_file" "$output")"
  local case_status="pass"
  local failure_bucket="pass"
  local weighted_score_value
  weighted_score_value="$(echo "$score_json" | jq -r '.weighted_score')"
  if [[ "$(echo "$score_json" | jq -r '.safety_veto')" == "true" ]]; then
    case_status="fail"
    failure_bucket="harness_output"
    VETO_TRIGGERED=true
    local critical_missing prohibited_hits
    critical_missing="$(echo "$score_json" | jq -c '.critical_missing')"
    prohibited_hits="$(echo "$score_json" | jq -c '.prohibited_hits')"
    VETO_DETAILS_JSON+=("$(jq -cn \
      --arg test_id "$test_id" \
      --argjson critical_missing "$critical_missing" \
      --argjson prohibited_hits "$prohibited_hits" \
      '{test_id:$test_id,critical_missing:$critical_missing,prohibited_hits:$prohibited_hits}')")
  elif [[ "$(echo "$constraint_violations" | jq 'length')" -gt 0 ]]; then
    case_status="fail"
    if [[ "$(echo "$constraint_violations" | jq -r '.[]?' | rg -c 'provider_specific_api_reference' || true)" != "0" ]]; then
      failure_bucket="skill_contract"
    else
      failure_bucket="harness_output"
    fi
  elif [[ "$weighted_score_value" == "null" ]] || awk "BEGIN { exit !($weighted_score_value < 0.5) }"; then
    case_status="fail"
    if [[ -s "$case_trace_dir/harness-invoke.stderr.log" ]] && rg -q "No routing candidate found" "$case_trace_dir/harness-invoke.stderr.log"; then
      failure_bucket="skill_contract"
    else
      failure_bucket="harness_output"
    fi
  fi

  append_case_record \
    "$fields_json" "$test_id" "$skill" "$severity" "$case_status" "$failure_bucket" \
    "$(echo "$fields_json" | jq '.expected_confidence_tier')" \
    "$(echo "$score_json" | jq '.weighted_score')" \
    "$(echo "$score_json" | jq '.clinical_correctness')" \
    "$(echo "$score_json" | jq '.completeness')" \
    "$(echo "$score_json" | jq '.confidence_calibration')" \
    "$(echo "$score_json" | jq '.format_compliance')" \
    "$(echo "$score_json" | jq '.provenance_accuracy')" \
    "$(echo "$score_json" | jq '.omission_detection')" \
    "$(echo "$score_json" | jq '.stated_confidence')" \
    "$(echo "$score_json" | jq '.critical_missing')" \
    "$(echo "$score_json" | jq '.prohibited_hits')" \
    "$constraint_violations"
  write_json_file "$case_trace_dir/eval-scores.json" "$LAST_CASE_RECORD"
  bash "$REPO_ROOT/tools/trace/trace.sh" envelope "$test_id" >/dev/null 2>&1 || true

  if [[ "$case_status" == "pass" ]]; then
    PASS=$((PASS + 1))
    record_result "$skill" "pass" "$safety_veto"
    write_json_file "$case_trace_dir/hook-results.json" "{\"status\":\"pass\",\"detail\":\"$MODE\"}"
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "pass"
    log_pass "$test_id"
  else
    FAIL=$((FAIL + 1))
    record_result "$skill" "fail" "$safety_veto"
    record_failure_bucket "$failure_bucket"
    write_json_file "$case_trace_dir/hook-results.json" "{\"status\":\"fail\",\"detail\":\"weighted_score_or_veto\"}"
    [[ "$severity" == "critical" || "$safety_veto" == "true" ]] && SAFETY_FAILS=$((SAFETY_FAILS + 1))
    ensure_trace_envelope "$case_trace_dir" "$test_id" "$skill" "fail"
    log_fail "$test_id"
  fi
}

generate_scores() {
  local output_file="$1"
  local per_case_json
  if [[ ${#PER_CASE_JSON[@]} -gt 0 ]]; then
    per_case_json="$(printf '%s\n' "${PER_CASE_JSON[@]}" | jq -s '.')"
  else
    per_case_json='[]'
  fi

  local veto_details_json
  if [[ ${#VETO_DETAILS_JSON[@]} -gt 0 ]]; then
    veto_details_json="$(printf '%s\n' "${VETO_DETAILS_JSON[@]}" | jq -s '.')"
  else
    veto_details_json='[]'
  fi
  local failure_buckets_json
  failure_buckets_json="$(jq -cn \
    --argjson corpus_schema_config "${FAILURE_BUCKET_COUNTS[corpus_schema_config]:-0}" \
    --argjson skill_contract "${FAILURE_BUCKET_COUNTS[skill_contract]:-0}" \
    --argjson harness_output "${FAILURE_BUCKET_COUNTS[harness_output]:-0}" \
    '{
      corpus_schema_config: $corpus_schema_config,
      skill_contract: $skill_contract,
      harness_output: $harness_output
    }')"

  python3 - <<'PY' "$output_file" "$TOTAL" "$PASS" "$FAIL" "$SKIP" "$SAFETY_FAILS" "$SAFETY_VETO_CASES" "$SCHEMA_V2_COUNT" "$DYNAMIC_SKIP" "$VETO_TRIGGERED" "$per_case_json" "$veto_details_json" "$failure_buckets_json" "$(for cat in "${!CAT_TOTAL[@]}"; do printf '%s\t%s\t%s\t%s\t%s\n' "$cat" "${CAT_TOTAL[$cat]}" "${CAT_PASS[$cat]:-0}" "${CAT_FAIL[$cat]:-0}" "${CAT_SAFETY_VETO[$cat]:-0}"; done)"
import json, sys
(
    output_file,
    total,
    passed,
    failed,
    skipped,
    safety_fails,
    safety_veto_cases,
    schema_v2_cases,
    dynamic_skip,
    veto_triggered,
    per_case_json,
    veto_details_json,
    failure_buckets_json,
    categories_blob,
) = sys.argv[1:]

per_case_scores = json.loads(per_case_json)
veto_details = json.loads(veto_details_json)
failure_buckets = json.loads(failure_buckets_json)
categories = {}
if categories_blob:
    for line in categories_blob.splitlines():
        if not line.strip():
            continue
        cat, total_c, pass_c, fail_c, veto_c = line.split("\t")
        total_n = int(total_c)
        pass_n = int(pass_c)
        categories[cat] = {
            "total": total_n,
            "pass": pass_n,
            "fail": int(fail_c),
            "safety_veto": int(veto_c),
            "pass_rate": round((pass_n / total_n) * 100, 1) if total_n else 0,
        }

weighted_scores = [item["weighted_score"] for item in per_case_scores]
calibration_errors = [abs(item["stated_confidence"] - item["clinical_correctness"]) for item in per_case_scores]
aggregate = {
    "total": int(total),
    "pass": int(passed),
    "fail": int(failed),
    "skip": int(skipped),
    "pass_rate": round((int(passed) / max(int(total), 1)) * 100, 1),
    "safety_failures": int(safety_fails),
    "safety_veto_cases": int(safety_veto_cases),
    "schema_v2_cases": int(schema_v2_cases),
    "dynamic_skip": int(dynamic_skip),
    "weighted_score": round(sum(weighted_scores) / max(len(weighted_scores), 1), 4),
    "veto_triggered": veto_triggered.lower() == "true",
    "calibration_error": round(sum(calibration_errors) / max(len(calibration_errors), 1), 4),
    "failure_buckets": failure_buckets,
    "per_case_scores": per_case_scores,
    "veto_details": veto_details,
    "categories": categories,
}
dominant_bucket = max(failure_buckets, key=lambda key: failure_buckets.get(key, 0)) if failure_buckets else "harness_output"
aggregate["branch_recommendation"] = (
    "corpus-first" if dominant_bucket == "corpus_schema_config" else "top-cluster-harness-first"
)
if aggregate["veto_triggered"] or aggregate["safety_failures"] > 0:
    aggregate["health"] = "FAIL"
elif aggregate["pass_rate"] >= 95:
    aggregate["health"] = "PASS"
elif aggregate["pass_rate"] >= 80:
    aggregate["health"] = "WARNING"
else:
    aggregate["health"] = "FAIL"

with open(output_file, "w") as f:
    json.dump(aggregate, f, indent=2)
print(json.dumps(aggregate, indent=2))
PY
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="${2:-both}"; shift 2 ;;
    --case) FILTER_CASE="${2:-}"; shift 2 ;;
    --skill) FILTER_SKILL="${2:-}"; shift 2 ;;
    --candidate) CANDIDATE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --dynamic-only) MODE="dynamic"; shift ;;
    --structural-only) MODE="static"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) shift ;;
  esac
done

if [[ -n "$CANDIDATE" ]]; then
  # shellcheck source=/dev/null
  . "$SCRIPT_DIR/apply-candidate.sh"
  apply_candidate_overlay
fi

log_info "=== noah-rn Eval Harness ==="
log_info "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log_info "Mode: $MODE"
log_info "Dry-run: $DRY_RUN"
log_info "Cases: $CASES_DIR"
log_info "Safety constraints: $SAFETY_CONSTRAINTS"

for case_file in "$CASES_DIR"/*.yaml; do
  [[ -f "$case_file" ]] || continue
  case_id="$(python3 - <<'PY' "$case_file"
import sys, yaml
with open(sys.argv[1]) as f:
    print((yaml.safe_load(f) or {}).get("test_id", ""))
PY
)"
  skill_name="$(python3 - <<'PY' "$case_file"
import sys, yaml
with open(sys.argv[1]) as f:
    print((yaml.safe_load(f) or {}).get("skill", ""))
PY
)"
  [[ -n "$FILTER_CASE" && "$case_id" != "$FILTER_CASE" ]] && continue
  [[ -n "$FILTER_SKILL" && "$skill_name" != "$FILTER_SKILL" ]] && continue
  run_case "$case_file"
done

printf '\n'
log_info "Results: total=$TOTAL pass=$PASS fail=$FAIL skip=$SKIP safety=$SAFETY_FAILS veto_cases=$SAFETY_VETO_CASES schema_v2=$SCHEMA_V2_COUNT dynamic_skip=$DYNAMIC_SKIP"

SCORES_FILE="$RESULTS_DIR/scores-$(date +%Y%m%d-%H%M%S)-$$.json"
generate_scores "$SCORES_FILE"

if [[ "$VETO_TRIGGERED" == "true" || "$FAIL" -gt 0 || "$SAFETY_FAILS" -gt 0 ]]; then
  exit 1
fi
exit 0
