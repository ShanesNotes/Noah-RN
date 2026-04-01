#!/usr/bin/env bash
set -euo pipefail

# Noah RN — NEWS2 (National Early Warning Score 2) Calculator
# Usage: news2.sh --rr N --spo2 N --o2 <yes|no> --temp N --sbp N --hr N --avpu <A|V|P|U> [--spo2-scale <1|2>]
#
# Clinical safety: NEWS2 is a standardized track-and-trigger system for acute illness.
# Score >= 5 triggers urgent clinical review. Score >= 7 or any single parameter scoring 3
# triggers emergency response. Per Royal College of Physicians 2017.
# This calculator does not replace clinical judgment.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: news2.sh --rr N --spo2 N --o2 <yes|no> --temp N --sbp N --hr N --avpu <A|V|P|U> [--spo2-scale <1|2>]

NEWS2 (National Early Warning Score 2) Calculator

Options:
  --rr        N   Respiratory rate (breaths/min, 0-60)
  --spo2      N   Oxygen saturation % (0-100)
  --o2        <yes|no>  Receiving supplemental oxygen
  --temp      N   Temperature in Celsius (e.g., 36.5, 38.2)
  --sbp       N   Systolic blood pressure mmHg (0-300)
  --hr        N   Heart rate bpm (0-300)
  --avpu      <A|V|P|U>  Level of consciousness (Alert, Voice, Pain, Unresponsive)
  --spo2-scale  <1|2>  SpO2 scoring scale (1=standard, 2=hypercapnic risk; default: 1)
  --help            Show this help and exit

Score ranges (total 0-20):
  0       No elevation — routine monitoring
  1-4     Low — ward-based care, review frequency per protocol
  5+      Medium — urgent clinical review within 1 hour
  7+      High — emergency, immediate clinical review
  Any single parameter scoring 3 — emergency response

Clinical note: NEWS2 uses two SpO2 scales. Scale 2 is for patients at risk of
hypercapnic respiratory failure (e.g., COPD). Default is Scale 1 (standard).
Per Royal College of Physicians — National Early Warning Score 2 (2017)."

RR=""
SPO2=""
O2=""
TEMP=""
SBP=""
HR=""
AVPU=""
SPO2_SCALE="1"

# Parse named arguments in any order
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)
            usage_exit "$USAGE"
            ;;
        --rr)
            RR="${2:-}"
            shift 2
            ;;
        --spo2)
            SPO2="${2:-}"
            shift 2
            ;;
        --o2)
            O2="${2:-}"
            shift 2
            ;;
        --temp)
            TEMP="${2:-}"
            shift 2
            ;;
        --sbp)
            SBP="${2:-}"
            shift 2
            ;;
        --hr)
            HR="${2:-}"
            shift 2
            ;;
        --avpu)
            AVPU="${2:-}"
            shift 2
            ;;
        --spo2-scale)
            SPO2_SCALE="${2:-}"
            shift 2
            ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Check all required args
if [[ -z "$RR" || -z "$SPO2" || -z "$O2" || -z "$TEMP" || -z "$SBP" || -z "$HR" || -z "$AVPU" ]]; then
    json_error "missing_args" "All parameters required: --rr, --spo2, --o2, --temp, --sbp, --hr, --avpu"
    exit 1
fi

# Validate spo2-scale
if [[ "$SPO2_SCALE" != "1" && "$SPO2_SCALE" != "2" ]]; then
    json_error "invalid_input" "spo2-scale must be 1 or 2, got: $SPO2_SCALE"
    exit 1
fi

# Validate RR (integer, 0-60)
err=""
err=$(validate_range "Respiratory rate" "$RR" 0 60) || { echo "$err"; exit 1; }

# Validate SpO2 (integer, 0-100)
err=$(validate_range "SpO2" "$SPO2" 0 100) || { echo "$err"; exit 1; }

# Validate O2
if [[ "$O2" != "yes" && "$O2" != "no" ]]; then
    json_error "invalid_input" "o2 must be 'yes' or 'no', got: $O2"
    exit 1
fi

# Validate SBP (integer, 0-300)
err=$(validate_range "Systolic BP" "$SBP" 0 300) || { echo "$err"; exit 1; }

# Validate HR (integer, 0-300)
err=$(validate_range "Heart rate" "$HR" 0 300) || { echo "$err"; exit 1; }

# Validate AVPU
AVPU_UPPER=$(echo "$AVPU" | tr '[:lower:]' '[:upper:]')
if [[ "$AVPU_UPPER" != "A" && "$AVPU_UPPER" != "V" && "$AVPU_UPPER" != "P" && "$AVPU_UPPER" != "U" ]]; then
    json_error "invalid_input" "avpu must be A, V, P, or U, got: $AVPU"
    exit 1
fi

# Validate temp — must be a number (integer or float)
if ! [[ "$TEMP" =~ ^-?[0-9]+\.?[0-9]*$ ]]; then
    json_error "invalid_input" "Temperature must be a number, got: $TEMP"
    exit 1
fi

# --- Score each parameter ---

# Respiratory Rate scoring
if (( RR <= 8 )); then
    RR_SCORE=3
elif (( RR <= 11 )); then
    RR_SCORE=1
elif (( RR <= 20 )); then
    RR_SCORE=0
elif (( RR <= 24 )); then
    RR_SCORE=2
else
    RR_SCORE=3
fi

# SpO2 scoring — two scales
if [[ "$SPO2_SCALE" == "2" ]]; then
    # Scale 2: hypercapnic respiratory failure risk
    if (( SPO2 <= 87 )); then
        SPO2_SCORE=3
    elif (( SPO2 <= 89 )); then
        SPO2_SCORE=2
    elif (( SPO2 <= 92 )); then
        SPO2_SCORE=1
    else
        SPO2_SCORE=0
    fi
else
    # Scale 1: standard
    if (( SPO2 <= 91 )); then
        SPO2_SCORE=3
    elif (( SPO2 <= 93 )); then
        SPO2_SCORE=2
    elif (( SPO2 <= 95 )); then
        SPO2_SCORE=1
    else
        SPO2_SCORE=0
    fi
fi

# O2 therapy
if [[ "$O2" == "yes" ]]; then
    O2_SCORE=2
else
    O2_SCORE=0
fi

# Temperature scoring (using awk for float comparison)
TEMP_SCORE=$(awk -v t="$TEMP" 'BEGIN {
    if (t <= 35.0) print 3
    else if (t <= 36.0) print 1
    else if (t <= 38.0) print 0
    else if (t <= 39.0) print 1
    else print 2
}')

# Systolic BP scoring
if (( SBP <= 90 )); then
    SBP_SCORE=3
elif (( SBP <= 100 )); then
    SBP_SCORE=2
elif (( SBP <= 110 )); then
    SBP_SCORE=1
elif (( SBP <= 219 )); then
    SBP_SCORE=0
else
    SBP_SCORE=3
fi

# Heart Rate scoring
if (( HR <= 40 )); then
    HR_SCORE=3
elif (( HR <= 50 )); then
    HR_SCORE=1
elif (( HR <= 90 )); then
    HR_SCORE=0
elif (( HR <= 110 )); then
    HR_SCORE=1
elif (( HR <= 130 )); then
    HR_SCORE=2
else
    HR_SCORE=3
fi

# AVPU scoring
if [[ "$AVPU_UPPER" == "A" ]]; then
    AVPU_SCORE=0
else
    AVPU_SCORE=3
fi

# Total score
TOTAL=$(( RR_SCORE + SPO2_SCORE + O2_SCORE + TEMP_SCORE + SBP_SCORE + HR_SCORE + AVPU_SCORE ))

# Check if any single parameter scored 3
ANY_THREE="false"
if (( RR_SCORE == 3 || SPO2_SCORE == 3 || O2_SCORE == 3 || TEMP_SCORE == 3 || SBP_SCORE == 3 || HR_SCORE == 3 || AVPU_SCORE == 3 )); then
    ANY_THREE="true"
fi

# Category assignment
if (( TOTAL == 0 )); then
    CATEGORY="no elevation"
    INTERPRETATION="No NEWS2 elevation — continue routine monitoring per ward protocol"
elif (( TOTAL <= 4 )); then
    CATEGORY="low"
    INTERPRETATION="Low NEWS2 — ward-based care, review monitoring frequency per facility protocol"
elif (( TOTAL <= 6 )); then
    CATEGORY="medium"
    INTERPRETATION="Medium NEWS2 — urgent clinical review within 1 hour, continuous monitoring"
else
    CATEGORY="high"
    INTERPRETATION="High NEWS2 — emergency response, immediate clinical review and escalation"
fi

# Emergency flag
if [[ "$ANY_THREE" == "true" && "$CATEGORY" != "high" ]]; then
    EMERGENCY_FLAG="true"
else
    EMERGENCY_FLAG="false"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$TOTAL" \
    --argjson rr "$RR" \
    --argjson rr_score "$RR_SCORE" \
    --argjson spo2 "$SPO2" \
    --argjson spo2_score "$SPO2_SCORE" \
    --arg spo2_scale "$SPO2_SCALE" \
    --arg o2 "$O2" \
    --argjson o2_score "$O2_SCORE" \
    --arg temp "$TEMP" \
    --argjson temp_score "$TEMP_SCORE" \
    --argjson sbp "$SBP" \
    --argjson sbp_score "$SBP_SCORE" \
    --argjson hr "$HR" \
    --argjson hr_score "$HR_SCORE" \
    --arg avpu "$AVPU_UPPER" \
    --argjson avpu_score "$AVPU_SCORE" \
    --argjson any_three "$ANY_THREE" \
    --argjson emergency_flag "$EMERGENCY_FLAG" \
    '{
        status: "ok",
        calculator: "news2",
        score: $score,
        max_score: 20,
        category: $category,
        components: {
            rr: { value: $rr, score: $rr_score },
            spo2: { value: $spo2, score: $spo2_score, scale: $spo2_scale },
            o2_therapy: { value: $o2, score: $o2_score },
            temperature: { value: $temp, score: $temp_score },
            sbp: { value: $sbp, score: $sbp_score },
            hr: { value: $hr, score: $hr_score },
            avpu: { value: $avpu, score: $avpu_score }
        },
        any_single_parameter_three: $any_three,
        emergency_response: $emergency_flag,
        interpretation: $interpretation
    }'
