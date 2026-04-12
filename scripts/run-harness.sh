#!/usr/bin/env bash
# NOAH_HARNESS_CMD wrapper — thin shell entry point for eval-harness.sh.
# Usage: NOAH_HARNESS_CMD=scripts/run-harness.sh bash evals/product/eval-harness.sh
#
# eval-harness calls: $NOAH_HARNESS_CMD <skill> <context> <trace_dir>
# This forwards to invoke-workflow.mjs with the same args.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$REPO_ROOT/packages/agent-harness/invoke-workflow.mjs" "$@"
