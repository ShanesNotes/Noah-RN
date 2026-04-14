# UI resource ledger

Purpose: durable ledger of source materials for Noah-RN clinician UI synthesis.

## Medplum

### Medplum React components docs
- Source type: official docs
- URL/path: https://www.medplum.com/docs/react
- Feature area: chart shell / resource views / forms / auth
- What it shows: official React component surface, Mantine dependency, provider setup
- Why it may matter for Noah-RN: defines what can be reused vs wrapped
- What to steal: provider pattern, native components, search/resource primitives
- What not to steal: assumption that Medplum default UI alone is enough for professional nursing workflow
- Suggested owner surface: nursing-station
- Confidence: high

### Medplum charting docs
- Source type: official docs
- URL/path: https://www.medplum.com/docs/charting
- Feature area: chart shell / conditions / allergies / observations / notes
- What it shows: FHIR-native charting patterns and resource modeling
- Why it may matter for Noah-RN: maps clinician concepts to concrete FHIR resource choices
- What to steal: problem/allergy/observation/document modeling discipline
- What not to steal: assuming docs alone define a nurse-first UI
- Suggested owner surface: nursing-station + clinical-mcp
- Confidence: high

### Medplum task workflow docs
- Source type: official docs
- URL/path: https://www.medplum.com/docs/careplans/tasks
- Feature area: tasks / worklist / acknowledge states
- What it shows: Task resource lifecycle, performer/owner patterns, workflow operations
- Why it may matter for Noah-RN: direct substrate for assignment/worklist and result acknowledgement flows
- What to steal: explicit task states, performer routing, subscription-friendly lifecycle
- What not to steal: assuming Medplum enforces workflow semantics by itself
- Suggested owner surface: nursing-station + clinical-mcp
- Confidence: high

### medplum-provider repo
- Source type: repo code / example app
- URL/path: https://github.com/medplum/medplum-provider
- Feature area: chart shell / persistent nav / workspace composition
- What it shows: Medplum-backed custom workspace shape
- Why it may matter for Noah-RN: best public reference for wrapping Medplum into a fuller workspace
- What to steal: shell composition, routing, patient-summary integration patterns
- What not to steal: provider-specific assumptions not relevant to nursing station
- Suggested owner surface: nursing-station
- Confidence: high

### medplum-task-demo repo
- Source type: repo code / example app
- URL/path: https://github.com/medplum/medplum-task-demo
- Feature area: tasks / worklist
- What it shows: focused task lifecycle demo
- Why it may matter for Noah-RN: useful for assignment/work queue behavior
- What to steal: lean task interactions, role-aware worklist flows
- What not to steal: demo simplicity as final production UX
- Suggested owner surface: nursing-station
- Confidence: high

## Epic

### UIowa Epic Education — The Brain
- Source type: public training page
- URL/path: https://epicsupport.sites.uiowa.edu/epic-resources/brain
- Feature area: worklist / assignment timeline
- What it shows: timeline-oriented nursing task management concept
- Why it may matter for Noah-RN: strongest public proof for Brain-like assignment orientation
- What to steal: time-based clustered workload visualization, immediate shift bottleneck visibility
- What not to steal: enterprise-specific clutter or narrow local workflow assumptions
- Suggested owner surface: nursing-station
- Confidence: high

### UIowa Epic Education — Flowsheets
- Source type: public training page
- URL/path: https://epicsupport.sites.uiowa.edu/epic-resources/flowsheets
- Feature area: flowsheet / time-series charting
- What it shows: high-velocity structured charting patterns
- Why it may matter for Noah-RN: strongest public evidence for flowsheet mechanics and speed requirements
- What to steal: time-column logic, exception charting, audit visibility concepts
- What not to steal: exact legacy visual density if it harms readability
- Suggested owner surface: nursing-station
- Confidence: high

### UIowa Epic Education — MAR
- Source type: public training page
- URL/path: https://epicsupport.sites.uiowa.edu/epic-resources/medication-administration-record-mar
- Feature area: meds / MAR
- What it shows: medication administration workflow primitives
- Why it may matter for Noah-RN: strongest public MAR reference from Epic training material
- What to steal: due/overdue/given state visibility, barcode/override friction, med workflow hierarchy
- What not to steal: desktop-era clutter if not clinically necessary
- Suggested owner surface: nursing-station
- Confidence: high

### MultiCare inpatient nurse guided practice PDF
- Source type: public training PDF
- URL/path: https://static.multicare.org/photos/Education/EpicCrisisReliefContent/CrisisReliefInpatientNurseSelf-GuidedPractice.pdf
- Feature area: summary / MAR / chart review / inpatient workflow
- What it shows: broad inpatient nurse interaction patterns in Epic
- Why it may matter for Noah-RN: rich screenshot/workflow source for multiple surfaces
- What to steal: summary/handoff behaviors, state cues, navigation landmarks
- What not to steal: local hospital-specific details
- Suggested owner surface: nursing-station
- Confidence: high

### I-PASS sources
- Source type: AHRQ / institute / clinical handoff materials
- URL/path: https://www.ipassinstitute.com/ ; https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/ipass.html
- Feature area: notes / handoff
- What it shows: structured handoff framework
- Why it may matter for Noah-RN: strong external grounding for shift/handoff UI and generated artifact structure
- What to steal: illness severity + summary + action list + contingency structure
- What not to steal: academic handoff theory without direct workflow packaging
- Suggested owner surface: nursing-station
- Confidence: high

## OpenEMR

### Dashboard Context Manager docs
- Source type: official wiki + community thread
- URL/path: https://www.open-emr.org/wiki/index.php/OpenEMR_7_The_Dashboard_Context_Manager ; https://community.open-emr.org/t/introducing-dashboard-context-manager-tailoring-patient-views-to-your-clinical-workflow/26384
- Feature area: chart shell / role-based context views
- What it shows: dynamic widget sets by workflow context
- Why it may matter for Noah-RN: strongest open-source proof for role/context-aware clinical dashboards
- What to steal: context-sensitive dashboard rendering
- What not to steal: widget sprawl as default
- Suggested owner surface: nursing-station
- Confidence: high

### OpenEMR institutional module discussion
- Source type: community development thread
- URL/path: https://community.open-emr.org/t/new-institutional-module-is-it-time/26580
- Feature area: tracking boards / MAR / shift summary
- What it shows: modernized acute-care board ideas inside OpenEMR ecosystem
- Why it may matter for Noah-RN: best open-source source for acuity board / institutional workflow concepts
- What to steal: event-driven board thinking, integrated acuity/risk badges, automated shift summary patterns
- What not to steal: overly dense 15-column board defaults
- Suggested owner surface: nursing-station + clinician-dashboard support only if needed
- Confidence: medium-high

### NationNotes / LBV docs
- Source type: official wiki
- URL/path: https://www.open-emr.org/wiki/index.php/Nation_Notes ; https://www.open-emr.org/wiki/index.php/Sample_NationNotes_Form ; https://www.open-emr.org/wiki/index.php/LBV_Forms
- Feature area: notes / handoff / macros
- What it shows: contrast between rigid forms and macro-driven structured narrative entry
- Why it may matter for Noah-RN: useful prior art for note templates and handoff macro systems
- What to steal: component/macro hierarchy, shared structured note scaffolds
- What not to steal: rigid form-heavy experience as default narrative interface
- Suggested owner surface: nursing-station
- Confidence: high

### Clinical Decision Rules docs
- Source type: official wiki
- URL/path: https://www.open-emr.org/wiki/index.php/Clinical_Decision_Rules
- Feature area: reminders / alerts / care-gap detection
- What it shows: background rule engine for surfacing actionable reminders
- Why it may matter for Noah-RN: useful prior art for gap alerts and worklist prompting
- What to steal: rule-driven reminders close to workflow surface
- What not to steal: noisy low-value reminders that induce fatigue
- Suggested owner surface: nursing-station + clinical-mcp
- Confidence: high

## Existing Noah-RN doctrine

### UI/UX foundations caveman artifact
- Source type: internal synthesized doctrine
- URL/path: `docs/analysis/ui-ux-foundations-caveman.md`
- Feature area: all early foundations
- What it shows: compressed build doctrine for AI agents
- Why it may matter for Noah-RN: current highest-signal actionable summary
- What to steal: everything; this is the current working build brief
- What not to steal: n/a
- Suggested owner surface: all agents
- Confidence: high

### Medplum primary workspace note
- Source type: internal doctrine
- URL/path: `docs/foundations/medplum-primary-workspace-note.md`
- Feature area: architecture boundary
- What it shows: nursing-station vs clinician-dashboard split
- Why it may matter for Noah-RN: prevents shadow-EHR sidecar drift
- What to steal: strict ownership boundaries
- What not to steal: n/a
- Suggested owner surface: all agents
- Confidence: high
