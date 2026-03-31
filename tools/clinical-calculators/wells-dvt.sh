#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Wells DVT (Deep Vein Thrombosis) Probability Calculator
# Usage: wells-dvt.sh --cancer N --paralysis N --bedridden N --tenderness N \
#                     --leg-swollen N --calf-swelling N --pitting-edema N \
#                     --collateral-veins N --previous-dvt N --alternative-dx N
#
# Clinical safety: Wells DVT score is a validated pre-test probability tool.
# Use in conjunction with D-dimer and duplex ultrasound — not a standalone rule-out.
# Low probability + negative D-dimer has high negative predictive value for DVT.
# High probability warrants venous duplex ultrasound regardless of D-dimer.
# Per facility protocol for empiric anticoagulation thresholds.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: wells-dvt.sh --cancer N --paralysis N --bedridden N --tenderness N \\
                    --leg-swollen N --calf-swelling N --pitting-edema N \\
                    --collateral-veins N --previous-dvt N --alternative-dx N

Wells DVT Probability Score

Each criterion is 0 (absent) or 1 (present):

Options:
  --cancer         N   Active cancer (treatment ongoing, within 6mo, or palliative)  (0 or 1)  → +1 pt
  --paralysis      N   Paralysis, paresis, or recent plaster immobilization of LE    (0 or 1)  → +1 pt
  --bedridden      N   Bedridden >3d or major surgery (general/regional) in 12 wks  (0 or 1)  → +1 pt
  --tenderness     N   Localized tenderness along deep venous system distribution    (0 or 1)  → +1 pt
  --leg-swollen    N   Entire leg swollen                                            (0 or 1)  → +1 pt
  --calf-swelling  N   Calf swelling >3cm vs asymptomatic side (10cm below tib tub) (0 or 1)  → +1 pt
  --pitting-edema  N   Pitting edema confined to symptomatic leg                    (0 or 1)  → +1 pt
  --collateral-veins N Collateral superficial veins (non-varicose)                  (0 or 1)  → +1 pt
  --previous-dvt   N   Previously documented DVT                                    (0 or 1)  → +1 pt
  --alternative-dx N   Alternative diagnosis at least as likely as DVT              (0 or 1)  → -2 pts
  --help               Show this help and exit

Score range: -2 to 9
  Traditional three-tier:
    ≤0     Low probability     (~5% DVT prevalence)
    1-2    Moderate probability (~17% DVT prevalence)
    ≥3     High probability    (~53% DVT prevalence)
  Simplified two-tier:
    ≤1     DVT unlikely
    ≥2     DVT likely

Clinical note: Low probability + negative D-dimer safely excludes DVT in most patients.
Moderate/high probability requires venous duplex ultrasound. Per facility protocol for
empiric anticoagulation in high-probability patients awaiting imaging."

CANCER=""
PARALYSIS=""
BEDRIDDEN=""
TENDERNESS=""
LEG_SWOLLEN=""
CALF_SWELLING=""
PITTING_EDEMA=""
COLLATERAL_VEINS=""
PREVIOUS_DVT=""
ALTERNATIVE_DX=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)              usage_exit "$USAGE" ;;
        --cancer)            CANCER="${2:-}";           shift 2 ;;
        --paralysis)         PARALYSIS="${2:-}";        shift 2 ;;
        --bedridden)         BEDRIDDEN="${2:-}";        shift 2 ;;
        --tenderness)        TENDERNESS="${2:-}";       shift 2 ;;
        --leg-swollen)       LEG_SWOLLEN="${2:-}";      shift 2 ;;
        --calf-swelling)     CALF_SWELLING="${2:-}";   shift 2 ;;
        --pitting-edema)     PITTING_EDEMA="${2:-}";   shift 2 ;;
        --collateral-veins)  COLLATERAL_VEINS="${2:-}"; shift 2 ;;
        --previous-dvt)      PREVIOUS_DVT="${2:-}";    shift 2 ;;
        --alternative-dx)    ALTERNATIVE_DX="${2:-}";  shift 2 ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$CANCER" || -z "$PARALYSIS" || -z "$BEDRIDDEN" || -z "$TENDERNESS" ||
      -z "$LEG_SWOLLEN" || -z "$CALF_SWELLING" || -z "$PITTING_EDEMA" ||
      -z "$COLLATERAL_VEINS" || -z "$PREVIOUS_DVT" || -z "$ALTERNATIVE_DX" ]]; then
    json_error "missing_args" "All ten criteria required: --cancer, --paralysis, --bedridden, --tenderness, --leg-swollen, --calf-swelling, --pitting-edema, --collateral-veins, --previous-dvt, --alternative-dx"
    exit 1
fi

err=""
err=$(validate_range "Active cancer" "$CANCER" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Paralysis/paresis" "$PARALYSIS" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Bedridden/surgery" "$BEDRIDDEN" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Localized tenderness" "$TENDERNESS" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Entire leg swollen" "$LEG_SWOLLEN" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Calf swelling >3cm" "$CALF_SWELLING" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Pitting edema" "$PITTING_EDEMA" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Collateral veins" "$COLLATERAL_VEINS" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Previous DVT" "$PREVIOUS_DVT" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Alternative diagnosis" "$ALTERNATIVE_DX" 0 1) || { echo "$err"; exit 1; }

SCORE=$(( CANCER + PARALYSIS + BEDRIDDEN + TENDERNESS + LEG_SWOLLEN + CALF_SWELLING + PITTING_EDEMA + COLLATERAL_VEINS + PREVIOUS_DVT - (ALTERNATIVE_DX * 2) ))

if (( SCORE <= 0 )); then
    CATEGORY="low probability"
elif (( SCORE <= 2 )); then
    CATEGORY="moderate probability"
else
    CATEGORY="high probability"
fi

if (( SCORE <= 1 )); then
    SIMPLIFIED="DVT unlikely"
else
    SIMPLIFIED="DVT likely"
fi

if [[ "$CATEGORY" == "low probability" ]]; then
    INTERPRETATION="Low probability of DVT (~5%) — negative D-dimer may safely rule out DVT if low clinical suspicion"
elif [[ "$CATEGORY" == "moderate probability" ]]; then
    INTERPRETATION="Moderate probability of DVT (~17%) — venous duplex ultrasound indicated; D-dimer useful if ultrasound negative"
else
    INTERPRETATION="High probability of DVT (~53%) — venous duplex ultrasound required; consider empiric anticoagulation per facility protocol"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg simplified "$SIMPLIFIED" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson cancer "$CANCER" \
    --argjson paralysis "$PARALYSIS" \
    --argjson bedridden "$BEDRIDDEN" \
    --argjson tenderness "$TENDERNESS" \
    --argjson leg_swollen "$LEG_SWOLLEN" \
    --argjson calf_swelling "$CALF_SWELLING" \
    --argjson pitting_edema "$PITTING_EDEMA" \
    --argjson collateral_veins "$COLLATERAL_VEINS" \
    --argjson previous_dvt "$PREVIOUS_DVT" \
    --argjson alternative_dx "$ALTERNATIVE_DX" \
    '{
        status: "ok",
        calculator: "wells_dvt",
        score: $score,
        max_score: 9,
        min_score: -2,
        category: $category,
        simplified: $simplified,
        components: {
            cancer: $cancer,
            paralysis: $paralysis,
            bedridden: $bedridden,
            tenderness: $tenderness,
            leg_swollen: $leg_swollen,
            calf_swelling: $calf_swelling,
            pitting_edema: $pitting_edema,
            collateral_veins: $collateral_veins,
            previous_dvt: $previous_dvt,
            alternative_dx: $alternative_dx
        },
        interpretation: $interpretation
    }'
