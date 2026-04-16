# Baseline Candidate

This baseline seeds the optimization filesystem with the current harness state before any proposer-driven changes.

## Source of Truth

- Harness surface: `packages/agent-harness/` via symlink in `skills/agent-harness`
- Eval harness: `optimization/product/eval-harness.sh`
- Clinical constraints: `optimization/product/clinical-constraints.yaml`
- Trace corpus: `optimization/product/traces`

## Seeded Score Snapshot

- Source file: `evals/product/results/scores-20260415-231126.json`
- Mode: structural-only verification snapshot
- Result: `health=FAIL`, `pass_rate=82.8`, `failures=10`, `safety_failures=1`

## Intent

The baseline exists so future candidates can be compared against a stable candidate-0 with explicit provenance.
