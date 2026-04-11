#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SKILL_FILE="$REPO_ROOT/packages/workflows/clinical-calculator/SKILL.md"
PASS=0
FAIL=0

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
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
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  FAIL: $desc"
        echo "    did not expect to contain: $needle"
        FAIL=$((FAIL + 1))
    else
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    fi
}

echo "=== Clinical Calculator Skill Contract: APACHE II ==="

skill_text="$(cat "$SKILL_FILE")"

assert_contains "APACHE II requires all 15 inputs before calculation" "require all 15 inputs before calculation" "$skill_text"
assert_contains "missing inputs must be requested explicitly" "missing inputs must be requested explicitly" "$skill_text"
assert_not_contains "does not promise calculation with available values" "available values" "$skill_text"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
