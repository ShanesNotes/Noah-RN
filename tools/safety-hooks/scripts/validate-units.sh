#!/usr/bin/env bash
# Tier 1 unit verification — detect mg/mcg, mL/L, kg/lbs mismatches
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

OUTPUT=$(get_tool_stdout "$INPUT") || exit 0
[ -z "$OUTPUT" ] && exit 0

WARNINGS=""

# mg vs mcg — 1000x difference
if echo "$OUTPUT" | grep -qiP '\b\d+\s*mcg\b' && echo "$OUTPUT" | grep -qiP '\b\d+\s*mg\b'; then
  WARNINGS="${WARNINGS}Output contains both mg and mcg values — verify units are correct. "
fi

# mL vs L — 1000x difference
if echo "$OUTPUT" | grep -qiP '\b\d+\s*mL\b' && echo "$OUTPUT" | grep -qiP '\b[0-9.]+\s*L\b'; then
  WARNINGS="${WARNINGS}Output contains both mL and L values — verify unit consistency. "
fi

# kg vs lbs — 2.2x difference
if echo "$OUTPUT" | grep -qiP '\b\d+\s*kg\b' && echo "$OUTPUT" | grep -qiP '\b\d+\s*lbs?\b'; then
  WARNINGS="${WARNINGS}Output contains both kg and lbs — verify weight unit used for calculations. "
fi

[ -z "$WARNINGS" ] && exit 0

emit_posttool_block \
  "[Safety] Unit check failed. ${WARNINGS}" \
  "[Safety] Potential unit mismatch in tool output. ${WARNINGS}"

exit 0
