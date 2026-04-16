#!/usr/bin/env bash
# Standalone sim-harness bootstrap: bring up the Pulse sidecar + the Vite
# vitals display. One command, end-to-end. No product-surface dependencies.
set -euo pipefail

cd "$(dirname "$0")/.."

: "${PULSE_PORT:=8104}"
: "${DISPLAY_PORT:=5173}"

printf '[bootstrap] starting pulse-sidecar + vitals-display-web…\n'
docker compose up -d --build

printf '[bootstrap] waiting for sidecar /healthz…\n'
for i in $(seq 1 90); do
  if curl -sf "http://localhost:${PULSE_PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 1
  if [ "$i" = 90 ]; then
    printf '[bootstrap] sidecar did not report healthy within 90s — see: docker compose logs pulse-sidecar\n' >&2
    exit 1
  fi
done

printf '\n'
printf '[bootstrap] READY\n'
printf '  Pulse sidecar:    http://localhost:%s/healthz\n' "${PULSE_PORT}"
printf '  Web display:      http://localhost:%s\n' "${DISPLAY_PORT}"
printf '  Terminal display: cd vitals-display-cli && npm install && node dashboard.js\n'
printf '\n'
printf '[bootstrap] teardown with:  ./scripts/teardown.sh\n'
