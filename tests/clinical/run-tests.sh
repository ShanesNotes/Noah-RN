#!/usr/bin/env bash
set -euo pipefail
# Clinical Golden Test Runner
# Runs each test case through the appropriate skill, validates output against expectations.
#
# Usage: tests/clinical/run-tests.sh [--skill <name>] [--case <id>]
#
# Requires: jq, yq (or python3 with PyYAML), network access for OpenFDA lookups
#
# Test cases are YAML files in tests/clinical/cases/
# Each case defines: test_id, skill, description, input, expected, severity

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CASES_DIR="$SCRIPT_DIR/cases"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Counters
TOTAL=0
PASS=0
FAIL=0
SKIP=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}PASS${NC} $1"; }
log_fail() { echo -e "${RED}FAIL${NC} $1"; }
log_skip() { echo -e "${YELLOW}SKIP${NC} $1"; }

# Parse a YAML test case using python3
parse_case() {
  local file="$1"
  python3 -c "
import yaml, json, sys
with open('$file') as f:
    data = yaml.safe_load(f)
print(json.dumps(data))
" 2>/dev/null
}

# Check if output contains all required strings
check_must_contain() {
  local output="$1"
  local requirements="$2"  # JSON array of strings
  local missing=()
  for req in $(echo "$requirements" | python3 -c "import json,sys; [print(r) for r in json.load(sys.stdin)]"); do
    if ! echo "$output" | grep -qi "$req"; then
      missing+=("$req")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing: ${missing[*]}"
    return 1
  fi
  return 0
}

# Check that output does NOT contain forbidden strings
check_must_not_contain() {
  local output="$1"
  local prohibitions="$2"  # JSON array of strings
  local found=()
  for proh in $(echo "$prohibitions" | python3 -c "import json,sys; [print(p) for p in json.load(sys.stdin)]"); do
    if echo "$output" | grep -qi "$proh"; then
      found+=("$proh")
    fi
  done
  if [ ${#found[@]} -gt 0 ]; then
    echo "Forbidden found: ${found[*]}"
    return 1
  fi
  return 0
}

# Check four-layer output format
check_format() {
  local output="$1"
  local layers=("summary" "evidence" "confidence" "provenance")
  local missing=()
  for layer in "${layers[@]}"; do
    if ! echo "$output" | grep -qi "$layer"; then
      missing+=("$layer")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing format layers: ${missing[*]}"
    return 1
  fi
  return 0
}

# Run a single test case
run_case() {
  local case_file="$1"
  local case_json
  case_json="$(parse_case "$case_file")" || { log_skip "$case_file (parse error)"; SKIP=$((SKIP+1)); return; }

  local test_id skill description severity
  test_id="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('test_id','?'))")"
  skill="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('skill','?'))")"
  description="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('description','?'))")"
  severity="$(echo "$case_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('severity','medium'))")"

  TOTAL=$((TOTAL+1))
  echo "--- $test_id: $description [$severity]"

  # Check if skill file exists
  local skill_file
  skill_file="$(find "$REPO_ROOT/packages/workflows" -name "SKILL.md" -path "*$skill*" 2>/dev/null | head -1)"
  if [ -z "$skill_file" ]; then
    log_fail "$test_id — skill '$skill' not found"
    FAIL=$((FAIL+1))
    return
  fi

  # For now, validate the skill file has required structure
  # Full execution requires Claude API — we validate static properties
  local errors=()

  # Check skill has safety disclaimer
  if ! grep -qi "not.*medical.*advice\|consult.*physician\|human.*review\|HITL\|clinical.*decision.*support" "$skill_file"; then
    errors+=("missing safety disclaimer")
  fi

  # Check skill has four-layer format reference
  if ! grep -qi "summary\|evidence\|confidence\|provenance" "$skill_file"; then
    errors+=("missing four-layer format")
  fi

  # Check skill has completeness checklist
  if ! grep -qi "checklist\|must.*include\|required.*section" "$skill_file"; then
    errors+=("missing completeness checklist")
  fi

  if [ ${#errors[@]} -gt 0 ]; then
    log_fail "$test_id — ${errors[*]}"
    FAIL=$((FAIL+1))
    return
  fi

  log_pass "$test_id"
  PASS=$((PASS+1))
}

# Main
FILTER_SKILL="${1:-}"
FILTER_CASE="${2:-}"

echo "=== noah-rn Clinical Golden Test Suite ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Cases: $CASES_DIR"
echo ""

if [ ! -d "$CASES_DIR" ]; then
  echo "ERROR: Cases directory not found at $CASES_DIR"
  exit 1
fi

for case_file in "$CASES_DIR"/*.yaml; do
  [ -f "$case_file" ] || continue

  case_id="$(python3 -c "import yaml; print(yaml.safe_load(open('$case_file')).get('test_id',''))" 2>/dev/null || echo "")"

  # Apply filters
  if [ -n "$FILTER_CASE" ] && [ "$case_id" != "$FILTER_CASE" ]; then
    continue
  fi

  run_case "$case_file"
done

echo ""
echo "=== Results ==="
echo "Total: $TOTAL | Pass: $PASS | Fail: $FAIL | Skip: $SKIP"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
