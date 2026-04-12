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

echo "=== Shift Report Bridge ==="

SHIFT_JSON="$(node "$REPO_ROOT/.pi/extensions/noah-router/describe-shift-report-bridge.mjs")"
BRIDGE_NAME="$(echo "$SHIFT_JSON" | jq -r '.bridge')"
WORKFLOW_PATH="$(echo "$SHIFT_JSON" | jq -r '.authoritative_workflow')"
PI_TARGET="$(echo "$SHIFT_JSON" | jq -r '.pi_skill_target')"
SERVICE_REF="$(echo "$SHIFT_JSON" | jq -r '.service_surfaces[0]')"
ASSET_COUNT="$(echo "$SHIFT_JSON" | jq '.knowledge_assets | length')"

assert_eq "bridge name is shift-report" "shift-report" "$BRIDGE_NAME"
assert_eq "authoritative workflow path is canonical" "packages/workflows/shift-report/SKILL.md" "$WORKFLOW_PATH"
assert_eq "pi skill target points at scaffold skill" ".pi/skills/shift-report/SKILL.md" "$PI_TARGET"
assert_eq "service surface points at clinical-mcp" "services/clinical-mcp/" "$SERVICE_REF"
assert_eq "bridge exposes mapped knowledge assets" "4" "$ASSET_COUNT"

PATIENT_JSON="$(node "$REPO_ROOT/.pi/extensions/medplum-context/describe-patient-context-bridge.mjs")"
PATIENT_BRIDGE="$(echo "$PATIENT_JSON" | jq -r '.bridge')"
PATIENT_TOOL="$(echo "$PATIENT_JSON" | jq -r '.primary_tool')"
PATIENT_SERVICE="$(echo "$PATIENT_JSON" | jq -r '.authoritative_service')"

assert_eq "patient bridge name is patient-context" "patient-context" "$PATIENT_BRIDGE"
assert_eq "patient bridge primary tool is get_patient_context" "get_patient_context" "$PATIENT_TOOL"
assert_eq "patient bridge service is clinical-mcp" "services/clinical-mcp/" "$PATIENT_SERVICE"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
