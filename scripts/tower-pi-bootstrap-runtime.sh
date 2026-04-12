#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
PI_CONTAINER_NAME="${PI_CONTAINER_NAME:-noah-pi-runtime}"

echo "[noah-rn] bootstrapping Noah RN runtime dependencies inside $PI_CONTAINER_NAME on $TOWER_HOST..."
ssh "$TOWER_HOST" "docker exec '$PI_CONTAINER_NAME' bash -lc 'cd /workspace && npm install && npm run build:clinical-mcp'"

echo "[noah-rn] runtime bootstrap complete."
