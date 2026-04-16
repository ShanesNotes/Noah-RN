# Drug Reference — Freshness & Provenance

This directory is the Noah RN Lexicomp-mirror **scaffold** (v0). It is not a comprehensive pharmacology database. It exists to support the first medication-related agent workflows (five-rights verification, high-alert secondary-check) during the three-product alignment build-out.

## Scope

- **Included:** ~10–20 ICU-relevant drugs covering the first bedside workflow scenarios (pressors, diuretics, RSI medications, high-alert infusions, sedatives, anticoagulants).
- **Not included:** broad outpatient formulary, complete interaction tables, dynamic renal/hepatic dose calculators, full ISMP high-alert list.
- **Future:** Phase 5b expands the catalog; Phase 5c integrates a live drug-reference API (Lexicomp, FDA OpenData, or equivalent).

## Provenance discipline

Every drug entry carries a `provenance` block with:

- `source` — named source (Lexicomp, AHA ACLS, FDA label, UpToDate, etc.). **Do not author from memory.**
- `last_reviewed` — ISO date. If older than 12 months, surfaces with a staleness warning.
- `confidence_tier`:
  - `tier-1-national-guideline` — AHA, ACLS, Joint Commission, CDC, FDA label.
  - `tier-2-established-reference` — Lexicomp, UpToDate, Sanford, peer-reviewed reviews.
  - `tier-3-consensus` — expert opinion, institutional policy without clear national backing.

## High-alert flagging

High-alert status follows the ISMP (Institute for Safe Medication Practices) list. Entries with `high_alert: true` include a `high_alert_reason` that the five-rights workflow surfaces to the nurse for second-check prompts.

## Current entries

See [drugs/](drugs/).

## Out-of-scope disclaimers

- This scaffold is clinical decision support only. Nurses must verify against facility policy, current MAR, and patient-specific orders.
- Renal/hepatic adjustment strings here are narrative reminders, not computed dose calculators. Future phases may add computed dosing via a dedicated tool lane.
- LASA (look-alike/sound-alike) pairs are a seed set; a complete LASA list requires a dedicated source integration.
