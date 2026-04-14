#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PI_RUNTIME_DIR="${PI_RUNTIME_DIR:-$REPO_ROOT/.noah-pi-runtime}"
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

echo "=== Shift Report Dry-Run Summary ==="

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-summary.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative summary is ready" "ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative mode preserved" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_eq "narrative outline contains 7 sections" "7" "$(echo "$NARRATIVE_JSON" | jq '.section_outline | length')"
assert_eq "narrative story seed preserved" "62yo M day 3 MICU septic shock on levo" "$(echo "$NARRATIVE_JSON" | jq -r '.summary.story_seed')"

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-summary.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient summary is ready" "ready" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "patient mode preserved" "patient_context" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient line includes John Doe" "John Doe | DOB 1962-05-10 | male" "$(echo "$PATIENT_JSON" | jq -r '.summary.patient_line')"
assert_eq "patient summary has 2 conditions" "2" "$(echo "$PATIENT_JSON" | jq '.summary.active_conditions | length')"
assert_eq "patient summary has 2 medications" "2" "$(echo "$PATIENT_JSON" | jq '.summary.active_medications | length')"
assert_eq "patient summary keeps 7 sections" "7" "$(echo "$PATIENT_JSON" | jq '.section_outline | length')"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-summary.mjs" '{}')"
assert_eq "missing summary is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing summary reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
