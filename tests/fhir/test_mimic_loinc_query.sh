#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
TOOL="$REPO_ROOT/tools/fhir/mimic-loinc-query.sh"
MAPPING_FILE="$REPO_ROOT/clinical-resources/mimic-mappings.json"
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
    if echo "$haystack" | grep -Fq "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: $haystack"
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

make_fake_curl() {
    local path="$1" log_file="$2"
    cat >"$path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

log_file="${FAKE_CURL_LOG:?}"
response_payload="${FAKE_CURL_RESPONSE:-}"
url=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        http://*|https://*)
            url="$1"
            shift
            ;;
        -s|-S|-sS|--fail-with-body)
            shift
            ;;
        -H|-o|-w|-X|-d|--data|--data-binary)
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

printf '%s\n' "$url" >>"$log_file"

if [[ "$url" == */Observation* ]]; then
    if [[ -n "$response_payload" ]]; then
        printf '%s' "$response_payload"
        exit 0
    fi
    printf '{"resourceType":"Bundle","entry":[{"resource":{"id":"obs-1"}}]}'
else
    printf '{"resourceType":"Bundle","entry":[]}'
fi
EOF
    chmod +x "$path"
    : >"$log_file"
}

echo "=== MIMIC LOINC Query Tests ==="
echo ""

echo "Test: tool file exists"
if [[ -f "$TOOL" ]]; then
    echo "  PASS: mimic-loinc-query.sh exists"
    PASS=$((PASS + 1))
else
    echo "  FAIL: missing $TOOL"
    FAIL=$((FAIL + 1))
fi

echo "Test: mapping file exists"
if [[ -f "$MAPPING_FILE" ]]; then
    echo "  PASS: mimic-mappings.json exists"
    PASS=$((PASS + 1))
else
    echo "  FAIL: missing $MAPPING_FILE"
    FAIL=$((FAIL + 1))
fi

echo "Test: mapping file includes provenance metadata"
assert_eq "mapping source" "MIT-LCP MIMIC-IV mapping tables" "$(jq -r '.provenance.source' "$MAPPING_FILE")"
assert_eq "mapping last_verified" "2026-03-31" "$(jq -r '.provenance.last_verified' "$MAPPING_FILE")"

echo "Test: mapping file preserves Noah compatibility aliases"
assert_eq "lactate alias retained" "2524-7" "$(jq -r '.item_id_to_loinc["50813"].aliases[0]' "$MAPPING_FILE")"
assert_eq "MAP alias retained" "76214-6" "$(jq -r '.item_id_to_loinc["220052"].aliases[0]' "$MAPPING_FILE")"
assert_eq "SpO2 alias retained" "2708-6" "$(jq -r '.item_id_to_loinc["220277"].aliases[0]' "$MAPPING_FILE")"

echo "Test: tool resolves official and compatibility codes"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
mock_dir="$tmpdir/mock"
mkdir -p "$mock_dir"
log_file="$tmpdir/curl.log"
make_fake_curl "$mock_dir/curl" "$log_file"

run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL" 2524-7 pat-1
assert_eq "exit 0 for lactate alias" "0" "$RUN_EXIT_CODE"
assert_eq "stdout is valid JSON" "0" "$(printf '%s' "$RUN_STDOUT" | jq -e . >/dev/null 2>&1; echo $?)"
assert_eq "response contains observation id" "obs-1" "$(printf '%s' "$RUN_STDOUT" | jq -r '.entry[0].resource.id')"
assert_contains "queries observation endpoint" "http://example.test/fhir/Observation?patient=pat-1&code=50813" "$(tail -n 1 "$log_file")"

run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL" 76214-6 pat-1
assert_eq "exit 0 for MAP alias" "0" "$RUN_EXIT_CODE"
assert_contains "resolves MAP alias to official itemID 220052" "code=220052" "$(tail -n 1 "$log_file")"

run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL" 2708-6 pat-1
assert_eq "exit 0 for SpO2 alias" "0" "$RUN_EXIT_CODE"
assert_contains "resolves SpO2 alias to official itemID 220277" "code=220277" "$(tail -n 1 "$log_file")"

run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL" 1111-1 pat-1
assert_eq "exit 1 for missing mapping" "1" "$RUN_EXIT_CODE"
assert_eq "no-match error is reported" "no_match" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | jq -r '.error')"

run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL"
assert_eq "exit 1 for missing args" "1" "$RUN_EXIT_CODE"
assert_eq "input error is reported" "invalid_input" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | sed -n '/^{/,$p' | jq -r '.error' 2>/dev/null)"

echo "Test: invalid mapping file returns system error exit 2"
bad_mapping="$tmpdir/bad-mapping.json"
printf '{"provenance":{"source":"broken"}}\n' >"$bad_mapping"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" CURL_BIN="$mock_dir/curl" MAPPING_FILE="$bad_mapping" FHIR_SERVER="http://example.test/fhir" "$TOOL" 2524-7 pat-1
assert_eq "exit 2 for invalid mapping file" "2" "$RUN_EXIT_CODE"
assert_eq "system error for invalid mapping file" "system_error" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | jq -r '.error')"

echo "Test: non-Bundle JSON response returns system error exit 2"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" FAKE_CURL_RESPONSE='{"resourceType":"OperationOutcome","issue":[]}' CURL_BIN="$mock_dir/curl" FHIR_SERVER="http://example.test/fhir" "$TOOL" 2524-7 pat-1
assert_eq "exit 2 for OperationOutcome payload" "2" "$RUN_EXIT_CODE"
assert_eq "system error for non-Bundle JSON" "system_error" "$(printf '%s' "$RUN_STDOUT$RUN_STDERR" | jq -r '.error')"

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
