#!/usr/bin/env bash
set -euo pipefail

# Noah RN — CURB-65 Pneumonia Severity Score Calculator
# Usage: curb65.sh --confusion N --urea N --rr N --bp N --age N
#
# Clinical safety: CURB-65 is a validated CAP severity tool.
# Use to inform disposition — not a substitute for clinical judgment.
# Score 2+ warrants reassessment for inpatient admission.
# Score 3+ consider ICU consult per facility protocol.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: curb65.sh --confusion N --urea N --rr N --bp N --age N

CURB-65 Pneumonia Severity Score

Each criterion scores 0 (absent) or 1 (present):

Options:
  --confusion N   New mental confusion         (0 or 1)
  --urea      N   BUN >19 mg/dL (urea >7 mmol) (0 or 1)
  --rr        N   Resp rate ≥30                 (0 or 1)
  --bp        N   SBP <90 or DBP ≤60           (0 or 1)
  --age       N   Age ≥65                       (0 or 1)
  --help          Show this help and exit

Score range: 0-5
  0-1  Low risk      Outpatient treatment likely appropriate — mortality <5%
  2    Moderate risk Consider short inpatient stay or close outpatient follow-up — mortality ~9%
  3-5  High risk     Consider ICU admission — mortality 15-40%

Clinical note: Per facility protocol for ICU consult and antibiotic escalation thresholds."

CONFUSION=""
UREA=""
RR=""
BP=""
AGE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --confusion)
            CONFUSION="${2:-}"
            shift 2
            ;;
        --urea)
            UREA="${2:-}"
            shift 2
            ;;
        --rr)
            RR="${2:-}"
            shift 2
            ;;
        --bp)
            BP="${2:-}"
            shift 2
            ;;
        --age)
            AGE="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$CONFUSION" || -z "$UREA" || -z "$RR" || -z "$BP" || -z "$AGE" ]]; then
    json_error "missing_args" "All five criteria required: --confusion, --urea, --rr, --bp, --age"
    exit 1
fi

err=""
err=$(validate_range "Confusion" "$CONFUSION" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Urea" "$UREA" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Respiratory rate" "$RR" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Blood pressure" "$BP" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Age" "$AGE" 0 1) || { echo "$err"; exit 1; }

SCORE=$(( CONFUSION + UREA + RR + BP + AGE ))

if (( SCORE <= 1 )); then
    CATEGORY="low risk"
    INTERPRETATION="Outpatient treatment likely appropriate — mortality <5%"
elif (( SCORE == 2 )); then
    CATEGORY="moderate risk"
    INTERPRETATION="Consider short inpatient stay or close outpatient follow-up — mortality ~9%"
else
    CATEGORY="high risk"
    INTERPRETATION="Consider ICU admission — mortality 15-40%"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson confusion "$CONFUSION" \
    --argjson urea "$UREA" \
    --argjson rr "$RR" \
    --argjson bp "$BP" \
    --argjson age "$AGE" \
    '{
        status: "ok",
        calculator: "curb65",
        score: $score,
        max_score: 5,
        category: $category,
        components: { confusion: $confusion, urea: $urea, rr: $rr, bp: $bp, age: $age },
        interpretation: $interpretation
    }'
