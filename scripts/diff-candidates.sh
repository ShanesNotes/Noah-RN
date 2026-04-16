#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANDIDATES_DIR="$REPO_ROOT/optimization/product/candidates"
LEFT="${1:-}"
RIGHT="${2:-}"

if [[ -z "$LEFT" || -z "$RIGHT" ]]; then
  echo "Usage: diff-candidates.sh <left> <right>" >&2
  exit 1
fi

LEFT_DIR="$CANDIDATES_DIR/$LEFT"
RIGHT_DIR="$CANDIDATES_DIR/$RIGHT"

python3 - <<'PY' "$LEFT" "$LEFT_DIR" "$RIGHT" "$RIGHT_DIR"
import difflib, json, os, pathlib, sys

left_id, left_dir, right_id, right_dir = sys.argv[1:]

def load_json(path):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def read_lines(path):
    if os.path.exists(path):
        return open(path).read().splitlines()
    return []

def collect_skill_files(root):
    files = {}
    skills_dir = pathlib.Path(root) / "skills"
    if not skills_dir.exists():
        return files
    for path in skills_dir.rglob("*"):
        if path.is_file():
            rel = str(path.relative_to(skills_dir))
            files[rel] = path.read_text().splitlines()
    return files

left_scores = load_json(os.path.join(left_dir, "scores.json"))
right_scores = load_json(os.path.join(right_dir, "scores.json"))
left_rationale = read_lines(os.path.join(left_dir, "RATIONALE.md"))
right_rationale = read_lines(os.path.join(right_dir, "RATIONALE.md"))

left_cases = {item.get("case_id") or item.get("test_id"): item.get("status") for item in left_scores.get("per_case_scores", [])}
right_cases = {item.get("case_id") or item.get("test_id"): item.get("status") for item in right_scores.get("per_case_scores", [])}
changed_cases = []
for test_id in sorted(set(left_cases) | set(right_cases)):
    if left_cases.get(test_id) != right_cases.get(test_id):
        changed_cases.append({
            "case_id": test_id,
            "left": left_cases.get(test_id),
            "right": right_cases.get(test_id),
        })

left_files = collect_skill_files(left_dir)
right_files = collect_skill_files(right_dir)
file_diffs = []
for rel_path in sorted(set(left_files) | set(right_files)):
    left_exists = rel_path in left_files
    right_exists = rel_path in right_files
    if left_exists and right_exists and left_files[rel_path] == right_files[rel_path]:
        continue
    change_type = "modified"
    if left_exists and not right_exists:
        change_type = "removed"
    elif right_exists and not left_exists:
        change_type = "added"
    diff_lines = list(
        difflib.unified_diff(
            left_files.get(rel_path, []),
            right_files.get(rel_path, []),
            fromfile=f"{left_id}/{rel_path}",
            tofile=f"{right_id}/{rel_path}",
            lineterm="",
        )
    )
    file_diffs.append({
        "path": rel_path,
        "change_type": change_type,
        "diff_lines": diff_lines[:120],
    })

payload = {
    "pair_key": f"{left_id}::{right_id}",
    "left": {"id": left_id, "weighted_score": left_scores.get("weighted_score"), "health": left_scores.get("health")},
    "right": {"id": right_id, "weighted_score": right_scores.get("weighted_score"), "health": right_scores.get("health")},
    "score_delta": (right_scores.get("weighted_score") or 0) - (left_scores.get("weighted_score") or 0),
    "changed_cases": changed_cases,
    "rationale_diff": list(difflib.unified_diff(left_rationale, right_rationale, fromfile=left_id, tofile=right_id, lineterm=""))[:120],
    "file_diffs": file_diffs,
}
print(json.dumps(payload, indent=2))
PY
