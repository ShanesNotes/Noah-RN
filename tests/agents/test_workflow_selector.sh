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

echo "=== Workflow Selector ==="

shift_report_json="$(node "$REPO_ROOT/packages/agent-harness/select-workflows.mjs" shift_handoff patient_id)"
shift_report_count="$(echo "$shift_report_json" | jq 'length')"
shift_report_name="$(echo "$shift_report_json" | jq -r '.[0].name')"
assert_eq "shift_handoff + patient_id selects one workflow" "1" "$shift_report_count"
assert_eq "shift_handoff + patient_id selects shift-report" "shift-report" "$shift_report_name"

assessment_json="$(node "$REPO_ROOT/packages/agent-harness/select-workflows.mjs" nursing_assessment clinical_narrative)"
assessment_count="$(echo "$assessment_json" | jq 'length')"
assessment_name="$(echo "$assessment_json" | jq -r '.[0].name')"
assert_eq "nursing_assessment + clinical_narrative selects one workflow" "1" "$assessment_count"
assert_eq "nursing_assessment + clinical_narrative selects shift-assessment" "shift-assessment" "$assessment_name"

protocol_json="$(node "$REPO_ROOT/packages/agent-harness/select-workflows.mjs" sepsis)"
protocol_count="$(echo "$protocol_json" | jq 'length')"
protocol_name="$(echo "$protocol_json" | jq -r '.[0].name')"
assert_eq "sepsis selects one workflow without mandatory context" "1" "$protocol_count"
assert_eq "sepsis selects protocol-reference" "protocol-reference" "$protocol_name"

none_json="$(node "$REPO_ROOT/packages/agent-harness/select-workflows.mjs" shift_handoff)"
none_count="$(echo "$none_json" | jq 'length')"
assert_eq "shift_handoff without required context selects none" "0" "$none_count"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
