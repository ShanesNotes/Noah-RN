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

echo "=== Clinical Resources Registry Consumer ==="

node "$REPO_ROOT/packages/agent-harness/list-clinical-resources.mjs" > "$OUT_JSON"

COUNT="$(jq 'length' "$OUT_JSON")"
assert_eq "registry consumer returns 6 clinical resource assets" "6" "$COUNT"

ALL_EXIST="$(jq 'all(.[]; .exists == true)' "$OUT_JSON")"
assert_eq "all registered knowledge source paths exist" "true" "$ALL_EXIST"

AUTHORITATIVE="$(jq -r '.[0].authoritative_surface' "$OUT_JSON")"
assert_eq "authoritative surface is clinical-resources" "clinical-resources" "$AUTHORITATIVE"

RAW_OUTPUT="$(cat "$OUT_JSON")"
assert_contains "includes cross-skill-triggers entry" '"name": "cross-skill-triggers"' "$RAW_OUTPUT"
assert_contains "includes mimic-mappings entry" '"name": "mimic-mappings"' "$RAW_OUTPUT"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit "$FAIL"
