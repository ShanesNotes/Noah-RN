#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/braden.sh"
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

echo "=== Braden Scale Tests ==="
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
    echo "  PASS: braden.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: braden.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score (6 — very high risk; lower is worse)
echo "Test 3: Minimum score (6 — very high risk)"
result=$("$TOOL" --sensory 1 --moisture 1 --activity 1 --mobility 1 --nutrition 1 --friction 1)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 6" "6" "$score"
assert_eq "category is very high risk" "very high risk" "$category"

# Test 4: Maximum score (23 — no significant risk)
echo "Test 4: Maximum score (23 — no significant risk)"
result=$("$TOOL" --sensory 4 --moisture 4 --activity 4 --mobility 4 --nutrition 4 --friction 3)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 23" "23" "$score"
assert_eq "category is no significant risk" "no significant risk" "$category"

# Test 5: Score 9 — very high risk boundary
echo "Test 5: Score 9 (very high risk)"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 1 --mobility 1 --nutrition 2 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 9" "9" "$score"
assert_eq "category is very high risk" "very high risk" "$category"

# Test 6: Score 10 — high risk boundary
echo "Test 6: Score 10 (high risk)"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 1 --nutrition 2 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 10" "10" "$score"
assert_eq "category is high risk" "high risk" "$category"

# Test 7: Score 12 — high risk upper boundary
echo "Test 7: Score 12 (high risk)"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 2 --nutrition 3 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 12" "12" "$score"
assert_eq "category is high risk" "high risk" "$category"

# Test 8: Score 13 — moderate risk boundary
echo "Test 8: Score 13 (moderate risk)"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 2 --nutrition 4 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 13" "13" "$score"
assert_eq "category is moderate risk" "moderate risk" "$category"

# Test 9: Score 15 — at risk boundary
echo "Test 9: Score 15 (at risk)"
result=$("$TOOL" --sensory 3 --moisture 3 --activity 2 --mobility 2 --nutrition 4 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 15" "15" "$score"
assert_eq "category is at risk" "at risk" "$category"

# Test 10: Score 19 — no significant risk boundary
echo "Test 10: Score 19 (no significant risk)"
result=$("$TOOL" --sensory 4 --moisture 4 --activity 3 --mobility 3 --nutrition 4 --friction 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 19" "19" "$score"
assert_eq "category is no significant risk" "no significant risk" "$category"

# Test 11: Inverted risk direction (low score = high risk, high score = low risk)
echo "Test 11: Inverted risk direction"
result_low=$("$TOOL" --sensory 1 --moisture 1 --activity 1 --mobility 1 --nutrition 1 --friction 1)
result_high=$("$TOOL" --sensory 4 --moisture 4 --activity 4 --mobility 4 --nutrition 4 --friction 3)
cat_low=$(echo "$result_low" | jq -r '.category')
cat_high=$(echo "$result_high" | jq -r '.category')
assert_eq "low score = very high risk" "very high risk" "$cat_low"
assert_eq "high score = no significant risk" "no significant risk" "$cat_high"

# Test 12: friction max=3 enforced (value 4 → invalid)
echo "Test 12: friction max is 3 (value 4 → invalid)"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 2 --nutrition 2 --friction 4 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for friction=4" "error" "$status"
assert_contains "message mentions friction" "friction" "$result"

invalid_exit=0
"$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 2 --nutrition 2 --friction 4 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for friction=4"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for friction=4, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 13: sensory out of range (5 → invalid)
echo "Test 13: sensory out of range (5)"
result=$("$TOOL" --sensory 5 --moisture 2 --activity 2 --mobility 2 --nutrition 2 --friction 2 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for sensory=5" "error" "$status"

# Test 14: Missing args → exit 1, error JSON
echo "Test 14: Missing args (no arguments)"
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

# Test 15: Help flag → exit 0
echo "Test 15: Help flag"
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

# Test 16: JSON validity
echo "Test 16: JSON validity"
result=$("$TOOL" --sensory 3 --moisture 3 --activity 3 --mobility 3 --nutrition 3 --friction 2)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --sensory 5 --moisture 2 --activity 2 --mobility 2 --nutrition 2 --friction 2 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 17: max_score is 23
echo "Test 17: max_score is 23"
result=$("$TOOL" --sensory 2 --moisture 2 --activity 2 --mobility 2 --nutrition 2 --friction 2)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 23" "23" "$max"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
