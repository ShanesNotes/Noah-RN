#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/news2.sh"
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

echo "=== NEWS2 Calculator Tests ==="
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
    echo "  PASS: news2.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: news2.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Minimum score — all normal → score 0
echo "Test 3: Minimum score (0 — no elevation)"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is no elevation" "no elevation" "$category"

# Test 4: Maximum score — all worst → score 19
echo "Test 4: Maximum score (19 — high)"
result=$("$TOOL" --rr 30 --spo2 88 --o2 yes --temp 39.5 --sbp 85 --hr 140 --avpu P)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
status=$(echo "$result" | jq -r '.status')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 19" "19" "$score"
assert_eq "category is high" "high" "$category"

# Test 5: Category boundary — score 1 → low
echo "Test 5: Score 1 (low)"
result=$("$TOOL" --rr 11 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 1" "1" "$score"
assert_eq "category is low" "low" "$category"

# Test 6: Category boundary — score 4 → low
echo "Test 6: Score 4 (low upper boundary)"
result=$("$TOOL" --rr 22 --spo2 94 --o2 no --temp 37.0 --sbp 105 --hr 80 --avpu A)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 4" "4" "$score"
assert_eq "category is low" "low" "$category"

# Test 7: Category boundary — score 5 → medium
echo "Test 7: Score 5 (medium)"
result=$("$TOOL" --rr 22 --spo2 94 --o2 yes --temp 37.0 --sbp 120 --hr 80 --avpu A)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 5" "5" "$score"
assert_eq "category is medium" "medium" "$category"

# Test 8: Category boundary — score 7 → high
echo "Test 8: Score 7 (high)"
result=$("$TOOL" --rr 22 --spo2 94 --o2 yes --temp 37.0 --sbp 105 --hr 100 --avpu A)
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "score is 7" "7" "$score"
assert_eq "category is high" "high" "$category"

# Test 9: Emergency flag — single parameter scoring 3 with low total
echo "Test 9: Emergency flag (single param=3, low total)"
result=$("$TOOL" --rr 30 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
score=$(echo "$result" | jq -r '.score')
emergency=$(echo "$result" | jq -r '.emergency_response')
any_three=$(echo "$result" | jq -r '.any_single_parameter_three')
assert_eq "score is 3" "3" "$score"
assert_eq "any_single_parameter_three is true" "true" "$any_three"
assert_eq "emergency_response is true" "true" "$emergency"

# Test 10: Hypercapnic SpO2 scale — scale 2
echo "Test 10: Hypercapnic SpO2 scale (scale 2)"
result=$("$TOOL" --rr 16 --spo2 90 --o2 yes --temp 37.0 --sbp 120 --hr 80 --avpu A --spo2-scale 2)
spo2_score=$(echo "$result" | jq -r '.components.spo2.score')
spo2_scale=$(echo "$result" | jq -r '.components.spo2.scale')
assert_eq "spo2 score is 1 on scale 2 (90%)" "1" "$spo2_score"
assert_eq "spo2 scale is 2" "2" "$spo2_scale"

# Test 11: Standard SpO2 scale — scale 1 (default)
echo "Test 11: Standard SpO2 scale (scale 1)"
result=$("$TOOL" --rr 16 --spo2 94 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
spo2_score=$(echo "$result" | jq -r '.components.spo2.score')
spo2_scale=$(echo "$result" | jq -r '.components.spo2.scale')
assert_eq "spo2 score is 1 on scale 1 (94%)" "1" "$spo2_score"
assert_eq "spo2 scale is 1" "1" "$spo2_scale"

# Test 12: SpO2 scale 1 — 91% should score 3
echo "Test 12: SpO2 scale 1 — 91% scores 3"
result=$("$TOOL" --rr 16 --spo2 91 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
spo2_score=$(echo "$result" | jq -r '.components.spo2.score')
assert_eq "spo2 score is 3 for 91% on scale 1" "3" "$spo2_score"

# Test 13: SpO2 scale 2 — 87% should score 3
echo "Test 13: SpO2 scale 2 — 87% scores 3"
result=$("$TOOL" --rr 16 --spo2 87 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A --spo2-scale 2)
spo2_score=$(echo "$result" | jq -r '.components.spo2.score')
assert_eq "spo2 score is 3 for 87% on scale 2" "3" "$spo2_score"

# Test 14: O2 therapy scoring
echo "Test 14: O2 therapy scores 2"
result=$("$TOOL" --rr 16 --spo2 98 --o2 yes --temp 37.0 --sbp 120 --hr 80 --avpu A)
o2_score=$(echo "$result" | jq -r '.components.o2_therapy.score')
assert_eq "o2_therapy score is 2" "2" "$o2_score"

# Test 15: AVPU — Voice scores 3
echo "Test 15: AVPU V scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu V)
avpu_score=$(echo "$result" | jq -r '.components.avpu.score')
assert_eq "avpu score is 3 for V" "3" "$avpu_score"

# Test 16: AVPU — Pain scores 3
echo "Test 16: AVPU P scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu P)
avpu_score=$(echo "$result" | jq -r '.components.avpu.score')
assert_eq "avpu score is 3 for P" "3" "$avpu_score"

# Test 17: AVPU — Unresponsive scores 3
echo "Test 17: AVPU U scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu U)
avpu_score=$(echo "$result" | jq -r '.components.avpu.score')
assert_eq "avpu score is 3 for U" "3" "$avpu_score"

# Test 18: Low temperature scoring
echo "Test 18: Temp 35.0 scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 35.0 --sbp 120 --hr 80 --avpu A)
temp_score=$(echo "$result" | jq -r '.components.temperature.score')
assert_eq "temp score is 3 for 35.0" "3" "$temp_score"

# Test 19: High temperature scoring
echo "Test 19: Temp 39.5 scores 2"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 39.5 --sbp 120 --hr 80 --avpu A)
temp_score=$(echo "$result" | jq -r '.components.temperature.score')
assert_eq "temp score is 2 for 39.5" "2" "$temp_score"

# Test 20: Invalid RR — out of range
echo "Test 20: Invalid RR (70)"
result=$("$TOOL" --rr 70 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for rr=70" "error" "$status"

invalid_exit=0
"$TOOL" --rr 70 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for invalid rr"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for invalid rr, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 21: Missing args
echo "Test 21: Missing args (no arguments)"
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

# Test 22: Help flag
echo "Test 22: Help flag"
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

# Test 23: JSON validity
echo "Test 23: JSON validity"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" --rr 70 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 24: max_score is 20
echo "Test 24: max_score is 20"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 20" "20" "$max"

# Test 25: Component presence — all 7 parameters present
echo "Test 25: All components present"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
has_rr=$(echo "$result" | jq 'has("components") and (.components | has("rr"))')
has_spo2=$(echo "$result" | jq 'has("components") and (.components | has("spo2"))')
has_o2=$(echo "$result" | jq 'has("components") and (.components | has("o2_therapy"))')
has_temp=$(echo "$result" | jq 'has("components") and (.components | has("temperature"))')
has_sbp=$(echo "$result" | jq 'has("components") and (.components | has("sbp"))')
has_hr=$(echo "$result" | jq 'has("components") and (.components | has("hr"))')
has_avpu=$(echo "$result" | jq 'has("components") and (.components | has("avpu"))')
assert_eq "rr component present" "true" "$has_rr"
assert_eq "spo2 component present" "true" "$has_spo2"
assert_eq "o2_therapy component present" "true" "$has_o2"
assert_eq "temperature component present" "true" "$has_temp"
assert_eq "sbp component present" "true" "$has_sbp"
assert_eq "hr component present" "true" "$has_hr"
assert_eq "avpu component present" "true" "$has_avpu"

# Test 26: Argument order independence
echo "Test 26: Argument order independence"
result_ordered=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
result_shuffled=$("$TOOL" --avpu A --hr 80 --sbp 120 --temp 37.0 --o2 no --spo2 98 --rr 16)
score_ordered=$(echo "$result_ordered" | jq -r '.score')
score_shuffled=$(echo "$result_shuffled" | jq -r '.score')
assert_eq "score same regardless of order" "$score_ordered" "$score_shuffled"

# Test 27: Invalid spo2-scale
echo "Test 27: Invalid spo2-scale (3)"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A --spo2-scale 3 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for spo2-scale=3" "error" "$status"

# Test 28: Invalid AVPU value
echo "Test 28: Invalid AVPU (X)"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu X 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for avpu=X" "error" "$status"

# Test 29: Invalid O2 value
echo "Test 29: Invalid O2 (maybe)"
result=$("$TOOL" --rr 16 --spo2 98 --o2 maybe --temp 37.0 --sbp 120 --hr 80 --avpu A 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for o2=maybe" "error" "$status"

# Test 30: Invalid temperature (non-numeric)
echo "Test 30: Invalid temperature (abc)"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp abc --sbp 120 --hr 80 --avpu A 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for temp=abc" "error" "$status"

# Test 31: RR boundary — 8 scores 3
echo "Test 31: RR 8 scores 3"
result=$("$TOOL" --rr 8 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
rr_score=$(echo "$result" | jq -r '.components.rr.score')
assert_eq "rr score is 3 for RR=8" "3" "$rr_score"

# Test 32: RR boundary — 9 scores 1
echo "Test 32: RR 9 scores 1"
result=$("$TOOL" --rr 9 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
rr_score=$(echo "$result" | jq -r '.components.rr.score')
assert_eq "rr score is 1 for RR=9" "1" "$rr_score"

# Test 33: HR boundary — 40 scores 3
echo "Test 33: HR 40 scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 40 --avpu A)
hr_score=$(echo "$result" | jq -r '.components.hr.score')
assert_eq "hr score is 3 for HR=40" "3" "$hr_score"

# Test 34: HR boundary — 41 scores 1
echo "Test 34: HR 41 scores 1"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 41 --avpu A)
hr_score=$(echo "$result" | jq -r '.components.hr.score')
assert_eq "hr score is 1 for HR=41" "1" "$hr_score"

# Test 35: SBP boundary — 90 scores 3
echo "Test 35: SBP 90 scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 90 --hr 80 --avpu A)
sbp_score=$(echo "$result" | jq -r '.components.sbp.score')
assert_eq "sbp score is 3 for SBP=90" "3" "$sbp_score"

# Test 36: SBP boundary — 91 scores 2
echo "Test 36: SBP 91 scores 2"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 91 --hr 80 --avpu A)
sbp_score=$(echo "$result" | jq -r '.components.sbp.score')
assert_eq "sbp score is 2 for SBP=91" "2" "$sbp_score"

# Test 37: SBP boundary — 220 scores 3
echo "Test 37: SBP 220 scores 3"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 220 --hr 80 --avpu A)
sbp_score=$(echo "$result" | jq -r '.components.sbp.score')
assert_eq "sbp score is 3 for SBP=220" "3" "$sbp_score"

# Test 38: Interpretation field is non-empty
echo "Test 38: Interpretation field is non-empty"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
interp=$(echo "$result" | jq -r '.interpretation')
if [[ -n "$interp" ]]; then
    echo "  PASS: interpretation is non-empty"
    PASS=$((PASS + 1))
else
    echo "  FAIL: interpretation is empty"
    FAIL=$((FAIL + 1))
fi

# Test 39: Calculator name is "news2"
echo "Test 39: Calculator name is news2"
result=$("$TOOL" --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
calc=$(echo "$result" | jq -r '.calculator')
assert_eq "calculator is news2" "news2" "$calc"

# Test 40: SpO2 scale 2 — 93% scores 0 (normal range for hypercapnic)
echo "Test 40: SpO2 scale 2 — 93% scores 0"
result=$("$TOOL" --rr 16 --spo2 93 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A --spo2-scale 2)
spo2_score=$(echo "$result" | jq -r '.components.spo2.score')
assert_eq "spo2 score is 0 for 93% on scale 2" "0" "$spo2_score"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
