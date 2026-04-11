#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_JSON="$(mktemp)"
trap 'rm -f "$OUT_JSON"' EXIT

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

echo "=== Workflow Registry Consumer ==="

node "$REPO_ROOT/packages/agent-harness/list-skills.mjs" > "$OUT_JSON"

COUNT="$(jq 'length' "$OUT_JSON")"
assert_eq "registry consumer returns 8 active workflows" "8" "$COUNT"

ALL_EXIST="$(jq 'all(.[]; .exists == true)' "$OUT_JSON")"
assert_eq "all registered workflow source paths exist" "true" "$ALL_EXIST"

ALL_CONTRACTS="$(jq 'all(.[]; .has_contract == true)' "$OUT_JSON")"
assert_eq "all active workflows expose contract blocks" "true" "$ALL_CONTRACTS"

SHIFT_REPORT="$(jq -r '.[] | select(.name == "shift-report") | .source_path' "$OUT_JSON")"
assert_eq "shift-report points at packages/workflows source" "packages/workflows/shift-report/SKILL.md" "$SHIFT_REPORT"

AUTHORITATIVE="$(jq -r '.[0].authoritative_surface' "$OUT_JSON")"
assert_eq "authoritative surface is packages/workflows" "packages/workflows" "$AUTHORITATIVE"

RAW_OUTPUT="$(cat "$OUT_JSON")"
assert_contains "includes clinical-calculator entry" '"name": "clinical-calculator"' "$RAW_OUTPUT"
assert_contains "includes protocol-reference entry" '"name": "protocol-reference"' "$RAW_OUTPUT"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
