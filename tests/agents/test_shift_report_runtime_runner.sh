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

echo "=== Shift Report Runtime Runner ==="

NARRATIVE_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/run-shift-report-bridge.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative runtime runner is ready" "narrative_ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative handoff step type is workflow_handoff" "workflow_handoff" "$(echo "$NARRATIVE_JSON" | jq -r '.handoff_payload.type')"
assert_eq "narrative authoritative workflow remains canonical" "packages/workflows/shift-report/SKILL.md" "$(echo "$NARRATIVE_JSON" | jq -r '.authoritative_workflow')"

MISSING_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/run-shift-report-bridge.mjs" '{}')"
assert_eq "missing input stays blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing input reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

PATIENT_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/run-shift-report-bridge.mjs" '{"patient_id":"patient-123"}')"
PATIENT_STATUS="$(echo "$PATIENT_JSON" | jq -r '.status')"
if [[ "$PATIENT_STATUS" == "patient_context_loaded" || "$PATIENT_STATUS" == "patient_context_fetch_failed" ]]; then
  echo "  PASS: patient-id runtime runner returns a structured runtime result"
  PASS=$((PASS + 1))
else
  echo "  FAIL: patient-id runtime runner returned unexpected status: $PATIENT_STATUS"
  FAIL=$((FAIL + 1))
fi

if [[ "$PATIENT_STATUS" == "patient_context_loaded" ]]; then
  assert_eq "fixture-backed patient_id path loads context" "patient_context_loaded" "$PATIENT_STATUS"
  assert_eq "loaded patient_id is preserved" "patient-123" "$(echo "$PATIENT_JSON" | jq -r '.patient_context_summary.patient_id')"
  assert_eq "handoff next step type is workflow_handoff" "workflow_handoff" "$(echo "$PATIENT_JSON" | jq -r '.next_step.type')"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
