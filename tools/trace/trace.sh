#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
TRACES_DIR="${TRACE_BASE_DIR:-$REPO_ROOT/evals/product/traces}"

cmd="${1:-}"

case "$cmd" in
    init)
        skill="${2:-}"
        if [[ -z "$skill" ]]; then
            echo '{"status":"error","error":"missing_skill","message":"Usage: trace.sh init <skill-name>"}' >&2
            exit 1
        fi
        date_part="$(date -u '+%Y%m%dT%H%M%S')"
        hex_part="$(od -An -N2 -tx1 /dev/urandom | tr -d ' \n' | head -c 4)"
        case_id="${skill}-${date_part}-${hex_part}"
        case_dir="$TRACES_DIR/$case_id"
        mkdir -p "$case_dir"
        start_ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        printf '{"skill":"%s","start":"%s"}' "$skill" "$start_ts" > "$case_dir/.meta"
        echo "$case_id"
        ;;

    input)
        case_id="${2:-}"
        if [[ -z "$case_id" ]]; then
            echo '{"status":"error","error":"missing_case_id","message":"Usage: trace.sh input <case-id> [json]"}' >&2
            exit 1
        fi
        case_dir="$TRACES_DIR/$case_id"
        if [[ ! -d "$case_dir" ]]; then
            echo '{"status":"error","error":"case_not_found","message":"Case directory not found"}' >&2
            exit 1
        fi
        if [[ $# -ge 3 ]]; then
            json_input="$3"
        else
            json_input="$(cat)"
        fi
        skill="$(jq -r '.skill' "$case_dir/.meta")"
        ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        context_json="$(echo "$json_input" | jq '.')"
        jq -n --arg skill "$skill" --arg ts "$ts" --argjson ctx "$context_json" \
            '{"skill":$skill,"timestamp":$ts,"context":$ctx}' \
            > "$case_dir/input-context.json"
        ;;

    output)
        case_id="${2:-}"
        if [[ -z "$case_id" ]]; then
            echo '{"status":"error","error":"missing_case_id","message":"Usage: trace.sh output <case-id>"}' >&2
            exit 1
        fi
        case_dir="$TRACES_DIR/$case_id"
        if [[ ! -d "$case_dir" ]]; then
            echo '{"status":"error","error":"case_not_found","message":"Case directory not found"}' >&2
            exit 1
        fi
        cat > "$case_dir/skill-output.txt"
        ;;

    hooks)
        case_id="${2:-}"
        if [[ -z "$case_id" ]]; then
            echo '{"status":"error","error":"missing_case_id","message":"Usage: trace.sh hooks <case-id> [json]"}' >&2
            exit 1
        fi
        case_dir="$TRACES_DIR/$case_id"
        if [[ ! -d "$case_dir" ]]; then
            echo '{"status":"error","error":"case_not_found","message":"Case directory not found"}' >&2
            exit 1
        fi
        if [[ $# -ge 3 ]]; then
            json_input="$3"
        else
            json_input="$(cat)"
        fi
        if ! echo "$json_input" | jq . >/dev/null 2>&1; then
            echo '{"status":"error","error":"invalid_json","message":"hook-results must be valid JSON"}' >&2
            exit 1
        fi
        echo "$json_input" | jq '.' > "$case_dir/hook-results.json"
        ;;

    done)
        case_id="${2:-}"
        if [[ -z "$case_id" ]]; then
            echo '{"status":"error","error":"missing_case_id","message":"Usage: trace.sh done <case-id>"}' >&2
            exit 1
        fi
        case_dir="$TRACES_DIR/$case_id"
        if [[ ! -d "$case_dir" || ! -f "$case_dir/.meta" ]]; then
            echo '{"status":"error","error":"case_not_found","message":"Case not initialized"}' >&2
            exit 1
        fi
        skill="$(jq -r '.skill' "$case_dir/.meta")"
        start_ts="$(jq -r '.start' "$case_dir/.meta")"
        end_ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        start_epoch="$(date -u -d "$start_ts" '+%s%3N' 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$start_ts" '+%s000' 2>/dev/null || echo 0)"
        end_epoch="$(date -u '+%s%3N' 2>/dev/null || date -u '+%s000' 2>/dev/null || echo 0)"
        duration_ms=$(( end_epoch - start_epoch ))
        jq -n \
            --arg skill "$skill" \
            --arg start "$start_ts" \
            --arg end_ts "$end_ts" \
            --argjson dur "$duration_ms" \
            '{"skill":$skill,"start":$start,"end":$end_ts,"duration_ms":$dur,"stages":{}}' \
            > "$case_dir/timing.json"
        echo "trace complete: $case_id (${duration_ms}ms)"
        ;;

    *)
        echo '{"status":"error","error":"unknown_command","message":"Usage: trace.sh <init|input|output|hooks|done>"}' >&2
        exit 1
        ;;
esac
