#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Critical Care Pain Observation Tool (CPOT) Calculator
# Usage: cpot.sh --facial N --body N --muscle N --compliance N
#
# Clinical safety: CPOT is validated for non-verbal/sedated ICU patients.
# Use in conjunction with other pain indicators (HR, BP, diaphoresis).
# Score ≥3 typically warrants analgesic intervention — per facility protocol.
# Always correlate with clinical picture and known pain history.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: cpot.sh --facial N --body N --muscle N --compliance N

Critical Care Pain Observation Tool (CPOT)

Options:
  --facial     N   Facial expression  (0=relaxed, 1=tense, 2=grimacing)
  --body       N   Body movements     (0=absent, 1=protection, 2=restlessness)
  --muscle     N   Muscle tension     (0=relaxed, 1=tense/rigid, 2=very tense)
  --compliance N   Vent compliance    (0=tolerating/calm, 1=coughing but tolerating, 2=fighting vent/crying out)
  --help           Show this help and exit

Score range: 0-8
  0-2  No significant pain
  3-8  Significant pain

Clinical note: Score ≥3 warrants analgesic reassessment per facility protocol."

FACIAL=""
BODY=""
MUSCLE=""
COMPLIANCE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --facial)
            FACIAL="${2:-}"
            shift 2
            ;;
        --body)
            BODY="${2:-}"
            shift 2
            ;;
        --muscle)
            MUSCLE="${2:-}"
            shift 2
            ;;
        --compliance)
            COMPLIANCE="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$FACIAL" || -z "$BODY" || -z "$MUSCLE" || -z "$COMPLIANCE" ]]; then
    json_error "missing_args" "All four components required: --facial, --body, --muscle, --compliance"
    exit 1
fi

err=""
err=$(validate_range "Facial expression" "$FACIAL" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Body movements" "$BODY" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Muscle tension" "$MUSCLE" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Vent compliance" "$COMPLIANCE" 0 2) || { echo "$err"; exit 1; }

SCORE=$(( FACIAL + BODY + MUSCLE + COMPLIANCE ))

if (( SCORE <= 2 )); then
    CATEGORY="no significant pain"
    INTERPRETATION="No significant pain indicated — continue monitoring"
else
    CATEGORY="significant pain"
    INTERPRETATION="Significant pain — reassess analgesia per facility protocol"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson facial "$FACIAL" \
    --argjson body "$BODY" \
    --argjson muscle "$MUSCLE" \
    --argjson compliance "$COMPLIANCE" \
    '{
        status: "ok",
        calculator: "cpot",
        score: $score,
        max_score: 8,
        category: $category,
        components: { facial: $facial, body: $body, muscle: $muscle, compliance: $compliance },
        interpretation: $interpretation
    }'
