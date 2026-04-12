#!/usr/bin/env bash
set -euo pipefail

TOWER_HOST="${TOWER_HOST:-tower}"
REMOTE_REPO_ROOT="${REMOTE_REPO_ROOT:-/home/ark/noah-rn}"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/noah-pi-runtime-sync.tar.gz}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SYNC_PATHS=(
  package.json
  package-lock.json
  tsconfig.json
  clinical-resources/registry.json
  clinical-resources/mimic-mappings.json
  packages/agent-harness
  packages/workflows
  services/clinical-mcp
  scripts/run-harness.sh
  scripts/medplum-shift-report-worker.sh
  infrastructure/medplum/test-shift-report-task.sh
  tools/registry.json
  tools/trace
)

echo "[noah-rn] creating runtime sync archive..."
tar -czf "$ARCHIVE_PATH" "${SYNC_PATHS[@]}"

echo "[noah-rn] pushing runtime sync archive to $TOWER_HOST..."
cat "$ARCHIVE_PATH" | ssh "$TOWER_HOST" "cat > '$ARCHIVE_PATH'"

echo "[noah-rn] extracting runtime sync archive into $REMOTE_REPO_ROOT..."
ssh "$TOWER_HOST" "cd '$REMOTE_REPO_ROOT' && tar -xzf '$ARCHIVE_PATH' && rm -f '$ARCHIVE_PATH'"

echo "[noah-rn] runtime sync complete."
