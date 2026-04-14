# Feature matrix seeds

Purpose: first-pass extraction from Medplum + Epic + OpenEMR + Noah-RN doctrine before full matrix.

| Feature | Priority | Owner surface | Source inspiration | Build strategy | Verification seed |
|---|---|---|---|---|---|
| Persistent patient header | P0 | nursing-station | Epic header, Medplum charting, Noah doctrine | custom shell on top of Medplum data | header persists across route/tab changes; patient identity stable; no wrong-patient bleed |
| Overview page | P0 | nursing-station | Epic summary/SBAR, Medplum patient summary concepts | custom overview composed from Medplum resources | overview shows problems/vitals/labs/tasks/meds/gaps; empty-state sane |
| Assignment/worklist | P0 | nursing-station | Epic Brain, Medplum Tasks, OpenEMR tracking boards | custom task/worklist surface backed by Task + patient context | time-based clustering visible; due/urgent states visible; no low-signal clutter |
| Review vs acknowledge states | P0 | nursing-station + clinical-mcp | Epic results/accountability patterns, Medplum Tasks | explicit state model over results/orders/tasks | state transitions visible; audit/provenance written; escalation path definable |
| Provenance + draft/final review | P0 | nursing-station | Noah doctrine, Epic review discipline | custom review panel / artifact surface | AI outputs show source data, gaps, timestamps, draft/final state |
| Chart shell / nav | P0 | nursing-station | Epic chart review, OpenEMR DCM | custom shell with stable nav and role-aware extension later | route stable; nav low-click; patient context preserved |
| Trend-first vitals/labs | P1 | nursing-station (+ reuse dashboard chart pieces) | Epic flowsheets, OpenEMR sparklines, Medplum sampled data | wrap existing charting + custom compact trend widgets | sparkline/detail charts render; abnormal/highlight states visible |
| MAR-lite | P1 | nursing-station | Epic MAR, OpenEMR 5-day MAR grid | custom med admin/status surface using MedicationRequest/MedicationAdministration | due/overdue/given/held/refused visible; patient-specific med view coherent |
| Handoff surface | P1 | nursing-station | Epic I-PASS, OpenEMR NationNotes/shift summary | custom structured handoff/review UI | shift handoff artifact complete, printable/readable, provenance visible |
| Role/context-specific views | P2 | nursing-station | OpenEMR DCM, Epic role-specific navigators | configurable shell/view presets | role/context switch changes visible panels without breaking context |
| Flowsheet grid | P2 | nursing-station | Epic flowsheets | custom high-performance grid over Observations | batch edits possible; audit history reachable; time-column logic works |
| Block charting / titration | P2 | nursing-station | Epic/AACN block charting | specialized med admin workflow | grouped titration entry valid; effectivePeriod / note output sensible |
| Keyboard efficiency layer | P1/P2 | nursing-station | Epic shortcut culture, OpenEMR shortcuts | custom shortcut map | shortcuts discoverable and non-destructive |
| Dashboard-side observability reuse | P0 support | clinician-dashboard | existing Noah app | keep sidecar narrow; reuse trend/context components if helpful | dashboard does not become chart; sidecar only |

## Non-negotiable anti-patterns

- no second chart in clinician-dashboard
- no global patient session state
- no calendar/manual status board as primary throughput engine
- no billing/admin clutter in clinician-facing workspace
- no AI silent writeback
- no vague visual polish work without workflow proof
