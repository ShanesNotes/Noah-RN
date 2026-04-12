#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURL_BIN="${CURL_BIN:-curl}"
JQ_BIN="${JQ_BIN:-jq}"

usage() {
    cat <<'EOF'
usage: mimic-loinc-query.sh <loinc> <patient-id>

Environment overrides:
  FHIR_SERVER   FHIR base URL (default: http://10.0.0.184:8080/fhir)
  MAPPING_FILE  Path to mimic-mappings.json
  CURL_BIN      curl executable to invoke
  JQ_BIN        jq executable to invoke
EOF
}

json_error() {
    local error="$1"
    local message="$2"
    "$JQ_BIN" -n --arg status error --arg error "$error" --arg message "$message" \
        '{status:$status,error:$error,message:$message}'
}

die_input() {
    json_error "$1" "$2"
    exit 1
}

die_system() {
    json_error "system_error" "$1"
    exit 2
}

if [[ "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
    printf '{"status":"error","error":"system_error","message":"jq binary not found: %s"}\n' "$JQ_BIN"
    exit 2
fi

if [[ $# -ne 2 ]]; then
    usage >&2
    die_input "invalid_input" "expected <loinc> <patient-id>"
fi

LOINC="$1"
PATIENT_ID="$2"

if [[ -z "$LOINC" || -z "$PATIENT_ID" ]]; then
    die_input "invalid_input" "loinc and patient-id are required"
fi

REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
MAPPING_FILE="${MAPPING_FILE:-$REPO_ROOT/clinical-resources/mimic-mappings.json}"
FHIR_SERVER="${FHIR_SERVER:-http://10.0.0.184:8080/fhir}"

if ! command -v "$CURL_BIN" >/dev/null 2>&1; then
    die_system "curl binary not found: $CURL_BIN"
fi

if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
    die_system "jq binary not found: $JQ_BIN"
fi

if [[ ! -f "$MAPPING_FILE" ]]; then
    die_system "mapping file not found: $MAPPING_FILE"
fi

if ! lookup_output="$("$JQ_BIN" -e -r --arg loinc "$LOINC" '
    if (.item_id_to_loinc? | type) != "object" then
        error("missing item_id_to_loinc object")
    else
        [
            .item_id_to_loinc
            | to_entries[]
            | select(.value.loinc == $loinc or ((.value.aliases // []) | index($loinc)))
            | .key
        ]
        | if length == 0 then empty else .[] end
    end
' "$MAPPING_FILE" 2>/dev/null)"; then
    if "$JQ_BIN" -e '(.item_id_to_loinc? | type) == "object"' "$MAPPING_FILE" >/dev/null 2>&1; then
        die_input "no_match" "no MIMIC itemID mapping found for LOINC $LOINC"
    fi
    die_system "mapping file could not be parsed or was missing item_id_to_loinc: $MAPPING_FILE"
fi

mapfile -t ITEM_IDS < <(printf '%s\n' "$lookup_output" | awk 'NF && !seen[$0]++')

if [[ "${#ITEM_IDS[@]}" -eq 0 ]]; then
    die_input "no_match" "no MIMIC itemID mapping found for LOINC $LOINC"
fi

code_param="$(IFS=,; echo "${ITEM_IDS[*]}")"
query_url="${FHIR_SERVER%/}/Observation?patient=${PATIENT_ID}&code=${code_param}"

if ! response="$("$CURL_BIN" -sS --fail-with-body "$query_url" 2>/dev/null)"; then
    die_system "FHIR query failed for $query_url"
fi

if ! printf '%s' "$response" | "$JQ_BIN" -e . >/dev/null 2>&1; then
    die_system "FHIR response was not valid JSON"
fi

if ! printf '%s' "$response" | "$JQ_BIN" -e '.resourceType == "Bundle"' >/dev/null 2>&1; then
    die_system "FHIR response was not an Observation Bundle"
fi

printf '%s\n' "$response"
