#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

FHIR_BASE_URL="${FHIR_BASE_URL:-http://10.0.0.184:8103/fhir/R4}"
TOKEN_ENDPOINT="${FHIR_TOKEN_ENDPOINT:-http://10.0.0.184:8103/oauth2/token}"
FHIR_CLIENT_ID="${FHIR_CLIENT_ID:-3c3c4c3a-2993-424c-b46d-f58db0d7ca14}"
FHIR_CLIENT_SECRET="${FHIR_CLIENT_SECRET:-be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34}"
TASK_SYSTEM="${TASK_SYSTEM:-https://noah-rn.dev/workflows}"
TASK_CODE="${TASK_CODE:-shift-report}"
ARTIFACT_SYSTEM="${ARTIFACT_SYSTEM:-https://noah-rn.dev/artifacts}"
NOAH_AGENT_AUTHOR_REFERENCE="${NOAH_AGENT_AUTHOR_REFERENCE:-}"
NOAH_AGENT_AUTHOR_DISPLAY="${NOAH_AGENT_AUTHOR_DISPLAY:-Noah RN Agent}"

ONCE=false
TASK_ID=""

usage() {
  cat <<'EOF'
Usage: medplum-shift-report-worker.sh [--once] [--task-id <id>]

Options:
  --once          Process at most one pending shift-report Task
  --task-id <id>  Process one specific Task id
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once)
      ONCE=true
      shift
      ;;
    --task-id)
      TASK_ID="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq
require_cmd base64

get_token() {
  curl -sf -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=${FHIR_CLIENT_ID}&client_secret=${FHIR_CLIENT_SECRET}" \
  | jq -r '.access_token'
}

FHIR_TOKEN="$(get_token)"

fhir_get() {
  local path="$1"
  curl -sf "$FHIR_BASE_URL/$path" \
    -H "Authorization: Bearer $FHIR_TOKEN" \
    -H "Accept: application/fhir+json"
}

fhir_post() {
  local resource_type="$1"
  local payload_file="$2"
  curl -sf -X POST "$FHIR_BASE_URL/$resource_type" \
    -H "Authorization: Bearer $FHIR_TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d @"$payload_file"
}

fhir_put() {
  local path="$1"
  local payload_file="$2"
  curl -sf -X PUT "$FHIR_BASE_URL/$path" \
    -H "Authorization: Bearer $FHIR_TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d @"$payload_file"
}

extract_requested_tasks() {
  if [[ -n "$TASK_ID" ]]; then
    fhir_get "Task/$TASK_ID"
    return 0
  fi

  fhir_get "Task?status=requested&code=${TASK_SYSTEM}|${TASK_CODE}&_sort=_lastUpdated&_count=20"
}

extract_patient_id() {
  local task_json="$1"
  jq -r '.for.reference // empty' <<<"$task_json" | sed -E 's#^Patient/##'
}

build_document_reference_payload() {
  local task_json="$1"
  local patient_id="$2"
  local author_reference="$3"
  local author_display="$4"
  local report_text="$4"
  if [[ $# -ge 5 ]]; then
    report_text="$5"
  fi

  local encounter_ref
  encounter_ref="$(jq -r '.encounter.reference // empty' <<<"$task_json")"
  local encoded
  encoded="$(printf '%s' "$report_text" | base64 -w0)"

  local tmp
  tmp="$(mktemp)"
  jq -n \
    --arg patient_ref "Patient/$patient_id" \
    --arg encounter_ref "$encounter_ref" \
    --arg author_reference "$author_reference" \
    --arg author_display "$author_display" \
    --arg artifact_system "$ARTIFACT_SYSTEM" \
    --arg encoded "$encoded" \
    '{
      resourceType: "DocumentReference",
      status: "current",
      docStatus: "preliminary",
      subject: {reference: $patient_ref},
      type: {
        coding: [{
          system: $artifact_system,
          code: "shift-report-draft",
          display: "Draft Shift Report"
        }],
        text: "Draft Shift Report"
      },
      description: "Draft Shift Report — requires nurse review",
      author: [
        if $author_reference != ""
        then {reference: $author_reference}
        else {display: $author_display}
        end
      ],
      content: [{
        attachment: {
          contentType: "text/plain",
          title: "Draft Shift Report",
          data: $encoded
        }
      }]
    }
    + (if $encounter_ref != "" then {context: {encounter: [{reference: $encounter_ref}]}} else {} end)' >"$tmp"

  printf '%s\n' "$tmp"
}

update_task_completed() {
  local task_json="$1"
  local document_reference_id="$2"

  local tmp
  tmp="$(mktemp)"
  jq \
    --arg doc_ref "DocumentReference/$document_reference_id" \
    '.status = "completed"
     | .output = [{
         "type": {"text": "shift-report-draft"},
         "valueReference": {
           "reference": $doc_ref,
           "display": "Draft Shift Report"
         }
       }]' <<<"$task_json" >"$tmp"

  local task_id
  task_id="$(jq -r '.id' <<<"$task_json")"
  fhir_put "Task/$task_id" "$tmp" >/dev/null
  rm -f "$tmp"
}

update_task_failed() {
  local task_json="$1"
  local reason="$2"

  local tmp
  tmp="$(mktemp)"
  jq \
    --arg reason "$reason" \
    '.status = "failed"
     | .statusReason = {"text": $reason}' <<<"$task_json" >"$tmp"

  local task_id
  task_id="$(jq -r '.id' <<<"$task_json")"
  fhir_put "Task/$task_id" "$tmp" >/dev/null || true
  rm -f "$tmp"
}

process_task() {
  local task_json="$1"
  local author_reference="$2"
  local author_display="$3"
  local task_id patient_id report_text payload_file created doc_id trace_dir

  task_id="$(jq -r '.id' <<<"$task_json")"
  patient_id="$(extract_patient_id "$task_json")"

  if [[ -z "$patient_id" ]]; then
    update_task_failed "$task_json" "Task.for.reference missing Patient reference"
    echo "Task $task_id failed: missing patient reference" >&2
    return 1
  fi

  trace_dir="$(mktemp -d)"
  if ! report_text="$("$REPO_ROOT/scripts/run-harness.sh" shift-report "patient_id: $patient_id" "$trace_dir")"; then
    rm -rf "$trace_dir"
    update_task_failed "$task_json" "Shift Report runtime execution failed"
    echo "Task $task_id failed: harness execution" >&2
    return 1
  fi

  if [[ ! -f "$trace_dir/patient-context.json" ]]; then
    rm -rf "$trace_dir"
    update_task_failed "$task_json" "Shift Report did not execute against live clinical-mcp context"
    echo "Task $task_id failed: no patient-context trace artifact detected" >&2
    return 1
  fi
  rm -rf "$trace_dir"

  payload_file="$(build_document_reference_payload "$task_json" "$patient_id" "$author_reference" "$author_display" "$report_text")"
  created="$(fhir_post "DocumentReference" "$payload_file")"
  rm -f "$payload_file"
  doc_id="$(jq -r '.id' <<<"$created")"

  if [[ -z "$doc_id" || "$doc_id" == "null" ]]; then
    update_task_failed "$task_json" "Draft DocumentReference creation failed"
    echo "Task $task_id failed: no DocumentReference id returned" >&2
    return 1
  fi

  update_task_completed "$task_json" "$doc_id"
  echo "Processed Task/$task_id -> DocumentReference/$doc_id"
}

main() {
  local tasks_json
  tasks_json="$(extract_requested_tasks)"

  if [[ -n "$TASK_ID" ]]; then
    process_task "$tasks_json" "$NOAH_AGENT_AUTHOR_REFERENCE" "$NOAH_AGENT_AUTHOR_DISPLAY"
    return 0
  fi

  local count
  count="$(jq '.entry | length // 0' <<<"$tasks_json")"
  if [[ "$count" -eq 0 ]]; then
    echo "No requested shift-report Tasks found."
    return 0
  fi

  local processed=0
  while IFS= read -r task_json; do
    process_task "$task_json" "$NOAH_AGENT_AUTHOR_REFERENCE" "$NOAH_AGENT_AUTHOR_DISPLAY"
    processed=$((processed + 1))
    if [[ "$ONCE" == "true" ]]; then
      break
    fi
  done < <(jq -c '.entry[]?.resource' <<<"$tasks_json")

  echo "Processed $processed task(s)."
}

main "$@"
