# Failure Modes Analysis

Last updated: 2026-04-01
Eval harness run: scores-20260401-150307.json
Candidate: 1 (Dynamic Validation Enhancement)

## Current State

All 53 golden test cases pass structural validation (80/80 including schema v2 cases). This validates that skill files contain:
- Safety disclaimers
- Four-layer output format references
- Completeness checklists
- HITL requirements

## Candidate 1 Diagnosis

### Primary Failure Mode: Static-Only Validation

The current eval harness performs **static structural validation** — it checks that skill files contain required elements but does not execute skills against clinical scenarios and validate actual output.

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

### Candidate 1 Fix

Added dynamic validation mode to eval harness:
1. When model API is configured (OpenAI, Anthropic, or Ollama), executes skills against test cases
2. Validates actual output against `must_contain` and `must_not_contain` expectations
3. Checks confidence scores against `minimum_overall` thresholds
4. Verifies provenance citations when `must_cite_source: true`
5. Gracefully falls back to static validation when no model is configured
6. Reports `schema_v2_cases` count and `dynamic_skip` count in scores.json

### Test Case Anomalies

- **sepsis-002**: Missing both `confidence` and `provenance` blocks in expected section. Should be updated to include these fields for consistency.
- **Schema v2 cases**: 27 cases have enhanced expectations (confidence/provenance). These will be validated dynamically when model is configured.

## Category Coverage

| Category | Cases | Status |
|----------|-------|--------|
| protocol-reference | 25 | Validated (static), Dynamic-ready |
| clinical-calculator | 7 | Validated (static), Dynamic-ready |
| drug-reference | 5 | Validated (static), Dynamic-ready |
| unit-conversion | 4 | Validated (static), Dynamic-ready |
| shift-report | 2 | Validated (static), Dynamic-ready |
| io-tracker | 2 | Validated (static), Dynamic-ready |
| hello-nurse | 2 | Validated (static), Dynamic-ready |

## Severity Distribution

| Severity | Count | Weight |
|----------|-------|--------|
| Critical | 24 | Veto |
| High | 21 | 2x |
| Medium | 4 | 1x |
| Low | 4 | 0.5x |

## Path to Full Dynamic Validation

1. Configure model API endpoint (set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `OLLAMA_BASE_URL`)
2. Run harness with `--mode dynamic` to execute all test cases
3. Review failures and iterate on skill prompts
4. Add timing instrumentation for latency tracking
5. Implement cross-skill trigger detection tests
