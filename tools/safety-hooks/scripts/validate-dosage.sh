#!/usr/bin/env bash
# Tier 1 dosage plausibility — cross-reference against known high-alert ranges
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
echo "$COMMAND" | grep -q 'drug-lookup/lookup.sh' || exit 0

OUTPUT=$(get_tool_stdout "$INPUT") || exit 0
[ -z "$OUTPUT" ] && exit 0

STATUS=$(json_field "$OUTPUT" '.status // empty') || exit 0
[ "$STATUS" != "ok" ] && exit 0

REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RANGES_FILE="$REPO_ROOT/clinical-resources/drug-ranges.json"

[ ! -f "$RANGES_FILE" ] && exit 0

GENERIC=$(json_field "$OUTPUT" '.drug.generic_name // .generic_name // empty') || exit 0
[ -z "$GENERIC" ] && exit 0

LOWER_GENERIC=$(echo "$GENERIC" | tr '[:upper:]' '[:lower:]')
UNDERSCORE_GENERIC=$(echo "$LOWER_GENERIC" | sed -E 's/[^a-z0-9]+/_/g; s/^_+//; s/_+$//')

RANGE_DATA=$(jq --arg drug "$LOWER_GENERIC" --arg alt "$UNDERSCORE_GENERIC" '.[$drug] // .[$alt] // empty' "$RANGES_FILE" 2>/dev/null) || exit 0
[ -z "$RANGE_DATA" ] || [ "$RANGE_DATA" = "null" ] && exit 0

ALERT=$(echo "$RANGE_DATA" | jq -r '.alert // "Verify dosing against facility protocol"' 2>/dev/null) || exit 0
EXPECTED_UNIT=$(echo "$RANGE_DATA" | jq -r '.dose.unit // empty' 2>/dev/null) || exit 0
TYPICAL_MIN=$(echo "$RANGE_DATA" | jq -r '.dose.typical_min // empty' 2>/dev/null) || exit 0
TYPICAL_MAX=$(echo "$RANGE_DATA" | jq -r '.dose.typical_max // empty' 2>/dev/null) || exit 0
PLAUSIBLE_MAX=$(echo "$RANGE_DATA" | jq -r '.dose.plausible_max // empty' 2>/dev/null) || exit 0

ADVISORY="[Safety] High-alert medication: $GENERIC. $ALERT"

normalize_unit() {
    local unit="$1"
    echo "$unit" |
        tr '[:upper:]' '[:lower:]' |
        tr -d '[:space:]' |
        sed -E 's#/h$#/hr#'
}

EXPECTED_UNIT_CANON=$(normalize_unit "$EXPECTED_UNIT")

if [ -z "$EXPECTED_UNIT" ] || [ -z "$TYPICAL_MIN" ] || [ -z "$TYPICAL_MAX" ] || [ -z "$PLAUSIBLE_MAX" ]; then
    emit_posttool_context "$ADVISORY"
    exit 0
fi

DOSE_AMOUNT=$(json_field "$OUTPUT" '.dose.amount // empty') || exit 0
DOSE_UNIT=$(json_field "$OUTPUT" '.dose.unit // empty') || exit 0

[ -z "$DOSE_AMOUNT" ] && {
    emit_posttool_context "$ADVISORY"
    exit 0
}

if ! jq -e '.dose.amount | numbers' >/dev/null 2>&1 <<<"$OUTPUT"; then
    emit_posttool_context "$ADVISORY Structured dose could not be parsed. Verify units against facility protocol."
    exit 0
fi

DOSE_UNIT_CANON=$(normalize_unit "$DOSE_UNIT")

if [ -z "$DOSE_UNIT_CANON" ] || [ "$DOSE_UNIT_CANON" != "$EXPECTED_UNIT_CANON" ]; then
    emit_posttool_context "$ADVISORY Structured dose unit '$DOSE_UNIT' does not match expected '$EXPECTED_UNIT'. Verify units against facility protocol."
    exit 0
fi

if awk -v amount="$DOSE_AMOUNT" -v min="$TYPICAL_MIN" -v max="$TYPICAL_MAX" 'BEGIN { exit !(amount + 0 >= min && amount + 0 <= max) }'; then
    emit_posttool_context "$ADVISORY"
    exit 0
fi

if awk -v amount="$DOSE_AMOUNT" -v max="$PLAUSIBLE_MAX" 'BEGIN { exit !(amount + 0 > max) }'; then
    emit_posttool_block \
        "[Safety] High-alert medication: $GENERIC. Dose $DOSE_AMOUNT $EXPECTED_UNIT_CANON exceeds plausible maximum $PLAUSIBLE_MAX $EXPECTED_UNIT_CANON. Hold and verify before use." \
        "[Safety] High-alert medication: $GENERIC. Dose $DOSE_AMOUNT $EXPECTED_UNIT_CANON exceeds plausible maximum $PLAUSIBLE_MAX $EXPECTED_UNIT_CANON. Hold and verify before use."
    exit 0
fi

emit_posttool_context "$ADVISORY Dose $DOSE_AMOUNT $EXPECTED_UNIT_CANON is outside the typical range ($TYPICAL_MIN-$TYPICAL_MAX $EXPECTED_UNIT_CANON) but below the plausible maximum $PLAUSIBLE_MAX $EXPECTED_UNIT_CANON. Verify against facility protocol."
