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

echo "=== Shift Report Bridge Stack ==="

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-bridge-stack.mjs" '{"patient_id":"patient-123"}')"
assert_eq "stack bridge name" "shift-report-bridge-stack" "$(echo "$PATIENT_JSON" | jq -r '.bridge')"
assert_eq "descriptor bridge preserved" "shift-report" "$(echo "$PATIENT_JSON" | jq -r '.descriptor.bridge')"
assert_eq "runtime contract preserved" "shift-report-runtime-bridge" "$(echo "$PATIENT_JSON" | jq -r '.runtime_contract.contract')"
assert_eq "request resolution mode preserved" "patient_id" "$(echo "$PATIENT_JSON" | jq -r '.request_resolution.input_mode')"
assert_eq "execution plan status preserved" "planned" "$(echo "$PATIENT_JSON" | jq -r '.execution_plan.status')"
assert_eq "readiness status preserved" "ready" "$(echo "$PATIENT_JSON" | jq -r '.readiness.status')"
assert_eq "invocation payload status preserved" "planned" "$(echo "$PATIENT_JSON" | jq -r '.invocation_payload.status')"
assert_eq "invocation payload has two steps" "2" "$(echo "$PATIENT_JSON" | jq '.invocation_payload.steps | length')"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-bridge-stack.mjs" '{}')"
assert_eq "missing request keeps readiness blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.readiness.status')"
assert_eq "missing request keeps invocation blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.invocation_payload.status')"
assert_eq "missing request asks for context" "request_required_context" "$(echo "$MISSING_JSON" | jq -r '.request_resolution.next_step')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
