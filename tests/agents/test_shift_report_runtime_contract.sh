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

echo "=== Shift Report Runtime Contract ==="

JSON_OUTPUT="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-runtime-contract.mjs")"

CONTRACT_NAME="$(echo "$JSON_OUTPUT" | jq -r '.contract')"
WORKFLOW_PATH="$(echo "$JSON_OUTPUT" | jq -r '.authoritative_workflow')"
SKILL_TARGET="$(echo "$JSON_OUTPUT" | jq -r '.pi_skill_target')"
PRIMARY_TOOL="$(echo "$JSON_OUTPUT" | jq -r '.patient_context_bridge.primary_tool')"
SERVICE_SURFACE="$(echo "$JSON_OUTPUT" | jq -r '.patient_context_bridge.authoritative_service')"
FIRST_TARGET="$(echo "$JSON_OUTPUT" | jq -r '.first_workflow_target')"
ASSET_COUNT="$(echo "$JSON_OUTPUT" | jq '.dependencies.knowledge_assets | length')"
ONE_OF_COUNT="$(echo "$JSON_OUTPUT" | jq '.dependencies.required_context.mandatory_one_of | length')"

assert_eq "contract name is shift-report-runtime-bridge" "shift-report-runtime-bridge" "$CONTRACT_NAME"
assert_eq "authoritative workflow remains canonical" "packages/workflows/shift-report/SKILL.md" "$WORKFLOW_PATH"
assert_eq "pi skill target points at shift-report scaffold" ".pi/skills/shift-report/SKILL.md" "$SKILL_TARGET"
assert_eq "primary tool is get_patient_context" "get_patient_context" "$PRIMARY_TOOL"
assert_eq "service surface is clinical-mcp" "services/clinical-mcp/" "$SERVICE_SURFACE"
assert_eq "first workflow target is shift-report" "shift-report" "$FIRST_TARGET"
assert_eq "knowledge asset count is preserved" "4" "$ASSET_COUNT"
assert_eq "mandatory_one_of count is preserved" "2" "$ONE_OF_COUNT"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
