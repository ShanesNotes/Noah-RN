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

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Shift Report Dry-Run Bundle ==="

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-dry-run-bundle.mjs" '{"patient_id":"patient-123"}')"
PATIENT_OUTPUT="$(echo "$PATIENT_JSON" | jq -r '.output.output')"
assert_eq "patient bundle is ready" "ready" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_eq "patient bundle mode preserved" "patient_context" "$(echo "$PATIENT_JSON" | jq -r '.input_mode')"
assert_eq "patient bundle stack bridge preserved" "shift-report-bridge-stack" "$(echo "$PATIENT_JSON" | jq -r '.stack.bridge')"
assert_eq "patient bundle output bridge preserved" "shift-report-dry-run-output" "$(echo "$PATIENT_JSON" | jq -r '.output.bridge')"
assert_contains "patient bundle output includes septic shock" "Septic shock" "$PATIENT_OUTPUT"
assert_contains "patient bundle output includes norepinephrine" "Norepinephrine" "$PATIENT_OUTPUT"

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-dry-run-bundle.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
NARRATIVE_OUTPUT="$(echo "$NARRATIVE_JSON" | jq -r '.output.output')"
assert_eq "narrative bundle is ready" "ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_eq "narrative bundle mode preserved" "clinical_narrative" "$(echo "$NARRATIVE_JSON" | jq -r '.input_mode')"
assert_contains "narrative bundle output includes story seed" "62yo M day 3 MICU septic shock on levo" "$NARRATIVE_OUTPUT"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/describe-shift-report-dry-run-bundle.mjs" '{}')"
assert_eq "missing bundle is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing bundle reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.output.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
