#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
PI_CONTAINER_NAME="${PI_CONTAINER_NAME:-noah-pi-runtime}"

if [ "$#" -eq 0 ]; then
  exec ssh -t "$TOWER_HOST" "docker exec -it '$PI_CONTAINER_NAME' bash -lc 'cd /runtime && exec bash'"
else
  quoted_args=""
  for arg in "$@"; do
    quoted_args+=" $(printf '%q' "$arg")"
  done
  exec ssh -t "$TOWER_HOST" "docker exec -it '$PI_CONTAINER_NAME' bash -lc 'cd /runtime && exec bash${quoted_args}'"
fi
