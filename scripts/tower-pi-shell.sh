#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
PI_CONTAINER_NAME="${PI_CONTAINER_NAME:-noah-pi-runtime}"
SHELL_CMD="${1:-bash}"

exec ssh -t "$TOWER_HOST" "docker exec -it '$PI_CONTAINER_NAME' $SHELL_CMD"
