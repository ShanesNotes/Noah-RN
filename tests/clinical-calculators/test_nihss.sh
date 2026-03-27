#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/nihss.sh"
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

echo "=== NIHSS Calculator Tests ==="
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
    echo "  PASS: nihss.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: nihss.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: All zeros — score 0, no stroke symptoms
echo "Test 3: All zeros (score 0 — no stroke symptoms)"
result=$("$TOOL" --1a 0 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is no stroke symptoms" "no stroke symptoms" "$category"

# Test 4: All max — score 42, severe stroke
echo "Test 4: All max (score 42 — severe stroke)"
result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 4 --5b 4 --6a 4 --6b 4 --7 2 --8 2 --9 3 --10 2 --11 2)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 42" "42" "$score"
assert_eq "category is severe stroke" "severe stroke" "$category"

# Test 5: Boundary 4 → minor stroke (score 4)
echo "Test 5: Boundary score 4 — minor stroke"
result=$("$TOOL" --1a 1 --1b 1 --1c 1 --2 1 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 4" "4" "$score"
assert_eq "category is minor stroke" "minor stroke" "$category"

# Test 5b: Boundary 5 → moderate stroke
echo "Test 5b: Boundary score 5 — moderate stroke"
result=$("$TOOL" --1a 1 --1b 1 --1c 1 --2 1 --3 1 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 5" "5" "$score"
assert_eq "category is moderate stroke" "moderate stroke" "$category"

# Test 5c: Boundary 15 → moderate stroke
echo "Test 5c: Boundary score 15 — moderate stroke"
result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 15" "15" "$score"
assert_eq "category is moderate stroke" "moderate stroke" "$category"

# Test 5d: Boundary 16 → moderate to severe stroke
echo "Test 5d: Boundary score 16 — moderate to severe stroke"
result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 1 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 16" "16" "$score"
assert_eq "category is moderate to severe stroke" "moderate to severe stroke" "$category"

# Test 5e: Boundary 20 → moderate to severe stroke
echo "Test 5e: Boundary score 20 — moderate to severe stroke"
result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 3 --5b 2 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 20" "20" "$score"
assert_eq "category is moderate to severe stroke" "moderate to severe stroke" "$category"

# Test 5f: Boundary 21 → severe stroke
echo "Test 5f: Boundary score 21 — severe stroke"
result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 3 --5b 2 --6a 1 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 21" "21" "$score"
assert_eq "category is severe stroke" "severe stroke" "$category"

# Test 6: Invalid item — 1a out of range (5 > max 3)
echo "Test 6: Invalid item --1a 5 (out of range)"
result=$("$TOOL" --1a 5 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"

invalid_exit=0
"$TOOL" --1a 5 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for invalid --1a"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for invalid --1a, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 7: Missing args → exit 1, error JSON
echo "Test 7: Missing args (no arguments)"
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

# Test 8: Help flag → exit 0, output contains "Usage"
echo "Test 8: Help flag"
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

# Test 9: JSON validity
echo "Test 9: JSON validity"
result=$("$TOOL" --1a 0 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --1a 5 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 10: max_score is 42
echo "Test 10: max_score is 42"
result=$("$TOOL" --1a 0 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 42" "42" "$max"

# Test 11: Components are present in output
echo "Test 11: Components present in output"
result=$("$TOOL" --1a 1 --1b 0 --1c 0 --2 2 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
comp_1a=$(echo "$result" | jq -r '.components."1a"')
comp_2=$(echo "$result" | jq -r '.components."2"')
assert_eq "component 1a is 1" "1" "$comp_1a"
assert_eq "component 2 is 2" "2" "$comp_2"

# Test 12: Interpretation present for each category
echo "Test 12: Interpretation present for categories"
result=$("$TOOL" --1a 0 --1b 0 --1c 0 --2 0 --3 0 --4 0 --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "no stroke interpretation" "neurological" "$interp"

result=$("$TOOL" --1a 3 --1b 2 --1c 2 --2 2 --3 3 --4 3 --5a 4 --5b 4 --6a 4 --6b 4 --7 2 --8 2 --9 3 --10 2 --11 2)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "severe stroke interpretation" "morbidity" "$interp"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
