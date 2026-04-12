#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "usage: tools/graphify/set-profile.sh <canonical-project|full-context>" >&2
  exit 1
fi

case "$PROFILE" in
  canonical-project|full-context) ;;
  *)
    echo "unknown profile: $PROFILE" >&2
    echo "expected: canonical-project | full-context" >&2
    exit 1
    ;;
esac

SRC="$ROOT/tools/graphify/profiles/$PROFILE.graphifyignore"
DEST="$ROOT/.graphifyignore"
BACKUP_DIR="$ROOT/local/graphify/backups"

mkdir -p "$BACKUP_DIR"

if [[ -f "$DEST" ]]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  cp "$DEST" "$BACKUP_DIR/.graphifyignore.$stamp.bak"
fi

cp "$SRC" "$DEST"
echo "graphify profile set: $PROFILE"
echo "wrote: $DEST"
