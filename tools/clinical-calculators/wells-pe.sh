#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Wells PE (Pulmonary Embolism) Probability Calculator
# Usage: wells-pe.sh --dvt N --heartrate N --immobilization N --prior N \
#                    --hemoptysis N --malignancy N --alternative N
#
# Clinical safety: Wells score is a validated pre-test probability tool for PE.
# Use in conjunction with D-dimer and clinical judgment — not a standalone rule-out.
# CT pulmonary angiography is the gold standard for PE diagnosis.
# Per facility protocol for empiric anticoagulation thresholds.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: wells-pe.sh --dvt N --heartrate N --immobilization N --prior N \\
                   --hemoptysis N --malignancy N --alternative N

Wells PE Probability Score

Each criterion is 0 (absent) or 1 (present):

Options:
  --dvt           N   Clinical signs/symptoms of DVT          (0 or 1)  → 3.0 pts
  --heartrate     N   Heart rate > 100                        (0 or 1)  → 1.5 pts
  --immobilization N  Immobilization ≥3d or surgery in 4wks  (0 or 1)  → 1.5 pts
  --prior         N   Previous DVT/PE                         (0 or 1)  → 1.5 pts
  --hemoptysis    N   Hemoptysis                              (0 or 1)  → 1.0 pts
  --malignancy    N   Active malignancy                       (0 or 1)  → 1.0 pts
  --alternative   N   PE as likely/more likely than alt dx   (0 or 1)  → 3.0 pts
  --help              Show this help and exit

Score range: 0.0-12.5
  Traditional three-tier:
    ≤1     Low probability
    2-6    Moderate probability
    >6     High probability
  Simplified two-tier:
    ≤4     PE unlikely
    >4     PE likely

Clinical note: Low probability + negative D-dimer may safely rule out PE in most patients.
High probability warrants CT pulmonary angiography regardless of D-dimer result."

DVT=""
HEARTRATE=""
IMMOBILIZATION=""
PRIOR=""
HEMOPTYSIS=""
MALIGNANCY=""
ALTERNATIVE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)          usage_exit "$USAGE" ;;
        --dvt)           DVT="${2:-}";           shift 2 ;;
        --heartrate)     HEARTRATE="${2:-}";     shift 2 ;;
        --immobilization) IMMOBILIZATION="${2:-}"; shift 2 ;;
        --prior)         PRIOR="${2:-}";         shift 2 ;;
        --hemoptysis)    HEMOPTYSIS="${2:-}";    shift 2 ;;
        --malignancy)    MALIGNANCY="${2:-}";    shift 2 ;;
        --alternative)   ALTERNATIVE="${2:-}";   shift 2 ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$DVT" || -z "$HEARTRATE" || -z "$IMMOBILIZATION" || -z "$PRIOR" ||
      -z "$HEMOPTYSIS" || -z "$MALIGNANCY" || -z "$ALTERNATIVE" ]]; then
    json_error "missing_args" "All seven criteria required: --dvt, --heartrate, --immobilization, --prior, --hemoptysis, --malignancy, --alternative"
    exit 1
fi

err=""
err=$(validate_range "DVT" "$DVT" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Heart rate" "$HEARTRATE" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Immobilization" "$IMMOBILIZATION" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Prior DVT/PE" "$PRIOR" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Hemoptysis" "$HEMOPTYSIS" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Malignancy" "$MALIGNANCY" 0 1) || { echo "$err"; exit 1; }
err=$(validate_range "Alternative diagnosis" "$ALTERNATIVE" 0 1) || { echo "$err"; exit 1; }

SCORE=$(awk "BEGIN { printf \"%.1f\", ($DVT * 3.0) + ($HEARTRATE * 1.5) + ($IMMOBILIZATION * 1.5) + ($PRIOR * 1.5) + ($HEMOPTYSIS * 1.0) + ($MALIGNANCY * 1.0) + ($ALTERNATIVE * 3.0) }")

CATEGORY=$(awk "BEGIN { if ($SCORE <= 1) print \"low probability\"; else if ($SCORE <= 6) print \"moderate probability\"; else print \"high probability\" }")

SIMPLIFIED=$(awk "BEGIN { if ($SCORE <= 4) print \"PE unlikely\"; else print \"PE likely\" }")

if [[ "$CATEGORY" == "low probability" ]]; then
    INTERPRETATION="Low probability of PE — D-dimer may be sufficient to rule out if low clinical suspicion"
elif [[ "$CATEGORY" == "moderate probability" ]]; then
    INTERPRETATION="Moderate probability of PE — consider D-dimer or CT angiography based on clinical picture"
else
    INTERPRETATION="High probability of PE — CT angiography indicated, consider empiric anticoagulation"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg simplified "$SIMPLIFIED" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson dvt "$DVT" \
    --argjson heartrate "$HEARTRATE" \
    --argjson immobilization "$IMMOBILIZATION" \
    --argjson prior "$PRIOR" \
    --argjson hemoptysis "$HEMOPTYSIS" \
    --argjson malignancy "$MALIGNANCY" \
    --argjson alternative "$ALTERNATIVE" \
    '{
        status: "ok",
        calculator: "wells_pe",
        score: $score,
        max_score: 12.5,
        category: $category,
        simplified: $simplified,
        components: {
            dvt: $dvt,
            heartrate: $heartrate,
            immobilization: $immobilization,
            prior: $prior,
            hemoptysis: $hemoptysis,
            malignancy: $malignancy,
            alternative: $alternative
        },
        interpretation: $interpretation
    }'
