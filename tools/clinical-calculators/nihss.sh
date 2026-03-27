#!/usr/bin/env bash
set -euo pipefail

# Noah RN — NIH Stroke Scale (NIHSS) Calculator
# Usage: nihss.sh --1a N --1b N --1c N --2 N --3 N --4 N --5a N --5b N \
#                 --6a N --6b N --7 N --8 N --9 N --10 N --11 N
#
# Clinical safety: NIHSS is a validated neurological stroke severity tool.
# Scores guide thrombolysis and thrombectomy candidacy decisions.
# This calculator does not replace clinical judgment or imaging findings.
# Per facility protocol for tPA window and thrombectomy criteria.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: nihss.sh --1a N --1b N --1c N --2 N --3 N --4 N --5a N --5b N \\
                --6a N --6b N --7 N --8 N --9 N --10 N --11 N

NIH Stroke Scale (NIHSS) Calculator

Items and ranges:
  --1a N   LOC (level of consciousness)    0-3
  --1b N   LOC Questions                   0-2
  --1c N   LOC Commands                    0-2
  --2  N   Best Gaze                       0-2
  --3  N   Visual Fields                   0-3
  --4  N   Facial Palsy                    0-3
  --5a N   Motor Arm Left                  0-4
  --5b N   Motor Arm Right                 0-4
  --6a N   Motor Leg Left                  0-4
  --6b N   Motor Leg Right                 0-4
  --7  N   Limb Ataxia                     0-2
  --8  N   Sensory                         0-2
  --9  N   Best Language                   0-3
  --10 N   Dysarthria                      0-2
  --11 N   Extinction/Inattention          0-2
  --help   Show this help and exit

Score range: 0-42
  0        No stroke symptoms
  1-4      Minor stroke
  5-15     Moderate stroke
  16-20    Moderate to severe stroke
  21-42    Severe stroke

Clinical note: Per facility protocol for thrombolysis window and LVO thrombectomy criteria."

I1A="" I1B="" I1C="" I2="" I3="" I4=""
I5A="" I5B="" I6A="" I6B="" I7="" I8="" I9="" I10="" I11=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help) usage_exit "$USAGE" ;;
        --1a)  I1A="${2:-}";  shift 2 ;;
        --1b)  I1B="${2:-}";  shift 2 ;;
        --1c)  I1C="${2:-}";  shift 2 ;;
        --2)   I2="${2:-}";   shift 2 ;;
        --3)   I3="${2:-}";   shift 2 ;;
        --4)   I4="${2:-}";   shift 2 ;;
        --5a)  I5A="${2:-}";  shift 2 ;;
        --5b)  I5B="${2:-}";  shift 2 ;;
        --6a)  I6A="${2:-}";  shift 2 ;;
        --6b)  I6B="${2:-}";  shift 2 ;;
        --7)   I7="${2:-}";   shift 2 ;;
        --8)   I8="${2:-}";   shift 2 ;;
        --9)   I9="${2:-}";   shift 2 ;;
        --10)  I10="${2:-}";  shift 2 ;;
        --11)  I11="${2:-}";  shift 2 ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$I1A" || -z "$I1B" || -z "$I1C" || -z "$I2" || -z "$I3" || -z "$I4" ||
      -z "$I5A" || -z "$I5B" || -z "$I6A" || -z "$I6B" || -z "$I7" || -z "$I8" ||
      -z "$I9" || -z "$I10" || -z "$I11" ]]; then
    json_error "missing_args" "All 15 items required: --1a --1b --1c --2 --3 --4 --5a --5b --6a --6b --7 --8 --9 --10 --11"
    exit 1
fi

err=""
err=$(validate_range "LOC (1a)" "$I1A" 0 3) || { echo "$err"; exit 1; }
err=$(validate_range "LOC Questions (1b)" "$I1B" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "LOC Commands (1c)" "$I1C" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Best Gaze (2)" "$I2" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Visual Fields (3)" "$I3" 0 3) || { echo "$err"; exit 1; }
err=$(validate_range "Facial Palsy (4)" "$I4" 0 3) || { echo "$err"; exit 1; }
err=$(validate_range "Motor Arm Left (5a)" "$I5A" 0 4) || { echo "$err"; exit 1; }
err=$(validate_range "Motor Arm Right (5b)" "$I5B" 0 4) || { echo "$err"; exit 1; }
err=$(validate_range "Motor Leg Left (6a)" "$I6A" 0 4) || { echo "$err"; exit 1; }
err=$(validate_range "Motor Leg Right (6b)" "$I6B" 0 4) || { echo "$err"; exit 1; }
err=$(validate_range "Limb Ataxia (7)" "$I7" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Sensory (8)" "$I8" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Best Language (9)" "$I9" 0 3) || { echo "$err"; exit 1; }
err=$(validate_range "Dysarthria (10)" "$I10" 0 2) || { echo "$err"; exit 1; }
err=$(validate_range "Extinction/Inattention (11)" "$I11" 0 2) || { echo "$err"; exit 1; }

SCORE=$(( I1A + I1B + I1C + I2 + I3 + I4 + I5A + I5B + I6A + I6B + I7 + I8 + I9 + I10 + I11 ))

if (( SCORE == 0 )); then
    CATEGORY="no stroke symptoms"
    INTERPRETATION="No measurable neurological deficit"
elif (( SCORE <= 4 )); then
    CATEGORY="minor stroke"
    INTERPRETATION="Minor stroke — likely favorable outcome, consider thrombolysis per window"
elif (( SCORE <= 15 )); then
    CATEGORY="moderate stroke"
    INTERPRETATION="Moderate stroke — significant deficit, strong thrombolysis candidate if within window"
elif (( SCORE <= 20 )); then
    CATEGORY="moderate to severe stroke"
    INTERPRETATION="Moderate to severe stroke — significant morbidity risk, consider thrombectomy if LVO"
else
    CATEGORY="severe stroke"
    INTERPRETATION="Severe stroke — high morbidity and mortality risk, assess for large vessel occlusion"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson i1a "$I1A" \
    --argjson i1b "$I1B" \
    --argjson i1c "$I1C" \
    --argjson i2 "$I2" \
    --argjson i3 "$I3" \
    --argjson i4 "$I4" \
    --argjson i5a "$I5A" \
    --argjson i5b "$I5B" \
    --argjson i6a "$I6A" \
    --argjson i6b "$I6B" \
    --argjson i7 "$I7" \
    --argjson i8 "$I8" \
    --argjson i9 "$I9" \
    --argjson i10 "$I10" \
    --argjson i11 "$I11" \
    '{
        status: "ok",
        calculator: "nihss",
        score: $score,
        max_score: 42,
        category: $category,
        components: {
            "1a": $i1a, "1b": $i1b, "1c": $i1c,
            "2": $i2, "3": $i3, "4": $i4,
            "5a": $i5a, "5b": $i5b,
            "6a": $i6a, "6b": $i6b,
            "7": $i7, "8": $i8, "9": $i9,
            "10": $i10, "11": $i11
        },
        interpretation: $interpretation
    }'
