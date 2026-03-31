#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/unit-conversions/convert.sh"
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
        echo "    actual: ${haystack:0:300}"
        FAIL=$((FAIL + 1))
    fi
}

assert_json_valid() {
    local desc="$1" json="$2"
    if echo "$json" | jq . > /dev/null 2>&1; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    not valid JSON: ${json:0:200}"
        FAIL=$((FAIL + 1))
    fi
}

assert_exit_code() {
    local desc="$1" expected="$2"
    shift 2
    local actual=0
    "$@" > /dev/null 2>&1 || actual=$?
    if [[ "$actual" -eq "$expected" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected exit $expected, got $actual"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Unit Conversion Tool Tests ==="
echo ""

# --- Dependency checks ---
echo "Test: jq dependency"
if command -v jq &>/dev/null; then
    echo "  PASS: jq is installed"
    PASS=$((PASS + 1))
else
    echo "  FAIL: jq not installed"
    FAIL=$((FAIL + 1))
fi

echo "Test: tool is executable"
if [[ -x "$TOOL" ]]; then
    echo "  PASS: convert.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: convert.sh is not executable"
    FAIL=$((FAIL + 1))
fi

# --- General / top-level ---
echo ""
echo "=== General ==="

echo "Test: no args → error JSON exit 1"
result=$("$TOOL" 2>&1 || true)
assert_eq "status error on no args" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on no args" 1 "$TOOL"

echo "Test: invalid subcommand → error JSON exit 1"
result=$("$TOOL" bogus 2>&1 || true)
assert_eq "status error on bad subcommand" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on bad subcommand" 1 "$TOOL" bogus

echo "Test: --help exits 0 and prints usage"
result=$("$TOOL" --help 2>&1)
assert_contains "help mentions usage" "usage" "$result"
assert_exit_code "exit 0 on --help" 0 "$TOOL" --help

# --- dose subcommand ---
echo ""
echo "=== dose subcommand ==="

echo "Test: basic dose calculation (70 kg, 2 mg/kg → 140 mg)"
result=$("$TOOL" dose --weight-kg 70 --dose-per-kg 2 --unit mg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "calculator field" "dose" "$(echo "$result" | jq -r '.calculator')"
assert_eq "weight_kg field" "70" "$(echo "$result" | jq -r '.weight_kg')"
assert_eq "dose_per_kg field" "2" "$(echo "$result" | jq -r '.dose_per_kg')"
assert_eq "total_dose 140" "140" "$(echo "$result" | jq -r '.total_dose')"
assert_eq "unit field" "mg" "$(echo "$result" | jq -r '.unit')"
assert_json_valid "dose success is valid JSON" "$result"

echo "Test: dose with decimal weight (82.5 kg, 0.5 mcg/kg → 41.25 mcg)"
result=$("$TOOL" dose --weight-kg 82.5 --dose-per-kg 0.5 --unit mcg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
total=$(echo "$result" | jq -r '.total_dose')
assert_eq "total_dose 41.25" "41.25" "$total"

echo "Test: extreme dose warning present (200 kg, 2 mg/kg → warning, >2x adult dose)"
result=$("$TOOL" dose --weight-kg 200 --dose-per-kg 2 --unit mg)
assert_eq "status ok (warning, not error)" "ok" "$(echo "$result" | jq -r '.status')"
warning=$(echo "$result" | jq -r '.warning // empty')
assert_contains "warning field present for extreme dose" "extreme" "$warning"

echo "Test: weight below 0.5 kg → error exit 1"
result=$("$TOOL" dose --weight-kg 0.3 --dose-per-kg 2 --unit mg 2>&1 || true)
assert_eq "status error on weight < 0.5" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on weight < 0.5" 1 "$TOOL" dose --weight-kg 0.3 --dose-per-kg 2 --unit mg

echo "Test: weight above 500 kg → error exit 1"
result=$("$TOOL" dose --weight-kg 501 --dose-per-kg 2 --unit mg 2>&1 || true)
assert_eq "status error on weight > 500" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on weight > 500" 1 "$TOOL" dose --weight-kg 501 --dose-per-kg 2 --unit mg

echo "Test: zero dose_per_kg → error exit 1"
result=$("$TOOL" dose --weight-kg 70 --dose-per-kg 0 --unit mg 2>&1 || true)
assert_eq "status error on zero dose" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on zero dose" 1 "$TOOL" dose --weight-kg 70 --dose-per-kg 0 --unit mg

echo "Test: negative dose_per_kg → error exit 1"
result=$("$TOOL" dose --weight-kg 70 --dose-per-kg -1 --unit mg 2>&1 || true)
assert_eq "status error on negative dose" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

echo "Test: missing args for dose → error exit 1"
result=$("$TOOL" dose --weight-kg 70 2>&1 || true)
assert_eq "status error on missing dose args" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on missing dose args" 1 "$TOOL" dose --weight-kg 70

echo "Test: non-numeric weight → error exit 1"
result=$("$TOOL" dose --weight-kg abc --dose-per-kg 2 --unit mg 2>&1 || true)
assert_eq "status error on non-numeric weight" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

# --- drip subcommand ---
echo ""
echo "=== drip subcommand ==="

echo "Test: basic drip rate (dose 100 mcg/min, conc 1600 mcg/mL → 3.75 mL/hr)"
result=$("$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration 1600 --conc-unit "mcg/mL")
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "calculator field" "drip_rate" "$(echo "$result" | jq -r '.calculator')"
rate=$(echo "$result" | jq -r '.rate_ml_hr')
assert_eq "rate_ml_hr 3.75" "3.75" "$rate"
assert_json_valid "drip success is valid JSON" "$result"

echo "Test: drip with weight → formula_used present"
result=$("$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration 1600 --conc-unit "mcg/mL" --weight-kg 70)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
formula=$(echo "$result" | jq -r '.formula_used // empty')
if [[ -n "$formula" ]]; then
    echo "  PASS: formula_used field present ($formula)"
    PASS=$((PASS + 1))
else
    echo "  FAIL: formula_used field missing"
    FAIL=$((FAIL + 1))
fi

echo "Test: drip mg/hr (100 mg/hr at 2 mg/mL → 50 mL/hr)"
result=$("$TOOL" drip --dose 100 --dose-unit "mg/hr" --concentration 2 --conc-unit "mg/mL")
assert_eq "mg/hr rate" "50" "$(echo "$result" | jq -r '.rate_ml_hr')"
PASS=$((PASS + 1))

echo "Test: drip mcg/hr with g/mL concentration (1000 mcg/hr at 1 g/mL → 0.001 mL/hr)"
result=$("$TOOL" drip --dose 1000 --dose-unit "mcg/hr" --concentration 1 --conc-unit "g/mL")
rate=$(echo "$result" | jq -r '.rate_ml_hr')
close_enough=$(jq -n --argjson r "$rate" --argjson e 0.001 'if (($r - $e) | fabs) < 0.000001 then "yes" else "no" end')
if [[ "$close_enough" == '"yes"' ]]; then
    echo "  PASS: mcg/hr to g/mL rate ~0.001 ($rate)"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected ~0.001, got $rate"
    FAIL=$((FAIL + 1))
fi

echo "Test: drip g/hr with mcg/mL concentration (1 g/hr at 1000 mcg/mL → 1000 mL/hr)"
result=$("$TOOL" drip --dose 1 --dose-unit "g/hr" --concentration 1000 --conc-unit "mcg/mL")
rate=$(echo "$result" | jq -r '.rate_ml_hr')
close_enough=$(jq -n --argjson r "$rate" --argjson e 1000 'if (($r - $e) | fabs) < 0.001 then "yes" else "no" end')
if [[ "$close_enough" == '"yes"' ]]; then
    echo "  PASS: g/hr to mcg/mL rate ~1000 ($rate)"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected ~1000, got $rate"
    FAIL=$((FAIL + 1))
fi

echo "Test: drip mcg/kg/min (0.1 mcg/kg/min at 1.6 mg/mL, 70kg)"
result=$("$TOOL" drip --dose 0.1 --dose-unit "mcg/kg/min" --concentration 1.6 --conc-unit "mg/mL" --weight-kg 70)
rate=$(echo "$result" | jq -r '.rate_ml_hr')
# Expected: 0.1 * 0.001 * 60 * 70 / 1.6 = 0.2625
expected="0.2625"
close_enough=$(jq -n --argjson r "$rate" --argjson e 0.2625 'if (($r - $e) | fabs) < 0.001 then "yes" else "no" end')
if [[ "$close_enough" == '"yes"' ]]; then
    echo "  PASS: mcg/kg/min rate ~$expected ($rate)"
    PASS=$((PASS + 1))
else
    echo "  FAIL: expected ~$expected, got $rate"
    FAIL=$((FAIL + 1))
fi

echo "Test: drip /kg without weight → error"
result=$("$TOOL" drip --dose 5 --dose-unit "mcg/kg/min" --concentration 1 --conc-unit "mg/mL" 2>&1 || true)
assert_eq "/kg needs weight" "missing_args" "$(echo "$result" | jq -r '.error')"

echo "Test: drip weight 0.1 kg → error"
result=$("$TOOL" drip --dose 5 --dose-unit "mcg/kg/min" --concentration 1 --conc-unit "mg/mL" --weight-kg 0.1 2>&1 || true)
assert_eq "weight floor" "invalid_input" "$(echo "$result" | jq -r '.error')"

echo "Test: drip units/hr (1000 units/hr at 100 units/mL → 10 mL/hr)"
result=$("$TOOL" drip --dose 1000 --dose-unit "units/hr" --concentration 100 --conc-unit "units/mL")
assert_eq "units/hr rate" "10" "$(echo "$result" | jq -r '.rate_ml_hr')"

echo "Test: incompatible drip units (units/hr with mg/mL) → error exit 1"
result=$("$TOOL" drip --dose 1000 --dose-unit "units/hr" --concentration 1 --conc-unit "mg/mL" 2>&1 || true)
assert_eq "status error on incompatible mass dimensions" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_eq "error type on incompatible mass dimensions" "invalid_input" "$(echo "$result" | jq -r '.error' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on incompatible mass dimensions" 1 "$TOOL" drip --dose 1000 --dose-unit "units/hr" --concentration 1 --conc-unit "mg/mL"

echo "Test: unsupported concentration denominator (mg/L) → error exit 1"
result=$("$TOOL" drip --dose 100 --dose-unit "mg/hr" --concentration 1 --conc-unit "mg/L" 2>&1 || true)
assert_eq "status error on non-mL concentration unit" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_eq "error type on non-mL concentration unit" "invalid_input" "$(echo "$result" | jq -r '.error' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on non-mL concentration unit" 1 "$TOOL" drip --dose 100 --dose-unit "mg/hr" --concentration 1 --conc-unit "mg/L"

echo "Test: zero concentration → error exit 1"
result=$("$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration 0 --conc-unit "mcg/mL" 2>&1 || true)
assert_eq "status error on zero conc" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on zero conc" 1 "$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration 0 --conc-unit "mcg/mL"

echo "Test: missing args for drip → error exit 1"
result=$("$TOOL" drip --dose 100 2>&1 || true)
assert_eq "status error on missing drip args" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on missing drip args" 1 "$TOOL" drip --dose 100

echo "Test: negative dose → error exit 1"
result=$("$TOOL" drip --dose -5 --dose-unit "mcg/min" --concentration 1600 --conc-unit "mcg/mL" 2>&1 || true)
assert_eq "status error on negative dose" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

echo "Test: non-numeric concentration → error exit 1"
result=$("$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration abc --conc-unit "mcg/mL" 2>&1 || true)
assert_eq "status error on non-numeric conc" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

# --- unit subcommand ---
echo ""
echo "=== unit subcommand ==="

echo "Test: kg → lbs (70 kg → 154.3234)"
result=$("$TOOL" unit --value 70 --from kg --to lbs)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "calculator field" "unit" "$(echo "$result" | jq -r '.calculator')"
assert_eq "from_unit kg" "kg" "$(echo "$result" | jq -r '.from_unit')"
assert_eq "to_unit lbs" "lbs" "$(echo "$result" | jq -r '.to_unit')"
assert_json_valid "kg→lbs is valid JSON" "$result"

echo "Test: lbs → kg (154.324 lbs → ~70.0)"
result=$("$TOOL" unit --value 154.324 --from lbs --to kg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
result_val=$(echo "$result" | jq -r '.result')
# Check result is a valid number (don't hardcode exact float)
if echo "$result_val" | grep -qE '^[0-9]+(\.[0-9]+)?$'; then
    echo "  PASS: lbs→kg result is numeric ($result_val)"
    PASS=$((PASS + 1))
else
    echo "  FAIL: lbs→kg result not numeric: $result_val"
    FAIL=$((FAIL + 1))
fi

echo "Test: F → C (98.6 F → 37 C)"
result=$("$TOOL" unit --value 98.6 --from F --to C)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
temp_c=$(echo "$result" | jq -r '.result')
# 37.0 or similar
assert_contains "98.6 F is 37 C" "37" "$temp_c"

echo "Test: C → F (37 C → 98.6 F)"
result=$("$TOOL" unit --value 37 --from C --to F)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
temp_f=$(echo "$result" | jq -r '.result')
assert_contains "37 C is 98.6 F" "98.6" "$temp_f"

echo "Test: mg → mcg (1 mg → 1000 mcg)"
result=$("$TOOL" unit --value 1 --from mg --to mcg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "1 mg = 1000 mcg" "1000" "$(echo "$result" | jq -r '.result')"

echo "Test: mcg → mg (1000 mcg → 1 mg)"
result=$("$TOOL" unit --value 1000 --from mcg --to mg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "1000 mcg = 1 mg" "1" "$(echo "$result" | jq -r '.result')"

echo "Test: g → mg (1 g → 1000 mg)"
result=$("$TOOL" unit --value 1 --from g --to mg)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "1 g = 1000 mg" "1000" "$(echo "$result" | jq -r '.result')"

echo "Test: mg → g (500 mg → 0.5 g)"
result=$("$TOOL" unit --value 500 --from mg --to g)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "500 mg = 0.5 g" "0.5" "$(echo "$result" | jq -r '.result')"

echo "Test: L → mL (1 L → 1000 mL)"
result=$("$TOOL" unit --value 1 --from L --to mL)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "1 L = 1000 mL" "1000" "$(echo "$result" | jq -r '.result')"

echo "Test: mL → L (500 mL → 0.5 L)"
result=$("$TOOL" unit --value 500 --from mL --to L)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "500 mL = 0.5 L" "0.5" "$(echo "$result" | jq -r '.result')"

echo "Test: mL → cc (250 mL → 250 cc)"
result=$("$TOOL" unit --value 250 --from mL --to cc)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "250 mL = 250 cc" "250" "$(echo "$result" | jq -r '.result')"

echo "Test: cc → mL (100 cc → 100 mL)"
result=$("$TOOL" unit --value 100 --from cc --to mL)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "100 cc = 100 mL" "100" "$(echo "$result" | jq -r '.result')"

echo "Test: in → cm (1 in → 2.54 cm)"
result=$("$TOOL" unit --value 1 --from in --to cm)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
assert_eq "1 in = 2.54 cm" "2.54" "$(echo "$result" | jq -r '.result')"

echo "Test: cm → in (2.54 cm → 1 in)"
result=$("$TOOL" unit --value 2.54 --from cm --to in)
assert_eq "status ok" "ok" "$(echo "$result" | jq -r '.status')"
result_val=$(echo "$result" | jq -r '.result')
assert_contains "2.54 cm ≈ 1 in" "1" "$result_val"

echo "Test: unsupported conversion → error exit 1"
result=$("$TOOL" unit --value 5 --from kg --to mg 2>&1 || true)
assert_eq "status error on unsupported conversion" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_exit_code "exit 1 on unsupported conversion" 1 "$TOOL" unit --value 5 --from kg --to mg

echo "Test: non-numeric value → error exit 1"
result=$("$TOOL" unit --value abc --from kg --to lbs 2>&1 || true)
assert_eq "status error on non-numeric value" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

echo "Test: missing args for unit → error exit 1"
result=$("$TOOL" unit --value 5 2>&1 || true)
assert_eq "status error on missing unit args" "error" "$(echo "$result" | jq -r '.status' 2>/dev/null || echo parse_error)"

echo "Test: all unit output fields present"
result=$("$TOOL" unit --value 70 --from kg --to lbs)
for field in status calculator value from_unit to_unit result; do
    val=$(echo "$result" | jq -r ".$field // empty")
    if [[ -n "$val" ]]; then
        echo "  PASS: field $field present"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: field $field missing"
        FAIL=$((FAIL + 1))
    fi
done

echo "Test: all dose output fields present"
result=$("$TOOL" dose --weight-kg 70 --dose-per-kg 2 --unit mg)
for field in status calculator weight_kg dose_per_kg total_dose unit; do
    val=$(echo "$result" | jq -r ".$field // empty")
    if [[ -n "$val" ]]; then
        echo "  PASS: field $field present"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: field $field missing"
        FAIL=$((FAIL + 1))
    fi
done

echo "Test: all drip output fields present"
result=$("$TOOL" drip --dose 100 --dose-unit "mcg/min" --concentration 1600 --conc-unit "mcg/mL")
for field in status calculator dose dose_unit concentration conc_unit rate_ml_hr; do
    val=$(echo "$result" | jq -r ".$field // empty")
    if [[ -n "$val" ]]; then
        echo "  PASS: field $field present"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: field $field missing"
        FAIL=$((FAIL + 1))
    fi
done

echo "Test: error JSON has required fields (status, error, message)"
result=$("$TOOL" dose --weight-kg 0.1 --dose-per-kg 2 --unit mg 2>&1 || true)
for field in status error message; do
    val=$(echo "$result" | jq -r ".$field // empty" 2>/dev/null || true)
    if [[ -n "$val" ]]; then
        echo "  PASS: error field $field present"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: error field $field missing"
        FAIL=$((FAIL + 1))
    fi
done

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
