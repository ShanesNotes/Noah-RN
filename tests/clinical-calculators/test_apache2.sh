#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/clinical-calculators/apache2.sh"
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

echo "=== APACHE II Calculator Tests ==="
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
    echo "  PASS: apache2.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: apache2.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# Test 3: Normal patient — all normal/optimal values → low score, low risk
# Temp 37.0 (0), MAP 80 (0), HR 80 (0), RR 16 (0),
# FiO2 0.21 → use PaO2=95 (0), pH 7.40 (0), Na 140 (0), K 4.0 (0),
# Creatinine 1.0 (0), Hematocrit 40 (0), WBC 8 (0), GCS 15 (0pts),
# Age 40 (0), Chronic 0 → total = 0
echo "Test 3: Normal patient (all normal values — low risk)"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_eq "score is 0" "0" "$score"
assert_eq "category is low risk" "low risk" "$category"

# Test 4: Critically ill patient — extreme values → high/critical score
# Temp 42 (+4), MAP 40 (+4), HR 200 (+4), RR 60 (+4),
# FiO2 0.8 → use A-aDO2=600 (+4), pH 7.10 (+4), Na 200 (+4), K 7.5 (+4),
# Creatinine 4.0 (+4), Hematocrit 65 (+4), WBC 50 (+4), GCS 3 (+12 pts),
# Age 75 (+6), Chronic 5 → many points
echo "Test 4: Critically ill (extreme values)"
result=$("$TOOL" \
    --temp 42 --map 40 --hr 200 --rr 60 \
    --fio2 0.8 --oxygenation 600 \
    --ph 7.10 --sodium 200 --potassium 7.5 \
    --creatinine 4.0 --hematocrit 65 --wbc 50 \
    --gcs 3 --age 75 --chronic 5)
status=$(echo "$result" | jq -r '.status')
score=$(echo "$result" | jq -r '.score')
category=$(echo "$result" | jq -r '.category')
assert_eq "status ok" "ok" "$status"
assert_contains "score is numeric" "^[0-9]" "$score"
# Score should be very high — critical category
assert_eq "category is critical" "critical" "$category"

# Test 5: ARF doubles creatinine points
# Creatinine 2.5 normally = +3 points. With ARF it should be doubled to +6.
echo "Test 5: ARF doubles creatinine points"
result_no_arf=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 2.5 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0 --arf 0)
result_arf=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 2.5 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0 --arf 1)
score_no_arf=$(echo "$result_no_arf" | jq -r '.score')
score_arf=$(echo "$result_arf" | jq -r '.score')
creat_no_arf=$(echo "$result_no_arf" | jq -r '.components.creatinine')
creat_arf=$(echo "$result_arf" | jq -r '.components.creatinine')
# creatinine 2.5 → normally +3 points; with ARF → +6 points
assert_eq "creatinine points no ARF = 3" "3" "$creat_no_arf"
assert_eq "creatinine points with ARF = 6" "6" "$creat_arf"
# Score difference should be 3
expected_diff=3
actual_diff=$(( score_arf - score_no_arf ))
assert_eq "ARF adds 3 to score" "$expected_diff" "$actual_diff"

# Test 6: FiO2 threshold — PaO2 path (FiO2 < 0.5)
# FiO2=0.21, PaO2=65 → 61-70 → +1 point
echo "Test 6: FiO2 < 0.5 path — PaO2 scoring"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 65 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "PaO2 65 → 1 point" "1" "$oxy_pts"

# FiO2=0.21, PaO2=57 → 55-60 → +3 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 57 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "PaO2 57 → 3 points" "3" "$oxy_pts"

# FiO2=0.21, PaO2=52 → <55 → +4 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 52 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "PaO2 52 → 4 points" "4" "$oxy_pts"

# Test 7: FiO2 ≥ 0.5 path — A-aDO2 scoring
# FiO2=0.8, A-aDO2=100 → <200 → 0 points
echo "Test 7: FiO2 >= 0.5 path — A-aDO2 scoring"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.8 --oxygenation 100 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "A-aDO2 100 → 0 points" "0" "$oxy_pts"

# FiO2=0.8, A-aDO2=250 → 200-349 → +2 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.8 --oxygenation 250 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "A-aDO2 250 → 2 points" "2" "$oxy_pts"

# FiO2=0.8, A-aDO2=520 → ≥500 → +4 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.8 --oxygenation 520 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
oxy_pts=$(echo "$result" | jq -r '.components.oxygenation')
assert_eq "A-aDO2 520 → 4 points" "4" "$oxy_pts"

# Test 8: Chronic health validation — value 3 → invalid (only 0, 2, 5)
echo "Test 8: Chronic health validation (value 3 — invalid)"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 3 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error for chronic=3" "error" "$status"

invalid_exit=0
"$TOOL" --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 3 > /dev/null 2>&1 || invalid_exit=$?
if [[ "$invalid_exit" -eq 1 ]]; then
    echo "  PASS: exits 1 for chronic=3"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected exit 1 for chronic=3, got $invalid_exit"
    FAIL=$((FAIL + 1))
fi

# Test 9: GCS points calculation — GCS 3 → 12 pts, GCS 15 → 0 pts
echo "Test 9: GCS points calculation"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 3 --age 40 --chronic 0)
gcs_pts=$(echo "$result" | jq -r '.components.gcs')
assert_eq "GCS 3 → 12 points" "12" "$gcs_pts"

result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
gcs_pts=$(echo "$result" | jq -r '.components.gcs')
assert_eq "GCS 15 → 0 points" "0" "$gcs_pts"

# Test 10: Age category boundaries
echo "Test 10: Age category boundaries"
# Age 44 → 0 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 44 --chronic 0)
age_pts=$(echo "$result" | jq -r '.components.age')
assert_eq "age 44 → 0 points" "0" "$age_pts"

# Age 45 → 2 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 45 --chronic 0)
age_pts=$(echo "$result" | jq -r '.components.age')
assert_eq "age 45 → 2 points" "2" "$age_pts"

# Age 75 → 6 points
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 75 --chronic 0)
age_pts=$(echo "$result" | jq -r '.components.age')
assert_eq "age 75 → 6 points" "6" "$age_pts"

# Test 11: Missing args → exit 1, error JSON
echo "Test 11: Missing args (no arguments)"
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

# Test 12: Help flag → exit 0
echo "Test 12: Help flag"
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

# Test 13: JSON validity
echo "Test 13: JSON validity"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: success output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: success output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 3 2>&1 || true)
if echo "$result" | jq . > /dev/null 2>&1; then
    echo "  PASS: error output is valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: error output is not valid JSON"
    FAIL=$((FAIL + 1))
fi

# Test 14: max_score is 71
echo "Test 14: max_score is 71"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
max=$(echo "$result" | jq -r '.max_score')
assert_eq "max_score is 71" "71" "$max"

# Test 15: Interpretation present for each category
echo "Test 15: Interpretation for categories"
result=$("$TOOL" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "low risk interpretation mentions mortality" "mortality" "$interp"

result=$("$TOOL" \
    --temp 42 --map 40 --hr 200 --rr 60 \
    --fio2 0.8 --oxygenation 600 \
    --ph 7.10 --sodium 200 --potassium 7.5 \
    --creatinine 4.0 --hematocrit 65 --wbc 50 \
    --gcs 3 --age 75 --chronic 5)
interp=$(echo "$result" | jq -r '.interpretation')
assert_contains "critical interpretation mentions mortality" "mortality" "$interp"

# Test 16: Valid chronic values — 0, 2, 5 all accepted
echo "Test 16: Valid chronic values (0, 2, 5)"
for val in 0 2 5; do
    result=$("$TOOL" \
        --temp 37.0 --map 80 --hr 80 --rr 16 \
        --fio2 0.21 --oxygenation 95 \
        --ph 7.40 --sodium 140 --potassium 4.0 \
        --creatinine 1.0 --hematocrit 40 --wbc 8 \
        --gcs 15 --age 40 --chronic $val)
    status=$(echo "$result" | jq -r '.status')
    assert_eq "chronic=$val is valid" "ok" "$status"
done

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
