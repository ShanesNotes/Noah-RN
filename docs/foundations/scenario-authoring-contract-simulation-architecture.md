# SAC-1: Scenario Authoring Contract — Simulation Architecture

## Governing Source

- Kernel anchor: `docs/foundations/invariant-kernel-simulation-architecture.md` Appendix A
- Contract anchors: `docs/foundations/foundational-contracts-simulation-architecture.md` amendments T1, T5, T6, D3, D5, D6, M2
- Companion: `docs/foundations/data-partition-contract-simulation-architecture.md` (CCPS-1)
- Vision pass: `/home/ark/.claude/plans/sunny-noodling-stearns.md` Session 1

## Purpose

SAC-1 locks the **authoring format** for clinical scenarios so Lane B implements the scenario controller against one specification. Today's scenarios (`pressor-titration.ts`, `fluid-responsive.ts`, `hyporesponsive.ts` under `services/sim-harness/scenarios/`) are bespoke hand-authored TypeScript — useful as engine unit-test fixtures but not as scenarios in the vision sense. SAC-1 defines the shape that grounded, MIMIC-IV / Synthea-derived scenarios must take.

This is **not** a 10th foundational contract. It is a Contract 6 extension numbered SAC-1 to stay out of the 1–9 stable numbering.

## Scope

SAC-1 covers:
- The required and optional fields of a scenario definition.
- The derivation pipeline from a source patient (MIMIC-IV or Synthea) to a scenario authoring file.
- The monitor-to-chart bridge configuration (preliminary-Observation cadence, validation window).
- The provider actor policy configuration (reactive latency, decision surface).
- The status of the existing three synthetic scenarios as engine unit-test fixtures only.
- The reference MIMIC-grounded scenario (respiratory decompensation; cross-referenced to `first-bedside-workflow-spec.md`).

SAC-1 does **not** cover:
- The serialization format (JSON vs YAML vs TypeScript DSL) — that is a Lane B implementation call.
- The loader implementation — that is a Lane B code deliverable.
- The catalog or versioning surface — future contract.

## Required Top-Level Fields

A valid SAC-1 scenario authoring file must contain the following fields at minimum. Validation is structural; a missing required field is a scenario-load error.

### Metadata
- `id`: stable scenario identifier, kebab-case.
- `name`: human-readable title.
- `description`: 1–3 sentences.
- `version`: SemVer string.
- `maturity`: `draft` | `review` | `stable`.

### Grounded seed (Contract 1 T1/T2, Contract 6 T5)
- `source_patient`: `{ dataset, patient_id, cut_point }`
  - `dataset`: `"mimic-iv"` | `"synthea"` | `"synthetic"` (the last is permitted only for engine unit-test fixtures, per T1).
  - `patient_id`: subject identifier within the dataset.
  - `cut_point`: either ISO-8601 timestamp or duration-from-admission (e.g., `"P2DT14H"` → 2 days 14 hours into the ICU stay).
- `history_window`: `{ mode, bounded_to? }`
  - `mode`: `"full"` (default — full ICU stay up to cut-point) | `"bounded"`.
  - `bounded_to`: required when `mode == "bounded"`. Duration preceding the cut-point (e.g., `"P3D"` for 72 hours).
  - Regardless of mode, admission H&P, active problems/meds/allergies, and the last prior discharge summary (if in cohort) are always included.

### Initial engine state (Contract 1 T2)
- `initial_engine_state`: either
  - `{ derive_from_source: true }` — preferred; engine initializes L0 from the patient's state at `source_patient.cut_point`.
  - `{ override: <engine-specific params> }` — escape hatch for synthetic unit-test fixtures.

### Ordered cadence (Contract 7 three-mode obligations)
- `ordered_cadence`: array of ServiceRequest-shaped entries active at T=0.
  - Each entry: `{ code, display, interval, first_due_offset? }`. Examples: `{ code: "vitals.set", interval: "PT1H" }`, `{ code: "neuro.check", interval: "PT2H" }`.
  - These populate the Contract 7 obligation engine at scenario start.

### Provider schedule (Contract 6 D6)
- `provider_schedule`: array of provider-authored events. Each entry is one of:
  - **Scheduled:** `{ at: sim-time, author: "provider", kind, payload }` where `kind ∈ { "note", "lab-result", "order", "imaging-read" }`.
  - **Reactive:** `{ trigger: escalation-event-ref, author: "provider", kind: "reactive-response", payload_template, latency_window, decision_policy }`.
    - `trigger` names the Noah escalation event (e.g., `"escalate_to_provider.intubation"`).
    - `latency_window` defaults to `"PT5M/PT15M"` (5 to 15 simulation-minutes; random within range per run).
    - `decision_policy` defines the small deterministic decision surface with weights or rules producing one of `{ accept, defer, modify, decline }` plus the follow-on L2/L3 write payload.

### Scenario timeline (Contract 6)
- `scenario_timeline`: array of engine-directed events. Insults, interventions, environmental changes, iatrogenic triggers. Each entry: `{ at: sim-time, kind, payload }`.

### Charting policy (Contract 5, amendment D3)
- `charting_policy`: per-entry-type authority ceiling map. Entries reference the Contract 5 authority states (`observe`, `propose`, `prepare`, `execute`, `attest`, `escalate`).
  - Example (respiratory-decompensation reference scenario):
    ```
    vitals.auto:            execute       # Noah may autonomously promote preliminary→final during q1h validation
    medication.administered: propose     # Noah drafts MedicationAdministration; provider attest required
    assessment.narrative:   propose
    procedure.note:         prepare      # Noah drafts; provider attests to final
    escalation.request:     execute
    ```
- Every `agent.who` referenced in `charting_policy` must resolve to the closed D5 actor set (`noah-nurse`, `provider`, `scenario-director`, `device-auto`, `historical-seed`).

### Monitor-to-chart bridge (Contract 4 D5 bridge clause)
- `monitor_bridge`: configures the preliminary-Observation auto-post.
  - `enabled`: bool (default `true` for grounded scenarios).
  - `cadence`: per-parameter sim-time interval. Default: continuous-lead vitals (HR, SpO2, RR, NIBP when cycling) posted at `PT5M`; temperature at `PT1H` aligned to ordered cadence.
  - `validation_window`: duration within which Noah's validation tool can promote a `preliminary` matching a parameter/timestamp. Default `PT15M` either side.
  - `parameters`: list of vital parameters the monitor posts. Defaults to HR, RR, SpO2, NIBP, Temp; scenario may add EtCO2, continuous ABP, CVP.

### Termination (Contract 6 amendment M2)
- `termination_conditions`: ordered list evaluated by the scenario controller.
  - Each entry: `{ kind, criterion, outcome }` where `kind ∈ { "elapsed", "l0_threshold", "eval_rubric_complete", "death" }` and `outcome ∈ { "survival", "death", "timeout", "eval_complete" }`.

### Eval hooks (Contract 8)
- `eval_hooks`: scored moments + rubric references.
  - Each entry: `{ at_or_event, rubric_ref, description }`. E.g., `{ at_or_event: "intubation_response_accepted", rubric_ref: "respiratory-decompensation.v1#intubation-timeliness", description: "Noah's escalation latency to provider acceptance" }`.

## Optional Extension Blocks

- `dataset_extraction_config`: loader hints for MIMIC-IV / Synthea extraction (table selections, filtering rules, code-system mappings).
- `waveform_sources`: per-parameter waveform source binding (MIMIC-IV WFDB channel, Pulse-native synthesis, recorded sample). Consumed by the monitor projection and the waveform vision contract.
- `visibility_overrides`: per-event agent-visibility rules (teaching mode may reveal; eval mode hides).

## Derivation Pipeline (MIMIC-IV / Synthea → Scenario Authoring File)

The scenario author follows this pipeline once per new grounded scenario. The pipeline itself is a Lane B loader-adjacent tool (or manual checklist) — SAC-1 specifies what the output must look like, not what language the tool is written in.

1. **Select source patient** — pick a MIMIC-IV subject_id / icustay_id or a Synthea patient whose trajectory matches the scenario's clinical shape (e.g., for respiratory decompensation: post-op ICU with rising O₂ demand, flash pulmonary edema, diuresis, pressor concomitant, possible intubation).
2. **Pick the cut-point** — a simulation-time zero positioned just before the clinically interesting trajectory begins. For MIMIC-IV, typically an ICU-day-N, hour-H anchor.
3. **Extract historical region** — all chartevents, labevents, procedureevents, noteevents, medication records, and relevant active-list resources with timestamps within `history_window` and ≤ cut-point.
4. **Classify post-cut-point source rows** into:
   - **Engine-input rows** — chartevents that represent authored insults/interventions (e.g., documented vasopressor start, fluid bolus, intubation). Map to `scenario_timeline` engine events.
   - **Provider-authored rows** — noteevents by physician roles, lab result releases, order entries, imaging reads. Map to `provider_schedule` scheduled entries.
   - **Reactive-provider rows** — provider-authored events that, in the source record, followed a nursing escalation. Map to `provider_schedule` reactive entries, bound to the corresponding Noah escalation tool call.
   - **Discarded rows** — rows irrelevant to the scenario (e.g., trivial chartings outside scope). Documented as pruned per CCPS-1.
5. **Fill `ordered_cadence` and `charting_policy`** — per clinical judgment matching the patient's ICU orders.
6. **Author `eval_hooks`** — map scenario beats to rubric identifiers.
7. **Validate** — run the SAC-1 validator (Lane B) over the file; confirm all required fields present, `agent.who` references resolve, reactive `trigger` references resolve to declared Noah tool calls.

## Monitor-to-Chart Bridge Configuration (Detail)

The monitor-to-chart bridge is the concrete mechanism behind the kernel's Appendix A.3 "monitor as read-only sibling surface" and Contract 4 D5 bridge clause. SAC-1 makes the configuration authorable:

- Monitor posts vital-sign Observations at `monitor_bridge.cadence` with `status=preliminary` and `agent.who=device-auto`.
- Preliminary Observations are inert — visible in the chart view but clearly marked; they carry no downstream Contract 7 obligation weight.
- Noah's validation tool (a clinical-mcp tool call) takes a preliminary Observation reference and either:
  - **Promotes** — sets `status=final`, appends attestation Provenance with `agent.who=noah-nurse` and `activity=attest`.
  - **Rejects** — marks the preliminary as artifact/disqualified (Contract 4 artifact-distinction pressure); Noah may then fresh-author a `status=final` Observation with her assessed value.
- The `validation_window` bounds which preliminary Observations Noah's tool call can match against a given timestamp.

## Provider Policy Configuration (Detail)

The provider actor is lightweight-behavioral: a deterministic policy, not an agent. SAC-1 `provider_schedule` entries with `kind: "reactive-response"` specify:

- `trigger`: the Noah escalation event that activates the reactive entry.
- `latency_window`: min/max simulation-time bounds for the response.
- `decision_policy`: a small rule set producing a decision in `{ accept, defer, modify, decline }` plus the payload(s) to write.
  - Example (intubation request): `if Noah.escalation.context.pao2_fio2_ratio < 150 → accept; elif < 200 → modify with trial BiPAP first; else → defer with pulmonology consult`.
- `payload_template`: the provider-authored writes (orders, notes, procedure reports) keyed by decision outcome.

The policy is deterministic for a given scenario seed — the random element is only the latency within the configured window.

## Reference Scenarios

### Engine unit-test fixtures (not scenarios in the vision sense)

The three existing files under `services/sim-harness/scenarios/` are reclassified as **engine unit-test fixtures**. They remain valid for testing reference PK and engine-adapter invariants but are **not** SAC-1 scenarios and must not be cited as such:

- `pressor-titration.ts`
- `fluid-responsive.ts`
- `hyporesponsive.ts`

When Lane B builds the SAC-1 loader, these three fixtures may continue to live alongside SAC-1 scenario files but must be clearly distinguished in the file layout (suggestion: move to `services/sim-harness/scenarios/__fixtures__/` — Lane B code task, not a SAC-1 deliverable).

### Reference SAC-1 scenario

`docs/foundations/reference-scenario-respiratory-decompensation-mimic.md` (Session 2 S2.3) is the reference SAC-1 scenario. It is bound to `first-bedside-workflow-spec.md` and exercises every contract across Lanes A–F. Once authored, it is the first end-to-end validation that SAC-1 + CCPS-1 + all contract amendments hold together.

## Acceptance Criteria

- [ ] A scenario authoring file validates only if all required top-level fields are present.
- [ ] `source_patient.dataset = "synthetic"` is permitted only when a fixture-flag is also set; otherwise validation fails with a pointer to T1.
- [ ] `history_window` defaults to `full` when omitted.
- [ ] `charting_policy` references resolve to closed-set D5 authors only.
- [ ] `provider_schedule` reactive entries name triggers that correspond to declared Noah tool calls (clinical-mcp escalation surface).
- [ ] `monitor_bridge.cadence`, `validation_window`, and `parameters` are validated; defaults applied when omitted.
- [ ] The three existing synthetic scenarios validate as fixtures (with the fixture flag) but not as SAC-1 scenarios.
- [ ] The reference respiratory-decompensation scenario, once authored, validates end-to-end against SAC-1.

## Open Questions

- **Serialization format.** JSON keeps tooling simple; YAML reads better; TypeScript DSL matches existing codebase habit. **Decision deferred to Lane B implementation.** SAC-1 is format-agnostic.
- **Catalog surface.** Where scenarios are stored (repo directory, Medplum ValueSet-like resource, external registry) is deferred.
- **Multi-patient scenarios.** SAC-1 is single-patient. Multi-patient orchestration is a future contract extension.

## Provenance

- **User vision input (2026-04-14):** `/home/ark/.claude/plans/sunny-noodling-stearns.md` §Decisions
- **Wiki grounding:** `wiki/concepts/dual-source-waveform-pipeline.md`, `wiki/concepts/synthetic-physiological-data-generation.md`, `wiki/entities/mimic-iv-waveforms.md`, `wiki/entities/pulse-physiology-engine.md`, `wiki/concepts/nurse-as-information-gatekeeper.md`, `wiki/concepts/intervention-linked-documentation-chain.md`
- **Kernel anchor:** `docs/foundations/invariant-kernel-simulation-architecture.md` Appendix A
- **Contract amendments:** T1, T5, T6, D3, D5, D6 in the 2026-04-14 Amendments Log entry of `foundational-contracts-simulation-architecture.md`
- **Companion:** `docs/foundations/data-partition-contract-simulation-architecture.md` (CCPS-1)
