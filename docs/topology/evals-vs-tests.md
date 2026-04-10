# Noah RN — `tests/` vs `evals/`

This note defines the boundary between correctness testing and meta-harness evaluation after the `optimization/` → `evals/` move.

## `tests/`

Use `tests/` for assertions that should pass or fail deterministically in normal development:

- unit tests
- integration tests
- regression checks
- contract tests
- structural shell-based validation
- build-adjacent verification

Examples in this repo:
- `tests/hooks/`
- `tests/agents/`
- `tests/integration/`
- `tests/clinical/`
- `tests/trace/`

## `evals/`

Use `evals/` for meta-harness quality artifacts and optimization-loop material:

- trace corpora
- candidate diffs and reviews
- proposer prompts
- score outputs
- eval harness assets
- product/company analysis surfaces

Examples in this repo:
- `evals/product/traces/`
- `evals/product/results/`
- `evals/product/candidates/`
- `evals/product/reviews/`
- `evals/company/`

## Rule of Thumb

- If it is a developer-facing check that should gate normal changes, it belongs in `tests/`.
- If it is evidence, scoring, trace accumulation, or optimization-loop material, it belongs in `evals/`.

## Migration Consequence

Do not add new long-lived trace corpora under `tests/`.
Do not move deterministic regression tests into `evals/`.
