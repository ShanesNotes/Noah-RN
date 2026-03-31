#!/usr/bin/env bash
# Tier 1 input sanitization — deterministic, no model dependency
# Detects prompt injection patterns before input reaches skills
set -euo pipefail

INPUT=$(cat)
USER_TEXT=$(echo "$INPUT" | jq -r '.user_prompt // empty' 2>/dev/null) || exit 0

[ -z "$USER_TEXT" ] && exit 0

INJECTION_PATTERNS=(
  'ignore previous instructions'
  'ignore all previous'
  'disregard your instructions'
  'you are now'
  'pretend you are'
  'act as if you'
  'forget your rules'
  'override your'
  'system prompt'
  'reveal your instructions'
  'what are your instructions'
  'ignore safety'
  'bypass safety'
  'ignore the disclaimer'
  'skip the disclaimer'
  'do not include disclaimer'
  'remove the safety'
)

LOWER_TEXT=$(echo "$USER_TEXT" | tr '[:upper:]' '[:lower:]')

for pattern in "${INJECTION_PATTERNS[@]}"; do
  if echo "$LOWER_TEXT" | grep -qiF "$pattern"; then
    jq -n --arg msg "[Safety] Input contains pattern resembling prompt injection: '$pattern'. Proceeding with standard safety protocols." \
      '{"systemMessage": $msg}'
    exit 0
  fi
done

exit 0
