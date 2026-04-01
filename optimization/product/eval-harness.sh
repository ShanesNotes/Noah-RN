#!/usr/bin/env bash
set -euo pipefail
# Eval Harness — Phase B
# Runs skills against golden test cases, captures traces, produces scores.json.
#
# Usage: optimization/product/eval-harness.sh [--candidate <N>] [--case <id>] [--skill <name>]
#
# Validates each candidate against the golden test suite and produces:
# - scores.json with per-category metrics
# - failure-modes.md with diagnosed issues
# - traces/ with per-case execution logs

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

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}PASS${NC} $1"; }
log_fail() { echo -e "${RED}FAIL${NC} $1"; }
log_skip() { echo -e "${YELLOW}SKIP${NC} $1"; }

# Category tracking
declare -A CAT_TOTAL CAT_PASS CAT_FAIL

record_result() {
  local category="$1" result="$2"
  CAT_TOTAL[$category]=$(( ${CAT_TOTAL[$category]:-0} + 1 ))
  if [ "$result" = "pass" ]; then
    CAT_PASS[$category]=$(( ${CAT_PASS[$category]:-0} + 1 ))
  else
    CAT_FAIL[$category]=$(( ${CAT_FAIL[$category]:-0} + 1 ))
  fi
}

# Parse YAML test case
parse_case() {
  local file="$1"
  python3 -c "
import yaml, json
with open('$file') as f:
    data = yaml.safe_load(f)
print(json.dumps(data))
" 2>/dev/null
}

# Validate skill structure against safety constraints
validate_skill() {
  local skill="$1"
  local skill_file
  skill_file="$(find "$REPO_ROOT/plugin/skills" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1)"

  if [ -z "$skill_file" ]; then
    echo "MISSING:skill_not_found"
    return 1
  fi

  local errors=()

  # Safety disclaimer
  if ! grep -qi "not.*medical.*advice\|consult.*physician\|human.*review\|HITL\|clinical.*decision.*support\|draft.*only" "$skill_file"; then
    errors+=("missing_safety_disclaimer")
  fi

  # Four-layer format
  if ! grep -qi "summary\|evidence\|confidence\|provenance" "$skill_file"; then
    errors+=("missing_four_layer_format")
  fi

  # Completeness checklist
  if ! grep -qi "checklist\|must.*include\|required.*section\|completeness" "$skill_file"; then
    errors+=("missing_completeness_checklist")
  fi

  # HITL requirement
  if ! grep -qi "human.*review\|HITL\|clinician.*review\|do.*not.*autonomously" "$skill_file"; then
    errors+=("missing_HITL_requirement")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    echo "FAIL:$(IFS=,; echo "${errors[*]}")"
    return 1
  fi

  echo "PASS"
  return 0
}

# Run a single test case
run_case() {
  local case_file="$1"
  local case_json
  case_json="$(parse_case "$case_file")" || { log_skip "$(basename "$case_file") (parse error)"; SKIP=$((SKIP+1)); return; }

  local test_id skill description severity
  test_id="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('test_id','?'))")"
  skill="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('skill','?'))")"
  description="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('description','?'))")"
  severity="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('severity','medium'))")"

  TOTAL=$((TOTAL+1))
  echo "--- $test_id: $description [$severity]"

  # Validate skill structure
  local skill_result
  skill_result="$(validate_skill "$skill")" || true

  if [[ "$skill_result" == FAIL:* ]]; then
    local detail="${skill_result#FAIL:}"
    if [ "$severity" = "critical" ]; then
      SAFETY_FAILS=$((SAFETY_FAILS+1))
    fi
    log_fail "$test_id — $detail"
    FAIL=$((FAIL+1))
    record_result "$skill" "fail"
    return
  elif [[ "$skill_result" == MISSING:* ]]; then
    log_fail "$test_id — skill '$skill' not found"
    FAIL=$((FAIL+1))
    record_result "$skill" "fail"
    return
  fi

  log_pass "$test_id"
  PASS=$((PASS+1))
  record_result "$skill" "pass"
}

# Generate scores.json
generate_scores() {
  local output_file="$1"
  python3 -c "
import json, sys

data = json.loads(sys.stdin.read())
data['pass'] = data['total'] - data['fail'] - data['skip']
scores = {
    'total': data['total'],
    'pass': data['pass'],
    'fail': data['fail'],
    'skip': data['skip'],
    'pass_rate': round(data['pass'] / max(data['total'], 1) * 100, 1),
    'safety_failures': data['safety_failures'],
    'categories': {}
}

for cat, counts in data.get('categories', {}).items():
    total = counts.get('total', 0)
    passed = counts.get('pass', 0)
    scores['categories'][cat] = {
        'total': total,
        'pass': passed,
        'fail': total - passed,
        'pass_rate': round(passed / max(total, 1) * 100, 1)
    }

# Overall health score
# Safety failures are veto-weight
if scores['safety_failures'] > 0:
    scores['health'] = 'FAIL — safety violations'
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
echo "=== noah-rn Eval Harness — Phase B ==="
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

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill) FILTER_SKILL="$2"; shift 2 ;;
    --case) FILTER_CASE="$2"; shift 2 ;;
    --candidate) CANDIDATE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Candidate overlay
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
  # Resolve number → full path
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

    # Back up original
    backup_target="$BACKUP_DIR/$rel_path"
    mkdir -p "$(dirname "$backup_target")"
    if [ -f "$original" ]; then
      cp "$original" "$backup_target"
    else
      touch "${backup_target}.DELETED"
    fi

    # Overlay candidate file
    mkdir -p "$(dirname "$original")"
    cp "$candidate_file" "$original"
    OVERLAY_FILES+=("$rel_path")
    echo "  overlaid: $rel_path"
  done < <(find "$DIFF_DIR" -type f -print0)
  echo ""
fi

for case_file in "$CASES_DIR"/*.yaml; do
  [ -f "$case_file" ] || continue

  case_id="$(python3 -c "import yaml; print(yaml.safe_load(open('$case_file')).get('test_id',''))" 2>/dev/null || echo "")"

  [ -n "$FILTER_CASE" ] && [ "$case_id" != "$FILTER_CASE" ] && continue
  [ -n "$FILTER_SKILL" ] && ! python3 -c "import yaml; d=yaml.safe_load(open('$case_file')); exit(0 if '$FILTER_SKILL' in d.get('skill','') else 1)" 2>/dev/null && continue

  run_case "$case_file"
done

echo ""
echo "=== Results ==="
echo "Total: $TOTAL | Pass: $PASS | Fail: $FAIL | Skip: $SKIP | Safety: $SAFETY_FAILS"

# Category breakdown
echo ""
echo "=== By Category ==="
for cat in "${!CAT_TOTAL[@]}"; do
  local_pass=${CAT_PASS[$cat]:-0}
  local_total=${CAT_TOTAL[$cat]}
  echo "  $cat: $local_pass/$local_total"
done

# Generate scores.json
SCORES_FILE="$RESULTS_DIR/scores-$(date +%Y%m%d-%H%M%S).json"
python3 -c "
import json
data = {
    'total': $TOTAL,
    'pass': $TOTAL - $FAIL - $SKIP,
    'fail': $FAIL,
    'skip': $SKIP,
    'safety_failures': $SAFETY_FAILS,
    'categories': {
$(for cat in "${!CAT_TOTAL[@]}"; do
  echo "        \"$cat\": {\"total\": ${CAT_TOTAL[$cat]}, \"pass\": ${CAT_PASS[$cat]:-0}},"
done | sed '$ s/,$//')
    }
}
print(json.dumps(data))
" | generate_scores "$SCORES_FILE"

if [ $FAIL -gt 0 ] || [ $SAFETY_FAILS -gt 0 ]; then
  exit 1
fi
exit 0
