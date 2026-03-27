#!/usr/bin/env bash
set -euo pipefail

# Noah RN — APACHE II (Acute Physiology and Chronic Health Evaluation II)
# Usage: apache2.sh --temp N --map N --hr N --rr N --fio2 N --oxygenation N \
#                   --ph N --sodium N --potassium N --creatinine N \
#                   --hematocrit N --wbc N --gcs N --age N --chronic N [--arf N]
#
# Clinical safety: APACHE II is a validated ICU severity scoring system.
# Scores estimate mortality risk — not a real-time clinical decision tool.
# Always integrate with full clinical picture, trajectory, and goals of care.
# Per facility protocol for ICU triage and resource allocation.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

USAGE="Usage: apache2.sh --temp N --map N --hr N --rr N --fio2 N --oxygenation N \\
                 --ph N --sodium N --potassium N --creatinine N \\
                 --hematocrit N --wbc N --gcs N --age N --chronic N [--arf N]

APACHE II Severity Score

Physiology variables:
  --temp        N   Temperature (°C)        e.g. 37.0
  --map         N   Mean Arterial Pressure  (mmHg)
  --hr          N   Heart Rate              (bpm)
  --rr          N   Respiratory Rate        (breaths/min)
  --fio2        N   FiO2 fraction           (e.g. 0.21 or 0.5) — determines oxygenation method
  --oxygenation N   If FiO2 ≥ 0.5: A-aDO2 value. If FiO2 < 0.5: PaO2 value.
  --ph          N   Arterial pH             (e.g. 7.40)
  --sodium      N   Sodium                  (mEq/L)
  --potassium   N   Potassium               (mEq/L)
  --creatinine  N   Creatinine              (mg/dL)
  --hematocrit  N   Hematocrit              (%)
  --wbc         N   White blood count       (×1000/mm³)
  --gcs         N   Glasgow Coma Scale      (3-15); points = 15 - GCS
  --age         N   Age in years
  --chronic     N   Chronic health points   (0, 2, or 5 only)
                      0 = no severe organ insufficiency or immunocompromised
                      2 = elective postop with severe organ insufficiency/immunocompromised
                      5 = emergency postop or nonoperative with severe organ insufficiency/immunocompromised
  --arf         N   Acute renal failure     (0 or 1) — doubles creatinine points [default: 0]
  --help            Show this help and exit

Score range: 0-71
  0-9    Low risk         Estimated mortality <10%
  10-19  Moderate risk    Estimated mortality 10-25%
  20-29  High risk        Estimated mortality 25-50%
  30-39  Very high risk   Estimated mortality 50-75%
  ≥40    Critical         Estimated mortality >75%

Clinical note: APACHE II was validated in mixed ICU populations. Interpret in context of
diagnosis, trajectory, and individual patient factors. Per facility protocol for care planning."

TEMP=""
MAP=""
HR=""
RR=""
FIO2=""
OXYGENATION=""
PH=""
SODIUM=""
POTASSIUM=""
CREATININE=""
HEMATOCRIT=""
WBC=""
GCS=""
AGE=""
CHRONIC=""
ARF="0"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --help)        usage_exit "$USAGE" ;;
        --temp)        TEMP="${2:-}";        shift 2 ;;
        --map)         MAP="${2:-}";         shift 2 ;;
        --hr)          HR="${2:-}";          shift 2 ;;
        --rr)          RR="${2:-}";          shift 2 ;;
        --fio2)        FIO2="${2:-}";        shift 2 ;;
        --oxygenation) OXYGENATION="${2:-}"; shift 2 ;;
        --ph)          PH="${2:-}";          shift 2 ;;
        --sodium)      SODIUM="${2:-}";      shift 2 ;;
        --potassium)   POTASSIUM="${2:-}";   shift 2 ;;
        --creatinine)  CREATININE="${2:-}";  shift 2 ;;
        --hematocrit)  HEMATOCRIT="${2:-}";  shift 2 ;;
        --wbc)         WBC="${2:-}";         shift 2 ;;
        --gcs)         GCS="${2:-}";         shift 2 ;;
        --age)         AGE="${2:-}";         shift 2 ;;
        --chronic)     CHRONIC="${2:-}";     shift 2 ;;
        --arf)         ARF="${2:-}";         shift 2 ;;
        *)
            json_error "invalid_input" "Unknown argument: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$TEMP" || -z "$MAP" || -z "$HR" || -z "$RR" || -z "$FIO2" ||
      -z "$OXYGENATION" || -z "$PH" || -z "$SODIUM" || -z "$POTASSIUM" ||
      -z "$CREATININE" || -z "$HEMATOCRIT" || -z "$WBC" || -z "$GCS" ||
      -z "$AGE" || -z "$CHRONIC" ]]; then
    json_error "missing_args" "All 15 parameters required: --temp --map --hr --rr --fio2 --oxygenation --ph --sodium --potassium --creatinine --hematocrit --wbc --gcs --age --chronic"
    exit 1
fi

# Validate integer-only inputs
err=""
err=$(validate_range "MAP" "$MAP" 0 300) || { echo "$err"; exit 1; }
err=$(validate_range "Heart rate" "$HR" 0 300) || { echo "$err"; exit 1; }
err=$(validate_range "Respiratory rate" "$RR" 0 100) || { echo "$err"; exit 1; }
err=$(validate_range "Sodium" "$SODIUM" 80 220) || { echo "$err"; exit 1; }
err=$(validate_range "Hematocrit" "$HEMATOCRIT" 0 100) || { echo "$err"; exit 1; }
err=$(validate_range "GCS" "$GCS" 3 15) || { echo "$err"; exit 1; }
err=$(validate_range "Age" "$AGE" 0 150) || { echo "$err"; exit 1; }
err=$(validate_range "ARF" "$ARF" 0 1) || { echo "$err"; exit 1; }

# Validate decimal inputs are numeric
for label_val in "Temperature:$TEMP" "Oxygenation:$OXYGENATION" "pH:$PH" "Potassium:$POTASSIUM" "Creatinine:$CREATININE" "WBC:$WBC" "FiO2:$FIO2"; do
    label="${label_val%%:*}"
    val="${label_val##*:}"
    if ! [[ "$val" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]; then
        json_error "invalid_input" "${label} must be a number, got: ${val}"
        exit 1
    fi
done

# Validate chronic: only 0, 2, or 5
if [[ "$CHRONIC" != "0" && "$CHRONIC" != "2" && "$CHRONIC" != "5" ]]; then
    json_error "invalid_input" "Chronic health must be 0, 2, or 5, got: $CHRONIC"
    exit 1
fi

# ─── Physiology scoring via awk ───────────────────────────────────────────────

# Temperature
PTS_TEMP=$(awk "BEGIN {
    t = $TEMP
    if (t >= 41) print 4
    else if (t >= 39) print 3
    else if (t >= 38.5) print 1
    else if (t >= 36) print 0
    else if (t >= 34) print 1
    else if (t >= 32) print 2
    else if (t >= 30) print 3
    else print 4
}")

# MAP
PTS_MAP=$(awk "BEGIN {
    m = $MAP
    if (m >= 160) print 4
    else if (m >= 130) print 3
    else if (m >= 110) print 2
    else if (m >= 70) print 0
    else if (m >= 50) print 2
    else print 4
}")

# Heart Rate
PTS_HR=$(awk "BEGIN {
    h = $HR
    if (h >= 180) print 4
    else if (h >= 140) print 3
    else if (h >= 110) print 2
    else if (h >= 70) print 0
    else if (h >= 55) print 2
    else if (h >= 40) print 3
    else print 4
}")

# Respiratory Rate
PTS_RR=$(awk "BEGIN {
    r = $RR
    if (r >= 50) print 4
    else if (r >= 35) print 3
    else if (r >= 25) print 1
    else if (r >= 12) print 0
    else if (r >= 10) print 1
    else if (r >= 6) print 2
    else if (r >= 1) print 3
    else print 4
}")

# Oxygenation: FiO2 determines scoring path
PTS_OXY=$(awk "BEGIN {
    fio2 = $FIO2
    oxy  = $OXYGENATION
    if (fio2 >= 0.5) {
        # A-aDO2 scoring
        if (oxy >= 500) print 4
        else if (oxy >= 350) print 3
        else if (oxy >= 200) print 2
        else print 0
    } else {
        # PaO2 scoring
        if (oxy > 70) print 0
        else if (oxy >= 61) print 1
        else if (oxy >= 55) print 3
        else print 4
    }
}")

# Arterial pH
PTS_PH=$(awk "BEGIN {
    p = $PH
    if (p >= 7.7) print 4
    else if (p >= 7.6) print 3
    else if (p >= 7.5) print 1
    else if (p >= 7.33) print 0
    else if (p >= 7.25) print 2
    else if (p >= 7.15) print 3
    else print 4
}")

# Sodium
PTS_NA=$(awk "BEGIN {
    s = $SODIUM
    if (s >= 180) print 4
    else if (s >= 160) print 3
    else if (s >= 155) print 2
    else if (s >= 150) print 1
    else if (s >= 130) print 0
    else if (s >= 120) print 2
    else if (s >= 111) print 3
    else print 4
}")

# Potassium
PTS_K=$(awk "BEGIN {
    k = $POTASSIUM
    if (k >= 7.0) print 4
    else if (k >= 6.0) print 3
    else if (k >= 5.5) print 1
    else if (k >= 3.5) print 0
    else if (k >= 3.0) print 1
    else if (k >= 2.5) print 2
    else print 4
}")

# Creatinine (doubled if ARF)
PTS_CR_BASE=$(awk "BEGIN {
    c = $CREATININE
    if (c >= 3.5) print 4
    else if (c >= 2.0) print 3
    else if (c >= 1.5) print 2
    else if (c >= 0.6) print 0
    else print 2
}")
PTS_CR=$(( ARF == 1 ? PTS_CR_BASE * 2 : PTS_CR_BASE ))

# Hematocrit
PTS_HCT=$(awk "BEGIN {
    h = $HEMATOCRIT
    if (h >= 60) print 4
    else if (h >= 50) print 2
    else if (h >= 46) print 1
    else if (h >= 30) print 0
    else if (h >= 20) print 2
    else print 4
}")

# WBC
PTS_WBC=$(awk "BEGIN {
    w = $WBC
    if (w >= 40) print 4
    else if (w >= 20) print 2
    else if (w >= 15) print 1
    else if (w >= 3) print 0
    else if (w >= 1) print 2
    else print 4
}")

# GCS: points = 15 - GCS
PTS_GCS=$(( 15 - GCS ))

# ─── Age points ───────────────────────────────────────────────────────────────
PTS_AGE=$(awk "BEGIN {
    a = $AGE
    if (a < 45) print 0
    else if (a <= 54) print 2
    else if (a <= 64) print 3
    else if (a <= 74) print 5
    else print 6
}")

# ─── Chronic health points (already validated as 0, 2, or 5) ─────────────────
PTS_CHRONIC="$CHRONIC"

# ─── Total ───────────────────────────────────────────────────────────────────
SCORE=$(( PTS_TEMP + PTS_MAP + PTS_HR + PTS_RR + PTS_OXY + PTS_PH + PTS_NA + PTS_K + PTS_CR + PTS_HCT + PTS_WBC + PTS_GCS + PTS_AGE + PTS_CHRONIC ))

# ─── Category ────────────────────────────────────────────────────────────────
if (( SCORE <= 9 )); then
    CATEGORY="low risk"
    INTERPRETATION="Low severity — estimated mortality <10%"
elif (( SCORE <= 19 )); then
    CATEGORY="moderate risk"
    INTERPRETATION="Moderate severity — estimated mortality 10-25%"
elif (( SCORE <= 29 )); then
    CATEGORY="high risk"
    INTERPRETATION="High severity — estimated mortality 25-50%"
elif (( SCORE <= 39 )); then
    CATEGORY="very high risk"
    INTERPRETATION="Very high severity — estimated mortality 50-75%"
else
    CATEGORY="critical"
    INTERPRETATION="Critical severity — estimated mortality >75%"
fi

jq -n \
    --arg category "$CATEGORY" \
    --arg interpretation "$INTERPRETATION" \
    --argjson score "$SCORE" \
    --argjson pts_temp "$PTS_TEMP" \
    --argjson pts_map "$PTS_MAP" \
    --argjson pts_hr "$PTS_HR" \
    --argjson pts_rr "$PTS_RR" \
    --argjson pts_oxy "$PTS_OXY" \
    --argjson pts_ph "$PTS_PH" \
    --argjson pts_na "$PTS_NA" \
    --argjson pts_k "$PTS_K" \
    --argjson pts_cr "$PTS_CR" \
    --argjson pts_hct "$PTS_HCT" \
    --argjson pts_wbc "$PTS_WBC" \
    --argjson pts_gcs "$PTS_GCS" \
    --argjson pts_age "$PTS_AGE" \
    --argjson pts_chronic "$PTS_CHRONIC" \
    '{
        status: "ok",
        calculator: "apache2",
        score: $score,
        max_score: 71,
        category: $category,
        components: {
            temperature: $pts_temp,
            map: $pts_map,
            heart_rate: $pts_hr,
            respiratory_rate: $pts_rr,
            oxygenation: $pts_oxy,
            ph: $pts_ph,
            sodium: $pts_na,
            potassium: $pts_k,
            creatinine: $pts_cr,
            hematocrit: $pts_hct,
            wbc: $pts_wbc,
            gcs: $pts_gcs,
            age: $pts_age,
            chronic_health: $pts_chronic
        },
        interpretation: $interpretation
    }'
