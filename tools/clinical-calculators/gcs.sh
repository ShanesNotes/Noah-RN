#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Glasgow Coma Scale (GCS) Calculator
# Usage: gcs.sh --eye N --verbal N --motor N
#
# Clinical safety: GCS is a standardized neurological assessment tool.
# Always correlate with full clinical picture. This calculator does not
# replace clinical judgment. Per facility protocol for code/rapid response
# activation thresholds.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: gcs.sh --eye <1-4> --verbal <1-5> --motor <1-6>

Glasgow Coma Scale Calculator

Options:
  --eye    N   Eye opening score   (1=none, 2=pain, 3=verbal, 4=spontaneous)
  --verbal N   Verbal response     (1=none, 2=sounds, 3=words, 4=confused, 5=oriented)
  --motor  N   Motor response      (1=none, 2=extension, 3=flexion, 4=withdrawal, 5=localizes, 6=obeys)
  --help       Show this help and exit

Score ranges:
  3-8   Severe
  9-12  Moderate
  13-15 Mild

Clinical note: GCS is mechanism-agnostic. Per facility protocol for intubation and ICP monitoring thresholds."

EYE=""
VERBAL=""
MOTOR=""

# Parse named arguments in any order
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --eye)
            EYE="${2:-}"
            shift 2
            ;;
        --verbal)
            VERBAL="${2:-}"
            shift 2
            ;;
        --motor)
            MOTOR="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Require all three components
if [[ -z "$EYE" || -z "$VERBAL" || -z "$MOTOR" ]]; then
    json_error "missing_args" "All three components required: --eye, --verbal, --motor"
    exit 1
fi

# Validate ranges — each prints error JSON and returns 1 on failure
err=""
err=$(validate_range "Eye opening" "$EYE" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Verbal response" "$VERBAL" 1 5) || { echo "$err"; exit 1; }
err=$(validate_range "Motor response" "$MOTOR" 1 6) || { echo "$err"; exit 1; }

SCORE=$(( EYE + VERBAL + MOTOR ))

if (( SCORE <= 8 )); then
    CATEGORY="severe"
    INTERPRETATION="Severe — not following commands, significant neurological compromise"
elif (( SCORE <= 12 )); then
    CATEGORY="moderate"
    INTERPRETATION="Moderate — not fully oriented, may follow simple commands"
else
    CATEGORY="mild"
    INTERPRETATION="Mild — following commands, oriented, likely alert"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson eye "$EYE" \
    --argjson verbal "$VERBAL" \
    --argjson motor "$MOTOR" \
    '{
        status: "ok",
        calculator: "gcs",
        score: $score,
        max_score: 15,
        category: $category,
        components: { eye: $eye, verbal: $verbal, motor: $motor },
        interpretation: $interpretation
    }'
