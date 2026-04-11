#!/usr/bin/env bash

get_user_prompt() {
    local input="$1"
    jq -r '.prompt // .user_prompt // empty' 2>/dev/null <<<"$input"
}

get_tool_stdout() {
    local input="$1"
    jq -r '
        if has("tool_response") then
            if (.tool_response | type) == "object" then
                .tool_response.stdout // .tool_response.output // .tool_response.result // .tool_response.message // ""
            elif (.tool_response | type) == "string" then
                .tool_response
            else
                ""
            end
        else
            .tool_result // ""
        end
    ' 2>/dev/null <<<"$input"
}

json_field() {
    local payload="$1"
    local query="$2"

    jq -r "$query" 2>/dev/null <<<"$payload"
}

normalize_text() {
    tr '[:upper:]' '[:lower:]' |
        tr '\r\n\t' '   ' |
        sed -E 's/[^a-z0-9]+/ /g; s/[[:space:]]+/ /g; s/^ //; s/ $//'
}

emit_prompt_block() {
    local reason="$1"
    jq -n --arg reason "$reason" '{decision: "block", reason: $reason}'
}

emit_posttool_block() {
    local reason="$1"
    local context="${2:-$1}"
    jq -n \
        --arg reason "$reason" \
        --arg context "$context" \
        '{
            decision: "block",
            reason: $reason,
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: $context
            }
        }'
}

emit_posttool_context() {
    local message="$1"
    jq -n \
        --arg message "$message" \
        '{
            systemMessage: $message,
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: $message
            }
        }'
}

score_in_range() {
    local score="$1"
    local min="$2"
    local max="$3"

    awk -v score="$score" -v min="$min" -v max="$max" 'BEGIN { exit !(score + 0 >= min && score + 0 <= max) }'
}
