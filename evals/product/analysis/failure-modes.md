# Failure Modes Analysis

Last updated: 2026-03-31
Eval harness run: scores-latest.json

> **Note (2026-04-12)**: `clinical-calculator` was split into `neuro-calculator`, `risk-calculator`, and `acuity-calculator`. Historical references below reflect pre-split state.

## Current State

All 53 golden test cases pass structural validation. This validates that skill files contain:
- Safety disclaimers
- Four-layer output format references
- Completeness checklists
- HITL requirements

## Limitations of Current Validation

The current eval harness performs **static structural validation** — it checks that skill files
contain required elements but does not execute skills against clinical scenarios and validate
actual output. This is the minimum viable eval harness.

### What's Validated
- [x] Skill file existence
- [x] Safety disclaimer presence
- [x] Four-layer format reference
- [x] Completeness checklist presence
- [x] HITL requirement presence
- [x] Test case schema validity

### What's NOT Yet Validated
- [ ] Actual skill output against `must_contain` expectations
- [ ] Actual skill output against `must_not_contain` prohibitions
- [ ] Confidence score calibration
- [ ] Provenance citation accuracy
- [ ] Cross-skill trigger detection
- [ ] Response latency
- [ ] Output format compliance in generated text

### Path to Dynamic Validation

Full dynamic validation requires:
1. A model API endpoint (OpenAI, Anthropic, or local)
2. A test runner that feeds `input.clinical_context` to the appropriate skill
3. Output parsing and comparison against `expected` criteria
4. Scoring and aggregation into `scores.json`

This is deferred until a model provider is configured. The static validation ensures that
any skill modification maintains structural integrity — the harness catches regressions in
skill prompt design even without live model execution.

## Category Coverage

| Category | Cases | Status |
|----------|-------|--------|
| protocol-reference | 29 | Validated |
| clinical-calculator | 8 | Validated |
| drug-reference | 6 | Validated |
| unit-conversion | 4 | Validated |
| shift-report | 2 | Validated |
| io-tracker | 2 | Validated |
| hello-nurse | 2 | Validated |

## Severity Distribution

| Severity | Count | Weight |
|----------|-------|--------|
| Critical | 22 | Veto |
| High | 22 | 2x |
| Medium | 6 | 1x |
| Low | 3 | 0.5x |
