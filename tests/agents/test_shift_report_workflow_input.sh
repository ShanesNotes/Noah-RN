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

echo "=== Shift Report Workflow Input ==="

NARRATIVE_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/build-shift-report-workflow-input.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative workflow input is ready" "ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative workflow input mode preserved" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_eq "narrative payload carries clinical text" "62yo M day 3 MICU septic shock on levo" "$(echo "$NARRATIVE_JSON" | jq -r '.workflow_input.clinical_narrative')"
assert_eq "narrative knowledge assets count preserved" "4" "$(echo "$NARRATIVE_JSON" | jq '.workflow_input.knowledge_assets | length')"

PATIENT_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/build-shift-report-workflow-input.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient workflow input is ready" "ready" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "patient workflow input mode preserved" "patient_context" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient workflow input carries patient id" "patient-123" "$(echo "$PATIENT_JSON" | jq -r '.workflow_input.patient_context.patient.id')"
PATIENT_TIMELINE_COUNT="$(echo "$PATIENT_JSON" | jq '.workflow_input.patient_context.timeline | length')"
if (( PATIENT_TIMELINE_COUNT >= 5 )); then
    echo "  PASS: patient workflow input has timeline entries"
    PASS=$((PASS + 1))
else
    echo "  FAIL: patient workflow input has timeline entries"
    echo "    expected: >= 5"
    echo "    actual:   $PATIENT_TIMELINE_COUNT"
    FAIL=$((FAIL + 1))
fi
assert_eq "patient workflow input preserves knowledge assets" "4" "$(echo "$PATIENT_JSON" | jq '.workflow_input.knowledge_assets | length')"

MISSING_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/build-shift-report-workflow-input.mjs" '{}')"
assert_eq "missing workflow input is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing workflow input reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
