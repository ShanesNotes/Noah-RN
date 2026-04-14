# Clinical Scenario Golden Tests

## Purpose

Golden test cases derived from 14 years of ICU clinical expertise. Regression safety nets for skill prompt changes. **Not automated** — Shane validates manually by invoking the skill with the input and comparing output against expected criteria.

These tests exist because a bad output from a clinical skill is not a UX problem — it is a patient safety problem. Every scenario here represents a clinical situation where getting the answer wrong has real consequences.

## Encounter Schema

The current format is **encounter-based**. Each file contains a full patient handoff in nurse-to-nurse voice, followed by multiple skills exercised naturally through the nursing workflow. This is the canonical format going forward.

```yaml
---
test_id: "encounter-NNN"
description: "One-line summary — archetype, key clinical features"
severity: critical                 # critical | moderate | low
patient_handoff: |
  [Full handoff in first-person nurse-to-nurse voice. Realistic vitals, labs,
  meds, lines. Written the way nurses actually talk — not a textbook vignette.]

skills_exercised:
  - skill: shift-report             # which skill to invoke
    trigger: "Exact prompt the nurse would type"
    must_contain:
      - concept_tag_snake_case      # concepts that MUST appear in output
    must_not_contain:
      - dangerous_omission_or_error # concepts that must NOT appear

  - skill: drug-reference
    trigger: "..."
    must_contain: [...]
    must_not_contain: [...]

  # ... additional skills ...

must_not_contain_anywhere:          # hard fails for every skill in this encounter
  - autonomous_clinical_decisions
  - fabricated_findings
  - diagnosis_or_prescribing
  - missing_safety_disclaimer

provenance:
  author: "shane"
  date: "YYYY-MM-DD"
  source: "lived_experience"        # lived_experience | knowledge_file | literature
result: null                        # fill in after review: pass | fail | partial
result_date: null
notes: |
  Clinical rationale, edge cases, historical context. What makes this scenario
  tricky. Why specific must_contain/must_not_contain tags were chosen.
---
```

### Field Reference

**`severity`** — clinical risk if any skill in this encounter gets the answer wrong:
- `critical` — patient safety risk. Non-negotiable. Must pass before any skill prompt change ships.
- `moderate` — clinical value degraded, but not immediately dangerous.
- `low` — polish or completeness issue.

**`must_contain`** — snake_case concept tags, not exact strings. The reviewer checks for the *concept* being addressed, not literal wording. `"blood_cultures_before_antibiotics"` passes if the output clearly communicates that cultures should be drawn before starting antibiotics, regardless of exact phrasing.

**`must_not_contain`** — same convention. These are hard fails. If the output contains the concept even implicitly, that is a failure.

**`must_not_contain_anywhere`** — hard fails that apply to every skill output in the encounter. These are the baseline safety floor.

**`result`** — filled in by Shane after manual review: `pass` | `fail` | `partial`

## How to Run a Scenario

1. Open the encounter YAML file.
2. Read the `patient_handoff` — this is the context for the session.
3. For each entry in `skills_exercised`, copy the `trigger` text and invoke the skill through the active agent harness (pi.dev) — e.g., `/shift-report` followed by the trigger, with the handoff as context.
4. Compare the output against `must_contain` and `must_not_contain` concepts for that skill.
5. After reviewing all skills, fill in `result`, `result_date`, and `notes` in the file.

A single encounter typically exercises 3–6 skills. Review them in the order listed — earlier skills may surface context that affects later ones.

## Directory Layout

```
tests/clinical-scenarios/
  README.md                              # this file
  MANIFEST.md                            # full scenario inventory with coverage summary
  encounters/                            # current format — encounter-based golden tests
    encounter-001-urosepsis.yaml
    encounter-002-stemi-arrest.yaml
    encounter-003-acute-stroke.yaml
    encounter-004-resp-failure-rsi.yaml
    encounter-005-pneumonia-medsurg.yaml
    encounter-006-icu-longstay-skin.yaml
    encounter-007-postop-dvt.yaml
    encounter-008-med-rec-unknown.yaml
    encounter-009-rapid-response.yaml
    encounter-010-drip-calc.yaml
    encounter-011-dka-insulin-drip.yaml
    encounter-012-hypertensive-emergency.yaml
    encounter-013-out-of-scope-edge-cases.yaml
    encounter-014-ards-ventilator-paralytic.yaml
  protocol-reference/                    # legacy — isolated per-skill scenarios
  drug-reference/                        # legacy — isolated per-skill scenarios
  clinical-calculator/                   # legacy — isolated per-skill scenarios
  shift-assessment/                      # legacy — isolated per-skill scenarios
  shift-report/                          # legacy — isolated per-skill scenarios
  io-tracker/                            # legacy — isolated per-skill scenarios
  unit-conversion/                       # legacy — isolated per-skill scenarios
```

The per-skill subdirectory files still exist but are **superseded by the encounter format**. New test cases go in `encounters/`. The legacy files remain as reference — they cover skill-isolated edge cases that may not appear in full encounter scenarios — but the encounter format is preferred because it tests skill outputs in clinical context, not in isolation.

`hello-nurse` is excluded from testing — it is an orientation skill with no clinical decision content to regression-test.

## Output Format Checks

In addition to clinical content checks, reviewers should verify these output standardization elements during manual review:

- [ ] Provenance footer present (noah-rn v0.2 | skill | source)
- [ ] Evidence citations inline (Source: [body] [year])
- [ ] Confidence tier labels present where applicable
- [ ] Disclaimer included (one of the 5-disclaimer pool)
- [ ] Copy-paste ready (no conversational preamble)

These are checked during manual review, not encoded in YAML must_contain tags (they are format requirements, not clinical content requirements).

## Targets

- **50 scenarios reached** (14 encounter-based + 36 legacy per-skill) — 2026-03-31 ✅
- **150+ encounters** over time as clinical edge cases surface
- Every production error or near-miss during development → immediate new encounter
- `severity: critical` encounters reviewed first on every skill prompt change
- Full manifest with coverage summary: [MANIFEST.md](MANIFEST.md)
