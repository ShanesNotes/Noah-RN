#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/cpot.sh"
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

echo "=== CPOT Calculator Tests ==="
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
    echo "  PASS: cpot.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: cpot.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score (0 — no significant pain)
echo "Test 3: Minimum score (0 — no significant pain)"
result=$("$TOOL" --facial 0 --body 0 --muscle 0 --compliance 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is no significant pain" "no significant pain" "$category"

# Test 4: Maximum score (8 — significant pain)
echo "Test 4: Maximum score (8 — significant pain)"
result=$("$TOOL" --facial 2 --body 2 --muscle 2 --compliance 2)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 8" "8" "$score"
assert_eq "category is significant pain" "significant pain" "$category"

# Test 5: Boundary — score 2 → no significant pain
echo "Test 5: Boundary — score 2 (no significant pain)"
result=$("$TOOL" --facial 1 --body 1 --muscle 0 --compliance 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 2" "2" "$score"
assert_eq "category is no significant pain" "no significant pain" "$category"

# Test 6: Boundary — score 3 → significant pain
echo "Test 6: Boundary — score 3 (significant pain)"
result=$("$TOOL" --facial 1 --body 1 --muscle 1 --compliance 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 3" "3" "$score"
assert_eq "category is significant pain" "significant pain" "$category"

# Test 7: Components captured in output
echo "Test 7: Components in output"
result=$("$TOOL" --facial 1 --body 2 --muscle 0 --compliance 1)
facial=$(echo "$result" | jq -r '.components.facial')
body=$(echo "$result" | jq -r '.components.body')
muscle=$(echo "$result" | jq -r '.components.muscle')
compliance=$(echo "$result" | jq -r '.components.compliance')
assert_eq "facial component" "1" "$facial"
assert_eq "body component" "2" "$body"
assert_eq "muscle component" "0" "$muscle"
assert_eq "compliance component" "1" "$compliance"

# Test 8: Invalid input (facial > 2) → exit 1, error JSON
echo "Test 8: Invalid facial score (3)"
result=$("$TOOL" --facial 3 --body 0 --muscle 0 --compliance 0 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"
assert_contains "message mentions facial" "facial" "$result"

invalid_exit=0
"$TOOL" --facial 3 --body 0 --muscle 0 --compliance 0 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for invalid facial"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for invalid facial, got $invalid_exit"
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
result=$("$TOOL" --facial 1 --body 0 --muscle 1 --compliance 0)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --facial 3 --body 0 --muscle 0 --compliance 0 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 12: max_score is 8
echo "Test 12: max_score is 8"
result=$("$TOOL" --facial 0 --body 0 --muscle 0 --compliance 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 8" "8" "$max"

# Test 13: Args in any order
echo "Test 13: Args in any order"
result_ordered=$("$TOOL" --facial 1 --body 2 --muscle 0 --compliance 1)
result_shuffled=$("$TOOL" --compliance 1 --muscle 0 --facial 1 --body 2)
score_ordered=$(echo "$result_ordered" | jq -r '.score')
score_shuffled=$(echo "$result_shuffled" | jq -r '.score')
assert_eq "score same regardless of order" "$score_ordered" "$score_shuffled"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
