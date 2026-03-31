#!/usr/bin/env bash
# Tier 1 calculator plausibility check — belt-and-suspenders
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
echo "$COMMAND" | grep -q 'clinical-calculators/' || exit 0

OUTPUT=$(get_tool_stdout "$INPUT") || exit 0
[ -z "$OUTPUT" ] && exit 0

STATUS=$(json_field "$OUTPUT" '.status // empty') || exit 0
[ "$STATUS" != "ok" ] && exit 0

CALCULATOR=$(json_field "$OUTPUT" '.calculator // empty') || exit 0
SCORE=$(json_field "$OUTPUT" '.score // empty') || exit 0

[ -z "$CALCULATOR" ] || [ -z "$SCORE" ] && exit 0

IN_RANGE=0
case "$CALCULATOR" in
  gcs)       score_in_range "$SCORE" 3 15 && IN_RANGE=1 ;;
  nihss)     score_in_range "$SCORE" 0 42 && IN_RANGE=1 ;;
  apache2)   score_in_range "$SCORE" 0 71 && IN_RANGE=1 ;;
  wells_pe)  score_in_range "$SCORE" 0 12.5 && IN_RANGE=1 ;;
  wells_dvt) score_in_range "$SCORE" -2 9 && IN_RANGE=1 ;;
  curb65)    score_in_range "$SCORE" 0 5 && IN_RANGE=1 ;;
  braden)    score_in_range "$SCORE" 6 23 && IN_RANGE=1 ;;
  rass)      score_in_range "$SCORE" -5 4 && IN_RANGE=1 ;;
  cpot)      score_in_range "$SCORE" 0 8 && IN_RANGE=1 ;;
  *)         exit 0 ;;
esac

[ "$IN_RANGE" -eq 1 ] && exit 0

emit_posttool_block \
  "[Safety] Calculator $CALCULATOR returned score $SCORE outside the expected range. Verify the tool output before presenting it." \
  "[Safety] Calculator $CALCULATOR produced an out-of-range score ($SCORE). Do not use that result in the clinical response."
