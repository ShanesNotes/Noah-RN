#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
TOOL="$REPO_ROOT/tools/trace/trace.sh"
PASS=0
FAIL=0

TRACE_BASE_DIR="$(mktemp -d)"
export TRACE_BASE_DIR
trap 'rm -rf "$TRACE_BASE_DIR"' EXIT

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        ((PASS++)) || true
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        ((FAIL++)) || true
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo "  PASS: $desc"
        ((PASS++)) || true
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: $haystack"
        ((FAIL++)) || true
    fi
}

assert_valid_json() {
    local desc="$1" content="$2"
    if echo "$content" | jq . >/dev/null 2>&1; then
        echo "  PASS: $desc"
        ((PASS++)) || true
    else
        echo "  FAIL: $desc (not valid JSON)"
        echo "    actual: $content"
        ((FAIL++)) || true
    fi
}

echo "=== Trace Logging Tool Tests ==="
echo ""

# Test 1: init creates directory and returns valid case-id
echo "Test 1: init creates directory and returns valid case-id"
case_id=$("$TOOL" init gcs)
assert_contains "case-id contains skill name" "gcs" "$case_id"
if [[ -d "$TRACE_BASE_DIR/$case_id" ]]; then
    echo "  PASS: directory created"
    ((PASS++)) || true
else
    echo "  FAIL: directory not created at $TRACE_BASE_DIR/$case_id"
    ((FAIL++)) || true
fi

# Test 2: init without skill-name exits 1
echo "Test 2: init without skill-name exits 1"
exit_code=0
"$TOOL" init 2>/dev/null || exit_code=$?
assert_eq "exit code is 1" "1" "$exit_code"

# Test 3: input writes valid JSON
echo "Test 3: input writes valid JSON"
case_id3=$("$TOOL" init test-skill)
"$TOOL" input "$case_id3" '{"patient_id":"P001","query":"vitals"}'
content="$(cat "$TRACE_BASE_DIR/$case_id3/input-context.json")"
assert_valid_json "input-context.json is valid JSON" "$content"
assert_eq "skill field matches" "test-skill" "$(echo "$content" | jq -r '.skill')"
assert_eq "context.patient_id present" "P001" "$(echo "$content" | jq -r '.context.patient_id')"

# Test 4: input from stdin works
echo "Test 4: input from stdin works"
case_id4=$("$TOOL" init stdin-test)
echo '{"patient_id":"P002","query":"gcs"}' | "$TOOL" input "$case_id4"
content="$(cat "$TRACE_BASE_DIR/$case_id4/input-context.json")"
assert_valid_json "input-context.json is valid JSON (stdin)" "$content"
assert_eq "context.patient_id from stdin" "P002" "$(echo "$content" | jq -r '.context.patient_id')"

# Test 5: output captures stdin to file
echo "Test 5: output captures stdin to file"
case_id5=$("$TOOL" init output-test)
echo "GCS Score: 15 — Alert and oriented" | "$TOOL" output "$case_id5"
if [[ -f "$TRACE_BASE_DIR/$case_id5/skill-output.txt" ]]; then
    echo "  PASS: skill-output.txt created"
    ((PASS++)) || true
else
    echo "  FAIL: skill-output.txt not created"
    ((FAIL++)) || true
fi
content="$(cat "$TRACE_BASE_DIR/$case_id5/skill-output.txt")"
assert_contains "output contains expected text" "GCS Score" "$content"

# Test 6: hooks writes valid JSON
echo "Test 6: hooks writes valid JSON"
case_id6=$("$TOOL" init hooks-test)
"$TOOL" hooks "$case_id6" '{"fired":["safety-check"],"results":{"safety-check":"pass"}}'
content="$(cat "$TRACE_BASE_DIR/$case_id6/hook-results.json")"
assert_valid_json "hook-results.json is valid JSON" "$content"
assert_eq "fired hook present" "safety-check" "$(echo "$content" | jq -r '.fired[0]')"

# Test 7: hooks validates JSON (rejects invalid)
echo "Test 7: hooks rejects invalid JSON"
case_id7=$("$TOOL" init hooks-invalid)
exit_code=0
"$TOOL" hooks "$case_id7" 'not-valid-json' 2>/dev/null || exit_code=$?
assert_eq "exit code is 1 for invalid JSON" "1" "$exit_code"

# Test 8: done writes timing.json with correct structure
echo "Test 8: done writes timing.json with correct structure"
case_id8=$("$TOOL" init timing-test)
sleep 0.05
"$TOOL" done "$case_id8" >/dev/null
content="$(cat "$TRACE_BASE_DIR/$case_id8/timing.json")"
assert_valid_json "timing.json is valid JSON" "$content"
assert_eq "skill field in timing" "timing-test" "$(echo "$content" | jq -r '.skill')"
for field in start end duration_ms stages; do
    val="$(echo "$content" | jq -r ".$field")"
    if [[ "$val" != "null" ]]; then
        echo "  PASS: timing.json has field '$field'"
        ((PASS++)) || true
    else
        echo "  FAIL: timing.json missing field '$field'"
        ((FAIL++)) || true
    fi
done
duration="$(echo "$content" | jq -r '.duration_ms')"
if [[ "$duration" -ge 0 ]] 2>/dev/null; then
    echo "  PASS: duration_ms is numeric ($duration)"
    ((PASS++)) || true
else
    echo "  FAIL: duration_ms is not numeric ($duration)"
    ((FAIL++)) || true
fi

# Test 9: done without prior init exits 1
echo "Test 9: done without prior init exits 1"
exit_code=0
"$TOOL" done "nonexistent-case-id-xyz" 2>/dev/null || exit_code=$?
assert_eq "exit code is 1 for missing case" "1" "$exit_code"

# Test 10: Full lifecycle: init → input → output → hooks → done
echo "Test 10: Full lifecycle"
case_id10=$("$TOOL" init lifecycle-test)
"$TOOL" input "$case_id10" '{"patient_id":"P010","query":"apache2"}'
echo "APACHE II Score: 12" | "$TOOL" output "$case_id10"
"$TOOL" hooks "$case_id10" '{"fired":[],"results":{}}'
summary=$("$TOOL" done "$case_id10")
assert_contains "summary contains case-id" "$case_id10" "$summary"
for f in input-context.json skill-output.txt hook-results.json timing.json; do
    if [[ -f "$TRACE_BASE_DIR/$case_id10/$f" ]]; then
        echo "  PASS: $f exists"
        ((PASS++)) || true
    else
        echo "  FAIL: $f missing"
        ((FAIL++)) || true
    fi
done

# Test 11: case-id format matches {skill}-{date}-{hex4}
echo "Test 11: case-id format validation"
case_id11=$("$TOOL" init format-check)
if echo "$case_id11" | grep -qE '^format-check-[0-9]{8}T[0-9]{6}-[0-9a-f]{4}$'; then
    echo "  PASS: case-id matches expected format"
    ((PASS++)) || true
else
    echo "  FAIL: case-id format mismatch: $case_id11"
    ((FAIL++)) || true
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
