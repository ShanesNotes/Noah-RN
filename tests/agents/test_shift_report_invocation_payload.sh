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

echo "=== Shift Report Invocation Payload ==="

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-invocation-payload.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient payload is planned" "planned" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "patient payload mode is patient_id" "patient_id" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient payload has two steps" "2" "$(echo "$PATIENT_JSON" | jq '.steps | length')"
assert_eq "first step is tool_call" "tool_call" "$(echo "$PATIENT_JSON" | jq -r '.steps[0].type')"
assert_eq "tool call uses get_patient_context" "get_patient_context" "$(echo "$PATIENT_JSON" | jq -r '.steps[0].name')"
assert_eq "second step is workflow_handoff" "workflow_handoff" "$(echo "$PATIENT_JSON" | jq -r '.steps[1].type')"

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-invocation-payload.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative payload is planned" "planned" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative payload mode is clinical_narrative" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_eq "narrative payload has one step" "1" "$(echo "$NARRATIVE_JSON" | jq '.steps | length')"
assert_eq "narrative step is workflow_handoff" "workflow_handoff" "$(echo "$NARRATIVE_JSON" | jq -r '.steps[0].type')"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-invocation-payload.mjs" '{}')"
assert_eq "missing payload is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing payload reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
