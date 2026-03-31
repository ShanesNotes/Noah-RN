#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/wells-dvt.sh"
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

# All-zero base args for convenience
ALL_ZERO="--cancer 0 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0"

echo "=== Wells DVT Calculator Tests ==="
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
    echo "  PASS: wells-dvt.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: wells-dvt.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score — only alternative-dx=1, all others 0 → score -2
echo "Test 3: Minimum score (-2: only alternative-dx=1)"
result=$("$TOOL" --cancer 0 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 1)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "status ok" "ok" "$status"
assert_eq "score is -2" "-2" "$score"
assert_eq "category is low probability" "low probability" "$category"
assert_eq "simplified is DVT unlikely" "DVT unlikely" "$simplified"

# Test 4: Maximum score — all criteria=1 except alternative-dx=0 → score 9
echo "Test 4: Maximum score (9: all criteria=1 except alternative-dx)"
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 1 --leg-swollen 1 --calf-swelling 1 --pitting-edema 1 --collateral-veins 1 --previous-dvt 1 --alternative-dx 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 9" "9" "$score"
assert_eq "category is high probability" "high probability" "$category"
assert_eq "simplified is DVT likely" "DVT likely" "$simplified"

# Test 5: All zeros — score 0, low probability, DVT unlikely
echo "Test 5: All zeros (score 0 — low probability)"
result=$("$TOOL" $ALL_ZERO)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is low probability" "low probability" "$category"
assert_eq "simplified is DVT unlikely" "DVT unlikely" "$simplified"

# Test 6: Low probability — score 0 (boundary, low end of low)
echo "Test 6: Low probability — score 0 (boundary)"
result=$("$TOOL" $ALL_ZERO)
category=$(echo "$result" | jq -r '.category')
assert_eq "score 0 is low probability" "low probability" "$category"

# Test 7: Moderate probability — score 1 (one criterion)
echo "Test 7: Moderate probability — score 1 (cancer only)"
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score is 1" "1" "$score"
assert_eq "score 1 is moderate probability" "moderate probability" "$category"
assert_eq "score 1 simplified is DVT unlikely" "DVT unlikely" "$simplified"

# Test 8: Moderate probability — score 2 (two criteria)
echo "Test 8: Moderate probability — score 2 (cancer + paralysis)"
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score is 2" "2" "$score"
assert_eq "score 2 is moderate probability" "moderate probability" "$category"
assert_eq "score 2 simplified is DVT likely" "DVT likely" "$simplified"

# Test 9: High probability — score 3 (three criteria)
echo "Test 9: High probability — score 3 (cancer + paralysis + bedridden)"
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score is 3" "3" "$score"
assert_eq "score 3 is high probability" "high probability" "$category"
assert_eq "score 3 simplified is DVT likely" "DVT likely" "$simplified"

# Test 10: Boundary score 0 vs 1 — score 0 is low, score 1 is moderate
echo "Test 10: Boundary score 0 vs 1 (low/moderate)"
result=$("$TOOL" $ALL_ZERO)
category=$(echo "$result" | jq -r '.category')
assert_eq "score 0 is low probability" "low probability" "$category"

result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
category=$(echo "$result" | jq -r '.category')
assert_eq "score 1 is moderate probability" "moderate probability" "$category"

# Test 11: Boundary score 2 vs 3 (moderate/high)
echo "Test 11: Boundary score 2 vs 3 (moderate/high)"
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
category=$(echo "$result" | jq -r '.category')
assert_eq "score 2 is moderate probability" "moderate probability" "$category"

result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
category=$(echo "$result" | jq -r '.category')
assert_eq "score 3 is high probability" "high probability" "$category"

# Test 12: Simplified two-tier — DVT unlikely (score <=1)
echo "Test 12: Simplified two-tier — DVT unlikely (score <=1)"
# score 0
result=$("$TOOL" $ALL_ZERO)
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score 0 is DVT unlikely" "DVT unlikely" "$simplified"

# score 1 (cancer only)
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score 1 is DVT unlikely" "DVT unlikely" "$simplified"

# Test 13: Simplified two-tier — DVT likely (score >=2)
echo "Test 13: Simplified two-tier — DVT likely (score >=2)"
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score 2 is DVT likely" "DVT likely" "$simplified"

result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
simplified=$(echo "$result" | jq -r '.simplified')
assert_eq "score 3 is DVT likely" "DVT likely" "$simplified"

# Test 14: Alternative-dx subtracts 2
echo "Test 14: Alternative-dx subtracts 2 points"
# cancer=1 + alternative-dx=1 → 1 - 2 = -1
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score 1-2=-1 with alt-dx" "-1" "$score"
assert_eq "score -1 is low probability" "low probability" "$category"

# cancer=1 + paralysis=1 + bedridden=1 + alternative-dx=1 → 3 - 2 = 1
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 1)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score 3-2=1 with alt-dx" "1" "$score"
assert_eq "score 1 (with alt-dx) is moderate probability" "moderate probability" "$category"

# Test 15: Invalid criterion (value=2) → exit 1, error JSON
echo "Test 15: Invalid criterion (cancer=2)"
result=$("$TOOL" --cancer 2 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for cancer=2" "error" "$status"

invalid_exit=0
"$TOOL" --cancer 2 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for cancer=2"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for cancer=2, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 16: Missing args → exit 1, error JSON
echo "Test 16: Missing args (no arguments)"
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

# Test 17: Help flag → exit 0, output contains Usage
echo "Test 17: Help flag"
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

# Test 18: JSON validity
echo "Test 18: JSON validity"
result=$("$TOOL" $ALL_ZERO)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --cancer 2 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 19: min_score and max_score fields
echo "Test 19: min_score and max_score fields"
result=$("$TOOL" $ALL_ZERO)
min=$(echo "$result" | jq -r '.min_score')
max=$(echo "$result" | jq -r '.max_score')
assert_eq "min_score is -2" "-2" "$min"
assert_eq "max_score is 9" "9" "$max"

# Test 20: All fields present
echo "Test 20: All required fields present"
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 1 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
assert_eq "status field" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "calculator field" "wells_dvt" "$(echo "$result" | jq -r '.calculator')"
assert_contains "score field present" "2" "$(echo "$result" | jq -r '.score')"
assert_eq "category field" "moderate probability" "$(echo "$result" | jq -r '.category')"
assert_contains "simplified field" "dvt" "$(echo "$result" | jq -r '.simplified')"
assert_contains "interpretation field" "dvt" "$(echo "$result" | jq -r '.interpretation')"

# Test 21: Components present
echo "Test 21: Components present in output"
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
assert_eq "component cancer is 1" "1" "$(echo "$result" | jq -r '.components.cancer')"
assert_eq "component paralysis is 0" "0" "$(echo "$result" | jq -r '.components.paralysis')"
assert_eq "component bedridden is 1" "1" "$(echo "$result" | jq -r '.components.bedridden')"
assert_eq "component alternative_dx is 0" "0" "$(echo "$result" | jq -r '.components.alternative_dx')"

# Test 22: Argument order independence
echo "Test 22: Argument order independence"
result1=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
result2=$("$TOOL" --bedridden 1 --alternative-dx 0 --cancer 1 --previous-dvt 0 --calf-swelling 0 --paralysis 0 --collateral-veins 0 --pitting-edema 0 --tenderness 0 --leg-swollen 0)
score1=$(echo "$result1" | jq -r '.score')
score2=$(echo "$result2" | jq -r '.score')
assert_eq "score same regardless of arg order" "$score1" "$score2"

# Test 23: Interpretation for each category
echo "Test 23: Interpretation text by category"
# low
result=$("$TOOL" $ALL_ZERO)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "low prob interpretation mentions D-dimer" "d-dimer" "$interp"

# moderate
result=$("$TOOL" --cancer 1 --paralysis 0 --bedridden 0 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "moderate prob interpretation mentions ultrasound" "ultrasound" "$interp"

# high
result=$("$TOOL" --cancer 1 --paralysis 1 --bedridden 1 --tenderness 0 --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 --collateral-veins 0 --previous-dvt 0 --alternative-dx 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "high prob interpretation mentions anticoagulation" "anticoagulat" "$interp"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
