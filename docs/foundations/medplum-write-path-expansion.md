# Medplum Write-Path Expansion Spec

## Purpose

Generalize the FHIR write surface beyond `createDraftShiftReport()` so Contract 5 (Charting Policy and Provenance) has an L3 destination for every resource the first bedside workflow demands. Produce a spec — shapes, authority-state mapping, staged implementation plan — not runtime code.

This is the L3 counterpart to the L0 engine decision. Lane D (charting authority + provenance) cannot start until this surface is designed.

## Trigger

Three converging pressures force this now:

1. **Audit finding.** `services/clinical-mcp/src/fhir/writes.ts` has 1 real export (`createDraftShiftReport`) and 3 stubs returning `Promise<never>` (`queueDraftTask`, `queueDraftMedicationAdministration`, `recordDraftProvenance`). Shift-report is the only FHIR-queued path.
2. **Contract 5 demands it.** Six authority states (observe / propose / prepare / execute / attest / escalate), three status distinctions (preliminary / final / amended), Provenance on every entry. Cannot be implemented against a write surface that only handles DocumentReference.
3. **First bedside workflow demands it.** `docs/foundations/first-bedside-workflow-spec.md` requires writes across Observation (vitals, I/O), MedicationAdministration (Lasix, pressors, RSI meds), Procedure (intubation), DocumentReference (narrative + escalation), Task (review queue), Communication or Task (provider consult), and Provenance on all of them.

## Governing alignment

- `docs/foundations/foundational-contracts-simulation-architecture.md` — Contract 5 (primary), Contract 6 (intervention closure → write triggers), Contract 7 (obligation resolution → write triggers), Contract 8 (eval reads the chart).
- `docs/foundations/medplum-draft-review-lifecycle.md` — the Task + preliminary-DocumentReference pattern this spec generalizes.
- `docs/foundations/medplum-draft-policy-proof.md` — empirical findings on preliminary-resource visibility in Medplum search.
- `docs/foundations/medplum-shift-report-contract.md` — the first concrete implementation to generalize from.
- `docs/foundations/medplum-rails-noah-runtime.md` — Medplum = clinician request/review plane; Noah RN = runtime plane.
- `docs/foundations/medplum-primary-workspace-note.md` — Medplum primacy principle.
- `docs/foundations/first-bedside-workflow-spec.md` — acceptance scenario.
- `services/clinical-mcp/src/fhir/writes.ts` — current surface.

## Scope of this spec

**In scope**

- FHIR resource set required by Contract 5 + the first workflow
- Authority-state → FHIR-operation mapping
- Provenance shape for every write type
- Generalization of the Task-as-review-queue pattern from shift-report to all draft-requiring writes
- `charting_policy` (amendment D3) configuration shape
- Staged implementation plan with lane dependencies

**Out of scope**

- Runtime implementation itself — Lane D deliverable
- Specific LOINC/SNOMED codings for each entry type — clinical-content decision, not architecture
- Nurse-facing UI for draft review — `apps/nursing-station/` territory
- FHIR SearchParameter authoring for `doc-status` queries — already proven in `medplum-draft-policy-proof.md`
- Medplum AccessPolicy design — deferred until first multi-actor scenario
- HAPI vs Medplum routing — not this decision

## Current state audit

### Exists

- `createDraftShiftReport(input)` — writes `DocumentReference` with `docStatus: preliminary`, LOINC `28651-8` + Noah-custom coding, base64 markdown attachment, optional Encounter context link.
- `fhirPost<T>(resourceType, payload)` in `services/clinical-mcp/src/fhir/client.ts` — generic write primitive.
- `Task` poller in `services/clinical-mcp/src/worker/shift-report-worker.ts` — reads requested Tasks, invokes agent, writes draft, closes Task with output reference.
- FHIR resource types in `services/clinical-mcp/src/fhir/types.ts` — DocumentReference, MedicationAdministration, Provenance, Task declared; Observation, Procedure, Communication, Encounter likely present or extendable.

### Stubs

- `queueDraftTask(input)` — returns `Promise<never>`
- `queueDraftMedicationAdministration(input)` — returns `Promise<never>`
- `recordDraftProvenance(target)` — returns `Promise<never>`

### Gaps

- No Observation write (vitals, I/O, lab-backed entries)
- No Procedure write (intubation, line placement)
- No Communication write (provider consult requests, inter-actor messages)
- No Encounter lifecycle (open/close on scenario start)
- No Provenance write at all (stubbed)
- No authority-state tagging on any write
- No amendment path for `preliminary` → `final` promotion
- No escalation-specific surface

## Contract 5 authority states → FHIR operations

Six authority states from Contract 5 § Invariants. Each maps to a specific FHIR operation pattern. This is the normative table.

| Authority state | FHIR operation | Resource status | Task involvement | Provenance activity.code |
|-----------------|----------------|-----------------|------------------|--------------------------|
| `observe` | no write; read-only attribution for agent/nurse's awareness | — | — | — (not a write) |
| `propose` | POST preliminary resource + POST Task(requested, focus→resource) | `preliminary` | required: nurse review queue | `CREATE` + note `agent-proposed` |
| `prepare` | POST preliminary resource (no Task if nurse is already present at bedside) | `preliminary` | optional | `CREATE` + note `agent-prepared` |
| `execute` | POST final resource directly | `final` | — | `CREATE` + note `agent-executed-with-policy` |
| `attest` | PATCH or PUT resource from `preliminary` → `final` by nurse/provider; or POST a new Provenance.target attached to existing resource | `final` | Task completed | `CREATE` (new Provenance) or `UPDATE` (status transition) + note `human-attested` |
| `escalate` | POST Task(requested) with `priority: urgent`, focus on the reason resource, owner = provider or nurse-supervisor | — (Task itself is `requested`) | — | `CREATE` + note `agent-escalated` |

### Mapping notes

- **`propose` vs `prepare`.** Both write a preliminary resource. `propose` also creates a Task that puts it in a review queue; `prepare` is a direct-to-nurse handoff without a queue. Use `propose` when the nurse is remote or asynchronous; use `prepare` when the nurse is at the bedside and will review synchronously.
- **`execute` vs `attest` on the same resource.** `execute` creates the resource at `final` in one write — the agent was pre-authorized by `charting_policy`. `attest` promotes an existing `preliminary` resource to `final` — the nurse reviewed and signed.
- **`escalate` does not write chart data.** It writes a Task (review-queue primitive) with `priority: urgent` whose focus points to the resource that triggered the escalation. The triggering resource may itself be a preliminary assessment DocumentReference, a failed obligation, or an alarm event.
- **`observe` is not an FHIR write** but produces an observation trace the eval recorder scores. Contract 5's authority-audit-trail invariant applies even to `observe` — the trace must show the agent saw the monitor value before making a downstream claim.

## Resource set for the first bedside workflow

Per `first-bedside-workflow-spec.md` §Per-beat → contract surface map. Every resource that must be writable for the scenario to complete end-to-end.

### Observation (high frequency)

- **Vitals** — HR, MAP, SBP, DBP, SpO₂, RR, etCO₂ (post-intubation), temp. Written at scenario-controller cadence (60 s default, q5 min during active titration — Contract 4 L1 write-back cadence rule).
- **I/O** — Intake and output measurements. Nurse/agent entered. High clinical significance post-Lasix.
- **Assessment findings** — pulmonary-edema-noted, respiratory-distress-severity, etc. Discretionary / judgment-driven.
- **Lab-backed observations** — ABG values, BMP, BNP, lactate, etc. Released by scenario controller per two-stage rule (amendment D2); written to FHIR when the scenario-controller release event fires.

**Authority ceiling for vitals (scenario policy default):** `execute` for device-sourced numerics (agent writes `final` directly from L1 feed). Contract 5 justification: the monitor is the primary avatar; auto-charting the monitor reading matches real ICU flowsheet behavior.

**Authority ceiling for I/O:** `propose` → nurse `attest`. Clinical significance is high enough that nurse validation is the default policy for the first workflow. Can be loosened per scenario.

### MedicationAdministration

- Lasix, norepinephrine titrations, vasopressin, phenylephrine, propofol (RSI), rocuronium (RSI), fentanyl (RSI), any bolus medications.
- Carries dose, route, rate, administered-by, and a reference to the MedicationRequest if one exists.

**Authority ceiling:** `propose` → nurse `attest` is the default. `execute` only for pre-approved standing-order medications in specific scenarios. RSI medications: `prepare` (agent-drafted during intubation, provider-attested).

### Procedure

- Intubation, central line placement, A-line placement, chest tube, defibrillation, pacing, cardioversion, any invasive or non-invasive intervention.
- Carries operator, time, location (on-body), outcome, complications, used devices.

**Authority ceiling:** `prepare` → provider `attest`. Agent cannot `execute` procedure records.

### DocumentReference

- Narrative assessments (admission note, shift notes, focused assessments, escalation rationale).
- Shift report (already handled by `createDraftShiftReport`).
- Procedure notes (post-intubation documentation).

**Authority ceiling:** `propose` for most; `execute` only for the shift report under the current established policy. Procedure notes: `prepare` → provider `attest`.

### Task

- Review queue primitive. `requested` when draft is pending review, `completed` when attested, `failed` when rejected.
- Also the escalation primitive: `priority: urgent`, owner = named provider or role.

**Authority ceiling:** Tasks are written by the runtime, not by clinical authority states. The agent never writes a Task at `final` chart status — Tasks are review metadata, not chart truth.

### Communication

- Provider consult requests, inter-actor messages, paging-equivalents.
- Alternative to Task for escalation when the target is a person rather than a work item; often written alongside an escalation Task.

**Authority ceiling:** `execute` when authored by the agent and addressed to a provider or nurse-supervisor. Content is not chart truth; it is communication metadata.

### Encounter

- Lifecycle: `in-progress` on scenario start, `finished` on scenario reset, `cancelled` on error.
- Carries class (inpatient-icu), period, subject, participant list.

**Authority ceiling:** `execute`. Encounter lifecycle is scenario infrastructure, not clinical authority.

### Provenance

- Required on every chart-resource write. Not itself a chart-authority surface; it is the audit substrate for the other resources.

**Authority ceiling:** N/A. Provenance is always written as `final` by the runtime, tagged with the authority state that produced the target resource.

## Provenance model

Per Contract 5 invariant 5 (every L3 entry has a provenance chain traceable to its source layer and authoring actor), every chart-resource write carries a Provenance resource. Shape:

```
Provenance:
  target: [Reference to the written resource]
  recorded: iso8601 (simulation time)
  occurredDateTime: iso8601 (when the underlying event occurred — may differ from recorded for lab/imaging)
  activity:
    coding: [{ system: "https://noah-rn.dev/provenance-activity", code: <authority-state>, display: ... }]
    text: "<authority-state> (<source-layer>)"
  agent:
    - type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type", code: "author" }] }
      who: Reference to the authoring Practitioner (human) or Device (agent runtime)
      onBehalfOf: Reference to the Encounter or Organization if applicable
    - type: { coding: [{ ... code: "attester" }] }  # only when authority-state is attest or prepared→attest
      who: Reference to the attesting human
  entity:
    - role: "source"
      what: { identifier: { system: "https://noah-rn.dev/source-layer", value: "L0" | "L1" | "L2" | "L3-original" } }
  policy: [URL to the charting_policy entry that authorized this write, if authority-state requires it]
  signature: [optional, for execute + attest states — integrity signature of the target at time of write]
```

### Source-layer tagging

The `entity.what.identifier` field carries an explicit source-layer tag:

- `L0` — eval recorder's direct L0 snapshots (only the eval recorder uses this)
- `L1` — monitor projection (device-sourced vitals; waveform-derived claims)
- `L2` — scenario-controller-released events (lab results, imaging, order completions)
- `L3-original` — originally-authored material (narrative assessments, history entries)

This tag is how Contract 5 invariant 4 ("Provenance distinguishes: auto-populated from device, nurse-validated from monitor, nurse-entered, agent-prepared/nurse-approved, and agent-executed with policy citation") is enforced programmatically.

### `activity.coding` values

- `observe` — trace only, no Provenance write
- `propose` — `CREATE` + agent-proposed
- `prepare` — `CREATE` + agent-prepared
- `execute` — `CREATE` + agent-executed-with-policy; policy URL required
- `attest` — `UPDATE` (status transition) or new Provenance with `attester` role
- `escalate` — `CREATE` on Task; activity = agent-escalated

### Policy citation

For `execute` writes, `Provenance.policy` must reference the scenario's `charting_policy` entry that authorized this resource type. Without that reference, the write is invalid — an `execute` with no policy citation is architecturally malformed.

## Task-as-review-queue generalization

Generalize the shift-report Task pattern from `medplum-draft-review-lifecycle.md` to cover every draft-requiring write.

### Queue primitives

```
Task(requested, focus → <draft-resource-reference>)
  intent: order
  priority: routine | urgent | asap | stat
  businessStatus: { coding: [{ system: "https://noah-rn.dev/review-state", code: "pending-review" }] }
  input: [ReviewRequestInput]  # structured reason, source trace id, alarm id, etc.
  owner: Practitioner / PractitionerRole reference  # the reviewer
  for: Patient reference
  encounter: Encounter reference

Task(completed, output → <attested-resource-reference>)
  businessStatus: { ... code: "attested" }
  output: [{ valueReference: <attested-resource> }]

Task(rejected, statusReason → <reason narrative>)
  businessStatus: { ... code: "rejected" }
```

### State machine

```
requested → in-progress → completed
                       ↘ rejected
                       ↘ cancelled
```

### Cadence + expiry

- `routine`: no expiry for the first workflow scope. Future: shift-boundary expiry (Task closed at shift end, artifact orphaned or escalated).
- `urgent` / `asap` / `stat`: obligation engine owns expiry per Contract 7. If not attested within the authored window, the Task transitions to an escalation chain (new Task with higher priority, different owner).

### Difference from shift-report-specific pattern

Shift-report pattern writes Task with `focus` pointing to a `DocumentReference`. Generalize: `focus` can point to any draft resource (Observation, MedicationAdministration, Procedure, DocumentReference). The worker (poller) routes by focus-type to the right attest path.

### Routing implications for `services/clinical-mcp/src/worker/`

The existing `shift-report-worker.ts` polls for Tasks with a specific tag (`shift-report-draft` code on the focused DocumentReference). Generalize to `review-worker.ts` or route shift-report-worker to a generic attest pipeline:

- Poll `Task?status=requested&owner=<nurse-role>`
- For each Task, read `focus.reference` → resolve resource
- Dispatch to per-type attest handler (vitals, med-admin, procedure, doc-ref)
- On attest: write status transition + Provenance with `attester` role
- On reject: write Task.businessStatus + Provenance with `rejected` note

This is Lane D infrastructure, not this spec's deliverable. But the write-path shape must support it.

## `charting_policy` configuration shape (amendment D3)

Per Contract 6 amendment D3. This is the scenario-level field shape.

```
interface ChartingPolicy {
  // Maximum authority ceiling the agent may invoke for each entry type.
  // Absence of an entry = `propose` default (most restrictive).
  entryTypeCeilings: Record<EntryType, AuthorityState>;

  // Per-entry-type Provenance.policy URL to cite when authority state is `execute`.
  // Required for every entry type where ceiling allows `execute`.
  executeAuthorizations?: Record<EntryType, string>;

  // Escalation chains when an authority state is denied.
  // e.g., propose fails nurse approval → escalate to provider
  denialEscalations?: Record<EntryType, EscalationRule>;
}

type EntryType =
  | "vitals.auto"         // device-sourced vital observation
  | "vitals.assessed"     // nurse- or agent-assessed derived observation
  | "io.intake"
  | "io.output"
  | "medication.administered"
  | "medication.rsi"
  | "procedure.invasive"
  | "procedure.ventilation"
  | "assessment.narrative"
  | "assessment.focused"
  | "communication.consult"
  | "communication.update"
  | "shift.report";

type AuthorityState =
  | "observe"
  | "propose"
  | "prepare"
  | "execute"
  | "attest"
  | "escalate";
```

### Scenario-level defaults for the first bedside workflow

Sketch, not locked:

```
{
  vitals.auto: execute,
  vitals.assessed: propose,
  io.intake: propose,
  io.output: propose,
  medication.administered: propose,
  medication.rsi: prepare,
  procedure.invasive: prepare,
  procedure.ventilation: propose,
  assessment.narrative: propose,
  assessment.focused: propose,
  communication.consult: execute,
  communication.update: execute,
  shift.report: execute
}
```

Rationale: device-sourced vitals are auto-charted (monitor-as-avatar flows directly to chart under execute); everything clinical-decision-shaped is nurse-gated; RSI and invasive procedures are prepared for provider attest; consult requests + shift reports are already established as execute surfaces.

## Resource-type shape notes

Per-type notes on what the write surface needs beyond generic `fhirPost`.

### Observation write

- Batching: L1 projection writes observations at a cadence. Use FHIR `Bundle` with `type: "batch"` or `transaction` to write multiple observations in one round-trip.
- Device reference: vital observations must link to a `Device` resource representing the monitor. First-workflow scope can use a single virtual device per encounter.
- Status transition for `propose` → `attest`: `preliminary` → `final` via PATCH or PUT.
- `effectiveDateTime` is simulation time, not wall time (Contract 3 rule).

### MedicationAdministration write

- References `MedicationRequest` when the medication was ordered; may stand alone for standing-order or emergency administrations.
- `status` states: `in-progress` (drip running), `completed` (bolus given, drip stopped), `stopped` (interrupted). Draft state uses `preliminary` or `not-done` with a reason, or a custom extension — decision deferred to Lane D implementation.
- RSI bundle: multiple MedicationAdministrations written together as a Bundle, each linked to the Procedure via `partOf`.

### Procedure write

- `status`: `preparation` → `in-progress` → `completed`.
- Links to Encounter, Patient, and the Procedure's performer.
- Carries `performedPeriod` in simulation time.
- Complications represented as secondary Observations with `focus` pointing to the Procedure.

### Communication write

- `status`: `in-progress` or `completed`.
- `sender` = agent (Device reference) or nurse (Practitioner).
- `recipient` = provider (Practitioner) or role.
- `payload.contentString` or `payload.contentAttachment` for structured content.
- `about` points to the triggering resource (alarm, failed-obligation, assessment).

### Encounter lifecycle

- Scenario start: POST Encounter with `status: in-progress`, `class: IMP` (inpatient), subject = Patient, period.start = simulation start time.
- Scenario reset: PATCH Encounter to `status: finished`, period.end set.
- Failed scenario: PATCH to `status: cancelled` with reason.

### Provenance write

- Batched with its target resource in a FHIR `Bundle` transaction. Never written separately, since Provenance without a target is orphan audit metadata.

## Staged implementation plan

Ordered by lane dependency, not by resource type. Each stage has a clear acceptance criterion and unblocks the next.

### Stage 1 — Provenance implementation (unblocks all other stages)

Remove the stub. Implement `recordProvenance(target, authorityState, sourceLayer, policyUrl?, attesterRef?)` as a real function. This is the lowest-level primitive; nothing else can be Contract-5-compliant without it.

- Covers: every chart-resource write gets a Provenance companion.
- Acceptance: round-trip write of a DocumentReference + Provenance to Medplum; Provenance is queryable via `Provenance?target=<resource-ref>`.
- Lane: prerequisite for Lane D; can be done in parallel with Lane A.
- File: `services/clinical-mcp/src/fhir/writes.ts` (remove `recordDraftProvenance` stub; add `recordProvenance`).

### Stage 2 — Observation batch write (unblocks Lane B L1 write-back)

Contract 4 L1 projection needs to write vital observations on cadence. This is the highest-volume write in the first workflow.

- Covers: vitals auto-charting on a controller-set cadence; I/O entries.
- Acceptance: Bundle transaction writing 5+ Observations + their Provenances in one round-trip; preliminary → final status transition works via PATCH.
- Lane: Lane B depends on this landing by its halfway point.
- File: `services/clinical-mcp/src/fhir/writes.ts` — new `writeObservationBatch(inputs)` + `attestObservation(ref, attester)`.

### Stage 3 — Task-as-review-queue generalization

Extend `shift-report-worker.ts` or write a parallel `review-worker.ts` that polls any `Task?status=requested` and routes by focus-type.

- Covers: the review loop for every propose-authority draft.
- Acceptance: a draft Observation + a draft DocumentReference both surface in the same nurse review queue and can be attested through the same worker path.
- Lane: Lane D prerequisite.
- Files: `services/clinical-mcp/src/worker/` new generic review module; existing shift-report-worker continues to handle its narrow path during transition.

### Stage 4 — MedicationAdministration + Procedure writes

These are medium-volume but clinically high-stakes. Land after the review queue is generalized so nurse-attest is the default flow.

- Covers: Lasix, pressor titrations, RSI meds, intubation, line placements.
- Acceptance: MedicationAdministration batched with its Provenance; Procedure with linked MedicationAdministrations via `partOf`; both land as `preliminary` and can be attested.
- Lane: Lane D + Lane B scenario runtime.
- File: `services/clinical-mcp/src/fhir/writes.ts` — new `writeMedicationAdministration`, `writeMedicationAdministrationBundle` (for RSI), `writeProcedure`.

### Stage 5 — Communication + Encounter lifecycle

Scenario infrastructure. Land before the first end-to-end scenario run.

- Covers: provider consult requests, Encounter open/close.
- Acceptance: scenario start opens an Encounter; consult escalation writes a Communication + a Task; scenario reset closes the Encounter.
- Lane: Lane B scenario controller + Lane E obligation engine (for escalation).
- File: `services/clinical-mcp/src/fhir/writes.ts` — new `writeCommunication`, `openEncounter`, `closeEncounter`.

### Stage 6 — `charting_policy` enforcement layer

Not a write — a pre-write gate. Every write call consults the active scenario's `charting_policy` before executing. Rejects writes that exceed the authority ceiling; routes them to an escalation path if a denialEscalation rule exists.

- Covers: policy enforcement for all prior stages.
- Acceptance: agent attempting `execute` on `medication.administered` when policy sets ceiling at `propose` is downgraded to a `propose` write + a Task for nurse attest, plus a Provenance-tagged rejection record.
- Lane: Lane D primary deliverable.
- File: `services/clinical-mcp/src/charting/policy.ts` new.

### Stage 7 — Amendment + cancellation paths

Post-attest corrections and cancellations. Deferred until the first workflow surfaces a real need.

- Covers: rare but Contract 5 invariant 4 implies it ("Amendment must re-evaluate against amended state" for obligations).
- Acceptance: deferred.

## Non-goals

- Any of these stages as runtime code right now. Spec only.
- FHIR AccessPolicy / Medplum security rules — deferred until multi-tenant concerns land.
- Offline write queueing — deferred until sync-reliability requirements surface.
- Bundle-level Provenance optimization (one Provenance covering a batch) — premature optimization; per-target Provenance is the default.
- Custom extensions for draft MedicationAdministration states — decide at Stage 4 implementation, not here.

## Explicit open questions for Lane D

- **Status encoding for preliminary MedicationAdministration.** FHIR's `MedicationAdministration.status` does not have a `preliminary` value. Options: use `not-done` with statusReason, use a custom extension, or use only the Task as the preliminary marker (resource itself goes `final` once attested). Decision at Stage 4.
- **Device resource strategy.** One virtual Device per encounter vs one Device per measurement type. Multi-device approach is more correct FHIR; single-device is cheaper. Decide at Stage 2.
- **Bundle vs individual POSTs for batch vitals.** Medplum performance characteristic. Measure at Stage 2; pick the winner.
- **Attestation UI surface.** Whether Medplum's native preliminary-to-final workflow is usable as-is or needs a custom review screen in `apps/nursing-station/`. Separate UI concern; write-path design is unaffected.
- **Shift-report path legacy.** Whether to migrate `createDraftShiftReport` onto the generalized Task queue or leave it as a special case. Recommendation: migrate at Stage 3 so there is one path, not two.

## Validation against the first bedside workflow

Every beat in `first-bedside-workflow-spec.md` can be written with this surface:

- T=0 baseline: Encounter open (Stage 5), initial vitals bundle (Stage 2), admission note as DocumentReference propose (current shift-report path generalized).
- T=10–15 respiratory drift: vitals observations continue (Stage 2); judgment-driven assessment narrative as DocumentReference propose (Stage 3 queue routes it).
- T=20–25 flash edema: alarm-triggered event-driven assessment (Stage 3 routes to queue); ABG scenario release writes an Observation at `final` (execute path — lab result, not agent-authored).
- T=30 Lasix: MedicationAdministration propose (Stage 4) + Provenance (Stage 1).
- T=30–45 pressor titration: batch MedicationAdministration writes (Stage 4); q5min vitals (Stage 2); I/O observation propose (Stage 2 + Stage 3 queue).
- T=45–55 continued hypoxia: ABG Observation at `final`; narrative assessment propose.
- T=55–65 escalation: Communication (Stage 5) + escalation Task (Stage 3).
- T=65–75 intubation: Procedure propose (Stage 4); RSI MedicationAdministration bundle (Stage 4); vent-settings Observation (Stage 2).
- T=75–90 branch: Encounter close (Stage 5) on stabilization; or second escalation cycle (Stages 3+5).

Every beat maps to a named stage. No gaps.

## Provenance

- **Spec author:** Shane + sim-architecture working session, 2026-04-13.
- **Triggering audit:** current-state findings in `services/clinical-mcp/src/fhir/writes.ts` (1 real + 3 stub exports).
- **Triggering contract:** Contract 5 (Charting Policy and Provenance).
- **Triggering scenario:** `docs/foundations/first-bedside-workflow-spec.md`.
- **Pattern source:** `docs/foundations/medplum-draft-review-lifecycle.md` (shift-report Task + preliminary-DocumentReference pattern).
