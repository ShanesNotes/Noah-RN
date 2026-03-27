#!/usr/bin/env bash
set -euo pipefail

# NOTE: Tests 3-8 require live network access to the OpenFDA API.
# They will fail in sandboxed CI, offline environments, or during
# OpenFDA maintenance windows. Tests 1-2 and 9 run offline.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/drug-lookup/lookup.sh"
PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        ((PASS++)) || true || true
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        ((FAIL++)) || true || true
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $desc"
        ((PASS++)) || true || true
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: ${haystack:0:200}..."
        ((FAIL++)) || true || true
    fi
}

echo "=== Drug Lookup Tool Tests ==="
echo ""

# Test 1: jq is available
echo "Test 1: jq dependency"
if command -v jq &>/dev/null; then
    echo "  PASS: jq is installed"
    ((PASS++)) || true
else
    echo "  FAIL: jq is not installed"
    ((FAIL++)) || true
fi

# Test 2: Tool is executable
echo "Test 2: Tool is executable"
if [[ -x "$TOOL" ]]; then
    echo "  PASS: lookup.sh is executable"
    ((PASS++)) || true
else
    echo "  FAIL: lookup.sh is not executable"
    ((FAIL++)) || true
fi

# Test 3: Query known generic name
echo "Test 3: Query generic name (metoprolol)"
result=$("$TOOL" "metoprolol")
status=$(echo "$result" | jq -r '.status')
generic=$(echo "$result" | jq -r '.drug.generic_name')
assert_eq "status is ok" "ok" "$status"
assert_contains "generic name contains metoprolol" "metoprolol" "$generic"

# Test 4: Query known brand name
echo "Test 4: Query brand name (Lopressor)"
result=$("$TOOL" "Lopressor")
status=$(echo "$result" | jq -r '.status')
generic=$(echo "$result" | jq -r '.drug.generic_name')
assert_eq "status is ok" "ok" "$status"
assert_contains "resolves to metoprolol" "metoprolol" "$generic"

# Test 5: Result has required fields
echo "Test 5: Required fields present"
result=$("$TOOL" "metoprolol")
for field in generic_name brand_name route dosage_and_administration contraindications drug_interactions; do
    val=$(echo "$result" | jq -r ".drug.$field")
    if [[ "$val" != "null" && -n "$val" ]]; then
        echo "  PASS: field '$field' present"
        ((PASS++)) || true
    else
        echo "  FAIL: field '$field' missing or null"
        ((FAIL++)) || true
    fi
done

# Test 6: Nonexistent drug returns error
echo "Test 6: Nonexistent drug"
result=$("$TOOL" "zzzznotadrug12345" || true)
status=$(echo "$result" | jq -r '.status')
error=$(echo "$result" | jq -r '.error')
assert_eq "status is ok for valid JSON" "error" "$status"
assert_eq "error type is no_match" "no_match" "$error"

# Test 7: No argument returns error
echo "Test 7: No argument"
result=$("$TOOL" 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"

# Test 9: Special characters in drug name don't break JSON
echo "Test 9: Special characters in drug name"
result=$("$TOOL" 'test"drug&name' || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
if [[ "$status" != "parse_error" ]]; then
    echo "  PASS: special chars produce valid JSON"
    PASS=$((PASS + 1))
else
    echo "  FAIL: special chars broke JSON output"
    FAIL=$((FAIL + 1))
fi

# Test 8: Drug with boxed warning
echo "Test 8: Boxed warning (amiodarone)"
result=$("$TOOL" "amiodarone")
boxed=$(echo "$result" | jq -r '.drug.boxed_warning')
if [[ "$boxed" != "null" && -n "$boxed" ]]; then
    echo "  PASS: boxed_warning present for amiodarone"
    ((PASS++)) || true
else
    echo "  FAIL: boxed_warning missing for amiodarone"
    ((FAIL++)) || true
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
