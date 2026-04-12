#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
START_SCRIPT="$REPO_ROOT/scripts/start-dev.sh"
TITLE="Noah RN Runtime"

launcher_payload=$(cat <<EOF
bash -lc '
"$START_SCRIPT"
status=\$?
echo
if [ "\$status" -eq 0 ]; then
  echo "Noah RN runtime exited cleanly."
else
  echo "Noah RN runtime exited with status \$status."
fi
echo
read -r -p "Press Enter to close... " _
exit "\$status"
'
EOF
)

if command -v gnome-terminal >/dev/null 2>&1; then
  exec gnome-terminal --title="$TITLE" -- bash -lc "$launcher_payload"
elif command -v kgx >/dev/null 2>&1; then
  exec kgx --title="$TITLE" bash -lc "$launcher_payload"
elif command -v x-terminal-emulator >/dev/null 2>&1; then
  exec x-terminal-emulator -e bash -lc "$launcher_payload"
elif command -v konsole >/dev/null 2>&1; then
  exec konsole -p tabtitle="$TITLE" -e bash -lc "$launcher_payload"
elif command -v xfce4-terminal >/dev/null 2>&1; then
  exec xfce4-terminal --title="$TITLE" --command="bash -lc $(printf '%q' "$launcher_payload")"
fi

exec bash -lc "$launcher_payload"
