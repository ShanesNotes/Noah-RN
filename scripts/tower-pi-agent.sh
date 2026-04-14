#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
PI_CONTAINER_NAME="${PI_CONTAINER_NAME:-noah-pi-runtime}"

# Run pi inside the isolated Tower runtime container from the curated runtime
# workspace. Project-scoped Pi assets live in repo .noah-pi-runtime/ on the host
# and are mounted into the container as /runtime/.pi, so the dev repo itself can
# stay free of a root .pi directory.
if [ "$#" -eq 0 ]; then
  exec ssh -t "$TOWER_HOST" "docker exec -it '$PI_CONTAINER_NAME' bash -lc 'cd /runtime && exec pi'"
else
  quoted_args=""
  for arg in "$@"; do
    quoted_args+=" $(printf '%q' "$arg")"
  done
  exec ssh -t "$TOWER_HOST" "docker exec -it '$PI_CONTAINER_NAME' bash -lc 'cd /runtime && exec pi${quoted_args}'"
fi
