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

echo "=== Shift Report Dry-Run Output ==="

NARRATIVE_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-output.mjs" '{"clinical_narrative":"62yo M day 3 MICU septic shock on levo"}')"
NARRATIVE_OUTPUT="$(echo "$NARRATIVE_JSON" | jq -r '.output')"
assert_eq "narrative output is ready" "ready" "$(echo "$NARRATIVE_JSON" | jq -r '.status')"
assert_contains "narrative output has PATIENT section" "PATIENT" "$NARRATIVE_OUTPUT"
assert_contains "narrative output has STORY section" "STORY" "$NARRATIVE_OUTPUT"
assert_contains "narrative output preserves narrative seed" "62yo M day 3 MICU septic shock on levo" "$NARRATIVE_OUTPUT"

PATIENT_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-output.mjs" '{"patient_id":"patient-123"}')"
PATIENT_OUTPUT="$(echo "$PATIENT_JSON" | jq -r '.output')"
assert_eq "patient output is ready" "ready" "$(echo "$PATIENT_JSON" | jq -r '.status')"
assert_contains "patient output includes patient line" "John Doe | DOB 1962-05-10 | male" "$PATIENT_OUTPUT"
assert_contains "patient output includes medication" "Norepinephrine" "$PATIENT_OUTPUT"
assert_contains "patient output includes gap count" "Gap count requiring review:" "$PATIENT_OUTPUT"

MISSING_JSON="$(node "$PI_RUNTIME_DIR/extensions/noah-router/build-shift-report-dry-run-output.mjs" '{}')"
assert_eq "missing output is blocked" "blocked" "$(echo "$MISSING_JSON" | jq -r '.status')"
assert_eq "missing output reports both required options" "2" "$(echo "$MISSING_JSON" | jq '.missing_context | length')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
