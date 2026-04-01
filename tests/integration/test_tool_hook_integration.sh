#!/usr/bin/env bash
# Integration tests: clinical calculator tool → validate-calculator.sh hook
#
# Exercises the full deterministic path:
#   run tool with realistic inputs → capture JSON output →
#   wrap in PostToolUse envelope → pass to validate-calculator.sh →
#   assert hook accepts valid scores and rejects out-of-range scores
#
# Also smoke-tests that all 10 calculators exist as scripts and are
# registered in validate-calculator.sh's case block.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TOOLS_DIR="$REPO_ROOT/tools/clinical-calculators"
HOOK="$REPO_ROOT/plugin/hooks/scripts/validate-calculator.sh"

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
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: ${haystack:0:300}..."
        FAIL=$((FAIL + 1))
    fi
}

assert_hook_exit() {
    local desc="$1" expected_exit="$2" hook_input="$3"
    local actual_exit=0
    echo "$hook_input" | bash "$HOOK" >/dev/null 2>&1 || actual_exit=$?
    if [[ "$actual_exit" == "$expected_exit" ]]; then
        echo "  PASS: $desc (exit $actual_exit)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected exit: $expected_exit"
        echo "    actual exit:   $actual_exit"
        FAIL=$((FAIL + 1))
    fi
}

# Build a PostToolUse hook envelope from a tool stdout string
posttool_env() {
    local cmd="$1" stdout="$2"
    jq -n --arg cmd "$cmd" --arg stdout "$stdout" \
        '{hook_event_name: "PostToolUse", tool_name: "Bash",
          tool_input: {command: $cmd},
          tool_response: {stdout: $stdout}}'
}

# Inject a fake score into a valid tool output JSON
inject_score() {
    local json="$1" score="$2"
    echo "$json" | jq --argjson s "$score" '.score = $s'
}

echo "=== Tool → Hook Integration Tests ==="
echo ""

# ── smoke: tool scripts exist ────────────────────────────────────────────────

echo "Smoke: all 10 calculator scripts exist and are executable"
# file names use hyphens for Wells calculators
SCRIPT_FILES=(gcs nihss apache2 wells-pe wells-dvt curb65 braden rass cpot news2)
for name in "${SCRIPT_FILES[@]}"; do
    if [[ -x "$TOOLS_DIR/$name.sh" ]]; then
        echo "  PASS: $name.sh exists and is executable"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name.sh missing or not executable"
        FAIL=$((FAIL + 1))
    fi
done

# ── smoke: all calculators registered in hook case block ─────────────────────

echo ""
echo "Smoke: all 10 calculators registered in validate-calculator.sh"
# hook case block uses underscores for Wells calculators (matches .calculator field in JSON)
HOOK_NAMES=(gcs nihss apache2 wells_pe wells_dvt curb65 braden rass cpot news2)
for name in "${HOOK_NAMES[@]}"; do
    if grep -q "^  ${name})" "$HOOK"; then
        echo "  PASS: $name registered in hook"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $name missing from hook case block"
        FAIL=$((FAIL + 1))
    fi
done

# ── GCS ──────────────────────────────────────────────────────────────────────

echo ""
echo "GCS: tool output passes hook (valid score)"
GCS_OUT=$("$TOOLS_DIR/gcs.sh" --eye 3 --verbal 4 --motor 5)
GCS_SCORE=$(echo "$GCS_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/gcs.sh" "$GCS_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "GCS valid score ($GCS_SCORE) — hook passes (no output)" "" "$OUT"

echo "GCS: injected score 16 — hook blocks"
BAD=$(inject_score "$GCS_OUT" 16)
ENV=$(posttool_env "bash tools/clinical-calculators/gcs.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "GCS score 16 > max 15 — hook emits block" '"decision": "block"' "$OUT"

echo "GCS: injected score 2 — hook blocks"
BAD=$(inject_score "$GCS_OUT" 2)
ENV=$(posttool_env "bash tools/clinical-calculators/gcs.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "GCS score 2 < min 3 — hook emits block" '"decision": "block"' "$OUT"

# ── NIHSS ─────────────────────────────────────────────────────────────────────

echo ""
echo "NIHSS: tool output passes hook (valid score)"
NIHSS_OUT=$("$TOOLS_DIR/nihss.sh" --1a 0 --1b 0 --1c 0 --2 0 --3 0 --4 0 \
    --5a 0 --5b 0 --6a 0 --6b 0 --7 0 --8 0 --9 0 --10 0 --11 0)
NIHSS_SCORE=$(echo "$NIHSS_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/nihss.sh" "$NIHSS_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "NIHSS valid score ($NIHSS_SCORE) — hook passes" "" "$OUT"

echo "NIHSS: injected score 43 — hook blocks"
BAD=$(inject_score "$NIHSS_OUT" 43)
ENV=$(posttool_env "bash tools/clinical-calculators/nihss.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "NIHSS score 43 > max 42 — hook emits block" '"decision": "block"' "$OUT"

# ── APACHE II ────────────────────────────────────────────────────────────────

echo ""
echo "APACHE II: tool output passes hook (valid score)"
APACHE_OUT=$("$TOOLS_DIR/apache2.sh" \
    --temp 37.0 --map 80 --hr 80 --rr 16 \
    --fio2 0.21 --oxygenation 95 \
    --ph 7.40 --sodium 140 --potassium 4.0 \
    --creatinine 1.0 --hematocrit 40 --wbc 8 \
    --gcs 15 --age 40 --chronic 0)
APACHE_SCORE=$(echo "$APACHE_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/apache2.sh" "$APACHE_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "APACHE II valid score ($APACHE_SCORE) — hook passes" "" "$OUT"

echo "APACHE II: injected score 72 — hook blocks"
BAD=$(inject_score "$APACHE_OUT" 72)
ENV=$(posttool_env "bash tools/clinical-calculators/apache2.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "APACHE II score 72 > max 71 — hook emits block" '"decision": "block"' "$OUT"

# ── Wells PE ─────────────────────────────────────────────────────────────────

echo ""
echo "Wells PE: tool output passes hook (valid score)"
WELLSPE_OUT=$("$TOOLS_DIR/wells-pe.sh" \
    --dvt 0 --heartrate 0 --immobilization 0 --prior 0 \
    --hemoptysis 0 --malignancy 0 --alternative 0)
WELLSPE_SCORE=$(echo "$WELLSPE_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/wells-pe.sh" "$WELLSPE_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Wells PE valid score ($WELLSPE_SCORE) — hook passes" "" "$OUT"

echo "Wells PE: injected score 13 — hook blocks"
BAD=$(inject_score "$WELLSPE_OUT" 13)
ENV=$(posttool_env "bash tools/clinical-calculators/wells-pe.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "Wells PE score 13 > max 12.5 — hook emits block" '"decision": "block"' "$OUT"

# ── Wells DVT ────────────────────────────────────────────────────────────────

echo ""
echo "Wells DVT: tool output passes hook (valid score)"
WELLSDVT_OUT=$("$TOOLS_DIR/wells-dvt.sh" \
    --cancer 0 --paralysis 0 --bedridden 0 --tenderness 0 \
    --leg-swollen 0 --calf-swelling 0 --pitting-edema 0 \
    --collateral-veins 0 --previous-dvt 0 --alternative-dx 1)
WELLSDVT_SCORE=$(echo "$WELLSDVT_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/wells-dvt.sh" "$WELLSDVT_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Wells DVT valid score ($WELLSDVT_SCORE) — hook passes" "" "$OUT"

echo "Wells DVT: injected score 10 — hook blocks"
BAD=$(inject_score "$WELLSDVT_OUT" 10)
ENV=$(posttool_env "bash tools/clinical-calculators/wells-dvt.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "Wells DVT score 10 > max 9 — hook emits block" '"decision": "block"' "$OUT"

echo "Wells DVT: injected score -3 — hook blocks"
BAD=$(inject_score "$WELLSDVT_OUT" -3)
ENV=$(posttool_env "bash tools/clinical-calculators/wells-dvt.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "Wells DVT score -3 < min -2 — hook emits block" '"decision": "block"' "$OUT"

# ── CURB-65 ──────────────────────────────────────────────────────────────────

echo ""
echo "CURB-65: tool output passes hook (valid score)"
CURB_OUT=$("$TOOLS_DIR/curb65.sh" \
    --confusion 0 --urea 0 --rr 0 --bp 0 --age 0)
CURB_SCORE=$(echo "$CURB_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/curb65.sh" "$CURB_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "CURB-65 valid score ($CURB_SCORE) — hook passes" "" "$OUT"

echo "CURB-65: injected score 6 — hook blocks"
BAD=$(inject_score "$CURB_OUT" 6)
ENV=$(posttool_env "bash tools/clinical-calculators/curb65.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "CURB-65 score 6 > max 5 — hook emits block" '"decision": "block"' "$OUT"

# ── Braden ───────────────────────────────────────────────────────────────────

echo ""
echo "Braden: tool output passes hook (valid score)"
BRADEN_OUT=$("$TOOLS_DIR/braden.sh" \
    --sensory 4 --moisture 4 --activity 4 --mobility 4 --nutrition 4 --friction 3)
BRADEN_SCORE=$(echo "$BRADEN_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/braden.sh" "$BRADEN_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Braden valid score ($BRADEN_SCORE) — hook passes" "" "$OUT"

echo "Braden: injected score 24 — hook blocks"
BAD=$(inject_score "$BRADEN_OUT" 24)
ENV=$(posttool_env "bash tools/clinical-calculators/braden.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "Braden score 24 > max 23 — hook emits block" '"decision": "block"' "$OUT"

echo "Braden: injected score 5 — hook blocks"
BAD=$(inject_score "$BRADEN_OUT" 5)
ENV=$(posttool_env "bash tools/clinical-calculators/braden.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "Braden score 5 < min 6 — hook emits block" '"decision": "block"' "$OUT"

# ── RASS ─────────────────────────────────────────────────────────────────────

echo ""
echo "RASS: tool output passes hook (valid score)"
RASS_OUT=$("$TOOLS_DIR/rass.sh" --score -2)
RASS_SCORE=$(echo "$RASS_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/rass.sh" "$RASS_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "RASS valid score ($RASS_SCORE) — hook passes" "" "$OUT"

echo "RASS: injected score 5 — hook blocks"
BAD=$(inject_score "$RASS_OUT" 5)
ENV=$(posttool_env "bash tools/clinical-calculators/rass.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "RASS score 5 > max 4 — hook emits block" '"decision": "block"' "$OUT"

echo "RASS: injected score -6 — hook blocks"
BAD=$(inject_score "$RASS_OUT" -6)
ENV=$(posttool_env "bash tools/clinical-calculators/rass.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "RASS score -6 < min -5 — hook emits block" '"decision": "block"' "$OUT"

# ── CPOT ─────────────────────────────────────────────────────────────────────

echo ""
echo "CPOT: tool output passes hook (valid score)"
CPOT_OUT=$("$TOOLS_DIR/cpot.sh" --facial 0 --body 0 --muscle 0 --compliance 0)
CPOT_SCORE=$(echo "$CPOT_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/cpot.sh" "$CPOT_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "CPOT valid score ($CPOT_SCORE) — hook passes" "" "$OUT"

echo "CPOT: injected score 9 — hook blocks"
BAD=$(inject_score "$CPOT_OUT" 9)
ENV=$(posttool_env "bash tools/clinical-calculators/cpot.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "CPOT score 9 > max 8 — hook emits block" '"decision": "block"' "$OUT"

# ── NEWS2 ─────────────────────────────────────────────────────────────────────

echo ""
echo "NEWS2: tool output passes hook (valid score)"
NEWS2_OUT=$("$TOOLS_DIR/news2.sh" \
    --rr 16 --spo2 98 --o2 no --temp 37.0 --sbp 120 --hr 80 --avpu A)
NEWS2_SCORE=$(echo "$NEWS2_OUT" | jq -r '.score')
ENV=$(posttool_env "bash tools/clinical-calculators/news2.sh" "$NEWS2_OUT")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "NEWS2 valid score ($NEWS2_SCORE) — hook passes" "" "$OUT"

echo "NEWS2: injected score 21 — hook blocks"
BAD=$(inject_score "$NEWS2_OUT" 21)
ENV=$(posttool_env "bash tools/clinical-calculators/news2.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "NEWS2 score 21 > max 20 — hook emits block" '"decision": "block"' "$OUT"

echo "NEWS2: injected score -1 — hook blocks"
BAD=$(inject_score "$NEWS2_OUT" -1)
ENV=$(posttool_env "bash tools/clinical-calculators/news2.sh" "$BAD")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_contains "NEWS2 score -1 < min 0 — hook emits block" '"decision": "block"' "$OUT"

# ── cross-cutting ─────────────────────────────────────────────────────────────

echo ""
echo "Cross-cutting: non-calculator Bash command — hook passes through"
ENV=$(posttool_env "bash tools/trace/trace.sh" '{"status":"ok"}')
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Non-calculator command — hook passthrough (no output)" "" "$OUT"

echo "Cross-cutting: unknown calculator name — hook passes through"
FAKE='{"status":"ok","calculator":"fake_calc","score":999}'
ENV=$(posttool_env "bash tools/clinical-calculators/fake.sh" "$FAKE")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Unknown calculator — hook passthrough (no output)" "" "$OUT"

echo "Cross-cutting: error status — hook passes through"
ERR='{"status":"error","error":"missing_args","message":"required"}'
ENV=$(posttool_env "bash tools/clinical-calculators/gcs.sh" "$ERR")
OUT=$(echo "$ENV" | bash "$HOOK")
assert_eq "Error status output — hook passthrough (no output)" "" "$OUT"

# ── summary ───────────────────────────────────────────────────────────────────

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
