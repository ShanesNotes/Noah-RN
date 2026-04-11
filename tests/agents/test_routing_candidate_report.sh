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

echo "=== Routing Candidate Report ==="

shift_json="$(node "$REPO_ROOT/packages/agent-harness/describe-routing-candidates.mjs" shift_handoff patient_id)"
shift_count="$(echo "$shift_json" | jq 'length')"
shift_name="$(echo "$shift_json" | jq -r '.[0].name')"
shift_service="$(echo "$shift_json" | jq -r '.[0].service_surface_refs[0]')"
shift_asset_count="$(echo "$shift_json" | jq '.[0].knowledge_assets | length')"
assert_eq "shift_handoff returns one candidate" "1" "$shift_count"
assert_eq "shift_handoff candidate is shift-report" "shift-report" "$shift_name"
assert_eq "shift-report points at clinical-mcp service surface" "services/clinical-mcp/" "$shift_service"
assert_eq "shift-report exposes mapped knowledge assets" "4" "$shift_asset_count"

protocol_json="$(node "$REPO_ROOT/packages/agent-harness/describe-routing-candidates.mjs" sepsis)"
protocol_name="$(echo "$protocol_json" | jq -r '.[0].name')"
protocol_sources="$(echo "$protocol_json" | jq '.[0].knowledge_sources_raw | length')"
assert_eq "sepsis candidate is protocol-reference" "protocol-reference" "$protocol_name"
assert_eq "protocol-reference preserves raw knowledge_sources" "5" "$protocol_sources"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
