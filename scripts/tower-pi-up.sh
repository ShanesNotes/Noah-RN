#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
REMOTE_REPO_ROOT="${REMOTE_REPO_ROOT:-/home/ark/noah-rn}"
PI_COMPOSE_REL="${PI_COMPOSE_REL:-infrastructure/pi/docker-compose.pi.yml}"
MEDPLUM_COMPOSE_REL="${MEDPLUM_COMPOSE_REL:-infrastructure/docker-compose.yml}"
PI_ENV_REL="${PI_ENV_REL:-infrastructure/pi/.env}"
PI_SERVICE="${PI_SERVICE:-pi-runtime}"

ssh_cmd() {
  ssh "$TOWER_HOST" "$@"
}

echo "[noah-rn] ensuring Medplum base stack is up on $TOWER_HOST..."
ssh_cmd "cd '$REMOTE_REPO_ROOT' && docker compose -f '$MEDPLUM_COMPOSE_REL' up -d"

echo "[noah-rn] checking pi lane env on $TOWER_HOST..."
if ! ssh_cmd "test -f '$REMOTE_REPO_ROOT/$PI_ENV_REL'"; then
  echo "[noah-rn][error] missing $PI_ENV_REL on $TOWER_HOST" >&2
  echo "[noah-rn][error] copy infrastructure/pi/.env.example to $PI_ENV_REL and fill in auth first" >&2
  exit 1
fi

echo "[noah-rn] building and starting $PI_SERVICE on $TOWER_HOST..."
ssh_cmd "cd '$REMOTE_REPO_ROOT' && docker compose -f '$PI_COMPOSE_REL' up -d --build '$PI_SERVICE'"

echo "[noah-rn] pi lane is up. enter it with:"
echo "  ./scripts/tower-pi-shell.sh"
