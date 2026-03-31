#!/usr/bin/env bash
set -euo pipefail

DEMO_URL_DEFAULT="https://physionet.org/files/mimic-iv-fhir-demo/2.1.0/"
DOWNLOAD_ROOT_DEFAULT="${HOME}/noah-rn/mimic-demo"
FHIR_SERVER_DEFAULT="http://10.0.0.184:8080/fhir"
EXPECTED_PATIENTS_DEFAULT="100"
WGET_BIN="${WGET_BIN:-wget}"
GUNZIP_BIN="${GUNZIP_BIN:-gunzip}"
JQ_BIN="${JQ_BIN:-jq}"
CURL_BIN="${CURL_BIN:-curl}"

LOAD_ORDER=(
    "MimicOrganization"
    "MimicLocation"
    "MimicPatient"
    "MimicEncounter"
    "MimicEncounterED"
    "MimicEncounterICU"
    "MimicCondition"
    "MimicConditionED"
    "MimicProcedure"
    "MimicProcedureED"
    "MimicProcedureICU"
    "MimicMedication"
    "MimicMedicationMix"
    "MimicMedicationRequest"
    "MimicMedicationDispense"
    "MimicMedicationDispenseED"
    "MimicMedicationAdministration"
    "MimicMedicationAdministrationICU"
    "MimicMedicationStatementED"
    "MimicSpecimen"
    "MimicSpecimenLab"
    "MimicObservationED"
    "MimicObservationLabevents"
    "MimicObservationDatetimeevents"
    "MimicObservationOutputevents"
    "MimicObservationMicroTest"
    "MimicObservationMicroOrg"
    "MimicObservationMicroSusc"
    "MimicObservationVitalSignsED"
    "MimicObservationChartevents"
)

usage() {
    cat <<EOF
Usage:
  $(basename "$0") <download|decompress|load|verify|all|print-load-order> [options]

Options:
  --download-root DIR         Root directory for wget output
  --data-dir DIR              Directory containing MIMIC *.ndjson files
  --download-url URL          PhysioNet demo URL
  --fhir-server URL           FHIR base URL
  --expected-patients N       Expected Patient count for verify
  --allow-nonempty-server     Permit import when Patient count is non-zero
  --dry-run                   Print planned PUT targets without sending requests
  --help                      Show this help
EOF
}

fail() {
    local code="$1"
    shift
    echo "$*" >&2
    exit "$code"
}

warn() {
    echo "warning: $*" >&2
}

require_cmd() {
    local bin="$1"
    command -v "$bin" >/dev/null 2>&1 || fail 2 "missing required command: $bin"
}

resolve_data_dir() {
    if [[ -n "${DATA_DIR:-}" ]]; then
        printf '%s\n' "$DATA_DIR"
    else
        printf '%s/physionet.org/files/mimic-iv-fhir-demo/2.1.0/fhir\n' "$DOWNLOAD_ROOT"
    fi
}

fetch_json() {
    "$CURL_BIN" -sS "$1"
}

metadata_check() {
    local metadata
    metadata="$(fetch_json "${FHIR_SERVER%/}/metadata")" || fail 2 "failed to fetch FHIR metadata from $FHIR_SERVER"
    local resource_type version
    resource_type="$("$JQ_BIN" -r '.resourceType // empty' <<<"$metadata" 2>/dev/null)" || fail 2 "invalid metadata response from $FHIR_SERVER"
    version="$("$JQ_BIN" -r '.fhirVersion // empty' <<<"$metadata" 2>/dev/null)" || fail 2 "invalid metadata response from $FHIR_SERVER"
    [[ "$resource_type" == "CapabilityStatement" ]] || fail 2 "unexpected metadata resourceType: $resource_type"
    [[ -n "$version" ]] || fail 2 "missing fhirVersion in metadata response"
}

patient_count() {
    local summary
    summary="$(fetch_json "${FHIR_SERVER%/}/Patient?_summary=count")" || fail 2 "failed to fetch Patient count from $FHIR_SERVER"
    "$JQ_BIN" -r '.total // 0' <<<"$summary" 2>/dev/null || fail 2 "invalid Patient count response from $FHIR_SERVER"
}

download_demo() {
    require_cmd "$WGET_BIN"
    mkdir -p "$DOWNLOAD_ROOT"
    (
        cd "$DOWNLOAD_ROOT"
        "$WGET_BIN" -r -N -c -np "$DOWNLOAD_URL"
    )
}

decompress_demo() {
    require_cmd "$GUNZIP_BIN"
    local files_dir
    files_dir="$(resolve_data_dir)"
    [[ -d "$files_dir" ]] || fail 1 "data directory not found: $files_dir"
    local gz_count
    gz_count="$(find "$files_dir" -maxdepth 1 -type f -name '*.ndjson.gz' | wc -l | tr -d ' ')"
    if [[ "$gz_count" == "0" ]]; then
        echo "No compressed NDJSON files found in $files_dir"
        return 0
    fi
    "$GUNZIP_BIN" -f "$files_dir"/*.ndjson.gz
}

ensure_server_safe_for_import() {
    metadata_check
    local current_patients
    current_patients="$(patient_count)"
    if [[ "$current_patients" != "0" && "$ALLOW_NONEMPTY_SERVER" != "1" ]]; then
        fail 1 "FHIR server already contains Patient resources ($current_patients). Re-run with --allow-nonempty-server to proceed."
    fi
}

put_resource() {
    local resource_type="$1" resource_id="$2" payload="$3"
    local url="${FHIR_SERVER%/}/${resource_type}/${resource_id}"

    if [[ "$DRY_RUN" == "1" ]]; then
        echo "DRY-RUN PUT $url"
        return 0
    fi

    "$CURL_BIN" --fail-with-body -sS \
        -X PUT \
        -H "Content-Type: application/fhir+json" \
        --data-binary "$payload" \
        "$url" >/dev/null
}

load_demo() {
    require_cmd "$JQ_BIN"
    require_cmd "$CURL_BIN"

    local files_dir
    files_dir="$(resolve_data_dir)"
    [[ -d "$files_dir" ]] || fail 1 "data directory not found: $files_dir"

    if [[ "$DRY_RUN" != "1" ]]; then
        ensure_server_safe_for_import
    fi

    local loaded=0 invalid=0 failed=0 skipped_profiles=0
    local profile file line_number resource_type resource_id

    for profile in "${LOAD_ORDER[@]}"; do
        file="${files_dir}/${profile}.ndjson"
        if [[ ! -f "$file" ]]; then
            skipped_profiles=$((skipped_profiles + 1))
            continue
        fi

        line_number=0
        while IFS= read -r line || [[ -n "$line" ]]; do
            line_number=$((line_number + 1))
            [[ -n "$line" ]] || continue

            resource_type="$("$JQ_BIN" -r '.resourceType // empty' <<<"$line" 2>/dev/null || true)"
            resource_id="$("$JQ_BIN" -r '.id // empty' <<<"$line" 2>/dev/null || true)"

            if [[ -z "$resource_type" || -z "$resource_id" ]]; then
                invalid=$((invalid + 1))
                warn "skipping malformed JSON in ${profile}.ndjson line ${line_number}"
                continue
            fi

            if put_resource "$resource_type" "$resource_id" "$line"; then
                loaded=$((loaded + 1))
            else
                failed=$((failed + 1))
                warn "PUT failed for ${resource_type}/${resource_id}"
            fi
        done <"$file"
    done

    echo "load summary: loaded=${loaded} invalid=${invalid} failed=${failed} skipped_profiles=${skipped_profiles}"
    [[ "$failed" == "0" ]] || fail 2 "import completed with failed PUT requests"
}

verify_demo() {
    require_cmd "$JQ_BIN"
    require_cmd "$CURL_BIN"
    metadata_check

    local current_patients sample_patient observations conditions medication_requests
    current_patients="$(patient_count)"
    [[ "$current_patients" == "$EXPECTED_PATIENTS" ]] || fail 2 "expected ${EXPECTED_PATIENTS} patients, found ${current_patients}"

    sample_patient="$(fetch_json "${FHIR_SERVER%/}/Patient?_count=1" | "$JQ_BIN" -r '.entry[0].resource.id // empty' 2>/dev/null)" || fail 2 "failed to fetch sample patient"
    [[ -n "$sample_patient" ]] || fail 2 "no sample patient returned from FHIR server"

    observations="$(fetch_json "${FHIR_SERVER%/}/Observation?_summary=count" | "$JQ_BIN" -r '.total // 0' 2>/dev/null)" || fail 2 "failed to verify Observations"
    conditions="$(fetch_json "${FHIR_SERVER%/}/Condition?_summary=count" | "$JQ_BIN" -r '.total // 0' 2>/dev/null)" || fail 2 "failed to verify Conditions"
    medication_requests="$(fetch_json "${FHIR_SERVER%/}/MedicationRequest?_summary=count" | "$JQ_BIN" -r '.total // 0' 2>/dev/null)" || fail 2 "failed to verify MedicationRequests"

    [[ "$observations" != "0" ]] || fail 2 "Observation count is zero after import"
    [[ "$conditions" != "0" ]] || fail 2 "Condition count is zero after import"
    [[ "$medication_requests" != "0" ]] || fail 2 "MedicationRequest count is zero after import"

    echo "verify summary: patients=${current_patients} sample_patient=${sample_patient} observations=${observations} conditions=${conditions} medication_requests=${medication_requests}"
}

COMMAND="${1:-}"
if [[ $# -gt 0 ]]; then
    shift
fi

DOWNLOAD_ROOT="$DOWNLOAD_ROOT_DEFAULT"
DATA_DIR=""
DOWNLOAD_URL="$DEMO_URL_DEFAULT"
FHIR_SERVER="$FHIR_SERVER_DEFAULT"
EXPECTED_PATIENTS="$EXPECTED_PATIENTS_DEFAULT"
ALLOW_NONEMPTY_SERVER="0"
DRY_RUN="0"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --download-root)
            [[ $# -ge 2 ]] || fail 1 "missing value for --download-root"
            DOWNLOAD_ROOT="$2"
            shift 2
            ;;
        --data-dir)
            [[ $# -ge 2 ]] || fail 1 "missing value for --data-dir"
            DATA_DIR="$2"
            shift 2
            ;;
        --download-url)
            [[ $# -ge 2 ]] || fail 1 "missing value for --download-url"
            DOWNLOAD_URL="$2"
            shift 2
            ;;
        --fhir-server)
            [[ $# -ge 2 ]] || fail 1 "missing value for --fhir-server"
            FHIR_SERVER="$2"
            shift 2
            ;;
        --expected-patients)
            [[ $# -ge 2 ]] || fail 1 "missing value for --expected-patients"
            EXPECTED_PATIENTS="$2"
            shift 2
            ;;
        --allow-nonempty-server)
            ALLOW_NONEMPTY_SERVER="1"
            shift
            ;;
        --dry-run)
            DRY_RUN="1"
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            fail 1 "unknown option: $1"
            ;;
    esac
done

case "$COMMAND" in
    download)
        download_demo
        ;;
    decompress)
        decompress_demo
        ;;
    load)
        load_demo
        ;;
    verify)
        verify_demo
        ;;
    all)
        download_demo
        decompress_demo
        load_demo
        verify_demo
        ;;
    print-load-order)
        printf '%s\n' "${LOAD_ORDER[@]}"
        ;;
    --help|-h|"")
        usage
        if [[ -z "$COMMAND" || "$COMMAND" == "--help" || "$COMMAND" == "-h" ]]; then
            exit 0
        fi
        ;;
    *)
        usage >&2
        fail 1 "unknown command: $COMMAND"
        ;;
esac
