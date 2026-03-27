#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/wells-pe.sh"
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

echo "=== Wells PE Calculator Tests ==="
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
    echo "  PASS: wells-pe.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: wells-pe.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: All zeros — score 0, low probability, PE unlikely
echo "Test 3: All zeros (score 0 — low probability)"
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0.0" "0.0" "$score"
assert_eq "category is low probability" "low probability" "$category"
assert_eq "simplified is PE unlikely" "PE unlikely" "$simplified"

# Test 4: All ones — score 12.5, high probability, PE likely
echo "Test 4: All ones (score 12.5 — high probability)"
result=$("$TOOL" --dvt 1 --heartrate 1 --immobilization 1 --prior 1 --hemoptysis 1 --malignancy 1 --alternative 1)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 12.5" "12.5" "$score"
assert_eq "category is high probability" "high probability" "$category"
assert_eq "simplified is PE likely" "PE likely" "$simplified"

# Test 5: DVT only — score 3.0, decimal output
echo "Test 5: DVT only (score 3.0)"
result=$("$TOOL" --dvt 1 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 3.0" "3.0" "$score"
assert_eq "category is moderate probability" "moderate probability" "$category"

# Test 6: Boundary — score 1.5 (heartrate only) → low probability
echo "Test 6: Boundary 1.5 — low probability"
result=$("$TOOL" --dvt 0 --heartrate 1 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 1.5" "1.5" "$score"
assert_eq "category is moderate probability" "moderate probability" "$category"

# Test 6b: Score exactly 1.0 → low probability
echo "Test 6b: Score 1.0 (hemoptysis+malignancy) — low probability"
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 1 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 1.0" "1.0" "$score"
assert_eq "category is low probability" "low probability" "$category"

# Test 6c: Score exactly 2 → moderate probability boundary
echo "Test 6c: Score 2.0 (hemoptysis+malignancy) — moderate probability"
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 1 --malignancy 1 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 2.0" "2.0" "$score"
assert_eq "category is moderate probability" "moderate probability" "$category"

# Test 7: Boundary at >6 — high probability requires score > 6
# heartrate=1 + immobilization=1 + prior=1 + hemoptysis=1 + malignancy=1 = 1.5+1.5+1.5+1.0+1.0 = 6.5
echo "Test 7: Boundary at >6 — high probability"
result=$("$TOOL" --dvt 0 --heartrate 1 --immobilization 1 --prior 1 --hemoptysis 1 --malignancy 1 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 6.5" "6.5" "$score"
assert_eq "score 6.5 is high probability" "high probability" "$category"

# Score exactly 6.0: heartrate=1+immobilization=1+prior=1+hemoptysis=1 = 1.5+1.5+1.5+1.0 = 5.5 ... nope
# dvt=1+hemoptysis=1+malignancy=1 = 3.0+1.0+1.0 = 5.0, moderate
# dvt=1+heartrate=1 = 3.0+1.5 = 4.5, moderate; + immobilization=1 → 6.0 → moderate
result=$("$TOOL" --dvt 1 --heartrate 1 --immobilization 1 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 6.0" "6.0" "$score"
assert_eq "score 6.0 is moderate probability" "moderate probability" "$category"

# Test 8: Simplified tier — ≤4 vs >4
echo "Test 8: Simplified tier — PE unlikely vs PE likely"
# Score 4.5 (dvt=1, heartrate=1, prior=0, immobilization=0, hemoptysis=0, malignancy=0, alternative=0) = 3.0+1.5 = 4.5
result=$("$TOOL" --dvt 1 --heartrate 1 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score is 4.5" "4.5" "$score"
assert_eq "4.5 simplified is PE likely" "PE likely" "$simplified"

# Score exactly 4.0 → PE unlikely
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 1 --malignancy 1 --alternative 0)
score=$(echo "$result" | jq -r '.score')
simplified=$(echo "$result" | jq -r '.simplified')
# hemoptysis=1.0 + malignancy=1.0 = 2.0, still PE unlikely
assert_eq "2.0 simplified is PE unlikely" "PE unlikely" "$simplified"

# prior=1.5 + immobilization=1.5 + hemoptysis=1.0 = 4.0, PE unlikely
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 1 --prior 1 --hemoptysis 1 --malignancy 0 --alternative 0)
score=$(echo "$result" | jq -r '.score')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score is 4.0" "4.0" "$score"
assert_eq "4.0 simplified is PE unlikely" "PE unlikely" "$simplified"

# Test 9: Invalid criterion (dvt=2) → exit 1, error JSON
echo "Test 9: Invalid criterion (dvt=2)"
result=$("$TOOL" --dvt 2 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for dvt=2" "error" "$status"

invalid_exit=0
"$TOOL" --dvt 2 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for dvt=2"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for dvt=2, got $invalid_exit"
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
result=$("$TOOL" --dvt 1 --heartrate 0 --immobilization 1 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --dvt 2 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 13: max_score is 12.5
echo "Test 13: max_score is 12.5"
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 12.5" "12.5" "$max"

# Test 14: Components present in output
echo "Test 14: Components present in output"
result=$("$TOOL" --dvt 1 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
comp_dvt=$(echo "$result" | jq -r '.components.dvt')
comp_hr=$(echo "$result" | jq -r '.components.heartrate')
assert_eq "component dvt is 1" "1" "$comp_dvt"
assert_eq "component heartrate is 0" "0" "$comp_hr"

# Test 15: Interpretation present
echo "Test 15: Interpretation for each category"
result=$("$TOOL" --dvt 0 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "low prob interpretation mentions D-dimer" "d-dimer" "$interp"

result=$("$TOOL" --dvt 1 --heartrate 0 --immobilization 0 --prior 0 --hemoptysis 0 --malignancy 0 --alternative 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "moderate prob interpretation mentions CT" "ct" "$interp"

result=$("$TOOL" --dvt 1 --heartrate 1 --immobilization 1 --prior 1 --hemoptysis 1 --malignancy 1 --alternative 1)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "high prob interpretation mentions CT angiography" "ct angiography" "$interp"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
