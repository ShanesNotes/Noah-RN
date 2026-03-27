#!/usr/bin/env bash
# Noah RN — Clinical Calculators shared helper library
# Source this file from sibling calculator scripts, do not execute directly.

# json_result — Build success JSON from key=value jq args.
# Caller passes --arg/--argjson pairs and a jq expression.
# Usage: json_result --arg category "$CAT" '{ status: "ok", category: $category }'
json_result() {
    local expr="${@: -1}"
    local args=("${@:1:$#-1}")
    jq -n "${args[@]}" "$expr"
}

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
