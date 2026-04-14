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

echo "=== Shift Report Execution Plan ==="

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/plan-shift-report-execution.mjs" '{"patient_id":"patient-123"}')"
assert_eq "patient-id plan status is planned" "planned" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "patient-id plan uses patient mode" "patient_id" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient-id plan points at canonical workflow" "packages/workflows/shift-report/SKILL.md" "$(echo "$PATIENT_JSON" | jq -r '.authoritative_workflow')"
assert_eq "patient-id plan has 4 execution steps" "4" "$(echo "$PATIENT_JSON" | jq '.steps | length')"
assert_eq "patient-id plan includes clinical-mcp service" "services/clinical-mcp/" "$(echo "$PATIENT_JSON" | jq -r '.service_surface_refs[0]')"

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/plan-shift-report-execution.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
assert_eq "narrative plan status is planned" "planned" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative plan uses narrative mode" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_eq "narrative plan has 3 execution steps" "3" "$(echo "$NARRATIVE_JSON" | jq '.steps | length')"
assert_eq "narrative plan still uses shift-report workflow" "packages/workflows/shift-report/SKILL.md" "$(echo "$NARRATIVE_JSON" | jq -r '.authoritative_workflow')"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/plan-shift-report-execution.mjs" '{}')"
assert_eq "missing input plan is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing input asks for required context" "request_required_context" "$(echo "$MISSING_JSON" | jq -r '.next_step')"
assert_eq "missing input reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
