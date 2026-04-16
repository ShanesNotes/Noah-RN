#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

FHIR_BASE_URL="${FHIR_BASE_URL:-http://10.0.0.184:8103/fhir/R4}"
TOKEN_ENDPOINT="${FHIR_TOKEN_ENDPOINT:-http://10.0.0.184:8103/oauth2/token}"
FHIR_CLIENT_ID="${FHIR_CLIENT_ID:-}"
FHIR_CLIENT_SECRET="${FHIR_CLIENT_SECRET:-}"
TASK_SYSTEM="${TASK_SYSTEM:-https://noah-rn.dev/workflows}"
TASK_CODE="${TASK_CODE:-shift-report}"
TEST_PATIENT_ID="${TEST_PATIENT_ID:-jody426manhattan736}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_env FHIR_CLIENT_ID
require_env FHIR_CLIENT_SECRET

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

resolve_test_patient_id() {
  local requested="$1"
  local existing
  existing="$(fhir_get "Patient?_id=${requested}&_count=1")"
  local patient_id
  patient_id="$(jq -r '.entry[0].resource.id // empty' <<<"$existing")"
  if [[ -n "$patient_id" ]]; then
    printf '%s\n' "$patient_id"
    return 0
  fi

  patient_id="$(fhir_get "Patient?name=${requested}&_count=1" | jq -r '.entry[0].resource.id // empty')"
  if [[ -n "$patient_id" ]]; then
    printf '%s\n' "$patient_id"
    return 0
  fi

  patient_id="$(
    fhir_get 'Patient?_count=20' | jq -r '.entry[]?.resource.id' | while read -r candidate_id; do
      has_draft="$(
        fhir_get "DocumentReference?patient=${candidate_id}&_count=20" \
          | jq -r '[
              .entry[]?.resource.type.coding[]?
              | select(.system == "https://noah-rn.dev/artifacts" and .code == "shift-report-draft")
            ] | if length > 0 then "true" else "false" end'
      )"
      if [[ "$has_draft" == "false" ]]; then
        printf '%s\n' "$candidate_id"
        break
      fi
    done
  )"

  if [[ -z "$patient_id" ]]; then
    patient_id="$(fhir_get 'Patient?_count=1' | jq -r '.entry[0].resource.id // empty')"
  fi
  if [[ -z "$patient_id" ]]; then
    echo "Unable to resolve a test patient from Medplum." >&2
    exit 1
  fi
  printf '%s\n' "$patient_id"
}

task_payload="$(mktemp)"
task_created=""

cleanup() {
  rm -f "$task_payload"
}
trap cleanup EXIT

TEST_PATIENT_ID="$(resolve_test_patient_id "$TEST_PATIENT_ID")"
authored_on="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
jq -n \
  --arg task_system "$TASK_SYSTEM" \
  --arg task_code "$TASK_CODE" \
  --arg patient_ref "Patient/$TEST_PATIENT_ID" \
  --arg authored_on "$authored_on" \
  '{
    resourceType: "Task",
    status: "requested",
    intent: "order",
    authoredOn: $authored_on,
    code: {
      coding: [{
        system: $task_system,
        code: $task_code,
        display: "Shift Report"
      }],
      text: "Generate Shift Report"
    },
    for: {reference: $patient_ref},
    description: "Generate shift handoff draft for this patient"
  }' >"$task_payload"

echo "Creating Task for Patient/$TEST_PATIENT_ID..."
task_created="$(fhir_post "Task" "$task_payload")"
task_id="$(jq -r '.id' <<<"$task_created")"
if [[ -z "$task_id" || "$task_id" == "null" ]]; then
  echo "Failed to create Task" >&2
  exit 1
fi

echo "Created Task/$task_id"
echo "Running worker once..."
"$REPO_ROOT/scripts/medplum-shift-report-worker.sh" --task-id "$task_id" --once

echo "Polling Task/$task_id..."
for _ in $(seq 1 10); do
  task_json="$(fhir_get "Task/$task_id")"
  status="$(jq -r '.status' <<<"$task_json")"
  if [[ "$status" == "completed" ]]; then
    break
  fi
  if [[ "$status" == "failed" ]]; then
    echo "Task failed: $(jq -r '.statusReason.text // "unknown failure"' <<<"$task_json")" >&2
    exit 1
  fi
  sleep 1
done

status="$(jq -r '.status' <<<"$task_json")"
if [[ "$status" != "completed" ]]; then
  echo "Task did not reach completed status. Current status: $status" >&2
  exit 1
fi

doc_ref="$(jq -r '.output[0].valueReference.reference // empty' <<<"$task_json")"
if [[ -z "$doc_ref" ]]; then
  echo "Task completed without output reference" >&2
  exit 1
fi

echo "Task completed with output: $doc_ref"
doc_json="$(fhir_get "$doc_ref")"

echo
echo "DocumentReference summary:"
jq '{id, status, docStatus, description, subject, type}' <<<"$doc_json"

echo
echo "Decoded attachment preview:"
jq -r '.content[0].attachment.data' <<<"$doc_json" | base64 -d | sed -n '1,80p'
