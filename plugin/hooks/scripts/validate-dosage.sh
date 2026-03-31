#!/usr/bin/env bash
# Tier 1 dosage plausibility — cross-reference against known high-alert ranges
set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || exit 0
[ "$TOOL_NAME" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
echo "$COMMAND" | grep -q 'drug-lookup/lookup.sh' || exit 0

OUTPUT=$(echo "$INPUT" | jq -r '.tool_result // empty' 2>/dev/null) || exit 0
[ -z "$OUTPUT" ] && exit 0

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "/home/ark/noah-rn")
RANGES_FILE="$REPO_ROOT/knowledge/drug-ranges.json"

[ ! -f "$RANGES_FILE" ] && exit 0

GENERIC=$(echo "$OUTPUT" | jq -r '.generic_name // empty' 2>/dev/null) || exit 0
[ -z "$GENERIC" ] && exit 0

LOWER_GENERIC=$(echo "$GENERIC" | tr '[:upper:]' '[:lower:]')

RANGE_DATA=$(jq --arg drug "$LOWER_GENERIC" '.[$drug] // empty' "$RANGES_FILE" 2>/dev/null) || exit 0
[ -z "$RANGE_DATA" ] || [ "$RANGE_DATA" = "null" ] && exit 0

ALERT=$(echo "$RANGE_DATA" | jq -r '.alert // "Verify dosing against facility protocol"' 2>/dev/null) || exit 0

jq -n --arg drug "$GENERIC" --arg alert "$ALERT" \
  '{"systemMessage": ("[Safety] High-alert medication: \($drug). \($alert)")}'
