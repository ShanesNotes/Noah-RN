#!/usr/bin/env bash
# Tier 1 negation integrity — flag critical negation phrases in clinical output
# Action: FLAG with [Safety] message — never block
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

OUTPUT=$(get_tool_stdout "$INPUT") || exit 0
[ -z "$OUTPUT" ] && exit 0

FINDINGS=""

# DNR / full code status
if echo "$OUTPUT" | grep -qiP '\b(do\s+not\s+resuscitate|DNR|full\s+code)\b'; then
  FINDINGS="${FINDINGS}Code status language detected (DNR/full code) — verify matches current order. "
fi

# Allergy negation
if echo "$OUTPUT" | grep -qiP '\b(no\s+known\s+allergies|NKA|NKDA)\b'; then
  FINDINGS="${FINDINGS}Allergy negation detected (NKA/NKDA) — confirm against allergy band and chart. "
fi

# Hold medication
if echo "$OUTPUT" | grep -qiP '\b(hold\s+medication|hold\s+[a-z]+)\b'; then
  FINDINGS="${FINDINGS}Medication hold detected — verify active hold order and reason. "
fi

# NPO status
if echo "$OUTPUT" | grep -qiP '\b(NPO|nothing\s+by\s+mouth)\b'; then
  FINDINGS="${FINDINGS}NPO status detected — confirm current diet order. "
fi

# DNI
if echo "$OUTPUT" | grep -qiP '\b(do\s+not\s+intubate|DNI)\b'; then
  FINDINGS="${FINDINGS}DNI status detected — verify matches current advance directive. "
fi

# Comfort care
if echo "$OUTPUT" | grep -qiP '\b(comfort\s+care|comfort\s+measures\s+only)\b'; then
  FINDINGS="${FINDINGS}Comfort care language detected — verify goals of care documentation. "
fi

[ -z "$FINDINGS" ] && exit 0

emit_posttool_context "[Safety] Negation integrity: ${FINDINGS}"

exit 0
