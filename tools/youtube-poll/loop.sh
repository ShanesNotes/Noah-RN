#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
SCRIPT_DIR="$REPO_ROOT/tools/youtube-poll"
DEFAULT_CONFIG="$SCRIPT_DIR/config.env"

# Defaults
CONFIG_PATH="$DEFAULT_CONFIG"
PLAYLIST_ID=""
INTERVAL=""
MAX_VIDEOS=""

usage() {
  echo "Usage: $0 --playlist-id ID [--interval SECONDS] [--config PATH] [--max-videos N]" >&2
  exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --playlist-id)
      PLAYLIST_ID="$2"; shift 2 ;;
    --interval)
      INTERVAL="$2"; shift 2 ;;
    --config)
      CONFIG_PATH="$2"; shift 2 ;;
    --max-videos)
      MAX_VIDEOS="$2"; shift 2 ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage ;;
  esac
done

# Load config
if [[ -f "$CONFIG_PATH" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_PATH"
else
  echo "ERROR: Config not found at $CONFIG_PATH" >&2
  exit 1
fi

# Apply config defaults, then arg overrides
PLAYLIST_ID="${PLAYLIST_ID:-${GOLD_PLAYLIST_ID:-}}"
INTERVAL="${INTERVAL:-${POLL_INTERVAL:-10800}}"
MAX_VIDEOS="${MAX_VIDEOS:-${MAX_VIDEOS_PER_CYCLE:-5}}"
INGEST_PROFILE="${INGEST_PROFILE:-~/university/tools/whisperx_tower_profile.yaml}"
REPORT_DIR="${REPORT_DIR:-research/youtube}"

if [[ -z "$PLAYLIST_ID" ]]; then
  echo "ERROR: --playlist-id required (or set GOLD_PLAYLIST_ID in config)" >&2
  exit 1
fi

# Peak hour detection: Mon-Fri 8am-2pm EDT = 12:00-18:00 UTC
is_peak_hours() {
  local hour dow
  hour=$(date -u +%H)
  dow=$(date -u +%u)  # 1=Mon, 7=Sun
  if [[ $dow -ge 1 && $dow -le 5 && $hour -ge 12 && $hour -lt 18 ]]; then
    return 0
  fi
  return 1
}

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# Graceful shutdown
RUNNING=true
SESSION_START=$(date -u +%s)
SESSION_PROCESSED=0

trap 'RUNNING=false; echo "[$(ts)] SHUTDOWN: Signal received, finishing current video..."' SIGTERM SIGINT

echo "[$(ts)] START: loop.sh — playlist=$PLAYLIST_ID interval=${INTERVAL}s max_videos=$MAX_VIDEOS"

while $RUNNING; do
  # Peak hour gate
  if is_peak_hours; then
    echo "[$(ts)] PEAK-GATED: Deferring to off-peak. Sleeping ${INTERVAL}s"
    sleep "$INTERVAL"
    continue
  fi

  # Poll for new videos
  POLL_OUTPUT=$("$SCRIPT_DIR/poll.sh" --playlist-id "$PLAYLIST_ID" --config "$CONFIG_PATH" 2>/dev/null || true)

  if [[ -z "$POLL_OUTPUT" ]]; then
    echo "[$(ts)] CAUGHT-UP: Playlist caught up, nothing new. Sleeping ${INTERVAL}s"
    sleep "$INTERVAL"
    continue
  fi

  # Parse output lines (VIDEO_ID|TITLE|PUBLISHED_DATE), limit to max-videos
  mapfile -t VIDEO_LINES < <(echo "$POLL_OUTPUT" | grep -v '^$' | head -n "$MAX_VIDEOS")
  TOTAL=${#VIDEO_LINES[@]}
  BATCH_PROCESSED=0

  for i in "${!VIDEO_LINES[@]}"; do
    $RUNNING || break

    LINE="${VIDEO_LINES[$i]}"
    VIDEO_ID=$(echo "$LINE" | cut -d'|' -f1)
    TITLE=$(echo "$LINE" | cut -d'|' -f2)
    N=$((i + 1))

    echo "[$(ts)] INGESTING [${N}/${TOTAL}]: $TITLE ($VIDEO_ID)"

    if ~/university/tools/ingest.sh \
        --url "https://youtube.com/watch?v=${VIDEO_ID}" \
        --profile "$INGEST_PROFILE" 2>&1; then
      "$SCRIPT_DIR/poll.sh" --mark-processed "$VIDEO_ID" --config "$CONFIG_PATH" 2>/dev/null || true
      BATCH_PROCESSED=$((BATCH_PROCESSED + 1))
      SESSION_PROCESSED=$((SESSION_PROCESSED + 1))
    else
      echo "[$(ts)] INGEST-FAILED: $TITLE ($VIDEO_ID) — skipping"
    fi

    $RUNNING || break
  done

  echo "[$(ts)] BATCH-COMPLETE: Processed $BATCH_PROCESSED videos. Reports dir: $REPO_ROOT/$REPORT_DIR/"

  $RUNNING || break
  sleep "$INTERVAL"
done

SESSION_END=$(date -u +%s)
RUNTIME=$((SESSION_END - SESSION_START))
echo "[$(ts)] EXIT: Videos processed this session: $SESSION_PROCESSED. Total runtime: ${RUNTIME}s."
exit 0
