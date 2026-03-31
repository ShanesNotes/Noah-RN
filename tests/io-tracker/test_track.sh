#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
TOOL="$REPO_ROOT/tools/io-tracker/track.sh"
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

run_and_capture() {
    local stdout_file stderr_file
    stdout_file="$(mktemp)"
    stderr_file="$(mktemp)"

    set +e
    "$@" >"$stdout_file" 2>"$stderr_file"
    RUN_EXIT_CODE=$?
    set -e

    RUN_STDOUT="$(<"$stdout_file")"
    RUN_STDERR="$(<"$stderr_file")"
    rm -f "$stdout_file" "$stderr_file"
}

echo "=== IO Tracker Tool Tests ==="
echo ""

echo "Test: tool is executable"
if [[ -x "$TOOL" ]]; then
    echo "  PASS: track.sh is executable"
    PASS=$((PASS + 1))
else
    echo "  FAIL: track.sh is not executable"
    FAIL=$((FAIL + 1))
fi

echo "Test: totals are computed from structured entries"
read -r -d '' INPUT_JSON <<'EOF' || true
{
  "entries": [
    {"direction": "intake", "category": "iv", "label": "NS bolus", "volume_ml": 1000, "details": "NS 1L bolus at 0800"},
    {"direction": "intake", "category": "po", "label": "oral fluids", "volume_ml": 480, "details": "drank 480 mL"},
    {"direction": "output", "category": "urine", "label": "foley", "volume_ml": 380, "details": "0700-1300"}
  ]
}
EOF
run_and_capture bash -lc "printf '%s' \"\$1\" | \"$TOOL\"" _ "$INPUT_JSON"
assert_eq "exit 0 on valid structured input" "0" "$RUN_EXIT_CODE"
assert_eq "status is ok" "ok" "$(printf '%s' "$RUN_STDOUT" | jq -r '.status' 2>/dev/null || echo parse_error)"
assert_eq "intake total" "1480" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.intake_total_ml' 2>/dev/null || echo parse_error)"
assert_eq "output total" "380" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.output_total_ml' 2>/dev/null || echo parse_error)"
assert_eq "net balance" "1100" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.net_balance_ml' 2>/dev/null || echo parse_error)"
assert_eq "iv subtotal" "1000" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.intake_by_category.iv' 2>/dev/null || echo parse_error)"
assert_eq "po subtotal" "480" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.intake_by_category.po' 2>/dev/null || echo parse_error)"
assert_eq "urine subtotal" "380" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.output_by_category.urine' 2>/dev/null || echo parse_error)"
assert_eq "entry count" "3" "$(printf '%s' "$RUN_STDOUT" | jq -r '.state.entries | length' 2>/dev/null || echo parse_error)"

echo "Test: incremental recomputation reuses prior state"
read -r -d '' FOLLOWUP_JSON <<'EOF' || true
{
  "prior_state": {
    "entries": [
      {"direction": "intake", "category": "iv", "label": "NS bolus", "volume_ml": 1000, "details": "NS 1L bolus at 0800", "estimate": false, "tier": 1, "is_new": false, "sequence": 1, "running_intake_ml": 1000, "running_output_ml": 0, "running_balance_ml": 1000},
      {"direction": "intake", "category": "po", "label": "oral fluids", "volume_ml": 480, "details": "drank 480 mL", "estimate": false, "tier": 1, "is_new": false, "sequence": 2, "running_intake_ml": 1480, "running_output_ml": 0, "running_balance_ml": 1480},
      {"direction": "output", "category": "urine", "label": "foley", "volume_ml": 380, "details": "0700-1300", "estimate": false, "tier": 1, "is_new": false, "sequence": 3, "running_intake_ml": 1480, "running_output_ml": 380, "running_balance_ml": 1100}
    ],
    "totals": {
      "intake_total_ml": 1480,
      "output_total_ml": 380,
      "grand_total_ml": 1860,
      "net_balance_ml": 1100,
      "intake_by_category": {"iv": 1000, "po": 480},
      "output_by_category": {"urine": 380}
    }
  },
  "entries": [
    {"direction": "output", "category": "emesis", "label": "emesis", "volume_ml": 150, "details": "coffee-ground emesis", "estimate": false, "tier": 1}
  ]
}
EOF
run_and_capture bash -lc "printf '%s' \"\$1\" | \"$TOOL\"" _ "$FOLLOWUP_JSON"
assert_eq "exit 0 on incremental recomputation" "0" "$RUN_EXIT_CODE"
assert_eq "updated intake total" "1480" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.intake_total_ml' 2>/dev/null || echo parse_error)"
assert_eq "updated output total" "530" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.output_total_ml' 2>/dev/null || echo parse_error)"
assert_eq "updated net balance" "950" "$(printf '%s' "$RUN_STDOUT" | jq -r '.totals.net_balance_ml' 2>/dev/null || echo parse_error)"
assert_eq "new entry marked is_new" "true" "$(printf '%s' "$RUN_STDOUT" | jq -r '.state.entries[-1].is_new' 2>/dev/null || echo parse_error)"

echo "Test: empty entries returns no-match exit 1"
run_and_capture bash -lc "printf '%s' '{\"entries\":[]}' | \"$TOOL\"" _
assert_eq "exit 1 on empty entries" "1" "$RUN_EXIT_CODE"
assert_eq "error type is no_match" "no_match" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | jq -r '.error' 2>/dev/null || echo parse_error)"

echo "Test: invalid JSON returns system error exit 2"
run_and_capture bash -lc "printf '%s' 'not-json' | \"$TOOL\"" _
assert_eq "exit 2 on invalid JSON" "2" "$RUN_EXIT_CODE"
assert_eq "error type is system_error" "system_error" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | jq -r '.error' 2>/dev/null || echo parse_error)"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
