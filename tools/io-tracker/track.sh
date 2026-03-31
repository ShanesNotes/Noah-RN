#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
JQ_BIN="${JQ_BIN:-jq}"

usage() {
    cat <<'EOF'
usage: track.sh < structured-io-json

Reads a JSON array of entries or an object with:
  - entries: current entries array
  - prior_state.entries: previous normalized entries array

Each entry should include:
  direction: intake|output
  category: string
  volume_ml: number
EOF
}

json_error() {
    local error="$1"
    local message="$2"
    "$JQ_BIN" -n --arg status error --arg error "$error" --arg message "$message" \
        '{status:$status,error:$error,message:$message}'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
fi

if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
    json_error "system_error" "jq binary not found: $JQ_BIN"
    exit 2
fi

if [[ -t 0 ]]; then
    json_error "no_match" "no structured I&O entries were provided"
    exit 1
fi

RAW_INPUT="$(cat)"

if [[ -z "$RAW_INPUT" ]]; then
    json_error "no_match" "no structured I&O entries were provided"
    exit 1
fi

if ! OUTPUT="$("$JQ_BIN" -n --argjson payload "$RAW_INPUT" '
def err($error; $message):
  {status:"error", error:$error, message:$message};

def valid_entry($e):
  ($e | type) == "object"
  and (($e.direction // "") == "intake" or ($e.direction // "") == "output")
  and (($e.category // "") | type) == "string"
  and ($e.category // "") != ""
  and (($e.volume_ml // null) | type) == "number"
  and (($e.label // $e.subcategory // $e.category) | type) == "string";

def normalize($e; $is_new; $seq):
  {
    direction: $e.direction,
    category: $e.category,
    label: ($e.label // $e.subcategory // $e.category),
    volume_ml: $e.volume_ml,
    details: ($e.details // ""),
    estimate: ($e.estimate // false),
    tier: ($e.tier // (if ($e.estimate // false) then 2 else 1 end)),
    is_new: $is_new,
    sequence: $seq
  };

def running($entries):
  reduce $entries[] as $e (
    {out: [], intake: 0, output: 0};
    .intake += (if $e.direction == "intake" then $e.volume_ml else 0 end)
    | .output += (if $e.direction == "output" then $e.volume_ml else 0 end)
    | .out += [
        $e + {
          running_intake_ml: .intake,
          running_output_ml: .output,
          running_balance_ml: (.intake - .output)
        }
      ]
  ) | .out;

def tallies($entries):
  reduce $entries[] as $e (
    {intake_total_ml: 0, output_total_ml: 0, intake_by_category: {}, output_by_category: {}};
    if $e.direction == "intake" then
      .intake_total_ml += $e.volume_ml
      | .intake_by_category[$e.category] = ((.intake_by_category[$e.category] // 0) + $e.volume_ml)
    else
      .output_total_ml += $e.volume_ml
      | .output_by_category[$e.category] = ((.output_by_category[$e.category] // 0) + $e.volume_ml)
    end
  );

($payload
 | if type == "array" then
     {prior: [], current: .}
   elif type == "object" then
     {prior: (((.prior_state? // {}) | .entries) // []), current: (.entries // [])}
   else
     err("invalid_input"; "input must be a JSON array or an object with entries")
   end
) as $src
| if ($src.prior | type) != "array" or ($src.current | type) != "array" then
    err("invalid_input"; "prior_state.entries and entries must be arrays")
  elif (($src.prior | length) + ($src.current | length)) == 0 then
    err("no_match"; "no structured I&O entries were provided")
  elif (any($src.prior[]; (valid_entry(.) | not)) or any($src.current[]; (valid_entry(.) | not))) then
    err("invalid_input"; "each entry needs direction, category, and numeric volume_ml")
  else
    ($src.prior | to_entries | map(normalize(.value; false; (.key + 1)))) as $prior_norm
    | ($src.current | to_entries | map(normalize(.value; true; ((.key + ($prior_norm | length)) + 1)))) as $current_norm
    | ($prior_norm + $current_norm) as $all_entries
    | (running($all_entries)) as $running_entries
    | (tallies($running_entries)) as $totals
    | {
        status: "ok",
        calculator: "io_tracker",
        entry_count: ($running_entries | length),
        totals: {
          intake_total_ml: $totals.intake_total_ml,
          output_total_ml: $totals.output_total_ml,
          grand_total_ml: ($totals.intake_total_ml + $totals.output_total_ml),
          net_balance_ml: ($totals.intake_total_ml - $totals.output_total_ml),
          intake_by_category: $totals.intake_by_category,
          output_by_category: $totals.output_by_category
        },
        entries: $running_entries,
        state: {
          version: 1,
          entries: $running_entries,
          totals: {
            intake_total_ml: $totals.intake_total_ml,
            output_total_ml: $totals.output_total_ml,
            grand_total_ml: ($totals.intake_total_ml + $totals.output_total_ml),
            net_balance_ml: ($totals.intake_total_ml - $totals.output_total_ml),
            intake_by_category: $totals.intake_by_category,
            output_by_category: $totals.output_by_category
          }
        }
      }
  end
' 2>/dev/null)"; then
    json_error "system_error" "input could not be parsed as JSON"
    exit 2
fi

STATUS="$("$JQ_BIN" -r '.status' <<<"$OUTPUT")"
if [[ "$STATUS" == "error" ]]; then
    ERROR_TYPE="$("$JQ_BIN" -r '.error' <<<"$OUTPUT")"
    printf '%s\n' "$OUTPUT"
    if [[ "$ERROR_TYPE" == "no_match" || "$ERROR_TYPE" == "invalid_input" ]]; then
        exit 1
    fi
    exit 2
fi

printf '%s\n' "$OUTPUT"
