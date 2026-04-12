#!/usr/bin/env bash

BACKUP_DIR=""
OVERLAY_FILES=()

cleanup_candidate_overlay() {
  if [ ${#OVERLAY_FILES[@]} -gt 0 ] && [ -n "$BACKUP_DIR" ]; then
    for rel_path in "${OVERLAY_FILES[@]}"; do
      local src="$BACKUP_DIR/$rel_path"
      local dst="$REPO_ROOT/$rel_path"
      if [ -f "$src" ]; then
        cp "$src" "$dst"
      elif [ -f "${src}.DELETED" ]; then
        rm -f "$dst"
      fi
    done
    rm -rf "$BACKUP_DIR"
  fi
}

apply_candidate_overlay() {
  if [[ "$CANDIDATE" =~ ^[0-9]+$ ]]; then
    CANDIDATE_DIR="$SCRIPT_DIR/candidates/candidate-$CANDIDATE"
  else
    CANDIDATE_DIR="$CANDIDATE"
  fi

  if [ ! -d "$CANDIDATE_DIR" ]; then
    echo "ERROR: Candidate directory not found: $CANDIDATE_DIR"
    exit 1
  fi

  DIFF_DIR="$CANDIDATE_DIR/diff"
  if [ ! -d "$DIFF_DIR" ]; then
    echo "ERROR: Candidate diff/ directory not found: $DIFF_DIR"
    exit 1
  fi

  BACKUP_DIR="$(mktemp -d)"
  trap cleanup_candidate_overlay EXIT

  echo "=== Applying candidate: $CANDIDATE_DIR ==="
  while IFS= read -r -d '' candidate_file; do
    rel_path="${candidate_file#$DIFF_DIR/}"
    original="$REPO_ROOT/$rel_path"

    backup_target="$BACKUP_DIR/$rel_path"
    mkdir -p "$(dirname "$backup_target")"
    if [ -f "$original" ]; then
      cp "$original" "$backup_target"
    else
      touch "${backup_target}.DELETED"
    fi

    mkdir -p "$(dirname "$original")"
    cp "$candidate_file" "$original"
    OVERLAY_FILES+=("$rel_path")
    log_info "overlaid: $rel_path"
  done < <(find "$DIFF_DIR" -type f -print0)
  echo ""
}
