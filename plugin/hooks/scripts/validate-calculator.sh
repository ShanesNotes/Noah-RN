#!/usr/bin/env bash
# Tier 1 calculator plausibility check — belt-and-suspenders
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
echo "$COMMAND" | grep -q 'clinical-calculators/' || exit 0

OUTPUT=$(echo "$INPUT" | jq -r '.tool_result // empty' 2>/dev/null) || exit 0
[ -z "$OUTPUT" ] && exit 0

STATUS=$(echo "$OUTPUT" | jq -r '.status // empty' 2>/dev/null) || exit 0
[ "$STATUS" != "ok" ] && exit 0

CALCULATOR=$(echo "$OUTPUT" | jq -r '.calculator // empty' 2>/dev/null) || exit 0
SCORE=$(echo "$OUTPUT" | jq -r '.score // empty' 2>/dev/null) || exit 0

[ -z "$CALCULATOR" ] || [ -z "$SCORE" ] && exit 0

IN_RANGE=0
case "$CALCULATOR" in
  gcs)       [ "$SCORE" -ge 3  ] && [ "$SCORE" -le 15 ] && IN_RANGE=1 ;;
  nihss)     [ "$SCORE" -ge 0  ] && [ "$SCORE" -le 42 ] && IN_RANGE=1 ;;
  apache2)   [ "$SCORE" -ge 0  ] && [ "$SCORE" -le 71 ] && IN_RANGE=1 ;;
  wells_pe)  [ "$SCORE" -ge 0  ] && [ "$SCORE" -le 12 ] && IN_RANGE=1 ;;
  wells_dvt) [ "$SCORE" -ge -2 ] && [ "$SCORE" -le 9  ] && IN_RANGE=1 ;;
  curb65)    [ "$SCORE" -ge 0  ] && [ "$SCORE" -le 5  ] && IN_RANGE=1 ;;
  braden)    [ "$SCORE" -ge 6  ] && [ "$SCORE" -le 23 ] && IN_RANGE=1 ;;
  rass)      [ "$SCORE" -ge -5 ] && [ "$SCORE" -le 4  ] && IN_RANGE=1 ;;
  cpot)      [ "$SCORE" -ge 0  ] && [ "$SCORE" -le 8  ] && IN_RANGE=1 ;;
  *)         exit 0 ;;
esac

[ "$IN_RANGE" -eq 1 ] && exit 0

jq -n --arg calc "$CALCULATOR" --arg score "$SCORE" \
  '{"systemMessage": ("[Safety] Calculator \($calc) returned score \($score) which is outside expected range. Verify tool output before presenting to user.")}'
