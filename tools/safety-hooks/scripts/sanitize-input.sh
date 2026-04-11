#!/usr/bin/env bash
# Tier 1 input sanitization — deterministic, no model dependency
# Detects prompt injection patterns before input reaches skills
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

INPUT=$(cat)
USER_TEXT=$(get_user_prompt "$INPUT") || exit 0

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

NORMALIZED_TEXT=$(printf '%s' "$USER_TEXT" | normalize_text)

for pattern in "${INJECTION_PATTERNS[@]}"; do
  if printf '%s' "$NORMALIZED_TEXT" | grep -qF "$pattern"; then
    emit_prompt_block "[Safety] Prompt injection attempt detected: '$pattern'. Rephrase the clinical request without instruction override language."
    exit 0
  fi
done

exit 0
