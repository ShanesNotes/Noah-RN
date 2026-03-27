#!/usr/bin/env bash
set -euo pipefail

# Noah RN — OpenFDA Drug Label Lookup
# Queries the FDA Drug Label API and returns structured JSON.
# Usage: lookup.sh <drug_name>

ENDPOINT="https://api.fda.gov/drug/label.json"

if [[ $# -lt 1 || -z "${1:-}" ]]; then
    echo '{"status":"error","error":"no_input","message":"Usage: lookup.sh <drug_name>"}'
    exit 1
fi

DRUG="$1"
DRUG_ENCODED=$(jq -rn --arg d "$DRUG" '$d|@uri')

# Search both brand and generic name fields (explicit OR)
SEARCH="(openfda.brand_name:%22${DRUG_ENCODED}%22+OR+openfda.generic_name:%22${DRUG_ENCODED}%22)"
URL="${ENDPOINT}?search=${SEARCH}&limit=1"

# Fetch from OpenFDA
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL" 2>/dev/null || echo -e "\n000")
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)

# Handle HTTP errors
if [[ "$HTTP_CODE" == "000" ]]; then
    echo '{"status":"error","error":"api_error","message":"OpenFDA is unreachable. Check network connection."}'
    exit 2
fi

if [[ "$HTTP_CODE" == "429" ]]; then
    echo '{"status":"error","error":"rate_limit","message":"OpenFDA rate limit hit. Wait a few seconds and retry."}'
    exit 2
fi

# Check for results
RESULT_COUNT=$(echo "$HTTP_BODY" | jq -r '.results | length' 2>/dev/null || echo "0")

if [[ "$RESULT_COUNT" == "0" || "$RESULT_COUNT" == "null" ]]; then
    jq -n --arg d "$DRUG" '{"status":"error","error":"no_match","message":"No FDA label found for \u0027\($d)\u0027."}'
    exit 1
fi

# Extract structured fields from first result
echo "$HTTP_BODY" | jq '{
    status: "ok",
    drug: {
        generic_name: (.results[0].openfda.generic_name // ["unknown"])[0],
        brand_name: ((.results[0].openfda.brand_name // ["unknown"]) | join(", ")),
        pharm_class: (
            (.results[0].openfda.pharm_class_epc // [])[0] //
            ((.results[0].description // [""])[0] | split(".")[0])
        ),
        route: ((.results[0].openfda.route // []) | join(", ")),
        dosage_and_administration: ((.results[0].dosage_and_administration // ["Not available"])[0]),
        warnings: (
            (.results[0].warnings // .results[0].warnings_and_precautions // .results[0].warnings_and_cautions // ["Not available"])[0]
        ),
        boxed_warning: ((.results[0].boxed_warning // [null])[0]),
        adverse_reactions: ((.results[0].adverse_reactions // ["Not available"])[0]),
        contraindications: ((.results[0].contraindications // ["Not available"])[0]),
        drug_interactions: ((.results[0].drug_interactions // ["Not available"])[0])
    }
}'
