# Noah-RN UI/UX Foundations — caveman full

Purpose: AI agent brief. Early UI foundation only. Build from this first. Read long reports later only if blocked.

## 0. Core truth

- Medplum = canonical clinician workspace substrate.
- `apps/nursing-station/` = primary clinician-facing workspace.
- `apps/clinician-dashboard/` = sidecar runtime console / observability / agent-debug surface.
- `services/clinical-mcp/` = agent-facing context boundary. Agents no direct Medplum/FHIR calls.
- Epic = workflow north star.
- OpenEMR = open-source pattern quarry, not product template.
- Goal not “clone EHR”. Goal = professional nurse workstation + agent-native review/provenance.

## 1. Surface ownership

### nursing-station owns
- assignment/worklist
- patient chart shell
- persistent patient header
- overview / summary
- results review
- meds / MAR-lite
- tasks / acknowledgements
- notes / handoff review
- patient-scoped agent launch/review entry points

### clinician-dashboard owns
- context inspector
- evals
- traces
- runtime health
- terminal/operator support
- workflow debugging
- sidecar prototype panels

### clinical-mcp owns
- context assembly
- timeline shaping
- gap reporting
- token/context budgeting
- normalized FHIR query path

Do not blur these.

## 2. Substrate constraints

### Medplum constraints
- use Medplum as FHIR/auth/workspace backbone
- `@medplum/react` tied hard to Mantine
- Medplum versions move in lockstep; upgrade discipline matters
- search good for filtering; weak for complex relational sorting -> often sort client-side
- workflow engine not strict by default; UI/bots/profiles enforce workflow rules
- use task/subscription/bot patterns for asynchronous work
- use Patient `$everything` selectively; often too heavy for focused views

### Noah-RN current constraints
- current nursing-station already has patient list, chart, timeline/vitals/labs/meds/tasks tabs
- current dashboard already has context inspector, trend pieces, skill/runtime visibility
- known data gaps may include allergies, provider notes, active-state imperfections depending on dataset
- broad UI expansion before role boundaries settle = trap

## 3. Epic patterns worth stealing

### P0 steal now
- Brain-like assignment timeline / worklist orientation
- persistent patient header with high-signal context
- low-click chart navigation
- summary/handoff surface built around what changed + what matters now
- review vs acknowledge distinction
- alert tiering: hard-stop only for lethal/high-risk, passive warning otherwise

### P1 steal soon
- flowsheet speed principles: macros, exception charting, time-column logic, audit visibility
- MAR color semantics: due / overdue / given / held / refused
- dual sign-off workflows for high-risk meds
- printable “brain sheet” / handoff artifact support
- keyboard shortcuts for high-frequency actions

### P2 steal later
- block charting for titrated infusions
- role-specific navigators / configurable contexts
- mobile parity for med workflows
- AI draft notes/handoff generation with explicit nurse approval

### Epic things to NOT copy literally
- enterprise sprawl
- too many hard-stop advisories
- giant module maze
- hidden navigation complexity
- brittle training-dependent workflows

## 4. OpenEMR patterns worth stealing

- Dashboard Context Manager: role/context-specific widget sets
- direct summary -> detail edit jumps
- ED/institutional tracking board patterns
- inline sparklines in worklists/results
- NationNotes-style macro/template hierarchy
- automated reminders/rule engine surfacing actionable gaps
- 5-day rolling MAR grid ideas
- explicit non-compliant med outcome states + reason capture
- PIN re-auth / lightweight re-auth for critical actions

## 5. OpenEMR baggage to reject

- global patient session state / tab bleed
- calendar-driven status boards requiring manual double-entry
- rigid form-heavy documentation as primary UX
- PHP-era architecture assumptions
- billing/admin clutter on clinician surfaces
- cluttered all-in-one dashboard default

## 6. Design north star

Desired feeling:
- Epic-grade workflow clarity
- Medplum-backed data correctness
- OpenEMR useful primitives only
- Noah-RN-specific agent review/provenance strengths
- progressively agent-native clinician surfaces

Translation:
- minimal surface
- dense context
- explicit contracts
- fast triage
- low click-count
- strong state visibility
- safe review/writeback boundaries
- inline agent affordances where they shorten real nurse work

## 6.5 Agent-native frontend direction

Do not treat agent-native architecture as backend-only.
Frontend must become agent-friendly over time.

### first surfaces to make agent-native
- handoff editor
- note editor
- results review rationale
- task/action drafting

### smallest safe inline agent actions
- summarize
- structure
- rewrite
- explain
- draft from current patient context

Not first:
- autonomous silent chart write
- hidden agent state changes
- chat-only sidecar replacing real workflow surfaces

### explicit UI states required
- human text
- AI draft
- AI edited
- human approved
- finalized
- source-backed
- missing data / unsupported

### principle
Not “chat bolted onto EHR.”
Goal = core clinician surfaces become safely agent-augmentable.

## 7. P0 foundation build set

Build these first. No debate.

### P0.1 persistent patient header
Must show:
- name
- MRN / patient ID
- age / sex
- room/location if present
- code status if present
- allergies summary if present
- attending/service if present
- latest vitals timestamp

Why:
- strongest professional-feel gain
- reduces wrong-patient/context slips

### P0.2 clinician chart shell
Replace top-tab-only feel with clearer shell:
- left rail or strong chart nav
- Overview default landing view
- stable route model

Recommended nav set:
- Overview
- Timeline
- Results
- Meds
- Tasks
- Notes
- Handoff
- Context / AI

### P0.3 overview page
Default chart entry should be Overview, not raw timeline.

Overview should include:
- active problems
- latest/abnormal vitals snapshot
- critical labs / deltas
- current meds / due meds summary
- pending tasks
- handoff/watch items
- missing-data warnings
- launch/review agent affordance

### P0.4 assignment/worklist
Need global nurse work surface:
- My patients
- pending tasks
- new/critical results
- due meds / overdue meds
- handoff due / discharge blockers

This is where professional feel starts. Not patient-first only.

### P0.5 results review state
Need explicit state model:
- unseen
- reviewed
- acknowledged/actioned

Use for:
- critical labs
- new orders
- major result changes

### P0.6 provenance + draft/final split
Every AI-generated artifact must show:
- source resources used
- timestamps
- gaps/missing data
- confidence/completeness note
- draft vs final state

No silent writeback.

## 8. P1 build set

- richer vitals/lab trends with sparklines + detail charts
- MAR-lite with due/overdue/given/held/refused states
- macro/template-backed handoff/note drafting
- role/context-specific dashboard variants
- keyboard shortcut layer for high-frequency actions
- direct summary -> detail drill-in everywhere

## 9. P2 build set

- flowsheet grid for high-velocity charting
- block charting/titration support
- dual sign-off for high-risk med actions
- mobile/bedside med workflow support
- richer rule-engine alerting / protocol-driven task generation

## 10. Data/runtime blockers

Before building fancy surfaces, verify:
- allergies availability
- provider note availability
- MedicationAdministration quality/completeness
- task/status semantics in real data
- location/room/service data quality
- code status representation

UI must degrade gracefully if these absent.

## 11. Build rules for AI agents

### do
- start in nursing-station for clinical workspace changes
- keep dashboard sidecar-focused
- reuse Medplum primitives when they save time
- wrap Medplum, do not fight it blindly
- prefer composable shell + custom panels over giant bespoke EHR rewrite
- make every state explicit: unseen/reviewed/acknowledged, due/overdue/given, draft/final
- design for high-frequency nurse actions first

### do not
- build a second EHR in clinician-dashboard
- import OpenEMR complexity wholesale
- use global/shared patient session assumptions
- hide critical workflow state in background logic only
- ship visual inspiration with no workflow reason
- force headed-only browser testing flows

## 12. Playwright dev/QA rules

Playwright is mandatory substrate for UI verification.
Use it as dev instrument, verification framework, evidence generator.

### default mode
- headless by default for CI/smoke/regression
- headed optional for review/demo capture
- Chromium primary target
- viewport default = 1920x1080 clinical workstation

### required artifact loop
For each meaningful UI change, agent should be able to produce:
- screenshot(s)
- current URL/title
- console warnings/errors
- failed requests
- DOM/body evidence
- accessibility audit when surface is clinician-facing
- trace/HAR when workflow is multi-step or data-heavy
- optional video/GIF for workflow changes

### required checks
For patient/workspace changes, verify:
- correct route opens
- patient header stays persistent across nav and scroll
- target panels render with expected data or empty-state copy
- no silent fetch/auth failures
- new states visible (reviewed, acknowledged, due, overdue, etc.)
- no major console/network regressions
- color is not sole indicator for acuity / risk / alert states

### Medplum-specific rules
- wait for skeleton/data resolution before screenshoting
- prefer response-gated waits on `/fhir/R4/` or equivalent API calls
- mask dynamic timestamps/live values in screenshots
- use fresh isolated browser context by default
- preserve auth state only when test requires it

### preferred workflow
- inspect in browser before editing
- patch smallest thing
- rerun Playwright smoke/targeted flow
- keep artifacts under repo-local path
- if visual workflow changed, capture before/after evidence
- if workflow changed, save trace or structured evidence bundle

## 13. Initial implementation order

1. persistent patient header
2. chart shell/nav cleanup
3. Overview page
4. assignment/worklist
5. result review states
6. provenance/draft-final review panel
7. trend upgrades
8. MAR-lite
9. handoff/note macro surface

## 14. Acceptance bar for early foundations

Early UI foundation pass succeeds if:
- workspace feels like one coherent clinician shell, not a demo tab set
- wrong-patient/context risk reduced by persistent header + stable nav
- nurse can answer fast:
  - who is this?
  - what changed?
  - what needs action now?
- agent outputs are reviewable, sourced, and non-silent
- dashboard remains sidecar, not shadow chart

## 15. One-line thesis for agents

Build Epic-like workflow clarity on Medplum substrate, steal OpenEMR primitives not baggage, keep Noah-RN agent-native where provenance/review matter most.
