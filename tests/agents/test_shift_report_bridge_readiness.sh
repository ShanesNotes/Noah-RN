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

echo "=== Shift Report Bridge Readiness ==="

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/evaluate-shift-report-bridge-readiness.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient-id readiness is ready" "ready" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "canonical workflow exists" "true" "$(echo "$PATIENT_JSON" | jq -r '.checks.workflow_exists')"
assert_eq "pi skill scaffold exists" "true" "$(echo "$PATIENT_JSON" | jq -r '.checks.pi_skill_exists')"
assert_eq "service surfaces exist" "true" "$(echo "$PATIENT_JSON" | jq -r '.checks.service_surfaces_exist')"
assert_eq "knowledge assets mapped" "true" "$(echo "$PATIENT_JSON" | jq -r '.checks.knowledge_assets_mapped')"

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/evaluate-shift-report-bridge-readiness.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative readiness is ready" "ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative mode preserved" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/evaluate-shift-report-bridge-readiness.mjs" '{}')"
assert_eq "missing input readiness is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing input reason is missing_required_context" "missing_required_context" "$(echo "$MISSING_JSON" | jq -r '.reason')"
assert_eq "missing input reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
