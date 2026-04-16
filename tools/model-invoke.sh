#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: model-invoke.sh --provider <openrouter|anthropic|local> --model <id> --prompt <file> --context <file> [--dry-run]" >&2
  exit 1
}

provider="openrouter"
model=""
prompt_file=""
context_file=""
dry_run=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider) provider="${2:-}"; shift 2 ;;
    --model) model="${2:-}"; shift 2 ;;
    --prompt) prompt_file="${2:-}"; shift 2 ;;
    --context) context_file="${2:-}"; shift 2 ;;
    --dry-run) dry_run=true; shift ;;
    *) usage ;;
  esac
done

[[ -n "$model" && -n "$prompt_file" && -n "$context_file" ]] || usage
[[ -f "$prompt_file" && -f "$context_file" ]] || usage

prompt_contents="$(cat "$prompt_file")"
context_contents="$(cat "$context_file")"
combined_payload="${prompt_contents}

${context_contents}"

estimate_tokens() {
  python3 - <<'PY' "$1"
import math, sys
text = sys.argv[1]
print(max(1, math.ceil(len(text) / 4)))
PY
}

if [[ "$dry_run" == "true" ]]; then
  input_tokens="$(estimate_tokens "$combined_payload")"
  output_tokens="$(estimate_tokens "$context_contents")"
  cat <<EOF 1>&2
{"provider":"$provider","model":"$model","dry_run":true,"input_tokens":$input_tokens,"output_tokens":$output_tokens,"cache_read_tokens":0,"cache_write_tokens":0}
EOF
  printf '%s\n' "$combined_payload"
  exit 0
fi

case "$provider" in
  openrouter)
    [[ -n "${OPENROUTER_API_KEY:-}" ]] || { echo "OPENROUTER_API_KEY is required" >&2; exit 1; }
    response="$(curl -fsSL https://openrouter.ai/api/v1/chat/completions \
      -H "Authorization: Bearer $OPENROUTER_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$(python3 - <<'PY' "$model" "$prompt_contents" "$context_contents"
import json, sys
model, prompt, context = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
  "model": model,
  "messages": [
    {"role": "system", "content": prompt},
    {"role": "user", "content": context},
  ],
  "temperature": 0.1
}))
PY
      )")"
    python3 - <<'PY' "$response"
import json, sys
payload = json.loads(sys.argv[1])
message = payload["choices"][0]["message"]["content"]
usage = payload.get("usage", {})
print(message)
print(json.dumps({
    "provider": "openrouter",
    "model": payload.get("model"),
    "dry_run": False,
    "input_tokens": usage.get("prompt_tokens", 0),
    "output_tokens": usage.get("completion_tokens", 0),
    "cache_read_tokens": usage.get("prompt_tokens_details", {}).get("cached_tokens", 0),
    "cache_write_tokens": 0,
}), file=sys.stderr)
PY
    ;;
  anthropic)
    [[ -n "${ANTHROPIC_API_KEY:-}" ]] || { echo "ANTHROPIC_API_KEY is required" >&2; exit 1; }
    response="$(curl -fsSL https://api.anthropic.com/v1/messages \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -H "content-type: application/json" \
      -d "$(python3 - <<'PY' "$model" "$prompt_contents" "$context_contents"
import json, sys
model, prompt, context = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
  "model": model,
  "max_tokens": 4096,
  "system": prompt,
  "messages": [{"role": "user", "content": context}],
}))
PY
      )")"
    python3 - <<'PY' "$response"
import json, sys
payload = json.loads(sys.argv[1])
text = "".join(block.get("text", "") for block in payload.get("content", []))
usage = payload.get("usage", {})
print(text)
print(json.dumps({
    "provider": "anthropic",
    "model": payload.get("model"),
    "dry_run": False,
    "input_tokens": usage.get("input_tokens", 0),
    "output_tokens": usage.get("output_tokens", 0),
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
}), file=sys.stderr)
PY
    ;;
  local)
    if [[ -n "${OLLAMA_BASE_URL:-}" ]]; then
      response="$(curl -fsSL "${OLLAMA_BASE_URL}/api/generate" \
        -H "Content-Type: application/json" \
        -d "$(python3 - <<'PY' "$model" "$combined_payload"
import json, sys
model, prompt = sys.argv[1], sys.argv[2]
print(json.dumps({"model": model, "prompt": prompt, "stream": False}))
PY
        )")"
      python3 - <<'PY' "$response"
import json, sys, math
payload = json.loads(sys.argv[1])
text = payload.get("response", "")
print(text)
print(json.dumps({
    "provider": "local",
    "model": payload.get("model"),
    "dry_run": False,
    "input_tokens": max(1, math.ceil(len(payload.get("prompt_eval_count", "") if isinstance(payload.get("prompt_eval_count"), str) else str(payload.get("prompt_eval_count", 0))) / 4)),
    "output_tokens": payload.get("eval_count", 0),
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
}), file=sys.stderr)
PY
    else
      echo "OLLAMA_BASE_URL is required for --provider local" >&2
      exit 1
    fi
    ;;
  *)
    echo "Unsupported provider: $provider" >&2
    exit 1
    ;;
esac
