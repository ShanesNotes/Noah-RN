# Candidate 1: Dynamic Validation Harness

## Diagnosed failure mode

The current eval harness (Phase B) performs only **static structural validation** — it checks that skill files contain required elements (safety disclaimers, four-layer format references, completeness checklists, HITL requirements) but does NOT:
- Execute skills against clinical scenarios
- Validate actual output against `must_contain` expectations
- Check `must_not_contain` prohibitions
- Verify confidence score calibration
- Test provenance citation accuracy
- Measure response latency

**Trace references**: `analysis/failure-modes.md` lines 28-36 document all unvalidated dimensions.

## Prior candidate comparison

No prior candidates exist — this is the first optimization iteration. The baseline harness achieves 100% pass rate (80/80) but this is meaningless without dynamic validation.

## Proposed modification

### 1. Enhanced eval harness (`optimization/product/eval-harness.sh`)
- Add dynamic test execution mode that:
  - Reads test case `input.clinical_context`
  - Invokes the appropriate skill with the clinical context
  - Captures actual skill output
  - Validates output against `expected.must_contain` and `expected.must_not_contain`
  - Checks confidence scores against `expected.confidence.minimum_overall`
  - Verifies provenance citations against `expected.provenance.must_cite_source`

### 2. Test case schema validation
- Ensure all 53 test cases have properly structured `expected` sections
- Add validation for missing or malformed test expectations

### 3. Scoring enhancements
- Per-category dynamic pass/fail tracking
- Confidence calibration scoring (difference between expected and actual confidence)
- Provenance accuracy scoring
- Response timing capture

### 4. Failure mode reporting
- Generate detailed failure reports showing:
  - What was expected vs what was produced
  - Which specific `must_contain`/`must_not_contain` criteria failed
  - Confidence calibration gaps

## Expected impact

- **protocol-reference**: 34 cases — will validate actual protocol guidance against ACLS/SSC guidelines
- **clinical-calculator**: 22 cases — will verify calculator outputs match expected values
- **drug-reference**: 9 cases — will check drug information accuracy
- **unit-conversion**: 6 cases — will validate conversion accuracy
- **shift-report**: 4 cases — will verify report format completeness
- **io-tracker**: 3 cases — will check I&O parsing accuracy
- **hello-nurse**: 2 cases — will validate greeting/safety disclaimer presence

Cases most likely to fail initially:
- `acls-*` cases: May miss specific algorithm steps
- `code-blue-*` cases: May not present both arrest algorithms
- `sepsis-*` cases: May have outdated SSC 2021 guidance

## Risk assessment

**Potential regressions**: None expected — this adds validation, doesn't change skill content.

**Model dependency**: Dynamic validation requires a model API endpoint. The harness should:
- Gracefully skip dynamic tests when no model is configured
- Report which tests were skipped vs which were actually executed
- Maintain backward compatibility with static validation

**Performance**: Dynamic tests will be slower than static validation. The harness should:
- Support parallel execution where possible
- Allow filtering by `--case`, `--skill`, or `--severity`
- Cache results where appropriate

## Files to modify

1. `optimization/product/eval-harness.sh` — Add dynamic execution mode
2. `optimization/product/clinical-constraints.yaml` — Add dynamic validation constraints
2. `optimization/product/safety-constraints.yaml` — Add dynamic validation constraints
3. `optimization/product/analysis/failure-modes.md` — Update with dynamic validation results