---
name: five-rights-verification
skill_version: "0.1.0"
description: >-
  This skill should be used when the user asks to "verify medication", "five rights",
  "5 rights", "check med", "right patient right drug right dose right route right time",
  "high-alert check", "second check", "LASA verification", or requests pre-administration
  medication verification for a scheduled, PRN, or newly ordered medication.
scope:
  - medication_safety
  - five_rights
  - high_alert_verification
  - clinical_documentation
complexity_tier: moderate
required_context:
  mandatory_one_of:
    - patient_id
    - clinical_narrative
  optional:
    - medication_request_id
    - medication_administration_task_id
    - nurse_narrative
knowledge_sources:
  - drug-reference
limitations:
  - adult_patients_only
  - does_not_replace_clinical_judgment
  - does_not_administer_medications
  - does_not_calculate_weight_based_doses_outside_drug_reference
  - requires_human_nurse_attestation_before_administration
contract:
  you_will_get:
    - explicit checklist of the five rights with pass / flag / fail per right
    - high-alert handling including second-nurse-check prompt when applicable
    - drug-reference citation with freshness warning if the entry is stale
    - structured verification artifact suitable for attaching to a draft Task
  you_will_not_get:
    - administration of the medication
    - dose recalculation beyond what the drug reference publishes
    - authoritative facility-policy verification (deferred to facility protocol)
    - finalized MedicationAdministration writes — those require human nurse attestation
  controllable_fields:
    - strict_mode: true | false (default false; true requires all five rights to pass before the artifact is produced)
    - acuity_level: icu | med-surg (inferred from patient context when not supplied)
  use_when:
    - a nurse is about to administer a scheduled or PRN medication
    - a high-alert medication requires a second-nurse verification
    - a new medication order needs pre-administration review
  do_not_use_when:
    - rapid-response or code-team drug push is happening right now — verify verbally, chart after
    - the user is asking for a drug reference lookup without a specific patient or administration
completeness_checklist:
  - right_patient
  - right_drug
  - right_dose
  - right_route
  - right_time
  - high_alert_handling
  - allergy_check
hitl_category: "II"
---

# Five-Rights Medication Verification

Pre-administration verification of a scheduled or newly ordered medication against the five rights of medication safety (right patient, right drug, right dose, right route, right time) plus high-alert handling and allergy cross-check.

This skill is the first concrete medication workflow in the three-product alignment plan. It proves the end-to-end round-trip across Product A (harness workflow), Product B (clinical-MCP `get_patient_context` + `get_medication_list` + `queue_draft_task` tools), and the drug-reference subordinate lane (`lookup_drug`). It does not administer the medication. The output is a verification artifact the nurse reviews at the bedside before charting the administration.

> **Conventions**: This skill follows `packages/workflows/CONVENTIONS.md` for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, and universal rules.

> **Framework**: ISMP 5-Rights + high-alert secondary-check convention. Verification is rule-based with explicit pass / flag / fail per right; the nurse is always the final authority.

## Workflow

### Step 1: Receive Input

Mandatory: either a `patient_id` (enables `get_patient_context` + `get_medication_list`) or a `clinical_narrative` describing the patient and the medication order.

Optional:
- `medication_request_id` — the specific scheduled order to verify. If omitted in `patient_id` mode, the most-overdue or next-due scheduled order is selected.
- `medication_administration_task_id` — a draft-review Task to attach the verification artifact to via `Task.output`.
- `nurse_narrative` — free-text context the nurse wants preserved (e.g. "patient just ate", "right IV line infiltrated").

### Step 2: Assemble Context

1. Call `get_patient_context` with `patient_id` to retrieve identity, active conditions, allergies, and the relevant timeline.
2. Call `get_medication_list` with `patient_id` (filter: active) to retrieve scheduled orders, recent administrations, and inline high-alert flags.
3. Identify the target `MedicationRequest` by `medication_request_id` if supplied, otherwise select the next-scheduled or most-overdue entry.
4. Call `lookup_drug` with the medication's generic name to retrieve the drug-reference entry (dose range, routes, high-alert status, contraindications, key monitoring, LASA pairs). Surface any staleness warnings.

### Step 3: Run the Five Rights

For each right, record `pass` (matches cleanly), `flag` (suspicious — surface to nurse), or `fail` (clearly mismatched — block administration).

#### 3.1 Right Patient
Pass if: `get_patient_context.patient.id` matches the scope of this invocation AND the patient name/DOB reconciles with two identifiers (chart ID + name + DOB where available).
Flag if: only one identifier is available, or allergy list contains the drug's class.
Fail if: patient identity cannot be confirmed against the order's subject reference.

#### 3.2 Right Drug
Pass if: the `MedicationRequest.medicationCodeableConcept.text` matches the drug-reference `generic_name` or one of `brand_names`.
Flag if: drug-reference match is against a `lasa_pairs` entry — highlight the LASA pair and request bedside confirmation.
Fail if: no drug-reference entry matches.

#### 3.3 Right Dose
Pass if: the `dosageInstruction.text` or `dosageInstruction.doseAndRate` value is within the drug-reference `adult_dose` range (interpreted narratively — the skill does not compute weight-based doses beyond what the drug reference publishes).
Flag if: the value is at or near the `max_dose` threshold, or the patient has an indication for `renal_adjustment` / `hepatic_adjustment`.
Fail if: the value exceeds `max_dose` or falls below a minimum documented in the entry.

#### 3.4 Right Route
Pass if: the `dosageInstruction.route` is one of the drug-reference `routes`.
Flag if: the route is listed but less common for this drug / indication.
Fail if: the route is not in the allowed list.

#### 3.5 Right Time
Pass if: scheduled administration time falls within the standard window (± 30 min for scheduled; PRN must have appropriate inter-dose interval from `key_monitoring` / `adult_dose` frequency).
Flag if: an administration of the same drug occurred within the minimum interval.
Fail if: the order is expired, held, or the previous dose occurred inside a contraindicated interval.

### Step 4: High-Alert Handling

If the drug-reference entry has `high_alert: true`:
- Surface the `high_alert_reason` prominently in the artifact.
- Require an explicit "second-nurse check" field — the artifact includes a TODO for the second-nurse signature/initials.
- For insulin and heparin specifically, require concentration verification to be called out.
- For paralytics (rocuronium, succinylcholine), verify the induction sedative plan is documented.

### Step 5: Allergy Cross-Check

If `get_patient_context.patient` reports any allergies, cross-reference against the drug-reference entry's `drug_class`. Any class match is a `fail` on Right Patient.

### Step 6: Produce the Verification Artifact

Render a structured Markdown + JSON artifact with the following sections:

```
PATIENT
- Name / Chart ID / DOB
- Allergies

DRUG
- Generic / brand / class
- High-alert status (if applicable)
- Drug-reference source + last_reviewed + staleness warning if >12 months

VERIFICATION (5 RIGHTS)
- Right Patient: pass | flag | fail — rationale
- Right Drug: pass | flag | fail — rationale
- Right Dose: pass | flag | fail — rationale
- Right Route: pass | flag | fail — rationale
- Right Time: pass | flag | fail — rationale

HIGH-ALERT HANDLING (if applicable)
- Reason
- Second-nurse check: [required — awaiting signature]
- Concentration verification: [text]
- Induction sedative plan: [text]

ACTIVE FLAGS (sort: fail > flag > pass)
- [!] ...

EVIDENCE
- Sources consulted
- FHIR queries fired
- Drug reference entry
- Patient context assembled at

CONFIDENCE
- Right Patient / Drug / Route / Time: Tier 1 (deterministic checks)
- Right Dose: Tier 2 (narrative range — not a weight-based computation)
- High-alert handling: Tier 1 ISMP list + Tier 3 facility-specific (deferred)
```

### Step 7: Optional — Queue Draft Review Task

If the invocation carries `medication_administration_task_id`, call `queue_draft_task` to create a `Task(code=verify-administration)` linked to the `MedicationAdministration` draft. The Task's `input` carries the verification artifact's JSON body.

If the invocation does NOT carry a Task ID, return the artifact for display. The nurse or a downstream flow decides whether to persist it.

## Evidence & Confidence

- Five-rights checks against drug-reference are Tier 1 (deterministic match against named fields).
- Dose-in-range is Tier 2 (narrative comparison; the skill does not compute weight-based doses beyond published values).
- High-alert list membership is Tier 1 (ISMP).
- Second-nurse-check requirement language is Tier 3 (facility-specific — the artifact flags it, never asserts it's been done).
- Output is clinical decision support. The nurse is the final authority on whether to administer.

## Important Rules

- **Never administer.** This skill never writes a finalized `MedicationAdministration`. The harness cannot — Product B's `chartMedicationAdministration` rejects agent performer references at the write boundary.
- **Never suppress a flag.** If any right is `flag` or `fail`, the artifact surfaces it even when strict_mode is false.
- **Always include drug-reference provenance.** The nurse reviewing the artifact must be able to see source and freshness at a glance.
- **Preserve nurse narrative.** If `nurse_narrative` is supplied, include it verbatim in the artifact's EVIDENCE section.
- **Allergy trumps everything.** A class-level allergy match is always a `fail` on Right Patient, never a flag.
