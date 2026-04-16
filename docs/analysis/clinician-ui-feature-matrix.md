# Clinician UI feature matrix

Purpose: concrete decision table for Noah-RN early clinician workspace development.

Legend:
- Priority: P0 now, P1 soon, P2 later, D defer
- Build strategy: reuse, wrap, custom, defer
- Owner: nursing-station, clinician-dashboard, clinical-mcp, shared
- Agent-native: none, later, early-inline

| Feature | Priority | Owner | Why now | Source inspirations | Build strategy | Agent-native | Playwright verification |
|---|---|---|---|---|---|---|---|
| Persistent patient header | P0 | nursing-station | biggest professional/workflow gain; reduces wrong-patient/context risk | Epic persistent header, Medplum charting, Noah doctrine | custom shell + Medplum data | none initially | sticky on scroll; persists across tab/route changes; screenshot baseline; a11y check |
| Chart shell / nav | P0 | nursing-station | current top-tab feel too demo-like | Epic chart review shell, OpenEMR DCM, Noah doctrine | custom shell, wrap Medplum content | later | route stability; no context loss; screenshot each nav state |
| Overview page | P0 | nursing-station | default chart entry must answer what matters now | Epic summary/SBAR, Medplum summary concepts | custom composed panel | later | all required summary blocks visible; empty-state sane; screenshot baseline |
| Assignment/worklist | P0 | nursing-station | professional nurse UX starts from assignment not raw patient browsing | Epic Brain, Medplum Task patterns, OpenEMR boards | custom | later | clustering visible; sorting/filtering work; screenshot + HAR |
| Review vs acknowledge state model | P0 | nursing-station + clinical-mcp | critical operational accountability primitive | Epic result/accountability patterns, Medplum Tasks | custom state model over FHIR resources | later | state transitions visible; provenance written; no silent state changes |
| Provenance + draft/final review | P0 | nursing-station | required for safe AI-assisted workflow | Noah doctrine, Epic review discipline | custom | early-inline | draft banner, attestation gate, final state visible |
| Missing-data / gaps indicators | P0 | nursing-station + clinical-mcp | clinical confidence depends on explicit absences | Noah doctrine, Medplum context assembly | wrap existing gap logic | none | gaps visible in overview/review surfaces |
| Trend-first vitals/labs | P1 | nursing-station (reuse dashboard chart pieces if useful) | needed for real review velocity after shell exists | Epic flowsheets, OpenEMR sparklines, Medplum sampled data | wrap + custom | later | sparklines/charts render; abnormal states visible |
| Results review panel | P1 | nursing-station | major daily nurse task | Epic results review, OpenEMR pending review queue | custom | early-inline for explain/summarize later | reviewed/unreviewed/critical states; no hidden fetch failures |
| MAR-lite | P1 | nursing-station | meds are core professional workflow after shell/worklist | Epic MAR, OpenEMR 5-day MAR grid | custom | later | due/overdue/given/held/refused states visible |
| Handoff surface | P1 | nursing-station | central Noah-RN differentiator | Epic I-PASS, OpenEMR NationNotes/shift summary | custom | early-inline | handoff sections complete; provenance visible; printable/readable |
| Task/action drafting | P1 | nursing-station | natural first inline agent action | Noah agent-native note, Epic action lists | custom micro-affordances | early-inline | draft/rewrite/suggest states visible |
| Notes editor w/ macros | P1 | nursing-station | supports structured but flexible documentation | OpenEMR NationNotes, Epic note efficiency ideas | custom | early-inline | textbox actions work; no silent writeback |
| Role/context-specific views | P2 | nursing-station | valuable after core flows stable | OpenEMR DCM, Epic role-specific navigators | configurable shell | later | switching contexts changes visible panels, not patient truth |
| Keyboard shortcut layer | P2 | nursing-station | efficiency multiplier after core shell stable | Epic shortcut culture, OpenEMR shortcuts | custom | none | shortcuts discoverable, non-destructive |
| Flowsheet grid | P2 | nursing-station | powerful but high complexity | Epic flowsheets | custom | later | batch edits, time columns, audit/review hooks |
| Block charting / titration | P2 | nursing-station | specialized ICU/high-acuity value | Epic/AACN block charting | custom | later | grouped titration entry valid; state/output coherent |
| Dual sign-off med actions | P2 | nursing-station | high-risk med workflow | Epic MAR patterns, OpenEMR institutional MAR | custom | none | second signer flow works and visible |
| Dashboard observability reuse | P0 support | clinician-dashboard | avoid re-building useful support surfaces | current Noah dashboard | keep narrow, selectively reuse internals | none | dashboard remains sidecar, not chart |
| Inline results explanation | D/P2 | nursing-station | useful but should follow explicit review model | agent-native direction note | custom | early-inline when enabled | explanation shown as draft/support, not fact |
| Chat-like omnibox agent shell | D | undecided | tempting but high derail risk | pi.dev inspiration only | defer | n/a | do not build now |

## Landed Status Snapshot

Landed in `apps/nursing-station/`:

- Persistent patient header
- Chart shell / nav
- Overview page
- Assignment/worklist
- Review vs acknowledge state model
- Provenance + draft/final review surface
- Results review panel
- Trend-first vitals/labs

Next sequenced lane:

- `MAR-lite`

## Non-negotiables

- no second chart in clinician-dashboard
- no global patient session state
- no calendar/manual status board as primary workflow engine
- no billing/admin clutter in clinician workspace
- no AI silent writeback
- no UI polish work without workflow proof
- no agent-native feature without explicit draft/approval/provenance states

## Immediate implementation stack

P0 build order:
1. persistent patient header
2. chart shell / nav
3. Overview page
4. assignment/worklist
5. review vs acknowledge states
6. provenance + draft/final review

P1 build order:
7. results review panel
8. trend-first vitals/labs
9. MAR-lite
10. handoff surface
11. task/action drafting
12. notes editor macro + agent affordances
