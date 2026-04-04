#!/usr/bin/env bash
set -euo pipefail
# Eval Harness — Phase B (Dynamic + Static)
# Runs skills against golden test cases, captures traces, produces scores.json.
#
# Usage: optimization/product/eval-harness.sh [--candidate <N>] [--case <id>] [--skill <name>]
#                                              [--mode static|dynamic|both]
#                                              [--dynamic-only] [--structural-only]
#
# Validates each candidate against the golden test suite and produces:
# - scores.json with per-category metrics
# - failure-modes.md with diagnosed issues
# - traces/ with per-case execution logs
#
# Schema v2 fields supported:
#   user_query, scoring_rubric, expected_routing, safety_veto
#   See tests/clinical/cases/ for examples.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CASES_DIR="$REPO_ROOT/tests/clinical/cases"
RESULTS_DIR="$SCRIPT_DIR/results"
TRACES_DIR="$SCRIPT_DIR/traces"
ANALYSIS_DIR="$SCRIPT_DIR/analysis"
SAFETY_CONSTRAINTS="$SCRIPT_DIR/safety-constraints.yaml"

mkdir -p "$RESULTS_DIR" "$TRACES_DIR" "$ANALYSIS_DIR"

# Counters
TOTAL=0
PASS=0
FAIL=0
SKIP=0
SAFETY_FAILS=0
SAFETY_VETO_CASES=0
DYNAMIC_SKIP=0
SCHEMA_V2_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}PASS${NC} $1"; }
log_fail() { echo -e "${RED}FAIL${NC} $1"; }
log_skip() { echo -e "${YELLOW}SKIP${NC} $1"; }
log_info() { echo -e "${CYAN}INFO${NC} $1"; }

# Category tracking
declare -A CAT_TOTAL CAT_PASS CAT_FAIL CAT_SAFETY_VETO

record_result() {
  local category="$1" result="$2" is_safety_veto="${3:-false}"
  CAT_TOTAL[$category]=$(( ${CAT_TOTAL[$category]:-0} + 1 ))
  if [ "$result" = "pass" ]; then
    CAT_PASS[$category]=$(( ${CAT_PASS[$category]:-0} + 1 ))
  elif [ "$result" = "fail" ]; then
    CAT_FAIL[$category]=$(( ${CAT_FAIL[$category]:-0} + 1 ))
  fi
  if [ "$is_safety_veto" = "true" ] || [ "$is_safety_veto" = "1" ]; then
    CAT_SAFETY_VETO[$category]=$(( ${CAT_SAFETY_VETO[$category]:-0} + 1 ))
  fi
}

parse_case() {
  local file="$1"
  python3 -c "
import json, yaml
with open('$file') as f:
    data = yaml.safe_load(f)
print(json.dumps(data))
" 2>/dev/null
}

has_schema_v2() {
  local case_file="$1"
  python3 -c "
import yaml
with open('$case_file') as f:
    d = yaml.safe_load(f)
v2 = bool(
    d.get('user_query')
    or d.get('scoring_rubric')
    or d.get('expected_routing')
    or d.get('safety_veto')
    or (d.get('input') and d['input'].get('user_query'))
)
print('true' if v2 else 'false')
" 2>/dev/null || echo "false"
}

validate_case_schema() {
  local case_file="$1"
  python3 -c "
import sys, yaml
with open('$case_file') as f:
    d = yaml.safe_load(f)
errors = []

if not d.get('test_id'):
    errors.append('missing_test_id')
if not d.get('skill'):
    errors.append('missing_skill')
if not d.get('severity'):
    errors.append('missing_severity')
if d.get('severity') not in ('critical', 'high', 'medium', 'moderate', 'low'):
    errors.append('invalid_severity')

if d.get('scoring_rubric'):
    rubric = d['scoring_rubric']
    if not isinstance(rubric, dict):
        errors.append('scoring_rubric_not_dict')
    else:
        for key in rubric:
            if key not in ('critical', 'important', 'nice_to_have'):
                errors.append(f'invalid_rubric_key:{key}')
            elif not isinstance(rubric[key], list):
                errors.append(f'rubric_{key}_not_list')

if d.get('expected_routing'):
    routing = d['expected_routing']
    if not isinstance(routing, dict):
        errors.append('expected_routing_not_dict')
    elif 'primary' not in routing:
        errors.append('missing_routing_primary')

if d.get('safety_veto') is True:
    has_query = bool(d.get('user_query') or (d.get('input') and d['input'].get('user_query')))
    if not has_query:
        errors.append('safety_veto_requires_user_query')

if errors:
    print('FAIL:' + ','.join(errors))
    sys.exit(1)
print('PASS')
" 2>/dev/null || echo "FAIL:parse_error"
}

validate_skill() {
  local skill="$1"
  local skill_file
  skill_file="$(find "$REPO_ROOT/plugin/skills" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1)"

  if [ -z "$skill_file" ]; then
    echo "MISSING:skill_not_found"
    return 1
  fi

  local errors=()

  if ! grep -qi "not.*medical.*advice\|consult.*physician\|human.*review\|HITL\|clinical.*decision.*support\|draft.*only" "$skill_file"; then
    errors+=("missing_safety_disclaimer")
  fi

  if ! grep -qi "summary\|evidence\|confidence\|provenance" "$skill_file"; then
    errors+=("missing_four_layer_format")
  fi

  if ! grep -qi "checklist\|must.*include\|required.*section\|completeness" "$skill_file"; then
    errors+=("missing_completeness_checklist")
  fi

  if ! grep -qi "human.*review\|HITL\|clinician.*review\|do.*not.*autonomously" "$skill_file"; then
    errors+=("missing_HITL_requirement")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    echo "FAIL:$(IFS=,; echo "${errors[*]}")"
    return 1
  fi

  echo "PASS"
}

run_dynamic_validation() {
  local case_json="$1"
  local skill="$2"
  local test_id="$3"
  local case_trace_dir="$4"

  if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${OLLAMA_BASE_URL:-}" ]; then
    log_skip "$test_id — no model configured (dynamic skipped)"
    DYNAMIC_SKIP=$((DYNAMIC_SKIP + 1))
    return 2
  fi

  local must_contain must_not_contain min_confidence must_cite_source
  must_contain="$(echo "$case_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
expected = d.get('expected', {})
print('\\n'.join(expected.get('must_contain', [])))
")"
  must_not_contain="$(echo "$case_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
expected = d.get('expected', {})
print('\\n'.join(expected.get('must_not_contain', [])))
")"
  min_confidence="$(echo "$case_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
expected = d.get('expected', {})
print(expected.get('confidence', {}).get('minimum_overall', 0.5))
")"
  must_cite_source="$(echo "$case_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
expected = d.get('expected', {})
print(str(expected.get('provenance', {}).get('must_cite_source', False)).lower())
")"

  local clinical_context
  clinical_context="$(echo "$case_json" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d.get('user_query') or d.get('input', {}).get('user_query') or d.get('input', {}).get('clinical_context', ''))
")"

  local skill_output
  skill_output="$(invoke_skill "$skill" "$clinical_context" "$case_trace_dir")" || {
    log_fail "$test_id — skill invocation failed"
    return 1
  }

  local missing_contains=()
  while IFS= read -r term; do
    [ -z "$term" ] && continue
    if ! echo "$skill_output" | grep -qi "$term"; then
      missing_contains+=("$term")
    fi
  done <<< "$must_contain"

  local found_prohibited=()
  while IFS= read -r term; do
    [ -z "$term" ] && continue
    if echo "$skill_output" | grep -qi "$term"; then
      found_prohibited+=("$term")
    fi
  done <<< "$must_not_contain"

  local actual_confidence
  actual_confidence="$(echo "$skill_output" | python3 -c "
import re, sys
text = sys.stdin.read()
match = re.search(r'confidence[:\\s]+([0-9.]+)', text, re.IGNORECASE)
print(match.group(1) if match else '0.0')
" 2>/dev/null || echo "0.0")"

  local confidence_ok
  confidence_ok="$(python3 -c "print('true' if float('$actual_confidence') >= float('$min_confidence') else 'false')")"

  local provenance_ok="true"
  if [ "$must_cite_source" = "true" ] && ! echo "$skill_output" | grep -qi "source:\|citation:\|reference:\|guideline:"; then
    provenance_ok="false"
  fi

  local failures=()
  [ ${#missing_contains[@]} -gt 0 ] && failures+=("missing:${missing_contains[*]}")
  [ ${#found_prohibited[@]} -gt 0 ] && failures+=("prohibited:${found_prohibited[*]}")
  [ "$confidence_ok" = "false" ] && failures+=("confidence:${actual_confidence} < ${min_confidence}")
  [ "$provenance_ok" = "false" ] && failures+=("provenance:missing_source")

  if [ ${#failures[@]} -gt 0 ]; then
    log_fail "$test_id — $(IFS='; '; echo "${failures[*]}")"
    return 1
  fi

  log_pass "$test_id"
  return 0
}

invoke_skill() {
  local skill="$1"
  local context="$2"
  local trace_dir="$3"

  local skill_file
  skill_file="$(find "$REPO_ROOT/plugin/skills" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1)"

  if [ -z "$skill_file" ]; then
    echo "ERROR: Skill file not found for '$skill'"
    return 1
  fi

  local skill_prompt
  skill_prompt="$(cat "$skill_file")"

  if [ -n "${OPENAI_API_KEY:-}" ]; then
    curl -s "https://api.openai.com/v1/chat/completions" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"${OPENAI_EVAL_MODEL:-gpt-4o-mini}\",
        \"messages\": [
          {\"role\": \"system\", \"content\": $(echo "$skill_prompt" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")},
          {\"role\": \"user\", \"content\": $(echo "$context" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")}
        ],
        \"temperature\": 0.1
      }" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['choices'][0]['message']['content'])"
  elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    curl -s "https://api.anthropic.com/v1/messages" \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -H "content-type: application/json" \
      -d "{
        \"model\": \"${ANTHROPIC_EVAL_MODEL:-claude-3-haiku-20240307}\",
        \"max_tokens\": 4096,
        \"system\": $(echo "$skill_prompt" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),
        \"messages\": [
          {\"role\": \"user\", \"content\": $(echo "$context" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")}
        ]
      }" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['content'][0]['text'])"
  elif [ -n "${OLLAMA_BASE_URL:-}" ]; then
    curl -s "${OLLAMA_BASE_URL}/api/generate" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"${OLLAMA_EVAL_MODEL:-llama3}\",
        \"prompt\": $(echo -e "${skill_prompt}\n\nUser: ${context}" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),
        \"stream\": false
      }" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('response', ''))"
  else
    echo "ERROR: No model provider configured"
    return 1
  fi
}

run_case() {
  local case_file="$1"
  local case_json
  case_json="$(parse_case "$case_file")" || { log_skip "$(basename "$case_file") (parse error)"; SKIP=$((SKIP+1)); return; }

  local test_id skill description severity safety_veto schema_v2
  test_id="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('test_id','?'))")"
  skill="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('skill','?'))")"
  description="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('description','?'))")"
  severity="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('severity','medium'))")"
  safety_veto="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if d.get('safety_veto') else 'false')")"
  schema_v2="$(has_schema_v2 "$case_file")"

  [ "$schema_v2" = "true" ] && SCHEMA_V2_COUNT=$((SCHEMA_V2_COUNT+1))
  [ "$safety_veto" = "true" ] && SAFETY_VETO_CASES=$((SAFETY_VETO_CASES+1))

  local schema_check
  schema_check="$(validate_case_schema "$case_file")"
  if [[ "$schema_check" == FAIL:* ]]; then
    log_fail "$test_id — schema validation: ${schema_check#FAIL:}"
    TOTAL=$((TOTAL+1))
    FAIL=$((FAIL+1))
    record_result "$skill" "fail" "$safety_veto"
    if [ "$severity" = "critical" ] || [ "$safety_veto" = "true" ]; then
      SAFETY_FAILS=$((SAFETY_FAILS+1))
    fi
    return
  fi

  TOTAL=$((TOTAL+1))
  local v2_tag=""
  [ "$schema_v2" = "true" ] && v2_tag=" [v2]"
  [ "$safety_veto" = "true" ] && v2_tag="${v2_tag} [SAFETY_VETO]"
  echo "--- $test_id: $description [$severity]${v2_tag}"

  local case_trace_dir="$TRACES_DIR/$test_id"
  mkdir -p "$case_trace_dir"
  echo "$case_json" > "$case_trace_dir/input-context.json"

  local skill_result
  skill_result="$(validate_skill "$skill")" || true

  if [[ "$skill_result" == FAIL:* ]]; then
    local detail="${skill_result#FAIL:}"
    log_fail "$test_id — $detail"
    FAIL=$((FAIL+1))
    record_result "$skill" "fail" "$safety_veto"
    echo "FAIL:$detail" > "$case_trace_dir/hook-results.json"
    if [ "$severity" = "critical" ] || [ "$safety_veto" = "true" ]; then
      SAFETY_FAILS=$((SAFETY_FAILS+1))
    fi
    return
  elif [[ "$skill_result" == MISSING:* ]]; then
    log_fail "$test_id — skill '$skill' not found"
    FAIL=$((FAIL+1))
    record_result "$skill" "fail" "$safety_veto"
    echo "MISSING:skill_not_found" > "$case_trace_dir/hook-results.json"
    if [ "$severity" = "critical" ] || [ "$safety_veto" = "true" ]; then
      SAFETY_FAILS=$((SAFETY_FAILS+1))
    fi
    return
  fi

  local has_dynamic_input="false"
  if [ "$schema_v2" = "true" ]; then
    has_dynamic_input="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if (d.get('user_query') or d.get('input', {}).get('user_query')) else 'false')")"
  fi

  if [ "$MODE" = "dynamic" ] && [ "$has_dynamic_input" = "false" ]; then
    log_skip "$test_id — no dynamic input defined"
    SKIP=$((SKIP+1))
    echo "SKIP:no_dynamic_input" > "$case_trace_dir/hook-results.json"
    return
  fi

  if [ "$MODE" != "static" ] && [ "$has_dynamic_input" = "true" ]; then
    if run_dynamic_validation "$case_json" "$skill" "$test_id" "$case_trace_dir"; then
      PASS=$((PASS+1))
      record_result "$skill" "pass" "$safety_veto"
      echo "PASS" > "$case_trace_dir/hook-results.json"
      return
    else
      status=$?
      if [ "$status" -eq 2 ]; then
        if [ "$MODE" = "dynamic" ]; then
          SKIP=$((SKIP+1))
          echo "SKIP:dynamic_unavailable" > "$case_trace_dir/hook-results.json"
          return
        fi
        log_pass "$test_id (static only)"
        PASS=$((PASS+1))
        record_result "$skill" "pass" "$safety_veto"
        echo "PASS:static_only" > "$case_trace_dir/hook-results.json"
        return
      fi
      FAIL=$((FAIL+1))
      record_result "$skill" "fail" "$safety_veto"
      echo "FAIL:dynamic_validation_failed" > "$case_trace_dir/hook-results.json"
      if [ "$severity" = "critical" ] || [ "$safety_veto" = "true" ]; then
        SAFETY_FAILS=$((SAFETY_FAILS+1))
      fi
      return
    fi
  fi

  log_pass "$test_id${has_dynamic_input:+} (static only)"
  PASS=$((PASS+1))
  record_result "$skill" "pass" "$safety_veto"
  echo "PASS:static_only" > "$case_trace_dir/hook-results.json"
}

generate_scores() {
  local output_file="$1"
  python3 -c "
import json, sys

data = json.loads(sys.stdin.read())
scores = {
    'total': data['total'],
    'pass': data['pass'],
    'fail': data['fail'],
    'skip': data['skip'],
    'pass_rate': round(data['pass'] / max(data['total'], 1) * 100, 1),
    'safety_failures': data['safety_failures'],
    'safety_veto_cases': data.get('safety_veto_cases', 0),
    'schema_v2_cases': data.get('schema_v2_cases', 0),
    'dynamic_skip': data.get('dynamic_skip', 0),
    'categories': {}
}

for cat, counts in data.get('categories', {}).items():
    total = counts.get('total', 0)
    passed = counts.get('pass', 0)
    failed = counts.get('fail', 0)
    safety_veto = counts.get('safety_veto', 0)
    scores['categories'][cat] = {
        'total': total,
        'pass': passed,
        'fail': failed,
        'skip': max(total - passed - failed, 0),
        'safety_veto': safety_veto,
        'pass_rate': round(passed / max(total, 1) * 100, 1)
    }

if scores['safety_failures'] > 0:
    scores['health'] = 'FAIL'
elif scores['pass_rate'] >= 95:
    scores['health'] = 'PASS'
elif scores['pass_rate'] >= 80:
    scores['health'] = 'WARNING'
else:
    scores['health'] = 'FAIL'

with open('$output_file', 'w') as f:
    json.dump(scores, f, indent=2)
print(json.dumps(scores, indent=2))
"
}

# Main
echo "=== noah-rn Eval Harness — Phase B (Dynamic + Static) ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Cases: $CASES_DIR"
echo "Safety constraints: $SAFETY_CONSTRAINTS"
echo ""

if [ ! -d "$CASES_DIR" ]; then
  echo "ERROR: Cases directory not found at $CASES_DIR"
  exit 1
fi

FILTER_SKILL=""
FILTER_CASE=""
MODE="both"
FILTER_DYNAMIC=false
FILTER_STRUCTURAL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill) FILTER_SKILL="$2"; shift 2 ;;
    --case) FILTER_CASE="$2"; shift 2 ;;
    --candidate) CANDIDATE="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --dynamic-only) FILTER_DYNAMIC=true; MODE="dynamic"; shift ;;
    --structural-only) FILTER_STRUCTURAL=true; MODE="static"; shift ;;
    *) shift ;;
  esac
done

BACKUP_DIR=""
OVERLAY_FILES=()

cleanup_candidate() {
  if [ ${#OVERLAY_FILES[@]} -gt 0 ] && [ -n "$BACKUP_DIR" ]; then
    for rel_path in "${OVERLAY_FILES[@]}"; do
      local src="$BACKUP_DIR/$rel_path"
      local dst="$REPO_ROOT/$rel_path"
      if [ -f "$src" ]; then
        cp "$src" "$dst"
      elif [ -f "${src}.DELETED" ]; then
        rm -f "$dst"
      fi
    done
    rm -rf "$BACKUP_DIR"
  fi
}

if [ -n "${CANDIDATE:-}" ]; then
  if [[ "$CANDIDATE" =~ ^[0-9]+$ ]]; then
    CANDIDATE_DIR="$SCRIPT_DIR/candidates/candidate-$CANDIDATE"
  else
    CANDIDATE_DIR="$CANDIDATE"
  fi

  if [ ! -d "$CANDIDATE_DIR" ]; then
    echo "ERROR: Candidate directory not found: $CANDIDATE_DIR"
    exit 1
  fi

  DIFF_DIR="$CANDIDATE_DIR/diff"
  if [ ! -d "$DIFF_DIR" ]; then
    echo "ERROR: Candidate diff/ directory not found: $DIFF_DIR"
    exit 1
  fi

  BACKUP_DIR="$(mktemp -d)"
  trap cleanup_candidate EXIT

  echo "=== Applying candidate: $CANDIDATE_DIR ==="
  while IFS= read -r -d '' candidate_file; do
    rel_path="${candidate_file#$DIFF_DIR/}"
    original="$REPO_ROOT/$rel_path"

    backup_target="$BACKUP_DIR/$rel_path"
    mkdir -p "$(dirname "$backup_target")"
    if [ -f "$original" ]; then
      cp "$original" "$backup_target"
    else
      touch "${backup_target}.DELETED"
    fi

    mkdir -p "$(dirname "$original")"
    cp "$candidate_file" "$original"
    OVERLAY_FILES+=("$rel_path")
    log_info "overlaid: $rel_path"
  done < <(find "$DIFF_DIR" -type f -print0)
  echo ""
fi

for case_file in "$CASES_DIR"/*.yaml; do
  [ -f "$case_file" ] || continue

  case_id="$(python3 -c "import yaml; print(yaml.safe_load(open('$case_file')).get('test_id',''))" 2>/dev/null || echo "")"

  [ -n "$FILTER_CASE" ] && [ "$case_id" != "$FILTER_CASE" ] && continue
  [ -n "$FILTER_SKILL" ] && ! python3 -c "import yaml; d=yaml.safe_load(open('$case_file')); exit(0 if '$FILTER_SKILL' in d.get('skill','') else 1)" 2>/dev/null && continue

  is_v2="$(has_schema_v2 "$case_file")"
  if [ "$FILTER_DYNAMIC" = "true" ] && [ "$is_v2" = "false" ]; then
    continue
  fi
  if [ "$FILTER_STRUCTURAL" = "true" ] && [ "$is_v2" = "true" ]; then
    continue
  fi

  run_case "$case_file"
done

echo ""
echo "=== Results ==="
echo "Total: $TOTAL | Pass: $PASS | Fail: $FAIL | Skip: $SKIP | Safety: $SAFETY_FAILS | Safety-veto cases: $SAFETY_VETO_CASES | Schema v2: $SCHEMA_V2_COUNT | Dynamic skip: $DYNAMIC_SKIP"

echo ""
echo "=== By Category ==="
for cat in "${!CAT_TOTAL[@]}"; do
  local_pass=${CAT_PASS[$cat]:-0}
  local_fail=${CAT_FAIL[$cat]:-0}
  local_total=${CAT_TOTAL[$cat]}
  local_veto=${CAT_SAFETY_VETO[$cat]:-0}
  local_veto_tag=""
  [ "$local_veto" -gt 0 ] && local_veto_tag=" (safety_veto: $local_veto)"
  echo "  $cat: pass=$local_pass fail=$local_fail total=$local_total${local_veto_tag}"
done

SCORES_FILE="$RESULTS_DIR/scores-$(date +%Y%m%d-%H%M%S).json"
python3 -c "
import json

data = {
    'total': $TOTAL,
    'pass': $PASS,
    'fail': $FAIL,
    'skip': $SKIP,
    'safety_failures': $SAFETY_FAILS,
    'safety_veto_cases': $SAFETY_VETO_CASES,
    'schema_v2_cases': $SCHEMA_V2_COUNT,
    'dynamic_skip': $DYNAMIC_SKIP,
    'categories': {
$(for cat in "${!CAT_TOTAL[@]}"; do
  echo "        \"$cat\": {\"total\": ${CAT_TOTAL[$cat]}, \"pass\": ${CAT_PASS[$cat]:-0}, \"fail\": ${CAT_FAIL[$cat]:-0}, \"safety_veto\": ${CAT_SAFETY_VETO[$cat]:-0}},"
done | sed '$ s/,$//')
    }
}
print(json.dumps(data))
" | generate_scores "$SCORES_FILE"

if [ $FAIL -gt 0 ] || [ $SAFETY_FAILS -gt 0 ]; then
  exit 1
fi
exit 0
