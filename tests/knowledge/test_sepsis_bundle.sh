#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
BUNDLE_FILE="$REPO_ROOT/knowledge/protocols/sepsis-bundle.md"
FRESHNESS_FILE="$REPO_ROOT/knowledge/FRESHNESS.md"
PASS=0
FAIL=0

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if grep -Fq "$needle" <<<"$haystack"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        FAIL=$((FAIL + 1))
    fi
}

assert_not_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if grep -Fq "$needle" <<<"$haystack"; then
        echo "  FAIL: $desc"
        echo "    unexpected content: $needle"
        FAIL=$((FAIL + 1))
    else
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    fi
}

echo "=== Sepsis Bundle Knowledge Tests ==="
echo ""

bundle_text="$(<"$BUNDLE_FILE")"
freshness_text="$(<"$FRESHNESS_FILE")"

assert_contains "bundle states bolus trigger as hypotension or lactate >= 4 mmol/L" "hypotension OR lactate >= 4 mmol/L" "$bundle_text"
assert_not_contains "bundle does not present qSOFA as primary screening" "SCREENING — qSOFA" "$bundle_text"
assert_contains "bundle explicitly says qSOFA is not primary screening" "qSOFA is not the primary screening framework here." "$bundle_text"
assert_contains "bundle includes bedside alert for lactate > 2" "clinical alert + remeasure in 2-4 hours" "$bundle_text"
assert_contains "bundle explains lactate > 2 is an alert, not bolus trigger" "Lactate > 2 = clinical alert + remeasure" "$bundle_text"
assert_contains "bundle review cadence stays quarterly" "next_review: \"2026-06-30\"" "$bundle_text"
assert_contains "freshness reflects bolus threshold" "lactate >= 4 mmol/L" "$freshness_text"
assert_contains "freshness reflects bedside alert threshold" "lactate > 2" "$freshness_text"
assert_not_contains "freshness drops the old bedside phrasing" "lactic > 2ish" "$freshness_text"
assert_contains "freshness review cadence stays quarterly" "| sepsis-bundle.md | Surviving Sepsis Campaign / CMS SEP-1 | 2021 | 2026-03-31 | 2026-06-30 | CURRENT |" "$freshness_text"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
