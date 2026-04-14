#!/usr/bin/env bash
set -euo pipefail

# Noah RN — Workspace Launcher
# Ensures Medplum is healthy on tower, then opens:
# 1) Noah RN nursing station (Medplum-backed clinician UI)
# 2) Noah RN dashboard as the runtime/observability sidecar

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOWER_HOST="${TOWER_HOST:-tower}"
REMOTE_REPO_ROOT="${REMOTE_REPO_ROOT:-/home/ark/noah-rn}"
MEDPLUM_HOST="${MEDPLUM_HOST:-10.0.0.184}"
MEDPLUM_PORT="${MEDPLUM_PORT:-8103}"
MEDPLUM_APP_PORT="${MEDPLUM_APP_PORT:-3000}"
NURSING_STATION_PORT="${NURSING_STATION_PORT:-3001}"
DASHBOARD_PORT="${DASHBOARD_PORT:-5173}"
LOG_DIR="$REPO_ROOT/.dev-logs"
MEDPLUM_APP_URL="${MEDPLUM_APP_URL:-http://$MEDPLUM_HOST:$MEDPLUM_APP_PORT/signin}"
NURSING_STATION_URL="${NURSING_STATION_URL:-http://localhost:$NURSING_STATION_PORT}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:$DASHBOARD_PORT}"

mkdir -p "$LOG_DIR"

log() { echo "[noah-rn] $*"; }
warn() { echo "[noah-rn][warn] $*" >&2; }

cleanup() {
  log "Shutting down local dev servers..."
  [ -n "${NURSING_STATION_PID:-}" ] && kill "$NURSING_STATION_PID" 2>/dev/null || true
  [ -n "${DASHBOARD_PID:-}" ] && kill "$DASHBOARD_PID" 2>/dev/null || true
}
trap cleanup EXIT

start_remote_medplum() {
  if ! command -v ssh >/dev/null 2>&1; then
    warn "ssh is not installed. Skipping remote Medplum bring-up."
    return 1
  fi

  log "Ensuring Medplum stack is running on $TOWER_HOST..."
  if ! ssh "$TOWER_HOST" "cd '$REMOTE_REPO_ROOT' && docker compose -f infrastructure/docker-compose.yml up -d" \
    >"$LOG_DIR/docker.log" 2>&1; then
    warn "Remote docker compose failed on $TOWER_HOST. Continuing with dashboard startup."
    return 1
  fi

  log "Waiting for Medplum on $TOWER_HOST to be healthy..."
  for i in $(seq 1 30); do
    if ssh "$TOWER_HOST" "curl -sf http://localhost:$MEDPLUM_PORT/healthcheck" >/dev/null 2>&1; then
      log "Remote Medplum healthy."
      return 0
    fi
    sleep 1
  done

  warn "Remote Medplum did not report healthy within 30s. Continuing anyway."
  return 1
}

if curl -sf "http://$MEDPLUM_HOST:$MEDPLUM_PORT/healthcheck" >/dev/null 2>&1; then
  log "Medplum already reachable at http://$MEDPLUM_HOST:$MEDPLUM_PORT."
else
  start_remote_medplum || true
fi

open_workspace_windows() {
  log "Opening nursing station..."
  xdg-open "$NURSING_STATION_URL" >/dev/null 2>&1 || true
  sleep 1
  log "Opening Noah RN runtime console..."
  xdg-open "$DASHBOARD_URL" >/dev/null 2>&1 || true
}

cd "$REPO_ROOT"

# 1. Reuse or start nursing station
if curl -sf "http://localhost:$NURSING_STATION_PORT" >/dev/null 2>&1; then
  log "Nursing station already running at $NURSING_STATION_URL."
else
  log "Starting nursing station on port $NURSING_STATION_PORT..."
  npm run dev --workspace apps/nursing-station >"$LOG_DIR/nursing-station.log" 2>&1 &
  NURSING_STATION_PID=$!

  log "Waiting for nursing station at localhost:$NURSING_STATION_PORT..."
  for i in $(seq 1 20); do
    if curl -sf "http://localhost:$NURSING_STATION_PORT" >/dev/null 2>&1; then
      log "Nursing station ready."
      break
    fi
    if ! kill -0 "$NURSING_STATION_PID" 2>/dev/null; then
      warn "Nursing station process exited early. Last log lines:"
      tail -n 40 "$LOG_DIR/nursing-station.log" >&2 || true
      exit 1
    fi
    if [ "$i" -eq 20 ]; then
      warn "Nursing station not responding after 20s. Opening anyway..."
    fi
    sleep 1
  done
fi

# 2. Reuse or start dashboard
if curl -sf "http://localhost:$DASHBOARD_PORT" >/dev/null 2>&1; then
  log "Dashboard already running at $DASHBOARD_URL."
else
  log "Starting clinician dashboard on port $DASHBOARD_PORT..."
  npm run dev --workspace apps/clinician-dashboard >"$LOG_DIR/dashboard.log" 2>&1 &
  DASHBOARD_PID=$!

  log "Waiting for dashboard at localhost:$DASHBOARD_PORT..."
  for i in $(seq 1 20); do
    if curl -sf "http://localhost:$DASHBOARD_PORT" >/dev/null 2>&1; then
      log "Dashboard ready."
      break
    fi
    if ! kill -0 "$DASHBOARD_PID" 2>/dev/null; then
      warn "Dashboard process exited early. Last log lines:"
      tail -n 40 "$LOG_DIR/dashboard.log" >&2 || true
      exit 1
    fi
    if [ "$i" -eq 20 ]; then
      warn "Dashboard not responding after 20s. Opening anyway..."
    fi
    sleep 1
  done
fi

# 3. Open current UI surfaces
open_workspace_windows

log "Noah RN dev environment running."
log "  Nursing station: $NURSING_STATION_URL"
log "  Medplum FHIR:   http://$MEDPLUM_HOST:$MEDPLUM_PORT"
log "  Medplum app:    $MEDPLUM_APP_URL"
log "  Runtime console: $DASHBOARD_URL"
log "  Logs:            $LOG_DIR/"
log ""
log "Press Ctrl+C to stop the local dev servers."
log "(Remote Medplum on $TOWER_HOST stays running.)"

# Keep the script alive so the local dev servers stay running
wait
