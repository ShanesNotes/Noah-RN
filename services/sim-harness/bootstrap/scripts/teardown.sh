#!/usr/bin/env bash
# Tear down the standalone sim-harness bootstrap.
set -euo pipefail

cd "$(dirname "$0")/.."

printf '[teardown] docker compose down -v\n'
docker compose down -v --remove-orphans

printf '[teardown] done\n'
