#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
TRACES_DIR="${TRACE_BASE_DIR:-$REPO_ROOT/evals/product/traces}"

cmd="${1:-}"

require_case_dir() {
    local case_id="$1"
    local case_dir="$TRACES_DIR/$case_id"
    if [[ -z "$case_id" ]]; then
        echo '{"status":"error","error":"missing_case_id","message":"case id is required"}' >&2
        exit 1
    fi
    if [[ ! -d "$case_dir" ]]; then
        echo '{"status":"error","error":"case_not_found","message":"Case directory not found"}' >&2
        exit 1
    fi
    printf '%s\n' "$case_dir"
}

read_json_arg_or_stdin() {
    if [[ $# -ge 1 ]]; then
        printf '%s' "$1"
    else
        cat
    fi
}

write_stage_json() {
    local case_id="$1"
    local filename="$2"
    local json_input="$3"
    local case_dir
    case_dir="$(require_case_dir "$case_id")"
    if ! echo "$json_input" | jq . >/dev/null 2>&1; then
        echo '{"status":"error","error":"invalid_json","message":"payload must be valid JSON"}' >&2
        exit 1
    fi
    echo "$json_input" | jq '.' > "$case_dir/$filename"
}

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
        case_dir="$(require_case_dir "$case_id")"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        skill="$(jq -r '.skill' "$case_dir/.meta")"
        ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        context_json="$(echo "$json_input" | jq '.')"
        jq -n --arg skill "$skill" --arg ts "$ts" --argjson ctx "$context_json" \
            '{"skill":$skill,"timestamp":$ts,"context":$ctx}' \
            > "$case_dir/input-context.json"
        ;;

    output)
        case_id="${2:-}"
        case_dir="$(require_case_dir "$case_id")"
        if [[ $# -ge 3 ]]; then
            printf '%s' "$3" > "$case_dir/skill-output.txt"
        else
            cat > "$case_dir/skill-output.txt"
        fi
        ;;

    hooks)
        case_id="${2:-}"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        write_stage_json "$case_id" "hook-results.json" "$json_input"
        ;;

    tokens)
        case_id="${2:-}"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        write_stage_json "$case_id" "token-spend.json" "$json_input"
        ;;

    routing)
        case_id="${2:-}"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        write_stage_json "$case_id" "routing-decision.json" "$json_input"
        ;;

    context)
        case_id="${2:-}"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        write_stage_json "$case_id" "context-assembly.json" "$json_input"
        ;;

    safety)
        case_id="${2:-}"
        json_input="$(read_json_arg_or_stdin "${3:-}")"
        case_dir="$(require_case_dir "$case_id")"
        safety_file="$case_dir/safety-gates.json"
        if [[ -f "$safety_file" ]]; then
            jq -s '.[0] + [.[1]]' "$safety_file" <(echo "$json_input" | jq '.') > "$safety_file.tmp"
            mv "$safety_file.tmp" "$safety_file"
        else
            echo "$json_input" | jq '[.]' > "$safety_file"
        fi
        ;;

    envelope)
        case_id="${2:-}"
        case_dir="$(require_case_dir "$case_id")"
        if [[ ! -f "$case_dir/.meta" ]]; then
            echo '{"status":"error","error":"missing_meta","message":"Case metadata missing"}' >&2
            exit 1
        fi
        skill="$(jq -r '.skill' "$case_dir/.meta")"
        start_ts="$(jq -r '.start' "$case_dir/.meta")"
        timing_file="$case_dir/timing.json"
        input_file="$case_dir/input-context.json"
        routing_file="$case_dir/routing-decision.json"
        context_file="$case_dir/context-assembly.json"
        safety_file="$case_dir/safety-gates.json"
        tokens_file="$case_dir/token-spend.json"
        hooks_file="$case_dir/hook-results.json"
        eval_scores_file="$case_dir/eval-scores.json"

        jq -n \
            --arg trace_id "$case_id" \
            --arg skill "$skill" \
            --arg timestamp "$start_ts" \
            --arg candidate_id "${TRACE_CANDIDATE_ID:-${CANDIDATE_ID:-}}" \
            --argjson input_payload "$(if [[ -f "$input_file" ]]; then jq '.' "$input_file"; else echo 'null'; fi)" \
            --argjson timing_payload "$(if [[ -f "$timing_file" ]]; then jq '.' "$timing_file"; else echo '{"duration_ms":0,"stages":{}}'; fi)" \
            --argjson routing_payload "$(if [[ -f "$routing_file" ]]; then jq '.' "$routing_file"; else echo '{"input_classification":"unknown","candidates_considered":[],"selected_workflow":"unknown","confidence":0,"rationale":"not recorded"}'; fi)" \
            --argjson context_payload "$(if [[ -f "$context_file" ]]; then jq '.' "$context_file"; else echo '{"patient_bundle_tokens":0,"knowledge_assets_selected":[],"compression_strategy":"unknown","gap_markers":[],"fhir_queries_fired":0}'; fi)" \
            --argjson safety_payload "$(if [[ -f "$safety_file" ]]; then jq '.' "$safety_file"; else echo '[]'; fi)" \
            --argjson token_payload "$(if [[ -f "$tokens_file" ]]; then jq '.' "$tokens_file"; else echo '{"input_tokens":0,"output_tokens":0,"cache_read_tokens":0,"cache_write_tokens":0,"context_ratio":0,"categories":{}}'; fi)" \
            --argjson hook_payload "$(if [[ -f "$hooks_file" ]]; then jq '.' "$hooks_file"; else echo '{}'; fi)" \
            --argjson eval_payload "$(if [[ -f "$eval_scores_file" ]]; then jq '.' "$eval_scores_file"; else echo 'null'; fi)" \
            '
            {
              trace_id: $trace_id,
              skill: $skill,
              candidate_id: (if $candidate_id == "" then null else $candidate_id end),
              timestamp: $timestamp,
              tags: {
                phi_risk: ($input_payload.context.phi_risk // "de-identified"),
                token_spend: $token_payload,
                latency: {
                  total_ms: ($timing_payload.duration_ms // 0),
                  stages: ($timing_payload.stages // {})
                },
                clinical_safety: {
                  status: (
                    if (($safety_payload | map(select(.result == "fail")) | length) > 0) then "fail"
                    elif (($safety_payload | map(select(.result == "warn")) | length) > 0) then "warn"
                    else "pass"
                    end
                  ),
                  veto_triggered: ($hook_payload.veto_triggered // false),
                  warnings: ($safety_payload | map(select(.result == "warn") | .detail))
                },
                user_action: ($input_payload.context.raw_input // null),
                downstream_system: ($hook_payload.downstream_system // "medplum")
              },
              context_assembly: $context_payload,
              routing_decision: $routing_payload,
              safety_gates: $safety_payload,
              eval_scores: $eval_payload,
              raw: {
                input: $input_payload,
                hooks: $hook_payload
              }
            }' > "$case_dir/trace-envelope.json"
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
        echo '{"status":"error","error":"unknown_command","message":"Usage: trace.sh <init|input|output|hooks|tokens|routing|context|safety|envelope|done>"}' >&2
        exit 1
        ;;
esac
