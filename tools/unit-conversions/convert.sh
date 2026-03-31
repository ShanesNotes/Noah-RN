#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Unit Conversion Tool
# Usage: convert.sh <subcommand> [options]
# Subcommands: dose, drip, unit
#
# Clinical safety: Unit errors are medication errors. Verify all calculations
# against original orders and facility protocols before acting. This tool does
# not replace clinical judgment.

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

json_error() {
    local error_type="$1"
    local message="$2"
    jq -n \
        --arg error_type "$error_type" \
        --arg message "$message" \
        '{"status":"error","error":$error_type,"message":$message}'
}

# is_number — returns 0 if $1 is a valid decimal number (int or float, optionally negative)
is_number() {
    local val="$1"
    [[ "$val" =~ ^-?[0-9]+(\.[0-9]+)?$ ]]
}

mass_unit_scale() {
    case "$1" in
        mcg) echo "1" ;;
        mg) echo "1000" ;;
        g) echo "1000000" ;;
        units) echo "1" ;;
        *) return 1 ;;
    esac
}

# ---------------------------------------------------------------------------
# USAGE
# ---------------------------------------------------------------------------

USAGE="Usage: convert.sh <subcommand> [options]

Subcommands:
  dose   Weight-based dose calculation
  drip   IV drip rate calculation
  unit   Unit conversion

Options (dose):
  --weight-kg N     Patient weight in kg (0.5-500)
  --dose-per-kg N   Dose per kg (> 0)
  --unit STR        Unit label (e.g., mg, mcg, units)

Options (drip):
  --dose N          Dose amount (> 0)
  --dose-unit STR   Dose unit (e.g., mcg/min, mg/hr)
  --concentration N Drug concentration (> 0)
  --conc-unit STR   Concentration unit (e.g., mcg/mL, mg/mL)
  --weight-kg N     Patient weight in kg (optional — enables mcg/kg/min)

Options (unit):
  --value N         Numeric value to convert
  --from STR        Source unit
  --to STR          Target unit

Supported unit conversions:
  Weight:      kg <-> lbs, g <-> mg, mg <-> mcg
  Volume:      L <-> mL, mL <-> cc (1:1)
  Temperature: F <-> C
  Length:      in <-> cm

  --help        Show this help and exit"

# ---------------------------------------------------------------------------
# Top-level dispatch
# ---------------------------------------------------------------------------

if [[ $# -eq 0 ]]; then
    json_error "missing_args" "No subcommand provided. Usage: convert.sh dose|drip|unit [options]"
    exit 1
fi

case "$1" in
    --help|-h)
        echo "$USAGE"
        exit 0
        ;;
    dose|drip|unit)
        SUBCMD="$1"
        shift
        ;;
    *)
        json_error "invalid_subcommand" "Unknown subcommand: $1. Must be one of: dose, drip, unit"
        exit 1
        ;;
esac

# ---------------------------------------------------------------------------
# dose subcommand
# ---------------------------------------------------------------------------

cmd_dose() {
    local WEIGHT_KG="" DOSE_PER_KG="" UNIT=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                echo "$USAGE"
                exit 0
                ;;
            --weight-kg)
                WEIGHT_KG="${2:-}"
                shift 2
                ;;
            --dose-per-kg)
                DOSE_PER_KG="${2:-}"
                shift 2
                ;;
            --unit)
                UNIT="${2:-}"
                shift 2
                ;;
            *)
                json_error "invalid_input" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Require all args
    if [[ -z "$WEIGHT_KG" || -z "$DOSE_PER_KG" || -z "$UNIT" ]]; then
        json_error "missing_args" "All three arguments required: --weight-kg, --dose-per-kg, --unit"
        exit 1
    fi

    # Validate numeric
    if ! is_number "$WEIGHT_KG"; then
        json_error "invalid_input" "--weight-kg must be a number, got: $WEIGHT_KG"
        exit 1
    fi
    if ! is_number "$DOSE_PER_KG"; then
        json_error "invalid_input" "--dose-per-kg must be a number, got: $DOSE_PER_KG"
        exit 1
    fi

    # Validate weight range
    local weight_check
    weight_check=$(jq -n --argjson w "$WEIGHT_KG" 'if $w < 0.5 or $w > 500 then "out_of_range" else "ok" end')
    if [[ "$weight_check" == '"out_of_range"' ]]; then
        json_error "invalid_input" "Weight must be 0.5-500 kg, got: $WEIGHT_KG"
        exit 1
    fi

    # Validate dose > 0
    local dose_check
    dose_check=$(jq -n --argjson d "$DOSE_PER_KG" 'if $d <= 0 then "invalid" else "ok" end')
    if [[ "$dose_check" == '"invalid"' ]]; then
        json_error "invalid_input" "--dose-per-kg must be > 0, got: $DOSE_PER_KG"
        exit 1
    fi

    # Calculate
    local total warning
    total=$(jq -n --argjson w "$WEIGHT_KG" --argjson d "$DOSE_PER_KG" '$w * $d')

    # Flag if total_dose > 2x what a 70 kg adult would get (weight > 140 kg is uncommon
    # enough to warrant a "verify your weight source" check before acting)
    local avg_adult_dose extreme_check
    avg_adult_dose=$(jq -n --argjson d "$DOSE_PER_KG" '$d * 70')
    extreme_check=$(jq -n --argjson t "$total" --argjson a "$avg_adult_dose" 'if $t > ($a * 2) then "extreme" else "ok" end')

    if [[ "$extreme_check" == '"extreme"' ]]; then
        warning="extreme dose: total $total $UNIT exceeds 2x expected adult dose ($(jq -n --argjson a "$avg_adult_dose" '$a') $UNIT for 70 kg) — verify weight source and order"
        jq -n \
            --arg calculator "dose" \
            --argjson weight_kg "$WEIGHT_KG" \
            --argjson dose_per_kg "$DOSE_PER_KG" \
            --argjson total_dose "$total" \
            --arg unit "$UNIT" \
            --arg warning "$warning" \
            '{
                status: "ok",
                calculator: $calculator,
                weight_kg: $weight_kg,
                dose_per_kg: $dose_per_kg,
                total_dose: $total_dose,
                unit: $unit,
                warning: $warning
            }'
    else
        jq -n \
            --arg calculator "dose" \
            --argjson weight_kg "$WEIGHT_KG" \
            --argjson dose_per_kg "$DOSE_PER_KG" \
            --argjson total_dose "$total" \
            --arg unit "$UNIT" \
            '{
                status: "ok",
                calculator: $calculator,
                weight_kg: $weight_kg,
                dose_per_kg: $dose_per_kg,
                total_dose: $total_dose,
                unit: $unit
            }'
    fi
}

# ---------------------------------------------------------------------------
# drip subcommand
# ---------------------------------------------------------------------------

cmd_drip() {
    local DOSE="" DOSE_UNIT="" CONCENTRATION="" CONC_UNIT="" WEIGHT_KG=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                echo "$USAGE"
                exit 0
                ;;
            --dose)
                DOSE="${2:-}"
                shift 2
                ;;
            --dose-unit)
                DOSE_UNIT="${2:-}"
                shift 2
                ;;
            --concentration)
                CONCENTRATION="${2:-}"
                shift 2
                ;;
            --conc-unit)
                CONC_UNIT="${2:-}"
                shift 2
                ;;
            --weight-kg)
                WEIGHT_KG="${2:-}"
                shift 2
                ;;
            *)
                json_error "invalid_input" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Require mandatory args
    if [[ -z "$DOSE" || -z "$DOSE_UNIT" || -z "$CONCENTRATION" || -z "$CONC_UNIT" ]]; then
        json_error "missing_args" "Required: --dose, --dose-unit, --concentration, --conc-unit"
        exit 1
    fi

    # Validate numeric
    if ! is_number "$DOSE"; then
        json_error "invalid_input" "--dose must be a number, got: $DOSE"
        exit 1
    fi
    if ! is_number "$CONCENTRATION"; then
        json_error "invalid_input" "--concentration must be a number, got: $CONCENTRATION"
        exit 1
    fi

    # Validate > 0
    local dose_check
    dose_check=$(jq -n --argjson d "$DOSE" 'if $d <= 0 then "invalid" else "ok" end')
    if [[ "$dose_check" == '"invalid"' ]]; then
        json_error "invalid_input" "--dose must be > 0, got: $DOSE"
        exit 1
    fi

    local conc_check
    conc_check=$(jq -n --argjson c "$CONCENTRATION" 'if $c <= 0 then "invalid" else "ok" end')
    if [[ "$conc_check" == '"invalid"' ]]; then
        json_error "invalid_input" "--concentration must be > 0, got: $CONCENTRATION"
        exit 1
    fi

    # --- Parse dose_unit for time component, weight component, mass unit ---
    local time_factor=1 weight_factor=1 formula_desc=""
    local is_weight_based=false

    # Time factor: /min → *60 to get per-hour; /hr → *1
    if echo "$DOSE_UNIT" | grep -qi '/min'; then
        time_factor=60
    elif echo "$DOSE_UNIT" | grep -qi '/hr\|/hour'; then
        time_factor=1
    else
        json_error "invalid_input" "dose-unit must contain /hr or /min, got: $DOSE_UNIT"
        exit 1
    fi

    # Weight component: /kg means weight-based dosing
    if echo "$DOSE_UNIT" | grep -qi '/kg'; then
        is_weight_based=true
        if [[ -z "$WEIGHT_KG" ]]; then
            json_error "missing_args" "Weight-based dose unit ($DOSE_UNIT) requires --weight-kg"
            exit 1
        fi
        if ! is_number "$WEIGHT_KG"; then
            json_error "invalid_input" "--weight-kg must be a number, got: $WEIGHT_KG"
            exit 1
        fi
        local weight_range_check
        weight_range_check=$(jq -n --argjson w "$WEIGHT_KG" 'if $w < 0.5 or $w > 500 then "out_of_range" else "ok" end')
        if [[ "$weight_range_check" == '"out_of_range"' ]]; then
            json_error "invalid_input" "Weight must be 0.5-500 kg, got: $WEIGHT_KG"
            exit 1
        fi
    fi

    # Validate optional weight even when not /kg
    if [[ -n "$WEIGHT_KG" ]] && [[ "$is_weight_based" == "false" ]]; then
        if ! is_number "$WEIGHT_KG"; then
            json_error "invalid_input" "--weight-kg must be a number, got: $WEIGHT_KG"
            exit 1
        fi
        local weight_range_check2
        weight_range_check2=$(jq -n --argjson w "$WEIGHT_KG" 'if $w < 0.5 or $w > 500 then "out_of_range" else "ok" end')
        if [[ "$weight_range_check2" == '"out_of_range"' ]]; then
            json_error "invalid_input" "Weight must be 0.5-500 kg, got: $WEIGHT_KG"
            exit 1
        fi
    fi

    # Concentration must be expressed per mL because output is mL/hr.
    if ! echo "$CONC_UNIT" | grep -qi '/mL$'; then
        json_error "invalid_input" "conc-unit must be expressed per mL, got: $CONC_UNIT"
        exit 1
    fi

    # --- Mass unit conversion factor between dose and concentration ---
    # Extract leading unit token from dose_unit and conc_unit
    local dose_mass="" conc_mass="" unit_factor=1

    dose_mass=$(echo "$DOSE_UNIT" | grep -oiE '^(mcg|mg|g|units)' | tr '[:upper:]' '[:lower:]')
    conc_mass=$(echo "$CONC_UNIT" | grep -oiE '^(mcg|mg|g|units)' | tr '[:upper:]' '[:lower:]')

    if [[ -z "$dose_mass" || -z "$conc_mass" ]]; then
        json_error "invalid_input" "dose-unit and conc-unit must start with mcg, mg, g, or units"
        exit 1
    fi

    if [[ "$dose_mass" == "units" || "$conc_mass" == "units" ]]; then
        if [[ "$dose_mass" != "$conc_mass" ]]; then
            json_error "invalid_input" "dose-unit and conc-unit must use compatible dimensions, got: $DOSE_UNIT and $CONC_UNIT"
            exit 1
        fi
        unit_factor=1
    else
        local dose_scale conc_scale
        dose_scale=$(mass_unit_scale "$dose_mass") || {
            json_error "invalid_input" "Unsupported dose-unit mass prefix: $DOSE_UNIT"
            exit 1
        }
        conc_scale=$(mass_unit_scale "$conc_mass") || {
            json_error "invalid_input" "Unsupported conc-unit mass prefix: $CONC_UNIT"
            exit 1
        }
        unit_factor=$(jq -n --argjson d "$dose_scale" --argjson c "$conc_scale" '$d / $c')
    fi

    # --- Calculate rate ---
    # Formula: rate_mL_hr = dose * unit_factor * time_factor * weight_factor / concentration
    # where weight_factor = weight_kg if weight-based, else 1
    local rate
    if [[ "$is_weight_based" == "true" ]]; then
        rate=$(jq -n --argjson d "$DOSE" --argjson uf "$unit_factor" --argjson tf "$time_factor" \
            --argjson w "$WEIGHT_KG" --argjson c "$CONCENTRATION" \
            '$d * $uf * $tf * $w / $c')
        formula_desc="dose * $unit_factor * $time_factor * weight / concentration"
    else
        rate=$(jq -n --argjson d "$DOSE" --argjson uf "$unit_factor" --argjson tf "$time_factor" \
            --argjson c "$CONCENTRATION" \
            '$d * $uf * $tf / $c')
        formula_desc="dose * $unit_factor * $time_factor / concentration"
    fi

    # --- Build output ---
    if [[ -n "$WEIGHT_KG" ]]; then
        jq -n \
            --arg calculator "drip_rate" \
            --argjson dose "$DOSE" \
            --arg dose_unit "$DOSE_UNIT" \
            --argjson concentration "$CONCENTRATION" \
            --arg conc_unit "$CONC_UNIT" \
            --argjson weight_kg "$WEIGHT_KG" \
            --argjson rate_ml_hr "$rate" \
            --arg formula_used "$formula_desc" \
            '{
                status: "ok",
                calculator: $calculator,
                dose: $dose,
                dose_unit: $dose_unit,
                concentration: $concentration,
                conc_unit: $conc_unit,
                weight_kg: $weight_kg,
                rate_ml_hr: $rate_ml_hr,
                formula_used: $formula_used
            }'
    else
        jq -n \
            --arg calculator "drip_rate" \
            --argjson dose "$DOSE" \
            --arg dose_unit "$DOSE_UNIT" \
            --argjson concentration "$CONCENTRATION" \
            --arg conc_unit "$CONC_UNIT" \
            --argjson rate_ml_hr "$rate" \
            --arg formula_used "$formula_desc" \
            '{
                status: "ok",
                calculator: $calculator,
                dose: $dose,
                dose_unit: $dose_unit,
                concentration: $concentration,
                conc_unit: $conc_unit,
                rate_ml_hr: $rate_ml_hr,
                formula_used: $formula_used
            }'
    fi
}

# ---------------------------------------------------------------------------
# unit subcommand
# ---------------------------------------------------------------------------

cmd_unit() {
    local VALUE="" FROM="" TO=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help)
                echo "$USAGE"
                exit 0
                ;;
            --value)
                VALUE="${2:-}"
                shift 2
                ;;
            --from)
                FROM="${2:-}"
                shift 2
                ;;
            --to)
                TO="${2:-}"
                shift 2
                ;;
            *)
                json_error "invalid_input" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Require all args
    if [[ -z "$VALUE" || -z "$FROM" || -z "$TO" ]]; then
        json_error "missing_args" "Required: --value, --from, --to"
        exit 1
    fi

    # Validate numeric
    if ! is_number "$VALUE"; then
        json_error "invalid_input" "--value must be a number, got: $VALUE"
        exit 1
    fi

    # Normalize conversion key
    local key="${FROM}__${TO}"
    local result

    case "$key" in
        # Weight: kg <-> lbs
        kg__lbs)
            result=$(jq -n --argjson v "$VALUE" '$v * 2.20462')
            ;;
        lbs__kg)
            result=$(jq -n --argjson v "$VALUE" '$v / 2.20462')
            ;;
        # Weight: g <-> mg
        g__mg)
            result=$(jq -n --argjson v "$VALUE" '$v * 1000')
            ;;
        mg__g)
            result=$(jq -n --argjson v "$VALUE" '$v / 1000')
            ;;
        # Weight: mg <-> mcg
        mg__mcg)
            result=$(jq -n --argjson v "$VALUE" '$v * 1000')
            ;;
        mcg__mg)
            result=$(jq -n --argjson v "$VALUE" '$v / 1000')
            ;;
        # Volume: L <-> mL
        L__mL)
            result=$(jq -n --argjson v "$VALUE" '$v * 1000')
            ;;
        mL__L)
            result=$(jq -n --argjson v "$VALUE" '$v / 1000')
            ;;
        # Volume: mL <-> cc (1:1)
        mL__cc)
            result=$(jq -n --argjson v "$VALUE" '$v')
            ;;
        cc__mL)
            result=$(jq -n --argjson v "$VALUE" '$v')
            ;;
        # Temperature: F <-> C
        F__C)
            result=$(jq -n --argjson v "$VALUE" '($v - 32) * 5 / 9')
            ;;
        C__F)
            result=$(jq -n --argjson v "$VALUE" '$v * 9 / 5 + 32')
            ;;
        # Length: in <-> cm
        in__cm)
            result=$(jq -n --argjson v "$VALUE" '$v * 2.54')
            ;;
        cm__in)
            result=$(jq -n --argjson v "$VALUE" '$v / 2.54')
            ;;
        *)
            json_error "unsupported_conversion" "Unsupported conversion: $FROM -> $TO. Supported: kg<->lbs, g<->mg, mg<->mcg, L<->mL, mL<->cc, F<->C, in<->cm"
            exit 1
            ;;
    esac

    jq -n \
        --arg calculator "unit" \
        --argjson value "$VALUE" \
        --arg from_unit "$FROM" \
        --arg to_unit "$TO" \
        --argjson result "$result" \
        '{
            status: "ok",
            calculator: $calculator,
            value: $value,
            from_unit: $from_unit,
            to_unit: $to_unit,
            result: $result
        }'
}

# ---------------------------------------------------------------------------
# Dispatch to subcommand
# ---------------------------------------------------------------------------

case "$SUBCMD" in
    dose) cmd_dose "$@" ;;
    drip) cmd_drip "$@" ;;
    unit) cmd_unit "$@" ;;
esac
