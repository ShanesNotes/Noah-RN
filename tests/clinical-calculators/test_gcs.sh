#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/gcs.sh"
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

echo "=== GCS Calculator Tests ==="
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
    echo "  PASS: gcs.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: gcs.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score — eye 1 verbal 1 motor 1 → score 3, category severe
echo "Test 3: Minimum score (3 — severe)"
result=$("$TOOL" --eye 1 --verbal 1 --motor 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 3" "3" "$score"
assert_eq "category is severe" "severe" "$category"

# Test 4: Maximum score — eye 4 verbal 5 motor 6 → score 15, category mild
echo "Test 4: Maximum score (15 — mild)"
result=$("$TOOL" --eye 4 --verbal 5 --motor 6)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 15" "15" "$score"
assert_eq "category is mild" "mild" "$category"

# Test 5: Boundary conditions
echo "Test 5: Boundary — score 8 → severe"
result=$("$TOOL" --eye 2 --verbal 2 --motor 4)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 8" "8" "$score"
assert_eq "category is severe" "severe" "$category"

echo "Test 5: Boundary — score 9 → moderate"
result=$("$TOOL" --eye 2 --verbal 2 --motor 5)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 9" "9" "$score"
assert_eq "category is moderate" "moderate" "$category"

echo "Test 5: Boundary — score 12 → moderate"
result=$("$TOOL" --eye 3 --verbal 3 --motor 6)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 12" "12" "$score"
assert_eq "category is moderate" "moderate" "$category"

echo "Test 5: Boundary — score 13 → mild"
result=$("$TOOL" --eye 4 --verbal 3 --motor 6)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 13" "13" "$score"
assert_eq "category is mild" "mild" "$category"

# Test 6: Invalid input — eye out of range → exit 1, error JSON
echo "Test 6: Invalid eye score (7)"
result=$("$TOOL" --eye 7 --verbal 3 --motor 4 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"
assert_contains "message mentions eye" "eye" "$result"

# Verify exit code 1 for invalid input
invalid_exit=0
"$TOOL" --eye 7 --verbal 3 --motor 4 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for invalid eye"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for invalid eye, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 7: Missing args → exit 1, error JSON
echo "Test 7: Missing args (no arguments)"
result=$("$TOOL" 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error on no args" "error" "$status"

# Test 8: Help flag → exit 0, output contains "Usage"
echo "Test 8: Help flag"
result=$("$TOOL" --help 2>&1)
assert_contains "output contains Usage" "usage" "$result"

# Test 9: All outputs are valid JSON (pipe through jq)
echo "Test 9: JSON validity"
result=$("$TOOL" --eye 3 --verbal 4 --motor 5)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --eye 7 --verbal 3 --motor 4 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 10: Args in any order
echo "Test 10: Args in any order"
result_ordered=$("$TOOL" --eye 3 --verbal 4 --motor 6)
result_shuffled=$("$TOOL" --motor 6 --eye 3 --verbal 4)
score_ordered=$(echo "$result_ordered" | jq -r '.score')
score_shuffled=$(echo "$result_shuffled" | jq -r '.score')
category_ordered=$(echo "$result_ordered" | jq -r '.category')
category_shuffled=$(echo "$result_shuffled" | jq -r '.category')
assert_eq "score same regardless of order" "$score_ordered" "$score_shuffled"
assert_eq "category same regardless of order" "$category_ordered" "$category_shuffled"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
