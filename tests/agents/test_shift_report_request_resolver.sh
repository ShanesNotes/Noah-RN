#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

echo "=== Shift Report Request Resolver ==="

PATIENT_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/resolve-shift-report-request.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient-id request resolves" "true" "$(echo "$PATIENT_JSON" | jq -r '.resolved')"
assert_eq "patient-id mode selected" "patient_id" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient-id next step fetches context first" "fetch_patient_context_then_invoke_shift_report" "$(echo "$PATIENT_JSON" | jq -r '.next_step')"
assert_eq "patient-id tool is get_patient_context" "get_patient_context" "$(echo "$PATIENT_JSON" | jq -r '.patient_context_tool')"

NARRATIVE_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/resolve-shift-report-request.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative request resolves" "true" "$(echo "$NARRATIVE_JSON" | jq -r '.resolved')"
assert_eq "narrative mode selected" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_eq "narrative next step invokes shift-report directly" "invoke_shift_report_with_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.next_step')"

MISSING_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/resolve-shift-report-request.mjs" '{}')"
assert_eq "missing request does not resolve" "false" "$(echo "$MISSING_JSON" | jq -r '.resolved')"
assert_eq "missing mode selected" "missing" "$(echo "$MISSING_JSON" | jq -r '.input_mode')"
assert_eq "missing request asks for required context" "request_required_context" "$(echo "$MISSING_JSON" | jq -r '.next_step')"
assert_eq "missing context count preserved" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
