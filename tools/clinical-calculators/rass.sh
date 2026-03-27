#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Richmond Agitation-Sedation Scale (RASS) Calculator
# Usage: rass.sh --score N
#
# Clinical safety: RASS is the standard ICU sedation assessment tool.
# Document at least every 4 hours or per your unit protocol.
# Scores drive sedation titration — correlate with patient's clinical goals.
# Per facility protocol for target RASS and sedation-hold procedures.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: rass.sh --score N

Richmond Agitation-Sedation Scale (RASS)

Options:
  --score N   RASS score (-5 to +4)
  --help      Show this help and exit

Scale:
  +4  Combative      Overtly combative, violent, immediate danger to staff
  +3  Very agitated  Pulls/removes tubes or catheters, aggressive
  +2  Agitated       Frequent non-purposeful movement, fights ventilator
  +1  Restless       Anxious, apprehensive, movements not aggressive
   0  Alert and calm Spontaneously attentive to caregiver
  -1  Drowsy         Not fully alert, sustained awakening to voice (>10 sec)
  -2  Light sedation Briefly awakens to voice, eye contact <10 sec
  -3  Moderate sed.  Movement or eye opening to voice, no eye contact
  -4  Deep sedation  No response to voice, movement to physical stimulation
  -5  Unarousable    No response to voice or physical stimulation

Clinical note: Per facility protocol for target RASS and sedation-hold timing."

SCORE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --score)
            SCORE="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$SCORE" ]]; then
    json_error "missing_args" "Required: --score N (range -5 to +4)"
    exit 1
fi

err=""
err=$(validate_range "RASS score" "$SCORE" -5 4) || { echo "$err"; exit 1; }

case "$SCORE" in
     4) CATEGORY="Combative";       INTERPRETATION="Overtly combative, violent, immediate danger to staff" ;;
     3) CATEGORY="Very agitated";   INTERPRETATION="Pulls/removes tubes or catheters, aggressive" ;;
     2) CATEGORY="Agitated";        INTERPRETATION="Frequent non-purposeful movement, fights ventilator" ;;
     1) CATEGORY="Restless";        INTERPRETATION="Anxious, apprehensive, movements not aggressive or vigorous" ;;
     0) CATEGORY="Alert and calm";  INTERPRETATION="Spontaneously attentive to caregiver" ;;
    -1) CATEGORY="Drowsy";          INTERPRETATION="Not fully alert, sustained awakening to voice (>10 sec eye contact)" ;;
    -2) CATEGORY="Light sedation";  INTERPRETATION="Briefly awakens to voice, eye contact <10 sec" ;;
    -3) CATEGORY="Moderate sedation"; INTERPRETATION="Movement or eye opening to voice, no eye contact" ;;
    -4) CATEGORY="Deep sedation";   INTERPRETATION="No response to voice, movement to physical stimulation" ;;
    -5) CATEGORY="Unarousable";     INTERPRETATION="No response to voice or physical stimulation" ;;
esac

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    '{
        status: "ok",
        calculator: "rass",
        score: $score,
        max_score: 4,
        category: $category,
        components: { score: $score },
        interpretation: $interpretation
    }'
