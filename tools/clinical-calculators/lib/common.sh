#!/usr/bin/env bash
# Noah RN — Clinical Calculators shared helper library
# Source this file from sibling calculator scripts, do not execute directly.

# json_result — Build a success JSON payload.
# Usage: json_result "calculator_name" key1=val1 key2=val2 ...
# The first argument is the calculator name; remaining arguments are jq --argjson
# or --arg pairs expressed as "key=value".  Values that look like integers are
# passed with --argjson so they remain numbers in the output; everything else is
# passed with --arg (strings).
#
# Callers that need structured sub-objects (components, etc.) should pipe the
# output of this function through a second jq call, or build the JSON directly
# with jq -n inside the calculator and use json_result only for flat fields.
# For GCS and similar calculators we expose json_result_raw for full control.

json_error() {
    local error_type="$1"
    local message="$2"
    jq -n \
        --arg error_type "$error_type" \
        --arg message "$message" \
        '{"status":"error","error":$error_type,"message":$message}'
}

# validate_range — Assert that $value is an integer in [$min, $max].
# Prints an error JSON to stdout and returns 1 on failure.
# Usage: validate_range "label" "$value" min max || exit 1
validate_range() {
    local label="$1"
    local value="$2"
    local min="$3"
    local max="$4"

    if ! [[ "$value" =~ ^-?[0-9]+$ ]]; then
        json_error "invalid_input" "${label} must be an integer, got: ${value}"
        return 1
    fi

    if (( value < min || value > max )); then
        json_error "invalid_input" "${label} score must be ${min}-${max}, got: ${value}"
        return 1
    fi

    return 0
}

# usage_exit — Print usage text and exit 0.
# Usage: usage_exit "usage text here"
usage_exit() {
    echo "$1"
    exit 0
}
