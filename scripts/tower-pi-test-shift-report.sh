#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
PI_CONTAINER_NAME="${PI_CONTAINER_NAME:-noah-pi-runtime}"

echo "[noah-rn] running Medplum Shift Report loop from inside $PI_CONTAINER_NAME on $TOWER_HOST..."
ssh "$TOWER_HOST" "docker exec '$PI_CONTAINER_NAME' bash -lc 'cd /runtime && bash infrastructure/medplum/test-shift-report-task.sh'"
