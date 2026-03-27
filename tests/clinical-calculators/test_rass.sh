#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/rass.sh"
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

echo "=== RASS Calculator Tests ==="
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
    echo "  PASS: rass.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: rass.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Score +4 — Combative
echo "Test 3: Score +4 (Combative)"
result=$("$TOOL" --score 4)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 4" "4" "$score"
assert_eq "category is Combative" "Combative" "$category"

# Test 4: Score 0 — Alert and calm
echo "Test 4: Score 0 (Alert and calm)"
result=$("$TOOL" --score 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is Alert and calm" "Alert and calm" "$category"

# Test 5: Negative scores
echo "Test 5: Score -3 (Moderate sedation)"
result=$("$TOOL" --score -3)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is -3" "-3" "$score"
assert_eq "category is Moderate sedation" "Moderate sedation" "$category"

echo "Test 5: Score -5 (Unarousable)"
result=$("$TOOL" --score -5)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is -5" "-5" "$score"
assert_eq "category is Unarousable" "Unarousable" "$category"

# Test 6: Score -1 — Drowsy
echo "Test 6: Score -1 (Drowsy)"
result=$("$TOOL" --score -1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is -1" "-1" "$score"
assert_eq "category is Drowsy" "Drowsy" "$category"

# Test 7: Score +3 — Very agitated
echo "Test 7: Score +3 (Very agitated)"
result=$("$TOOL" --score 3)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 3" "3" "$score"
assert_eq "category is Very agitated" "Very agitated" "$category"

# Test 8: Out-of-range score → exit 1, error JSON
echo "Test 8: Out-of-range score (5)"
result=$("$TOOL" --score 5 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"

invalid_exit=0
"$TOOL" --score 5 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for score 5"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for score 5, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

echo "Test 8: Out-of-range score (-6)"
result=$("$TOOL" --score -6 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for -6" "error" "$status"

# Test 9: Non-integer input → exit 1, error JSON
echo "Test 9: Non-integer input (abc)"
result=$("$TOOL" --score abc 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for non-integer" "error" "$status"

invalid_exit=0
"$TOOL" --score abc > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for non-integer"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for non-integer, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 10: Missing args → exit 1, error JSON
echo "Test 10: Missing args (no arguments)"
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

# Test 11: Help flag → exit 0
echo "Test 11: Help flag"
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

# Test 12: JSON validity
echo "Test 12: JSON validity"
result=$("$TOOL" --score 2)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --score 9 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 13: max_score field is 4
echo "Test 13: max_score is 4"
result=$("$TOOL" --score 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 4" "4" "$max"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
