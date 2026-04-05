#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
SCRIPT_DIR="$REPO_ROOT/tools/youtube-poll"
DEFAULT_CONFIG="$SCRIPT_DIR/config.env"
PROCESSED_JSON="$SCRIPT_DIR/processed.json"

# Defaults
CONFIG_PATH="$DEFAULT_CONFIG"
PLAYLIST_ID=""
DRY_RUN=false
MARK_PROCESSED=""

usage() {
  echo "Usage: $0 --playlist-id ID [--config PATH] [--dry-run] [--mark-processed VIDEO_ID]" >&2
  exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --playlist-id)
      PLAYLIST_ID="$2"; shift 2 ;;
    --config)
      CONFIG_PATH="$2"; shift 2 ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --mark-processed)
      MARK_PROCESSED="$2"; shift 2 ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage ;;
  esac
done

# Load config
if [[ -f "$CONFIG_PATH" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_PATH"
fi

YOUTUBE_API_KEY_PATH="${YOUTUBE_API_KEY_PATH:-$HOME/.config/youtube-api-key}"

# Validate API key
API_KEY_FILE="${YOUTUBE_API_KEY_PATH/#\~/$HOME}"
if [[ ! -f "$API_KEY_FILE" ]]; then
  echo "ERROR: YouTube API key not found at $API_KEY_FILE. Create one at https://console.cloud.google.com → YouTube Data API v3 → Credentials" >&2
  exit 1
fi
API_KEY=$(tr -d '[:space:]' < "$API_KEY_FILE")

# Handle --mark-processed
if [[ -n "$MARK_PROCESSED" ]]; then
  MARKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  TMP=$(mktemp)
  jq --arg id "$MARK_PROCESSED" --arg ts "$MARKED_AT" \
    '.processed += [{"video_id": $id, "marked_at": $ts}]' \
    "$PROCESSED_JSON" > "$TMP"
  mv "$TMP" "$PROCESSED_JSON"
  echo "Marked $MARK_PROCESSED as processed at $MARKED_AT" >&2
  exit 0
fi

# Validate playlist ID
if [[ -z "$PLAYLIST_ID" ]]; then
  echo "ERROR: --playlist-id is required" >&2
  usage
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: Would fetch playlist $PLAYLIST_ID using key from $API_KEY_FILE" >&2
  exit 0
fi

# Fetch all playlist items via pagination
declare -a ALL_IDS=()
declare -a ALL_TITLES=()
declare -a ALL_DATES=()
PAGE_TOKEN=""

while true; do
  URL="https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=50&key=${API_KEY}"
  if [[ -n "$PAGE_TOKEN" ]]; then
    URL="${URL}&pageToken=${PAGE_TOKEN}"
  fi

  RESPONSE=$(curl -sf "$URL" 2>/dev/null) || {
    echo "ERROR: API request failed for playlist $PLAYLIST_ID" >&2
    exit 2
  }

  # Check for API error
  if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
    echo "ERROR: YouTube API error: $ERR_MSG" >&2
    exit 2
  fi

  # Extract items
  while IFS=$'\t' read -r vid_id title pub_date; do
    ALL_IDS+=("$vid_id")
    ALL_TITLES+=("$title")
    ALL_DATES+=("$pub_date")
  done < <(echo "$RESPONSE" | jq -r '.items[] | [.snippet.resourceId.videoId, .snippet.title, .snippet.publishedAt] | @tsv')

  # Check for next page
  NEXT=$(echo "$RESPONSE" | jq -r '.nextPageToken // empty')
  if [[ -z "$NEXT" ]]; then
    break
  fi
  PAGE_TOKEN="$NEXT"
done

TOTAL=${#ALL_IDS[@]}

# Load processed ledger
PROCESSED_IDS=$(jq -r '.processed[].video_id' "$PROCESSED_JSON" 2>/dev/null || echo "")

NEW_COUNT=0
for i in "${!ALL_IDS[@]}"; do
  VID_ID="${ALL_IDS[$i]}"
  TITLE="${ALL_TITLES[$i]}"
  PUB_DATE="${ALL_DATES[$i]}"

  if ! echo "$PROCESSED_IDS" | grep -qx "$VID_ID"; then
    echo "${VID_ID}|${TITLE}|${PUB_DATE}"
    NEW_COUNT=$((NEW_COUNT + 1))
  fi
done

echo "Found $NEW_COUNT new videos ($TOTAL total in playlist)" >&2
exit 0
