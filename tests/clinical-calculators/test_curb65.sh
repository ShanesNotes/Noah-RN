#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/curb65.sh"
PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: ${haystack:0:200}..."
        FAIL=$((FAIL + 1))
    fi
}

echo "=== CURB-65 Calculator Tests ==="
echo ""

# Test 1: jq dependency
echo "Test 1: jq dependency"
if command -v jq &>/dev/null; then
    echo "  PASS: jq is installed"
    PASS=$((PASS + 1))
else
    echo "  FAIL: jq is not installed"
    FAIL=$((FAIL + 1))
fi

# Test 2: Tool is executable
echo "Test 2: Tool is executable"
if [[ -x "$TOOL" ]]; then
    echo "  PASS: curb65.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: curb65.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score (0 — low risk)
echo "Test 3: Minimum score (0 — low risk)"
result=$("$TOOL" --confusion 0 --urea 0 --rr 0 --bp 0 --age 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is low risk" "low risk" "$category"

# Test 4: Maximum score (5 — high risk)
echo "Test 4: Maximum score (5 — high risk)"
result=$("$TOOL" --confusion 1 --urea 1 --rr 1 --bp 1 --age 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 5" "5" "$score"
assert_eq "category is high risk" "high risk" "$category"

# Test 5: Score 1 — low risk boundary
echo "Test 5: Score 1 (low risk)"
result=$("$TOOL" --confusion 1 --urea 0 --rr 0 --bp 0 --age 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 1" "1" "$score"
assert_eq "category is low risk" "low risk" "$category"

# Test 6: Score 2 — moderate risk
echo "Test 6: Score 2 (moderate risk)"
result=$("$TOOL" --confusion 1 --urea 1 --rr 0 --bp 0 --age 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 2" "2" "$score"
assert_eq "category is moderate risk" "moderate risk" "$category"

# Test 7: Score 3 — high risk boundary
echo "Test 7: Score 3 (high risk)"
result=$("$TOOL" --confusion 1 --urea 1 --rr 1 --bp 0 --age 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 3" "3" "$score"
assert_eq "category is high risk" "high risk" "$category"

# Test 8: Criterion value 2 → invalid (only 0 or 1 accepted)
echo "Test 8: Invalid criterion value (confusion=2)"
result=$("$TOOL" --confusion 2 --urea 0 --rr 0 --bp 0 --age 0 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for confusion=2" "error" "$status"

invalid_exit=0
"$TOOL" --confusion 2 --urea 0 --rr 0 --bp 0 --age 0 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for confusion=2"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for confusion=2, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 9: Missing args → exit 1, error JSON
echo "Test 9: Missing args (no arguments)"
result=$("$TOOL" 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error on no args" "error" "$status"

missing_exit=0
"$TOOL" > /dev/null 2>&1 || missing_exit=$?
if [[ "$missing_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for missing args"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for missing args, got $missing_exit"
    FAIL=$((FAIL + 1))
fi

# Test 10: Help flag → exit 0
echo "Test 10: Help flag"
result=$("$TOOL" --help 2>&1)
assert_contains "output contains Usage" "usage" "$result"

help_exit=0
"$TOOL" --help > /dev/null 2>&1 || help_exit=$?
if [[ "$help_exit" -eq 0 ]]; then
    echo "  PASS: --help exits 0"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 0 for --help, got $help_exit"
    FAIL=$((FAIL + 1))
fi

# Test 11: JSON validity
echo "Test 11: JSON validity"
result=$("$TOOL" --confusion 0 --urea 1 --rr 0 --bp 1 --age 0)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --confusion 2 --urea 0 --rr 0 --bp 0 --age 0 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 12: max_score is 5
echo "Test 12: max_score is 5"
result=$("$TOOL" --confusion 0 --urea 0 --rr 0 --bp 0 --age 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 5" "5" "$max"

# Test 13: Interpretation contains mortality info
echo "Test 13: Interpretation contains mortality info"
result=$("$TOOL" --confusion 0 --urea 0 --rr 0 --bp 0 --age 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "low risk interpretation mentions mortality" "mortality" "$interp"

result=$("$TOOL" --confusion 1 --urea 1 --rr 0 --bp 0 --age 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "moderate risk interpretation mentions mortality" "mortality" "$interp"

result=$("$TOOL" --confusion 1 --urea 1 --rr 1 --bp 0 --age 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "high risk interpretation mentions ICU" "icu" "$interp"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
