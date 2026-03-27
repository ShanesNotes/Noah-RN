#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Braden Scale for Pressure Injury Risk Calculator
# Usage: braden.sh --sensory N --moisture N --activity N --mobility N --nutrition N --friction N
#
# Clinical safety: LOWER Braden scores indicate HIGHER pressure injury risk.
# Score ≤18 warrants preventive interventions.
# Score ≤12 — escalate to wound/skin care specialist and implement full prevention bundle.
# Per facility protocol for reassessment frequency and documentation requirements.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: braden.sh --sensory N --moisture N --activity N --mobility N --nutrition N --friction N

Braden Scale for Pressure Injury Risk
NOTE: LOWER score = HIGHER risk

Options:
  --sensory  N   Sensory perception  (1-4)
  --moisture N   Moisture exposure   (1-4)
  --activity N   Physical activity   (1-4)
  --mobility N   Mobility            (1-4)
  --nutrition N  Nutritional intake  (1-4)
  --friction N   Friction and shear  (1-3)  ← max is 3
  --help         Show this help and exit

Score range: 6-23 (lower = worse)
  ≤9      Very high risk
  10-12   High risk
  13-14   Moderate risk
  15-18   At risk
  19-23   No significant risk

Clinical note: Per facility protocol for skin assessment frequency and prevention bundle activation."

SENSORY=""
MOISTURE=""
ACTIVITY=""
MOBILITY=""
NUTRITION=""
FRICTION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --sensory)
            SENSORY="${2:-}"
            shift 2
            ;;
        --moisture)
            MOISTURE="${2:-}"
            shift 2
            ;;
        --activity)
            ACTIVITY="${2:-}"
            shift 2
            ;;
        --mobility)
            MOBILITY="${2:-}"
            shift 2
            ;;
        --nutrition)
            NUTRITION="${2:-}"
            shift 2
            ;;
        --friction)
            FRICTION="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$SENSORY" || -z "$MOISTURE" || -z "$ACTIVITY" || -z "$MOBILITY" || -z "$NUTRITION" || -z "$FRICTION" ]]; then
    json_error "missing_args" "All six subscales required: --sensory, --moisture, --activity, --mobility, --nutrition, --friction"
    exit 1
fi

err=""
err=$(validate_range "Sensory perception" "$SENSORY" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Moisture exposure" "$MOISTURE" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Physical activity" "$ACTIVITY" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Mobility" "$MOBILITY" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Nutrition" "$NUTRITION" 1 4) || { echo "$err"; exit 1; }
err=$(validate_range "Friction and shear" "$FRICTION" 1 3) || { echo "$err"; exit 1; }

SCORE=$(( SENSORY + MOISTURE + ACTIVITY + MOBILITY + NUTRITION + FRICTION ))

if (( SCORE <= 9 )); then
    CATEGORY="very high risk"
    INTERPRETATION="Very high pressure injury risk — implement full prevention bundle immediately"
elif (( SCORE <= 12 )); then
    CATEGORY="high risk"
    INTERPRETATION="High pressure injury risk — pressure redistribution, nutrition consult, frequent repositioning"
elif (( SCORE <= 14 )); then
    CATEGORY="moderate risk"
    INTERPRETATION="Moderate pressure injury risk — assess skin q shift, consider pressure-relieving devices"
elif (( SCORE <= 18 )); then
    CATEGORY="at risk"
    INTERPRETATION="At risk for pressure injury — standard prevention precautions"
else
    CATEGORY="no significant risk"
    INTERPRETATION="No significant pressure injury risk at this time — reassess per facility protocol"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson sensory "$SENSORY" \
    --argjson moisture "$MOISTURE" \
    --argjson activity "$ACTIVITY" \
    --argjson mobility "$MOBILITY" \
    --argjson nutrition "$NUTRITION" \
    --argjson friction "$FRICTION" \
    '{
        status: "ok",
        calculator: "braden",
        score: $score,
        max_score: 23,
        category: $category,
        components: { sensory: $sensory, moisture: $moisture, activity: $activity, mobility: $mobility, nutrition: $nutrition, friction: $friction },
        interpretation: $interpretation
    }'
