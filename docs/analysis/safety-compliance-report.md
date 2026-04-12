# Noah RN — Safety & Compliance Architecture Research Report

> Status: deep reference
> Role: detailed safety/compliance analysis and backlog input, not active control-plane guidance

**Date:** 2026-04-01
**Classification:** Internal — Engineering + Compliance
**Scope:** Clinical decision-support system safety, regulatory compliance, and production readiness

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Hook Coverage Analysis](#2-current-hook-coverage-analysis)
3. [Regulatory Framework Mapping](#3-regulatory-framework-mapping)
4. [Tier 2 Context-Aware Hooks Design](#4-tier-2-context-aware-hooks-design)
5. [Facility Policy Configuration System](#5-facility-policy-configuration-system)
6. [Audit Logging Architecture](#6-audit-logging-architecture)
7. [OpenFDA Response Version Pinning Strategy](#7-openfda-response-version-pinning-strategy)
8. [Regression Test Suite Design](#8-regression-test-suite-design)
9. [FHIR R4 Validation Against Real EHR Schemas](#9-fhir-r4-validation-against-real-ehr-schemas)
10. [HIPAA Compliance Documentation Checklist](#10-hipaa-compliance-documentation-checklist)
11. [Phased Implementation Plan](#11-phased-implementation-plan)

---

## 1. Executive Summary

Noah RN is a clinical decision-support agentic harness targeting critical care workflows. The system currently operates as a **Tier 1 safety layer** — deterministic, input/output validation hooks with no clinical context awareness. This is a solid foundation but insufficient for production deployment in a clinical environment.

**Key findings:**

- The 5 output validators (calculator, dosage, units, negation) and 1 input sanitizer cover ~40% of clinically significant failure modes
- The system likely qualifies as **FDA non-device CDS** under the 21st Century Cures Act §3060 (2016), as clarified in the January 2026 FDA guidance update — provided the nurse retains independent review capability
- Under IEC 62304, the system should be classified as **Class B** (non-serious injury possible from failure) with potential **Class C** escalation for dosage validation components
- HIPAA compliance requires a complete audit logging architecture that does not currently exist
- The OpenFDA integration has no response caching, version pinning, or staleness detection
- No facility-specific policy configuration exists — all thresholds are hardcoded in calculators

**Risk assessment:** The system is not production-ready without Tier 2 hooks, audit logging, facility policy configuration, and a documented risk management file per ISO 14971.

---

## 2. Current Hook Coverage Analysis

### 2.1 Architecture Overview

```
UserPromptSubmit ──→ sanitize-input.sh (prompt injection detection)
                        ↓
                   [Agent executes tools]
                        ↓
PostToolUse (Bash) ──→ validate-calculator.sh  (score range check)
                    ──→ validate-dosage.sh      (high-alert drug range check)
                    ──→ validate-units.sh       (mg/mcg, mL/L, kg/lbs cross-check)
                    ──→ validate-negation.sh    (DNR/DNI/NPO/allergy flagging)
```

### 2.2 What's Validated (Tier 1 — Deterministic)

| Hook | Trigger | What It Checks | Decision | Coverage |
|------|---------|---------------|----------|----------|
| `sanitize-input.sh` | UserPromptSubmit (all) | 16 prompt injection patterns | BLOCK | Good for injection, no clinical content validation |
| `validate-calculator.sh` | PostToolUse (Bash, clinical-calculators/) | Score within known min/max range per calculator | BLOCK | Covers all 10 calculators |
| `validate-dosage.sh` | PostToolUse (Bash, drug-lookup/) | Dose against drug-ranges.json typical/plausible ranges | BLOCK (extreme) / ADVISORY (atypical) | 18 high-alert drugs covered |
| `validate-units.sh` | PostToolUse (Bash, all) | Co-occurrence of mg+mcg, mL+L, kg+lbs in output | BLOCK | Catches 3 critical unit-confusion pairs |
| `validate-negation.sh` | PostToolUse (Bash, all) | DNR/DNI/NPO/NKDA/comfort-care language | ADVISORY (never blocks) | 7 negation categories |

### 2.3 What's NOT Validated (Gaps)

#### Critical Gaps (patient safety risk)

1. **No temporal plausibility checks** — A NEWS2 score calculated from vitals taken 6 hours apart would pass all hooks
2. **No cross-parameter consistency** — GCS 3 + patient "following commands" would pass
3. **No vital sign physiological plausibility** — HR 300, SBP 0, SpO2 105% all pass calculator range checks (they're within numeric bounds but clinically impossible)
4. **No drug-drug interaction checking** — Heparin + alteplase co-administration not flagged
5. **No renal/hepatic dose adjustment checking** — Morphine in renal impairment (noted in drug-ranges.json alert but not enforced)
6. **No weight-based dose verification** — Calculator says 70kg, drug lookup says 100kg, no cross-check
7. **No calculator-to-calculator consistency** — NEWS2 high + Braden low + RASS deep sedation without CPOT pain assessment
8. **No FHIR data freshness validation** — Stale lab values used in calculations
9. **No OpenFDA response staleness** — API returns current label but system has no concept of "last verified"
10. **No output completeness validation** — Calculator returns partial components without flagging

#### Moderate Gaps (operational risk)

11. **No audit trail** — Every tool invocation, hook decision, and clinical output is ephemeral
12. **No facility policy override** — All thresholds are universal, not configurable per hospital
13. **No session-level risk aggregation** — Multiple advisory warnings don't escalate
14. **No model hallucination detection for clinical text** — Free-text clinical summaries from the LLM are not validated
15. **No rate limiting or abuse detection** — Beyond OpenFDA's own 429 handling
16. **No patient identity verification** — FHIR queries use patient IDs without validation
17. **No change detection in knowledge files** — drug-ranges.json or protocol updates silently change behavior

### 2.4 Test Coverage

The hook test suite (`tests/hooks/test_hooks.sh`) covers:
- 6 sanitize-input tests (clean, injection, case-insensitive, empty, missing, malformed)
- 9 validate-calculator tests (non-Bash, non-calc, in-range, out-of-range, boundaries, unknown calc, error status)
- 6 validate-units tests (non-Bash, mg+mcg, mg-only, mL+L, kg+lbs, empty)
- 13 validate-dosage tests (non-Bash, non-drug, high-alert advisory, normal dose, high dose, extreme dose, unparseable, unit mismatch, equivalent units, non-high-alert, missing generic)
- 16 validate-negation tests (DNR, full code, NKA, NKDA, hold, NPO, DNI, comfort care, multiple findings, clean, empty, case-insensitive)
- 7 structural checks (hooks.json validity, metadata, drug classes, executability)

**Total: 57 tests. All pass.** Coverage is strong for Tier 1 but zero coverage for Tier 2 scenarios.

---

## 3. Regulatory Framework Mapping

### 3.1 FDA CDS Guidance (January 2026 Update)

The FDA revised its Clinical Decision Support Software guidance on January 6, 2026, superseding the 2022 version. Key implications for Noah RN:

**Likely EXEMPT from FDA regulation** under 21st Century Cures Act §3060 if all four criteria are met:

1. **Not intended to acquire, process, or analyze medical images** — ✅ Noah RN does not process images
2. **Intended for HCP review** — ✅ Designed for critical care nurses, not autonomous action
3. **Provides recommendations that HCP can independently review** — ✅ Calculators show component scores, drug lookups show source data
4. **Does not provide a single clinically appropriate recommendation without transparency** — ⚠️ **RISK**: The agent's synthesized shift reports could be interpreted as a single recommendation. The system must ensure the nurse sees the underlying data and reasoning.

**Action items:**
- Ensure every clinical output includes the raw calculator scores, component breakdowns, and data sources
- Add explicit "This does not replace clinical judgment" language to all outputs (already present in calculator scripts as comments but not surfaced to end user)
- Document the intended use statement clearly: "Decision support tool for licensed critical care nurses to assist with clinical calculations and drug reference lookup"

**If the system evolves to:** auto-administer doses, auto-escalate care without nurse confirmation, or interpret medical images — it crosses into FDA-regulated territory.

### 3.2 IEC 62304 Classification

**Recommended classification: Class B** with Class C considerations for dosage validation.

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| Clinical calculators (10) | Class B | Incorrect scores could lead to delayed recognition of deterioration (non-serious harm) |
| Drug lookup + dosage validation | Class C | Incorrect dosing of high-alert medications (heparin, insulin, vasopressors) could cause death or serious injury |
| Unit conversion | Class B | Unit errors could lead to wrong doses, but dosage validator provides mitigation |
| FHIR queries | Class B | Stale or incorrect data could lead to clinical decisions based on wrong information |
| Input sanitizer | Class A | Security function, not clinical |
| Negation validator | Class B | Missing DNR/DNI detection could lead to unwanted interventions |

**System-level classification: Class C** (highest component determines system class per IEC 62304 §4.3).

**Required IEC 62304 artifacts for Class C:**
- Software Development Plan (SDP)
- Software Requirements Specification (SRS) with traceability
- Software Architecture Design with module interfaces
- Risk Management File per ISO 14971
- Verification & Validation plan with unit-level test coverage metrics
- Independent review records
- Software Configuration Management plan
- Problem Resolution Process

### 3.3 ISO 14971 Risk Management

Required risk management process:
1. **Risk Analysis** — Identify hazards for each function (done partially in calculator comments)
2. **Risk Evaluation** — Assess severity and probability of harm
3. **Risk Control** — Implement mitigations (hooks are risk controls)
4. **Residual Risk Evaluation** — After hooks, what risk remains?
5. **Risk/Benefit Analysis** — Does the benefit of decision support outweigh residual risk?
6. **Risk Management Report** — Document the entire process

### 3.4 HIPAA Security Rule (45 CFR §164.312(b))

As a system that processes FHIR data (ePHI), Noah RN is subject to HIPAA if deployed at a covered entity or as a business associate. The 2026 Security Rule update emphasizes:
- Real-time monitoring capabilities
- Comprehensive audit controls
- Field-level access logging
- 6-year minimum retention

### 3.5 NIST CSF 2.0 Mapping

| NIST Function | Noah RN Current State | Required |
|---------------|----------------------|----------|
| IDENTIFY | Asset inventory (calculators, hooks, knowledge files) | Asset risk categorization, supply chain risk (OpenFDA) |
| PROTECT | Input sanitization, output validation | Access controls, encryption, training, data integrity |
| DETECT | None currently | Audit logging, anomaly detection, continuous monitoring |
| RESPOND | None currently | Incident response plan, communication plan |
| RECOVER | None currently | Recovery planning, improvements, communications |

---

## 4. Tier 2 Context-Aware Hooks Design

Tier 1 hooks are deterministic and context-free. Tier 2 hooks maintain session state and cross-reference multiple data sources.

### 4.1 Design Principles

1. **Never block on Tier 2** — Tier 2 hooks emit ADVISORY only; blocking decisions remain with Tier 1
2. **Stateless where possible** — Use session context passed through hook payload, not persistent storage
3. **Fast fail** — Timeout at 3 seconds; if context unavailable, pass through
4. **Composable** — Each hook checks one clinical rule; composition happens at the agent level

### 4.2 Proposed Tier 2 Hooks

#### 4.2.1 `validate-vitals-plausibility.sh`

**Trigger:** PostToolUse on clinical-calculators/

**Checks:**
- HR: 20-250 (not 0-300) — physiologically plausible range
- SBP: 40-280 (not 0-300)
- RR: 4-50 (not 0-60)
- SpO2: 50-100 (not 0-100)
- Temp: 30.0-43.0°C (not arbitrary)

**Rationale:** Calculator range checks accept mathematically valid but physiologically impossible values. A NEWS2 with HR=300 passes the calculator but should be flagged.

**Action:** ADVISORY — "Vital sign value [X] for parameter [Y] is outside physiologically plausible range. Verify data source."

#### 4.2.2 `validate-cross-parameter-consistency.sh`

**Trigger:** PostToolUse on clinical-calculators/ (maintains session context)

**Checks:**
- GCS ≤ 8 + no RASS assessment → flag missing sedation assessment
- NEWS2 ≥ 5 + no repeat assessment within session → flag required reassessment
- Braden ≤ 12 + no skin assessment documentation → flag
- CPOT > 0 + RASS ≤ -3 (deep sedation/unresponsive) → flag: "Patient deeply sedated; pain assessment may be unreliable"
- Wells PE/DVT high risk + no D-dimer or imaging reference → flag

**Action:** ADVISORY — "Clinical inconsistency detected: [description]. Consider [recommendation]."

#### 4.2.3 `validate-drug-interaction.sh`

**Trigger:** PostToolUse on drug-lookup/

**Checks:**
- Session-level drug list cross-reference
- Known high-risk pairs: heparin+alteplase, vasopressor+vasopressin, opioid+sedation
- Contraindication checking against documented allergies (from negation hook context)

**Data source:** Extend `clinical-resources/drug-ranges.json` with `interactions` array per drug, or create `clinical-resources/drug-interactions.json`.

**Action:** ADVISORY for moderate interactions, BLOCK for absolute contraindications (e.g., known allergy + drug).

#### 4.2.4 `validate-dose-adjustment.sh`

**Trigger:** PostToolUse on drug-lookup/

**Checks:**
- Renal impairment flag (from session context or FHIR creatinine/eGFR) → flag renally-cleared drugs (morphine, digoxin)
- Hepatic impairment flag → flag hepatically-metabolized drugs
- Age > 65 → flag Beers criteria medications
- Weight-based dose recalculation verification

**Action:** ADVISORY — "[Drug] requires dose adjustment for [renal/hepatic/age] impairment. Current dose may be inappropriate."

#### 4.2.5 `validate-fhir-freshness.sh`

**Trigger:** PostToolUse on fhir/

**Checks:**
- Observation timestamp vs. current time
- Flag if lab value > 24 hours old for acute decisions
- Flag if vital sign > 1 hour old for NEWS2 calculation

**Action:** ADVISORY — "FHIR data for [parameter] is [X] hours old. Consider obtaining current value before clinical decision."

#### 4.2.6 `validate-output-completeness.sh`

**Trigger:** PostToolUse on clinical-calculators/

**Checks:**
- All expected components present in calculator output JSON
- No null/missing component scores
- Interpretation field present and non-empty

**Action:** BLOCK if critical components missing; ADVISORY if optional components missing.

#### 4.2.7 `validate-session-risk-aggregation.sh`

**Trigger:** PostToolUse (runs last in chain)

**Checks:**
- Count of ADVISORY warnings in current session
- If ≥ 3 advisories → escalate to "review required" state
- If any BLOCK in session → prevent further tool use until resolved

**Action:** System-level risk state management.

### 4.3 Hook Execution Order

```
UserPromptSubmit
  └── sanitize-input.sh                    (Tier 1)

PostToolUse (Bash)
  ├── validate-calculator.sh               (Tier 1)
  ├── validate-output-completeness.sh      (Tier 2 — new)
  ├── validate-vitals-plausibility.sh      (Tier 2 — new)
  ├── validate-dosage.sh                   (Tier 1)
  ├── validate-drug-interaction.sh         (Tier 2 — new)
  ├── validate-dose-adjustment.sh          (Tier 2 — new)
  ├── validate-units.sh                    (Tier 1)
  ├── validate-negation.sh                 (Tier 1)
  ├── validate-fhir-freshness.sh           (Tier 2 — new)
  ├── validate-cross-parameter-consistency.sh (Tier 2 — new)
  └── validate-session-risk-aggregation.sh (Tier 2 — new)
```

---

## 5. Facility Policy Configuration System

### 5.1 Problem Statement

Different hospitals have different clinical thresholds, protocols, and formulary restrictions. Currently, all thresholds are hardcoded in calculator scripts. A nurse at Hospital A and Hospital B would get identical outputs even if their facilities have different escalation thresholds.

### 5.2 Design: Policy-as-Code

```
clinical-resources/
  policies/
    default.yaml              # Baseline (evidence-based defaults)
    facilities/
      hospital-a.yaml         # Overrides for Hospital A
      hospital-b.yaml         # Overrides for Hospital B
    templates/
      icu.yaml                # Unit-specific overrides
      ed.yaml
      med-surg.yaml
```

### 5.3 Policy Schema

```yaml
# clinical-resources/policies/default.yaml
_meta:
  version: "1.0.0"
  effective_date: "2026-04-01"
  source: "Evidence-based defaults"

calculators:
  news2:
    escalation_thresholds:
      urgent_review: 5        # Royal College of Physicians default
      emergency: 7            # Royal College of Physicians default
      single_parameter_three: true
    reassessment_frequency:   # Minutes
      low: 240                # q4h
      medium: 60              # q1h
      high: 15                # q15min

  braden:
    intervention_threshold: 18
    specialist_referral: 12
    reassessment_frequency:
      no_risk: 1440           # q24h
      at_risk: 480            # q8h
      high_risk: 240          # q4h
      very_high_risk: 120     # q2h

  gcs:
    intubation_threshold: 8   # GCS ≤ 8 = intubate (general default)
    icp_monitoring_threshold: 8

drug_ranges:
  source: "clinical-resources/drug-ranges.json"
  facility_formulary_overrides: "clinical-resources/policies/facilities/{facility_id}-formulary.yaml"

protocols:
  sepsis:
    fluid_bolus_ml_per_kg: 30
    antibiotic_window_minutes: 60
    lactate_remeasure_threshold: 2.0
```

### 5.4 Facility Override Example

```yaml
# clinical-resources/policies/facilities/hospital-a.yaml
_meta:
  facility_id: "hospital-a"
  facility_name: "Metro General Hospital"
  effective_date: "2026-03-15"
  approved_by: "Dr. Jane Smith, CMO"

calculators:
  news2:
    escalation_thresholds:
      urgent_review: 4        # Hospital A uses lower threshold
      emergency: 6            # More aggressive escalation
  gcs:
    intubation_threshold: 7   # Hospital A intubates at GCS ≤ 7

drug_ranges:
  overrides:
    heparin:
      typical_max: 20         # Hospital A uses lower max
    propofol:
      typical_max: 40         # Hospital A sedation protocol
```

### 5.5 Policy Resolution Logic

```
1. Load default.yaml (evidence-based baseline)
2. Load facility override (if facility_id set in environment)
3. Load unit override (if unit set in environment)
4. Deep merge: facility overrides > unit overrides > defaults
5. Validate merged policy against schema
6. Cache resolved policy for session duration
```

### 5.6 Policy Validation Hook

New hook: `validate-policy-compliance.sh`
- Runs on PostToolUse
- Checks calculator outputs against facility-specific thresholds
- Flags when output conflicts with facility policy
- Example: NEWS2 score of 5 triggers "urgent" at default but "emergency" at Hospital A

---

## 6. Audit Logging Architecture

### 6.1 What to Log

Based on HIPAA 45 CFR §164.312(b) and the 2026 Security Rule update:

#### Clinical Events (ePHI-adjacent)

| Event | Fields | Retention |
|-------|--------|-----------|
| Calculator invocation | timestamp, session_id, calculator_name, input_params (hashed), output_score, hook_decisions | 6 years |
| Drug lookup | timestamp, session_id, drug_name, lookup_result_summary, dosage_warnings | 6 years |
| FHIR query | timestamp, session_id, loinc_code, patient_id (hashed), result_count, data_freshness | 6 years |
| Hook decision | timestamp, hook_name, decision (block/advisory/pass), reason, tool_name | 6 years |
| Unit conversion | timestamp, session_id, from_unit, to_unit, from_value, to_value | 6 years |

#### Security Events

| Event | Fields | Retention |
|-------|--------|-----------|
| Session start | timestamp, session_id, user_id (hashed), source_ip, facility_id | 6 years |
| Session end | timestamp, session_id, duration, tool_count, hook_blocks | 6 years |
| Hook block | timestamp, hook_name, blocked_content_summary, reason | 6 years |
| Policy override | timestamp, facility_id, policy_key, default_value, override_value | 6 years |
| Knowledge file change | timestamp, file_path, old_hash, new_hash, changed_by | 6 years |

#### What NOT to Log

- Raw patient names, MRNs, or direct identifiers (hash them)
- Full FHIR response payloads (log summary only)
- Raw clinical notes (log that notes were accessed, not content)
- LLM prompt/response content (too verbose; log tool invocations instead)

### 6.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Noah RN Agent                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │Calculator│  │DrugLookup│  │  FHIR    │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       └──────────────┼──────────────┘                    │
│                      │                                   │
│              ┌───────▼────────┐                         │
│              │  Hook Chain    │                         │
│              │  (5 Tier 1 +   │                         │
│              │   7 Tier 2)    │                         │
│              └───────┬────────┘                         │
│                      │                                   │
│              ┌───────▼────────┐                         │
│              │ Audit Emitter  │──→ Local JSONL file     │
│              │ (async, non-   │──→ Syslog endpoint      │
│              │  blocking)     │──→ SIEM (Splunk/Elastic)│
│              └────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Log Format

```json
{
  "event_id": "evt_20260401_143022_a7f8d9e2",
  "timestamp": "2026-04-01T14:30:22.123Z",
  "event_type": "CALCULATOR_INVOCATION",
  "session_id": "sess_abc123",
  "user_id_hash": "sha256:8f4e3d2c...",
  "facility_id": "hospital-a",
  "resource": {
    "type": "calculator",
    "name": "news2",
    "input_hash": "sha256:input_params_hash",
    "output_summary": {"score": 7, "category": "high"}
  },
  "hook_decisions": [
    {"hook": "validate-calculator", "decision": "pass"},
    {"hook": "validate-vitals-plausibility", "decision": "advisory", "reason": "HR 150 at upper plausible limit"}
  ],
  "outcome": "SUCCESS",
  "source": "clinical-calculator-skill",
  "previous_log_hash": "sha256:c3b4a1f8..."
}
```

### 6.4 Storage Strategy

| Tier | Duration | Storage | Cost |
|------|----------|---------|------|
| Hot | 0-90 days | Local JSONL + Elasticsearch | $0.023/GB-month |
| Warm | 90 days-2 years | S3 Standard-IA | $0.0125/GB-month |
| Cold | 2-7 years | S3 Glacier Deep Archive | $0.00099/GB-month |

**Immutability:** S3 Object Lock (WORM) for warm and cold tiers. Hash chaining for tamper detection.

### 6.5 HIPAA-Specific Requirements

| Requirement | Implementation |
|-------------|---------------|
| Audit controls (164.312(b)) | All events above logged with hash chaining |
| Access logging (164.312(d)) | Session start/end, FHIR queries logged |
| Integrity controls (164.312(c)(1)) | SHA-256 hash chaining, S3 Object Lock |
| Transmission security (164.312(e)(1)) | TLS 1.3 for all log transmission |
| 6-year retention (164.530(j)) | Automated lifecycle policy to Glacier |
| Right to amend (164.526) | Amendment events logged with before/after |
| Breach notification (164.404) | Log access patterns support scope determination |

---

## 7. OpenFDA Response Version Pinning Strategy

### 7.1 Current State

The `lookup.sh` tool queries `api.fda.gov/drug/label.json` with no caching, no version pinning, and no staleness detection. Each invocation makes a live API call.

### 7.2 Risks

1. **API changes silently break parsing** — OpenFDA can change response schema without notice
2. **Label updates change clinical information** — A drug label updated between sessions changes the system's behavior without audit trail
3. **Rate limiting** — 429 responses degrade user experience
4. **Offline operation** — No network = no drug lookup

### 7.3 Recommended Strategy

#### 7.3.1 Response Caching with Version Pinning

```
clinical-resources/
  drug-labels/
    heparin/
      v2026-03-31.json        # Pinned response snapshot
      metadata.yaml           # API URL, hash, fetch date, checksum
    insulin/
      v2026-03-31.json
      metadata.yaml
    ...
  drug-labels-index.json      # Index of all pinned labels with versions
```

#### 7.3.2 Metadata Schema

```yaml
# clinical-resources/drug-labels/heparin/metadata.yaml
drug_name: "heparin"
api_url: "https://api.fda.gov/drug/label.json?search=(openfda.generic_name:%22heparin%22)&limit=1"
fetched_at: "2026-03-31T10:00:00Z"
response_hash: "sha256:a7f8d9e2c3b4..."
response_size_bytes: 45230
api_version: "2026-03-31"  # OpenFDA API version if available
label_effective_date: "2025-11-15"  # From label metadata
next_check_date: "2026-04-30"  # Monthly re-check
status: "current"
```

#### 7.3.3 Lookup Resolution Order

```
1. Check local pinned cache for drug
2. If cache exists and not stale (< 30 days):
   → Return cached response
3. If cache exists but stale (> 30 days):
   → Return cached response + ADVISORY: "Drug label last verified 30+ days ago"
   → Background: fetch fresh label, update cache if changed
4. If no cache:
   → Fetch from OpenFDA
   → Cache response with metadata
   → Return result
```

#### 7.3.4 Change Detection

When a fresh fetch differs from cached version:
1. Log the diff summary (what sections changed)
2. Alert: "Drug label for [X] has been updated since last verification"
3. Require manual review before adopting new label
4. Update `drug-ranges.json` if dosing ranges changed

#### 7.3.5 CI/CD Integration

```yaml
# .github/workflows/check-drug-labels.yml
name: Check OpenFDA Label Updates
schedule:
  - cron: '0 6 1 * *'  # Monthly on 1st at 6 AM UTC
jobs:
  check-labels:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for label updates
        run: |
          for drug in $(jq -r 'keys[]' clinical-resources/drug-ranges.json); do
            ./scripts/check-label-update.sh "$drug"
          done
      - name: Create PR if changes detected
        uses: peter-evans/create-pull-request@v6
```

---

## 8. Regression Test Suite Design Against Clinical Guideline Updates

### 8.1 Problem

Clinical guidelines change. NEWS2 scoring was updated in 2017. SSC sepsis bundle was updated in 2026. When guidelines change, calculator logic must be updated and verified. Currently, there is no mechanism to detect or test guideline drift.

### 8.2 Test Suite Architecture

```
tests/
  clinical-calculators/
    fixtures/
      news2/
        rcp-2017-cases.json      # Royal College of Physicians 2017 test cases
        boundary-cases.json       # Edge cases
        emergency-cases.json      # Cases that should trigger emergency response
      gcs/
        teeling-1974-cases.json   # Original GCS validation cases
      ...
    test-news2.sh
    test-gcs.sh
    ...
  clinical-guidelines/
    guideline-versions.json       # Tracks which guideline version each calculator implements
    change-log.md                 # Human-readable changelog of guideline updates
  regression/
    run-all.sh                    # Master regression runner
    compare-outputs.sh            # Compare current output against fixture baselines
```

### 8.3 Guideline Version Tracking

```json
// tests/clinical-guidelines/guideline-versions.json
{
  "news2": {
    "current_version": "RCP-2017",
    "source": "Royal College of Physicians — National Early Warning Score 2",
    "source_url": "https://www.rcplondon.ac.uk/projects/outputs/national-early-warning-score-news-2",
    "implemented_date": "2026-03-23",
    "next_review": "2027-03-23",
    "test_cases": 47,
    "pass_rate": "100%"
  },
  "gcs": {
    "current_version": "Teasdale-Jennett-1974",
    "source": "Teasdale G, Jennett B. Lancet 1974",
    "implemented_date": "2026-03-23",
    "next_review": "2027-03-23",
    "test_cases": 21,
    "pass_rate": "100%"
  },
  "sepsis-bundle": {
    "current_version": "SSC-2026",
    "source": "Surviving Sepsis Campaign 2026, CMS SEP-1",
    "implemented_date": "2026-03-23",
    "next_review": "2026-09-30",
    "protocol_file": "clinical-resources/protocols/sepsis-bundle.md"
  }
}
```

### 8.4 Test Case Format

```json
{
  "test_id": "news2-rcp-2017-001",
  "description": "Normal vitals — score 0",
  "input": {
    "rr": 16, "spo2": 98, "o2": "no", "temp": 37.0,
    "sbp": 120, "hr": 72, "avpu": "A"
  },
  "expected": {
    "score": 0,
    "category": "no elevation",
    "components": {
      "rr": {"score": 0}, "spo2": {"score": 0}, "o2_therapy": {"score": 0},
      "temperature": {"score": 0}, "sbp": {"score": 0}, "hr": {"score": 0}, "avpu": {"score": 0}
    }
  },
  "source": "RCP NEWS2 scoring table, 2017",
  "guideline_version": "RCP-2017"
}
```

### 8.5 Regression Test Runner

```bash
#!/usr/bin/env bash
# tests/regression/run-all.sh
# Run all clinical calculator tests against fixture baselines

set -euo pipefail

PASS=0
FAIL=0
CALCULATORS="news2 gcs nihss apache2 curb65 wells-pe wells-dvt braden rass cpot"

for calc in $CALCULATORS; do
    FIXTURE_DIR="tests/clinical-calculators/fixtures/$calc"
    [ ! -d "$FIXTURE_DIR" ] && continue

    for fixture in "$FIXTURE_DIR"/*.json; do
        while IFS= read -r case; do
            INPUT=$(echo "$case" | jq -r '.input | to_entries | map("--\(.key) \(.value)") | join(" ")')
            EXPECTED=$(echo "$case" | jq -r '.expected.score')

            ACTUAL=$(bash "tools/clinical-calculators/$calc.sh" $INPUT 2>/dev/null | jq -r '.score')

            if [ "$ACTUAL" = "$EXPECTED" ]; then
                PASS=$((PASS + 1))
            else
                FAIL=$((FAIL + 1))
                echo "FAIL: $calc — $(echo "$case" | jq -r '.description')"
                echo "  expected: $EXPECTED, got: $ACTUAL"
            fi
        done < <(jq -c '.[]' "$fixture")
    done
done

echo "Regression: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

### 8.6 Guideline Update Workflow

1. **Detection:** Monthly check of guideline sources (RCP, SSC, etc.) for updates
2. **Assessment:** Clinical team reviews changes, determines impact
3. **Implementation:** Update calculator logic and test fixtures
4. **Verification:** Run regression suite — all old test cases still pass (or are intentionally updated)
5. **Documentation:** Update `guideline-versions.json` and `change-log.md`
6. **Sign-off:** Clinical reviewer approves changes
7. **Deployment:** New version tagged and deployed

---

## 9. FHIR R4 Validation Against Real EHR Schemas

### 9.1 Current State

The FHIR tool (`mimic-loinc-query.sh`) queries a local FHIR server for Observation resources. It validates:
- Response is valid JSON
- Response is a Bundle resourceType
- LOINC-to-itemID mapping exists

**Missing:**
- FHIR R4 schema validation
- Required field checking
- Data type validation
- Reference integrity checking
- Profile conformance checking

### 9.2 FHIR R4 Validation Requirements

#### 9.2.1 Observation Resource Validation

The tool queries `Observation` resources. Per FHIR R4, an Observation must have:

```
Required fields:
  - resourceType: "Observation"
  - status: registered | preliminary | final | amended +
  - code: CodeableConcept (LOINC in our case)

Conditionally required:
  - value[x]: if status is final/amended
  - effective[x]: date/time of observation
  - subject: reference to patient

Common fields we use:
  - valueQuantity.value + valueQuantity.unit + valueQuantity.system + valueQuantity.code
  - referenceRange.low + referenceRange.high
  - interpretation: coding (L, N, H, HH, LL)
```

#### 9.2.2 Validation Hook Design

New hook: `validate-fhir-response.sh`

```bash
# Validates FHIR R4 Observation Bundle responses
# Checks:
# 1. Bundle structure (type=searchset, total, entry[])
# 2. Each entry is a valid Observation resource
# 3. Required fields present (status, code, subject)
# 4. valueQuantity has numeric value
# 5. LOINC code in code.coding[]
# 6. No null/missing required references

# Action: BLOCK if structural validation fails
#         ADVISORY if optional fields missing but usable
```

#### 9.2.3 Schema Validation Approach

Given the bash-based architecture, full JSON Schema validation is impractical. Three-tier approach:

1. **Structural validation (bash/jq)** — Check required fields, types, and structure
2. **Profile validation (external tool)** — Use `fhir-validator` or HAPI FHIR validator for full R4 conformance
3. **Integration testing (CI)** — Validate against real EHR test instances (Epic/Cerner sandboxes)

#### 9.2.4 Integration Test Design

```
tests/fhir/
  fixtures/
    epic-observation-bundle.json    # Real Epic FHIR R4 response
    cerner-observation-bundle.json  # Real Cerner FHIR R4 response
    hapi-observation-bundle.json    # HAPI FHIR server response
    malformed-bundle.json           # Invalid FHIR response
    empty-bundle.json               # Valid but empty search
  test-fhir-validation.sh           # Validates tool handles all fixtures correctly
```

#### 9.2.5 EHR-Specific Quirks to Handle

| EHR | Known Quirk | Mitigation |
|-----|------------|------------|
| Epic | Uses custom extensions for some fields | Ignore extensions, validate core FHIR |
| Cerner | Sometimes returns Bundle.type="collection" instead of "searchset" | Accept both types |
| HAPI | May return additional search parameters | Ignore unknown parameters |
| All | Patient references may be relative or absolute | Normalize before comparison |

---

## 10. HIPAA Compliance Documentation Checklist

### 10.1 Administrative Safeguards (164.308)

| # | Requirement | Status | Evidence Needed |
|---|------------|--------|-----------------|
| 10.1.1 | Security Management Process | ❌ | Risk analysis document, risk management plan, sanction policy |
| 10.1.2 | Assigned Security Official | ❌ | Designation letter for Security Officer |
| 10.1.3 | Workforce Security | ❌ | Background check policy, access authorization procedures |
| 10.1.4 | Information Access Management | ❌ | Role-based access control documentation |
| 10.1.5 | Security Awareness Training | ❌ | Training materials, completion records |
| 10.1.6 | Security Incident Procedures | ❌ | Incident response plan, reporting procedures |
| 10.1.7 | Contingency Plan | ❌ | Data backup plan, disaster recovery plan, emergency mode operation plan |
| 10.1.8 | Evaluation | ❌ | Periodic technical and nontechnical evaluation schedule |

### 10.2 Physical Safeguards (164.310)

| # | Requirement | Status | Evidence Needed |
|---|------------|--------|-----------------|
| 10.2.1 | Facility Access Controls | ⚠️ | Facility access plan (if self-hosted) |
| 10.2.2 | Workstation Use | ❌ | Workstation security policy |
| 10.2.3 | Workstation Security | ❌ | Physical security controls for workstations |
| 10.2.4 | Device and Media Controls | ❌ | Disposal, media reuse, accountability procedures |

### 10.3 Technical Safeguards (164.312)

| # | Requirement | Status | Evidence Needed |
|---|------------|--------|-----------------|
| 10.3.1 | Access Control (164.312(a)(1)) | ❌ | Unique user IDs, emergency access procedure, automatic logoff |
| 10.3.2 | Audit Controls (164.312(b)) | ❌ | Audit logging architecture (see Section 6) |
| 10.3.3 | Integrity Controls (164.312(c)(1)) | ❌ | Hash chaining, WORM storage, integrity verification |
| 10.3.4 | Person/Entity Authentication (164.312(d)) | ❌ | MFA, session management |
| 10.3.5 | Transmission Security (164.312(e)(1)) | ❌ | TLS 1.3 for all data in transit |

### 10.4 Organizational Requirements (164.314)

| # | Requirement | Status | Evidence Needed |
|---|------------|--------|-----------------|
| 10.4.1 | Business Associate Agreements | ❌ | BAA with any third-party service (OpenFDA is public, but FHIR server hosting needs BAA) |
| 10.4.2 | Business Associate Contracts | ❌ | Written contracts with all BAs |

### 10.5 Policies and Procedures (164.316)

| # | Requirement | Status | Evidence Needed |
|---|------------|--------|-----------------|
| 10.5.1 | Written Policies | ❌ | All security policies documented |
| 10.5.2 | Documentation Retention | ❌ | 6-year retention policy for all documentation |

### 10.6 Production Readiness Gates

**NOT READY for production until all ❌ items are resolved.**

Minimum viable production configuration:
1. Audit logging implemented (Section 6)
2. Access controls with unique user IDs
3. TLS encryption for all data in transit
4. BAA signed with any hosting provider
5. Risk analysis completed per ISO 14971
6. Incident response plan documented
7. Data backup and disaster recovery tested

---

## 11. Phased Implementation Plan

### Phase 1: Critical Safety Gaps (Weeks 1-3)

**Goal:** Close the highest-risk validation gaps

| Task | Effort | Priority |
|------|--------|----------|
| `validate-vitals-plausibility.sh` hook | 2 days | P0 |
| `validate-output-completeness.sh` hook | 1 day | P0 |
| `validate-session-risk-aggregation.sh` hook | 2 days | P0 |
| Audit logging emitter (local JSONL) | 3 days | P0 |
| Session ID generation and propagation | 1 day | P0 |
| Hook test coverage for new Tier 2 hooks | 2 days | P0 |
| **Total** | **11 days** | |

**Exit criteria:** All calculator outputs validated for physiological plausibility, completeness, and session-level risk aggregation. Audit log captures every tool invocation.

### Phase 2: Drug Safety Enhancement (Weeks 3-5)

| Task | Effort | Priority |
|------|--------|----------|
| `validate-drug-interaction.sh` hook | 3 days | P0 |
| `validate-dose-adjustment.sh` hook | 3 days | P1 |
| Drug interaction knowledge file (`drug-interactions.json`) | 2 days | P0 |
| OpenFDA response caching with version pinning | 3 days | P1 |
| Label change detection CI workflow | 1 day | P1 |
| **Total** | **12 days** | |

**Exit criteria:** High-alert drug interactions flagged, renal/hepatic dose adjustments checked, OpenFDA responses cached and versioned.

### Phase 3: FHIR and Clinical Consistency (Weeks 5-7)

| Task | Effort | Priority |
|------|--------|----------|
| `validate-fhir-freshness.sh` hook | 2 days | P1 |
| `validate-cross-parameter-consistency.sh` hook | 3 days | P1 |
| `validate-fhir-response.sh` (FHIR R4 structural) | 2 days | P1 |
| FHIR fixture tests (Epic/Cerner/HAPI) | 2 days | P1 |
| FHIR data freshness thresholds configuration | 1 day | P2 |
| **Total** | **10 days** | |

**Exit criteria:** FHIR responses validated for structure and freshness. Cross-parameter clinical inconsistencies flagged.

### Phase 4: Facility Policy System (Weeks 7-9)

| Task | Effort | Priority |
|------|--------|----------|
| Policy schema design and YAML files | 3 days | P1 |
| Policy resolution logic (default → facility → unit) | 3 days | P1 |
| `validate-policy-compliance.sh` hook | 2 days | P1 |
| Policy validation CI check | 1 day | P2 |
| Documentation for facility onboarding | 1 day | P2 |
| **Total** | **10 days** | |

**Exit criteria:** Facility-specific policy overrides functional. Policy compliance validated per hook execution.

### Phase 5: Compliance Documentation (Weeks 9-12)

| Task | Effort | Priority |
|------|--------|----------|
| Risk Management File (ISO 14971) | 5 days | P0 |
| IEC 62304 Software Development Plan | 3 days | P0 |
| Software Requirements Specification | 3 days | P0 |
| HIPAA Security Rule gap analysis and remediation | 5 days | P0 |
| BAA templates and vendor assessment | 2 days | P1 |
| Audit log retention and archival implementation | 3 days | P0 |
| Incident response plan | 2 days | P0 |
| **Total** | **23 days** | |

**Exit criteria:** All compliance documentation complete. HIPAA technical safeguards implemented. Risk management file approved.

### Phase 6: Regression Test Suite (Weeks 10-12, parallel with Phase 5)

| Task | Effort | Priority |
|------|--------|----------|
| Clinical calculator test fixtures (all 10 calculators) | 5 days | P0 |
| Guideline version tracking system | 2 days | P1 |
| Regression test runner | 2 days | P0 |
| CI integration (run on every PR) | 1 day | P1 |
| Guideline update workflow documentation | 1 day | P2 |
| **Total** | **11 days** | |

**Exit criteria:** All 10 calculators have test fixtures from source guidelines. Regression suite runs on every PR. Guideline update workflow documented.

### Summary

| Phase | Duration | Effort | Cumulative |
|-------|----------|--------|------------|
| Phase 1: Critical Safety | 3 weeks | 11 days | 11 days |
| Phase 2: Drug Safety | 2 weeks | 12 days | 23 days |
| Phase 3: FHIR & Consistency | 2 weeks | 10 days | 33 days |
| Phase 4: Facility Policy | 2 weeks | 10 days | 43 days |
| Phase 5: Compliance Docs | 3 weeks | 23 days | 66 days |
| Phase 6: Regression Tests | 2 weeks (parallel) | 11 days | 66 days |

**Total estimated effort: ~66 person-days (13 person-weeks for a single engineer)**

**Critical path:** Phases 1 → 2 → 3 → 4 → 5 (sequential), Phase 6 parallel with Phase 5.

**Realistic timeline with review cycles and clinical sign-off: 14-16 weeks.**

---

## Appendix A: Risk Register (Initial)

| ID | Risk | Severity | Probability | Mitigation | Residual |
|----|------|----------|-------------|------------|----------|
| R1 | Incorrect calculator score leads to missed deterioration | High | Low | Tier 1 + Tier 2 hooks, regression tests | Medium |
| R2 | Wrong drug dose administered based on lookup | Critical | Low | Dosage validator, drug interaction checks, version pinning | Medium |
| R3 | Unit confusion leads to 1000x dosing error | Critical | Low | Unit validator, dose adjustment checks | Low |
| R4 | Stale FHIR data used for clinical decision | Medium | Medium | FHIR freshness validator, data age advisories | Medium |
| R5 | Prompt injection leads to unsafe clinical advice | High | Low | Input sanitizer, output validators | Low |
| R6 | Facility policy mismatch causes protocol violation | Medium | Medium | Facility policy system, policy compliance hook | Low |
| R7 | OpenFDA label update changes dosing info silently | High | Low | Version pinning, change detection CI | Low |
| R8 | HIPAA breach via audit log exposure | Critical | Low | Encrypted logs, access controls, WORM storage | Low |
| R9 | LLM hallucination in clinical summary | High | Medium | Output validators, negation checks, human review requirement | Medium |
| R10 | System downtime during critical care event | High | Low | Offline mode (cached drug labels, local calculators) | Medium |

---

## Appendix B: Standards Reference

| Standard | Version | Relevance |
|----------|---------|-----------|
| FDA CDS Guidance | Jan 2026 | Determines FDA regulatory status |
| 21st Century Cures Act §3060 | 2016 | CDS exemption criteria |
| IEC 62304 | 2006+A1:2015 | Software lifecycle classification (Class C) |
| ISO 14971 | 2019 | Risk management framework |
| ISO 13485 | 2016 | Quality management system |
| HIPAA Security Rule | 45 CFR 164.312(b) | Audit logging requirements |
| HIPAA Privacy Rule | 45 CFR 164.502 | ePHI handling |
| NIST CSF 2.0 | 2024 | Cybersecurity framework |
| HL7 FHIR R4 | 4.0.1 | EHR data interchange |
| ISMP High-Alert Medications | 2026 | Drug safety reference |
| SSC Sepsis Guidelines | 2026 | Protocol reference |
| RCP NEWS2 | 2017 | Calculator reference |

---

*End of Report*
