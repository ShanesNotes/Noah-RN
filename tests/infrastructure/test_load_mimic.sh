#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
TOOL="$REPO_ROOT/infrastructure/load-mimic.sh"
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
    if echo "$haystack" | grep -Fqi "$needle"; then
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
    local path="$1" log_file="$2" verify_payload="${3:-}"
    cat >"$path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

log_file="${FAKE_CURL_LOG:?}"
verify_payload="${FAKE_CURL_VERIFY_PAYLOAD:-}"
patient_count_payload="${FAKE_CURL_PATIENT_COUNT_PAYLOAD:-}"
sample_patient_payload="${FAKE_CURL_SAMPLE_PATIENT_PAYLOAD:-}"
observation_count_payload="${FAKE_CURL_OBSERVATION_COUNT_PAYLOAD:-}"
condition_count_payload="${FAKE_CURL_CONDITION_COUNT_PAYLOAD:-}"
med_request_count_payload="${FAKE_CURL_MEDREQUEST_COUNT_PAYLOAD:-}"
[[ -n "$patient_count_payload" ]] || patient_count_payload='{"total":0}'
[[ -n "$sample_patient_payload" ]] || sample_patient_payload='{"entry":[{"resource":{"id":"pat-1"}}]}'
[[ -n "$observation_count_payload" ]] || observation_count_payload='{"total":1}'
[[ -n "$condition_count_payload" ]] || condition_count_payload='{"total":1}'
[[ -n "$med_request_count_payload" ]] || med_request_count_payload='{"total":1}'
method="GET"
url=""
data=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -X)
            method="$2"
            shift 2
            ;;
        -d|--data|--data-binary)
            data="$2"
            shift 2
            ;;
        -o)
            shift 2
            ;;
        -H|-w)
            shift 2
            ;;
        -s|-S|-sS|--fail-with-body)
            shift
            ;;
        http://*|https://*)
            url="$1"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

printf '%s\t%s\t%s\n' "$method" "$url" "$data" >>"$log_file"

if [[ "$url" == */metadata ]]; then
    printf '{"resourceType":"CapabilityStatement","fhirVersion":"4.0.1"}'
    exit 0
fi

if [[ -n "$verify_payload" && "$url" == *"_summary=count"* ]]; then
    printf '%s' "$verify_payload"
    exit 0
fi

if [[ "$url" == *"/Patient?_summary=count"* ]]; then
    printf '%s' "$patient_count_payload"
    exit 0
fi

if [[ "$url" == *"/Patient?_count=1"* ]]; then
    printf '%s' "$sample_patient_payload"
    exit 0
fi

if [[ "$url" == *"/Observation?_summary=count"* ]]; then
    printf '%s' "$observation_count_payload"
    exit 0
fi

if [[ "$url" == *"/Condition?_summary=count"* ]]; then
    printf '%s' "$condition_count_payload"
    exit 0
fi

if [[ "$url" == *"/MedicationRequest?_summary=count"* ]]; then
    printf '%s' "$med_request_count_payload"
    exit 0
fi

if [[ "$method" == "PUT" ]]; then
    printf '201'
else
    printf '200'
fi
EOF
    chmod +x "$path"
    : >"$log_file"
}

echo "=== MIMIC Loader Tests ==="
echo ""

echo "Test: tool file exists"
if [[ -f "$TOOL" ]]; then
    echo "  PASS: load-mimic.sh exists"
    PASS=$((PASS + 1))
else
    echo "  FAIL: missing $TOOL"
    FAIL=$((FAIL + 1))
fi

echo "Test: --help exits 0 and prints usage"
run_and_capture "$TOOL" --help
assert_eq "exit 0 on --help" "0" "$RUN_EXIT_CODE"
assert_contains "help mentions usage" "usage" "$RUN_STDOUT$RUN_STDERR"

echo "Test: invalid subcommand exits 1"
run_and_capture "$TOOL" nope
assert_eq "exit 1 on invalid subcommand" "1" "$RUN_EXIT_CODE"
assert_contains "invalid subcommand mentions usage" "usage" "$RUN_STDOUT$RUN_STDERR"

echo "Test: print-load-order exposes required sequence"
run_and_capture "$TOOL" print-load-order
assert_eq "exit 0 on print-load-order" "0" "$RUN_EXIT_CODE"
expected_order=$'MimicOrganization\nMimicLocation\nMimicPatient\nMimicEncounter\nMimicEncounterED\nMimicEncounterICU\nMimicCondition\nMimicConditionED\nMimicProcedure\nMimicProcedureED\nMimicProcedureICU\nMimicMedication\nMimicMedicationMix\nMimicMedicationRequest\nMimicMedicationDispense\nMimicMedicationDispenseED\nMimicMedicationAdministration\nMimicMedicationAdministrationICU\nMimicMedicationStatementED\nMimicSpecimen\nMimicSpecimenLab\nMimicObservationED\nMimicObservationLabevents\nMimicObservationDatetimeevents\nMimicObservationOutputevents\nMimicObservationMicroTest\nMimicObservationMicroOrg\nMimicObservationMicroSusc\nMimicObservationVitalSignsED\nMimicObservationChartevents'
assert_eq "load order matches issue" "$expected_order" "$RUN_STDOUT"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
data_dir="$tmpdir/data"
mock_dir="$tmpdir/mock"
mkdir -p "$data_dir" "$mock_dir"

cat >"$data_dir/MimicPatient.ndjson" <<'EOF'
{"resourceType":"Patient","id":"pat-1"}
{"resourceType":"Patient","id":"pat-2"}
EOF

cat >"$data_dir/MimicOrganization.ndjson" <<'EOF'
{"resourceType":"Organization","id":"org-1"}
EOF

cat >"$data_dir/MimicEncounter.ndjson" <<'EOF'
{"resourceType":"Encounter","id":"enc-1"}
EOF

log_file="$tmpdir/curl.log"
make_fake_curl "$mock_dir/curl" "$log_file"

echo "Test: load uses fixed order and individual PUT targets"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" FAKE_CURL_VERIFY_PAYLOAD='{"total":0}' "$TOOL" load --data-dir "$data_dir" --fhir-server "http://example.test/fhir"
assert_eq "load exits 0" "0" "$RUN_EXIT_CODE"
url_sequence="$(awk -F '\t' '$1 == "PUT" { print $2 }' "$log_file")"
expected_urls=$'http://example.test/fhir/Organization/org-1\nhttp://example.test/fhir/Patient/pat-1\nhttp://example.test/fhir/Patient/pat-2\nhttp://example.test/fhir/Encounter/enc-1'
assert_eq "PUT URLs follow profile order" "$expected_urls" "$url_sequence"
assert_eq "all import requests use PUT" $'PUT\nPUT\nPUT\nPUT' "$(awk -F '\t' '$1 == "PUT" { print $1 }' "$log_file")"
assert_contains "summary reports loaded resources" "loaded=4" "$RUN_STDOUT$RUN_STDERR"

cat >"$data_dir/MimicMedication.ndjson" <<'EOF'
{"resourceType":"Medication","id":"med-1"}
not-json
{"resourceType":"Medication","id":"med-2"}
EOF

: >"$log_file"

echo "Test: malformed JSON line warns and continues"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" FAKE_CURL_VERIFY_PAYLOAD='{"total":0}' "$TOOL" load --data-dir "$data_dir" --fhir-server "http://example.test/fhir"
assert_eq "load still exits 0 with malformed line" "0" "$RUN_EXIT_CODE"
assert_contains "warning mentions malformed JSON" "warning" "$RUN_STDOUT$RUN_STDERR"
assert_contains "summary reports invalid line count" "invalid=1" "$RUN_STDOUT$RUN_STDERR"
assert_eq "malformed line skipped" "2" "$(grep -c '/Medication/' "$log_file" | tr -d ' ')"

echo "Test: missing data dir exits 1"
run_and_capture "$TOOL" load --data-dir "$tmpdir/does-not-exist"
assert_eq "exit 1 on missing data dir" "1" "$RUN_EXIT_CODE"
assert_contains "missing data dir message" "data directory" "$RUN_STDOUT$RUN_STDERR"

echo "Test: dry-run works without preflight server probes"
: >"$log_file"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" "$TOOL" load --dry-run --data-dir "$data_dir" --fhir-server "http://offline.example/fhir"
assert_eq "dry-run exits 0" "0" "$RUN_EXIT_CODE"
assert_contains "dry-run prints planned PUTs" "DRY-RUN PUT http://offline.example/fhir/Organization/org-1" "$RUN_STDOUT$RUN_STDERR"
assert_eq "dry-run does not call curl" "0" "$(wc -l <"$log_file" | tr -d ' ')"

echo "Test: verify succeeds with expected counts"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" FAKE_CURL_PATIENT_COUNT_PAYLOAD='{"total":100}' FAKE_CURL_OBSERVATION_COUNT_PAYLOAD='{"total":10}' FAKE_CURL_CONDITION_COUNT_PAYLOAD='{"total":5}' FAKE_CURL_MEDREQUEST_COUNT_PAYLOAD='{"total":3}' "$TOOL" verify --fhir-server "http://example.test/fhir"
assert_eq "verify exits 0" "0" "$RUN_EXIT_CODE"
assert_contains "verify summary reports patient count" "patients=100" "$RUN_STDOUT$RUN_STDERR"

echo "Test: verify fails when downstream clinical counts are zero"
run_and_capture env PATH="$mock_dir:$PATH" FAKE_CURL_LOG="$log_file" FAKE_CURL_PATIENT_COUNT_PAYLOAD='{"total":100}' FAKE_CURL_OBSERVATION_COUNT_PAYLOAD='{"total":0}' FAKE_CURL_CONDITION_COUNT_PAYLOAD='{"total":5}' FAKE_CURL_MEDREQUEST_COUNT_PAYLOAD='{"total":3}' "$TOOL" verify --fhir-server "http://example.test/fhir"
assert_eq "verify exits 2 on zero downstream count" "2" "$RUN_EXIT_CODE"
assert_contains "verify failure mentions Observation count" "Observation count is zero" "$RUN_STDOUT$RUN_STDERR"

echo "Test: help works outside git worktree"
run_and_capture bash -lc "cd /tmp && '$TOOL' --help"
assert_eq "help outside repo exits 0" "0" "$RUN_EXIT_CODE"
assert_contains "help outside repo mentions usage" "usage" "$RUN_STDOUT$RUN_STDERR"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit "$FAIL"
