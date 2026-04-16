# Noah RN Three-Product Alignment Plan

> **Status.** Approved 2026-04-16. This is the canonical execution record for the three-product alignment. Phase progress updates land back into this document; architectural decisions warrant new entries in `PLAN.md` Decision Log. Source scratchpad: `/home/ark/.claude/plans/snoopy-swinging-creek.md`.

## Execution log

Tracks phase-level landing status. Individual commits carry the fine-grained history.

| Phase | Scope | Status | Commit |
|---|---|---|---|
| 0 | Control-plane reconciliation (docs) | ✅ landed 2026-04-16 | `a6cc25a` |
| 1 | Gate-zero renderer inversion | ✅ landed 2026-04-16 | `e77e3b9` |
| 2 | Clinical-MCP Contract v1.0.0 publication | ✅ landed 2026-04-16 | `7c26e89` |
| 3 | `@noah-rn/contracts` shared types package | ✅ landed 2026-04-16 | `1dbe3ae` |
| 4a | Product B MAR backend (read view + human-attested writers) | ✅ landed 2026-04-16 | `ce5fcaa` |
| 4b | Product B MAR chart section (read view in nursing-station) | ✅ landed 2026-04-16 | `8158c3d` |
| 4c | Write actions in MAR UI + "Verify with Noah" bridge | ⏳ deferred (needs browser-to-harness tool-invocation bridge) | — |
| 5 | Drug reference scaffold (Lexicomp-mirror v0, 10 entries) | ✅ landed 2026-04-16 | `911f37b` |
| 6 | `five-rights-verification` workflow contract | ✅ landed 2026-04-16 | `eaafb68` |
| 7 | Shared `TraceEnvelopeV1` observability contract | ✅ landed 2026-04-16 | `6c38a28` |
| 8a | Sim-harness MCP server skeleton (5 tools + stub store) | ✅ landed 2026-04-16 | `3320937` |
| 8b | Real sim physiology wiring (Lanes B–D, scenario controller unification, Pulse REST sidecar) | ⏳ deferred | — |
| 9 | ICU respiratory decompensation E2E | ⏳ deferred (depends on 4c + 8b) | — |

**What's running at end of session 2026-04-16:**

- `services/clinical-mcp`: 76 tests green. Agent-callable contract v1 tools all registered: `get_patient_context`, `list_patients`, `inspect_context`, `get_medication_list`, `queue_draft_task`, `create_draft_document`, `queue_draft_medication_administration`, `record_provenance`, `lookup_drug`. Internal writers: `chartMedicationAdministration`, `holdMedicationAdministration`, `recordProcedure`, `recordHumanAttestedProvenance` (all agent-rejection guarded).
- `services/sim-harness`: 6 new MCP-server tests green. Tool surface exposes `sim_list_scenarios`, `sim_load_scenario`, `sim_get_vitals_snapshot`, `sim_advance_clock`, `sim_set_clock_mode`. Scaffold-level stub store; real physiology lands in Phase 8b. 5 pre-existing scenario-controller tests continue to fail (real-time tick flakiness from the earlier sim-harness expansion commit — orthogonal to 8a).
- `packages/agent-harness`: tsc clean; registers `five-rights-verification` and re-exports shared telemetry types from `@noah-rn/contracts`.
- `packages/workflows`: 11 skills (five-rights-verification added to the existing 10).
- `packages/contracts`: tsc clean. Subpath exports for lane-coverage / context-bundle / provenance-envelope / trace-envelope / mcp-tool-types / renderer-input / drug-reference.
- `apps/nursing-station`: builds clean; new `/Patient/:id/mar` chart section landed; MAR read view with high-alert flags + 24h administration history.
- `docs/standards/`: `clinical-mcp-contract-v1.md` + 6 JSON schemas.
- `clinical-resources/drug-reference/`: 10 ICU-relevant entries + schema + FRESHNESS.md.

**What remains for the next session:**

- Phase 4c: MAR write actions (chart / hold / skip) and the "Verify with Noah" button routing through a browser-compatible harness-client transport.
- Phase 8b: unify the sim-harness scenario loader, fix the 5 scenario-controller test failures, land the monitor bridge + alarm classifier, stand up the Pulse REST sidecar per the 2026-04-16 decision.
- Phase 9: 9-beat ICU respiratory decompensation E2E verification.

## Context

Noah RN's core mission is a pi-native agentic clinical workspace harness for critical care nursing — conceptually similar to NemoClaw/OpenClaw but clinically specialized. Over the last two weeks the repo grew three large surfaces simultaneously: the Medplum-backed chart (`apps/nursing-station/`), the sim-harness runtime center (`services/sim-harness/`), and the Pi bridge (`.noah-pi-runtime/extensions/`). The control-plane documentation describes a single integrated system; the actual code is growing into three distinct products that must connect through contracts rather than imports.

The user has confirmed the target shape:

1. **Product A — Noah RN Agent Harness.** The core deliverable. pi.dev runtime + executable workflow task functions + MCP client. Must drop into any clinical-MCP-compliant EHR, including Epic or Cerner in a live clinical environment.
2. **Product B — Agent-Native Nursing EHR.** Standalone EHR with Epic-gold-standard trajectory. `apps/nursing-station/` + Medplum + the clinical-MCP server side. Houses the MAR, orders, documentation, results, vitals. Someone could adopt this as their agent-native EHR substrate without installing the Noah harness.
3. **Product C — Agent-Native Clinical Simulation.** `services/sim-harness/` + wrapped Pulse + L0–L4 projection + its own MCP surface. Code-standalone; FHIR-coupled at the operational level. Requires Product B (or any FHIR backbone with MAR write path) to be clinically useful.

Three novel contributions emerge from this shape: an agent-native EHR designed for first-class agent authorship, an agent-native clinical simulation with the agent as a first-class actor, and a clinical-MCP standard any EHR could implement to be agent-ready. Together they form a research-grade substrate for medical AI evaluation.

The purpose of this plan is to (a) reconcile the control-plane documentation with the three-product shape, (b) fix the one concrete cross-product boundary violation blocking extraction (the renderer import), (c) publish the clinical-MCP contract as a real artifact, (d) add the MAR surface to Product B so medication-related workflows and sim scenarios have somewhere to land, (e) stand up a minimal drug-reference scaffold, (f) land the first medication-related harness workflow as a three-product round-trip proof, and (g) prepare Product C for its own MCP surface so sim-driven scenarios can unblock.

This plan is deliberately thorough. It is also deliberately modular — each phase is a small, reviewable change with its own acceptance criteria, and later phases can be re-sequenced if priorities shift.

---

## The Architecture (canonical statement)

```
Product A (Noah RN Agent Harness) ──── MCP ────▶ Product B (Agent-Native Nursing EHR)
                │                                        │
                │                                      FHIR
                │                                        │
                └────── MCP ────▶ Product C (Agent-Native Clinical Sim) ──── FHIR
```

- **Products communicate via contracts.** No product imports code from another product. The clinical-MCP contract is the integration seam for A↔B and A↔C. Product C writes through FHIR into whatever EHR backbone it is pointed at (today: Medplum under Product B).
- **Subordinate resource lanes** (not products, shared substrate): `clinical-resources/` including the Lexicomp-mirror, the memory layer (spec-only today), meta-harness observability (telemetry + dashboard).
- **Authority rule.** `packages/agent-harness/` + `packages/workflows/*/SKILL.md` are the authoritative contract surface. `.noah-pi-runtime/extensions/*` is the live execution surface and is subordinate. On conflict, contracts win; the extension updates within the same change.

---

## Current State Snapshot (from exploration)

Key facts, concise:

- **Shift Report worker** (`services/clinical-mcp/src/worker/shift-report-worker.ts`) imports `invoke-workflow.mjs` and `shift-report-renderer.mjs` directly from `packages/agent-harness/` via relative paths. **This is the only confirmed cross-product code import.**
- **Pi bridge** has 5 LIVE extensions (runtime code, not docs): `noah-router` (195 lines), `noah-context` (148), `medplum-context` (~50), `noah-clinical-tools` (314), `noah-guardrails` (93), plus `shared/`.
- **Clinical-MCP server tools registered today:** `get_patient_context`, `list_patients`, `inspect_context`, `poll_shift_report_tasks`. `registerSimTools()` is a no-op stub in `src/server.ts:27-29`.
- **Nursing-station** has routes `/`, `/Patient/:id/:section?`, `/Task`. `MedicationList` exists (read-only display of `MedicationRequest`). **No MAR administration UI, no write surface for medications, procedures, or assessments.**
- **Clinical-MCP context assembler** already reads `MedicationAdministration`. Read path present; write path absent.
- **Write-path expansion** (`docs/foundations/medplum-write-path-expansion.md`) defines 5 stages. Only Stage 1 (Provenance) is partially landed via `createDraftShiftReport`. Stage 4 is `MedicationAdministration + Procedure`.
- **Sim-harness** has Lane A LIVE (clock + engine adapter + reference PK), Lane B PARTIAL (scenario controller with competing JSON vs TS loaders; static Map of three scenarios; SAC-1 not implemented), Lanes C–F stubbed. **No MCP surface on the sim side; clinical-mcp calls sim via direct function imports.**
- **Clinical resources** has `drug-ranges.json` (3.3 KB stub), protocol markdown, templates. **No Lexicomp-mirror scaffold.**
- **Observability** trace schema at `packages/agent-harness/src/telemetry-schema.ts` is skill-centric and harness-shaped. Sim-harness and clinical-mcp do not emit matching traces.
- **Memory layer** is spec-only (`docs/foundations/memory-layer-scaffold.md`); no runtime code.
- **TASKS.md item 12** incorrectly claims sim-harness Lanes 1–4 landed 2026-04-14; the service README and ARCHITECTURE.md both say Lane A partial only.

---

## Phase 0 — Control-Plane Reconciliation (docs only)

Smallest, fastest phase. Brings the text in line with the code and names the three-product shape.

### 0.1 Reconcile `TASKS.md` item 12
Replace the struck-through "Runtime landed 2026-04-14. Layers 1–4 implemented…" with:
> **Lane A partial landed** (simulation clock + engine adapter + reference pharmacokinetics). Scenario controller (Lane B) partial — competing JSON vs TS loaders require unification. Lanes C–F deferred. See `services/sim-harness/README.md` and `docs/foundations/execution-packet-simulation-architecture.md`.

### 0.2 Promote three-product shape into `PLAN.md`
Add a new section after "Current Foundation Decision" titled **"Three-Product Architecture"** with the canonical diagram and the definition of Products A/B/C plus the Clinical-MCP Standard. Subordinate lanes listed explicitly.

Add a new Decision Log entry `2026-04-16: Adopt Three-Product Topology` capturing: core product = harness; Product B = agent-native EHR (Epic-gold-standard trajectory); Product C = agent-native clinical simulation (FHIR-coupled, not EHR-coupled); Clinical-MCP contract = the seam; rationale = modularity enables each to ship standalone and enables the research substrate.

### 0.3 Redraw `docs/ARCHITECTURE.md`
Replace "Workspace Centers" with three product blocks (A/B/C) plus a Subordinate Lanes section. Each block:
- product name + one-line definition
- owning packages/services/apps
- owns / does not own
- external contracts consumed and published
- standalone-shippability note

### 0.4 Update `README.md`
The "Current Shape" section currently lists 5 subprojects. Reframe as: one product (harness) + two subordinate products (EHR, sim) + three subordinate lanes (resources, memory, observability). Keep the nursing-station status block (already accurate).

### 0.5 Rewrite `packages/agent-harness/README.md` header
Add explicit authority rule (see "Authority rule" above). Add one-line statement: "`.noah-pi-runtime/extensions/*` is the live execution surface; on conflict with `packages/agent-harness/` or `packages/workflows/*/SKILL.md`, the contract wins and the extension updates in the same change."

### 0.6 Rewrite `services/clinical-mcp/README.md` header
Add: "Product B (Agent-Native Nursing EHR) server side. Sole agent-facing boundary for chart data, MAR, orders, documentation, and Contract 5 write path. Sim tools reach agents through the `registerSimTools()` seam only."

### 0.7 Promote `docs/plans/sim-harness-bedside-workflow.md` decisions or close them
Pulse wrapping strategy (REST sidecar, docker-compose, pre-baked `.pbb` state files) becomes a PLAN Decision Log entry dated today **or** the plan is marked "exploratory — no binding decisions" to stop acting as a soft decision. Recommendation: promote as decision; defer only if Product C extraction work will not start in the next two weeks.

**Acceptance criteria Phase 0:**
- `TASKS.md`, `PLAN.md`, `docs/ARCHITECTURE.md`, `README.md`, two service READMEs all describe the three-product shape consistently.
- No reader encountering the control plane for the first time conflates subordinate products with the core harness.
- Authority rule written in one paragraph readable by a new contributor.

---

## Phase 1 — Gate-Zero: Renderer Inversion

**The one code change that makes the three-product split real.** Nothing else in this plan is meaningful until this lands.

### 1.1 Problem

`services/clinical-mcp/src/worker/shift-report-worker.ts` imports:
```ts
// current (wrong)
import { invokeWorkflow } from "../../../packages/agent-harness/invoke-workflow.mjs";
import { buildShiftReportRendererInput, renderShiftReportFromPatientContext }
  from "../../../packages/agent-harness/shift-report-renderer.mjs";
```

Product B's worker reaches across into Product A at build time. Under the three-product shape, B cannot depend on A's code.

### 1.2 Inversion approach

Expose the rendering as a tool call. The worker already invokes the harness conceptually — it just does so via import. Make that call explicit and cross-process-safe.

**Option chosen: register `render_shift_report` as a Product A tool the worker invokes via the same transport the rest of the harness uses.** The harness becomes a subprocess/service, not a library.

Concretely:

1. Product A gains a `packages/agent-harness/src/tools/render-shift-report.mjs` that wraps `buildShiftReportRendererInput` + `renderShiftReportFromPatientContext`. This is where the existing renderer code lives. No functional change to the renderer itself.

2. Product A's invocation harness exposes this tool via its existing runner (whichever process/binary pi.dev spawns). The tool signature:
   ```
   render_shift_report(candidate, patientId, context, laneCoverage?) -> { markdown: string, provenance: {...} }
   ```

3. Product B's worker replaces the direct import with a client call. Minimum-viable first pass: a thin local IPC (stdio/unix-socket) that spawns the harness runner. Preferred: the same MCP transport the agent uses to reach B.

4. The renderer stays in its current file for now; only the import site inverts. A future phase may relocate the source file, but the phase-1 deliverable is the inversion of the call path.

### 1.3 Files to modify

- `services/clinical-mcp/src/worker/shift-report-worker.ts` — replace direct imports with tool-call client; add error handling for the tool boundary.
- `packages/agent-harness/src/tools/render-shift-report.mjs` — new; wraps existing renderer.
- `packages/agent-harness/package.json` — register the tool in the harness's tool manifest.
- `services/clinical-mcp/src/server.ts` — no change here; the worker is the call site, not the server.
- `packages/agent-harness/shift-report-renderer.mjs` — unchanged in this phase.
- `services/clinical-mcp/src/__tests__/worker.test.ts` — add test for the cross-boundary call with a fake harness client.

### 1.4 Interim transport

If standing up the full harness runner as a service is too costly for Phase 1, an acceptable interim is a clearly-labeled in-process adapter whose only purpose is to fake the future IPC boundary. The adapter must:
- live in `services/clinical-mcp/src/adapters/harness-client.ts`
- have a single `callHarnessTool(name, args)` entrypoint
- throw on any call other than `render_shift_report`
- contain a single comment line: `// Interim: this file is the stub for the future IPC boundary. Do not grow its API surface.`

This forces the future transport swap to happen at one file, not scattered imports.

### 1.5 Acceptance criteria Phase 1

- `shift-report-worker.ts` has zero imports from `packages/agent-harness/`.
- `grep -r "packages/agent-harness" services/` returns no source imports.
- Worker tests pass with a fake harness client.
- End-to-end: `test-shift-report-task.sh` still produces a draft `DocumentReference` with the same markdown content as before.

---

## Phase 2 — Clinical-MCP Contract v1 (the standard)

Publish the agent-native clinical-MCP contract as a real artifact with a version number. This is the document any EHR (Medplum-backed, Epic-backed, Cerner-backed) implements to be agent-ready.

### 2.1 Location

New file: `docs/standards/clinical-mcp-contract-v1.md` (new `docs/standards/` directory). This is intentionally outside `docs/foundations/` because it is a published standard, not an internal foundation.

### 2.2 Contents

Minimum v1 schema, fully specified:

**Read tools:**
- `get_patient_context(patientId, budgetTokens?) -> PatientContextBundle` — assembled chart context with timeline, trends, gaps, explicit lane coverage.
- `list_patients() -> PatientSummary[]` — patient enumeration.
- `inspect_context(patientId) -> ContextAssemblyTrace` — debug/audit surface.
- `get_medication_list(patientId, filter?) -> MedicationListView` — active MedicationRequests + recent MedicationAdministrations with scheduled/overdue/PRN/held states.

**Write tools (draft-review lifecycle per Contract 5):**
- `queue_draft_task(input: DraftTaskWriteInput) -> Task` — creates `Task(status=requested)`.
- `create_draft_document(input: DraftDocumentWriteInput) -> DocumentReference` — creates `DocumentReference(status=current, docStatus=preliminary)`.
- `queue_draft_medication_administration(input: DraftMedicationAdministrationWriteInput) -> MedicationAdministration` — creates draft MAR entry with review state.
- `record_provenance(target, executionId?) -> Provenance` — mandatory with every write.
- `finalize_draft_document(documentRef, reviewerId) -> DocumentReference` — promotes preliminary to final with attestation.

**Context bundle shape:**
- `patient` (identity, demographics, allergies)
- `encounter` (active encounter snapshot)
- `timeline` (chronologically ordered events: observations, conditions, medications, procedures, notes, devices)
- `trends` (computed vital/lab trends)
- `gaps` (explicit missing-data callouts)
- `lane_coverage` ({ehr/chart, memory, clinical-resources, patient-monitor/simulation} -> present|partial|missing|not-assembled)
- `sources` (FHIR resource types consulted)
- `budgetTruncated`, `truncatedCount` (context-compression metadata)

**Provenance envelope:**
Required fields per resource, including agent-authored vs human-authored tagging, execution ID, workflow code, source layer (L3-original by default).

**Lane vocabulary:**
`ehr/chart`, `memory`, `clinical-resources`, `patient-monitor/simulation` — normative. Extensions are allowed but must be namespaced.

**Versioning:**
- Semver. v1.0.0 is the initial publication.
- Breaking changes require major bump and a migration note.

### 2.3 Validation mechanism

- JSON Schema files for each input/output shape under `docs/standards/schemas/`.
- A conformance checklist Product B's server can be tested against (`services/clinical-mcp/src/__tests__/contract-v1-conformance.test.ts`).

### 2.4 Acceptance criteria Phase 2

- `docs/standards/clinical-mcp-contract-v1.md` exists and is complete.
- JSON schemas are parseable.
- `services/clinical-mcp/` passes the conformance test for v1 tools it claims to implement. Unimplemented tools are marked `todo` in the conformance matrix, not silently absent.

---

## Phase 3 — Shared Contracts Package

Pull types that cross product boundaries out of any single product. No subordinate may depend on another subordinate for these.

### 3.1 New package: `packages/contracts/`

Contents:
- `src/renderer-input.ts` — `ShiftReportRendererInput` type used by harness renderer and EHR worker.
- `src/lane-coverage.ts` — lane vocabulary + coverage enum.
- `src/provenance-envelope.ts` — agent-authored vs human-authored provenance shape.
- `src/trace-envelope.ts` — shared trace envelope (expanded in Phase 7).
- `src/context-bundle.ts` — `PatientContextBundle` type matching the clinical-MCP contract.
- `src/mcp-tool-types.ts` — tool input/output types for clinical-MCP contract v1.
- `package.json` — npm workspace member; no dependencies on other Noah packages.

### 3.2 Migration

- `services/clinical-mcp/src/context/assembler.ts` imports `PatientContextBundle` from `@noah/contracts` instead of local types.
- `packages/agent-harness/shift-report-renderer.mjs` imports renderer-input type from `@noah/contracts`.
- `.noah-pi-runtime/extensions/noah-router/` imports lane-coverage from `@noah/contracts`.

### 3.3 FHIR types decision

`services/clinical-mcp/src/fhir/types.ts` defines minimal FHIR R4 types (Patient, Observation, MedicationAdministration, etc.). Options:
- (a) Keep in clinical-mcp — these are implementation types, not contracts.
- (b) Move to `packages/fhir-types/` as a separate shared package.

**Recommendation: (a) for Phase 3.** FHIR types are implementation detail; the contract references FHIR resource names, not TypeScript shapes. Revisit if a second package needs them.

### 3.4 Acceptance criteria Phase 3

- `packages/contracts/` exists and is a valid npm workspace.
- Type imports across product boundaries go through `@noah/contracts` (or equivalent package name).
- No subordinate imports types from another subordinate directly.
- Build passes across all workspaces.

---

## Phase 4 — Product B: MAR Surface

The MAR is an EHR artifact. This phase builds the MAR into Product B so medication workflows (Phase 6) and sim scenarios (Phase 9) have something to write to.

### 4.1 Write path (server side)

File: `services/clinical-mcp/src/fhir/writes.ts`

The file already has a `queueDraftMedicationAdministration` function. This phase expands it into the full MAR write lifecycle per Stage 4 of `medplum-write-path-expansion.md`:

- `queueDraftMedicationAdministration` — exists; verify against contract schema.
- `chartMedicationAdministration` — new; writes a finalized administration when a human nurse (or attested agent) records it. Status `completed`, effectiveDateTime set, performer reference required.
- `holdMedicationAdministration` — new; writes `not-done` with statusReason `held`, link to MedicationRequest.
- `recordProcedure` — new; stubs Procedure writes for RSI/intubation/line placement (Stage 4 half 2).

All must call `recordDraftProvenance` (already exists) with explicit author type (agent vs human) and source layer.

### 4.2 Read path additions

File: `services/clinical-mcp/src/context/medication.ts` — new.

- `getMedicationList(patientId, filter)` — assembles a MAR view: active MedicationRequests, recent MedicationAdministrations (last 24h), computed scheduled/overdue/PRN/held states from MedicationRequest.dosageInstruction.timing and Administration history.
- Exposes this through `server.ts` as the `get_medication_list` MCP tool per contract v1.

### 4.3 Nursing-station UI

Files: `apps/nursing-station/src/pages/Mar.tsx` + integrations in `apps/nursing-station/src/App.tsx` router.

- New route `/Patient/:id/mar` or section `mar` on `PatientChartPage`.
- Reads `MedicationRequest` and `MedicationAdministration` from Medplum via the Medplum React SDK (not via the MCP tool — the UI talks to FHIR directly; the MCP tool is the agent-facing path).
- Displays: scheduled meds with times, overdue flags, PRN list, held meds, administration history, high-alert med flagging (using `drug-ranges.json` data until Phase 5 replaces it).
- Write actions: administer (prompts for actual time, site, amount), hold (prompts reason), skip with reason.
- Write calls go through Medplum React SDK directly (human clinician path) or through the MCP tool (agent path). Both paths use the same FHIR primitives, differ only in provenance tagging.

### 4.4 Provenance rules for MAR

Document and enforce in code:
- Human-nurse-authored: `agent.who = Practitioner/{id}`, `activity = record`, no `source-layer` entity.
- Agent-authored: `agent.who = "Noah RN Agent"`, `activity = propose`, `source-layer = L3-original`.
- Agent-administered (not valid): if an agent tries to create a MedicationAdministration with `status=completed` and no human attestation, the write path rejects it.

This rule enforces that medications are always nurse-verified, even when agent-proposed.

### 4.5 Acceptance criteria Phase 4

- MAR UI renders in nursing-station with live Medplum data.
- Nurse can chart an administration via the UI; FHIR resource is written with correct provenance.
- Agent can propose a draft administration via the `queue_draft_medication_administration` MCP tool; it appears in the MAR with `review-required` tag.
- Agent cannot write a finalized administration without human attestation (enforced in writes.ts).
- Playwright test covers: open chart → MAR section → chart one administration → verify FHIR write.

---

## Phase 5 — Drug Reference Scaffold (Lexicomp-Mirror v0)

Replace the 3.3 KB `drug-ranges.json` stub with a structured drug reference substrate. Not a full Lexicomp clone — a minimum viable scaffold the first medication workflow can consume.

### 5.1 Location

New directory: `clinical-resources/drug-reference/`

- `drug-reference/schema.json` — JSON Schema for a drug entry.
- `drug-reference/drugs/` — one file per drug (starting with ~20 drugs relevant to the ICU respiratory decompensation scenario: norepinephrine, vasopressin, epinephrine, lasix, heparin, insulin, morphine, fentanyl, rocuronium, succinylcholine, propofol, midazolam, amiodarone, diltiazem, levophed, dopamine, dobutamine, nitroglycerin, phenylephrine, hydralazine).
- `drug-reference/indexes/` — auto-generated lookup indexes by generic name, brand name, drug class, high-alert status.
- `drug-reference/FRESHNESS.md` — provenance metadata, source attribution, review dates.

### 5.2 Drug entry shape

Each drug file contains:
- Identity: generic name, brand names, drug class, controlled substance status.
- Dosing: adult, pediatric, renal/hepatic adjustments, max doses.
- Routes: IV push, IV infusion, IM, PO, etc. with typical rates.
- High-alert: ISMP high-alert list membership with risk factors.
- Incompatibilities: IV compatibility list, LASA pairs.
- Indications and contraindications (reference, not exhaustive).
- Monitoring: what to watch (HR, BP, sedation level, specific labs).
- Provenance: source citation, freshness date, confidence tier.

### 5.3 Consumer surface

New file: `packages/contracts/src/drug-reference-client.ts`

A typed interface the harness can use to look up a drug by name or class. Backed by the directory contents at startup (or on demand).

### 5.4 MCP tool

Exposed through the EHR's MCP server so clinicians and agents can both look up drugs. Alternatively: a separate lightweight MCP server for `clinical-resources` if it needs to be standalone-shippable later.

**Recommendation: Phase 5 exposes it through the EHR's MCP server** (convenience); Phase 5b (future) extracts it into its own server if a standalone resource product is desired.

### 5.5 Acceptance criteria Phase 5

- 20 drug entries with complete schema.
- Lookup by generic name, brand name, and drug class returns correct entries.
- High-alert flagging works for insulin, heparin, and pressors at minimum.
- MCP tool `lookup_drug(query)` returns structured results.
- Existing `drug-ranges.json` is either removed or marked deprecated with a pointer to the new location.

---

## Phase 6 — First Medication Workflow (Five-Rights Verification)

The three-product round-trip proof. A narrow, clinically meaningful workflow that exercises Product A → Product B → resource lanes end-to-end.

### 6.1 Workflow: `five-rights-verification`

New directory: `packages/workflows/five-rights-verification/`

- `SKILL.md` — full workflow contract per `packages/workflows/CONVENTIONS.md`.
- `dependencies.yaml` — declares: `clinical-mcp` (MAR tools), `drug-reference` (lookup).

Scope: Given a scheduled medication administration, verify the five rights (right patient, right drug, right dose, right route, right time) plus high-alert special handling. Output is a structured verification artifact the nurse reviews before administering.

### 6.2 Workflow inputs

- `patientId` (required) — fetches patient + encounter via `get_patient_context`.
- `medicationRequestId` or `medicationAdministrationTaskId` — the med to verify.
- Optional narrative clarification from nurse.

### 6.3 Workflow steps (illustrative)

1. Fetch patient context via `get_patient_context` MCP tool.
2. Fetch medication list via `get_medication_list` MCP tool.
3. Identify the target MedicationRequest.
4. Look up the drug via `lookup_drug` MCP tool.
5. Check right drug: generic/brand match.
6. Check right dose: compare MedicationRequest.dosageInstruction against drug reference max/min; flag if outside range.
7. Check right route: compare route codes against drug reference allowed routes.
8. Check right time: compare scheduled time against patient's last administration of this drug (contraindicated if too recent).
9. Check right patient: patient identity reconciliation (two identifiers, allergy check against drug class).
10. High-alert handling: if insulin/heparin/pressor, require explicit second-nurse-check flag in output.
11. Produce structured verification artifact (Markdown + JSON) with each of the five rights explicitly checked.
12. Optional: queue a draft `Task(code=verify-administration)` linked to the MedicationAdministration via `queue_draft_task`.

### 6.4 Output artifact

Structured like the Shift Report artifact: PATIENT, DRUG, VERIFICATION sections, EVIDENCE (which FHIR sources and drug reference entries were consulted), CONFIDENCE (tier per check), PROVENANCE, disclaimer.

### 6.5 Nursing-station integration

MAR UI (Phase 4) gains a "Verify with Noah" button next to each scheduled administration. Button invokes the workflow through the harness and renders the returned artifact in a review pane. Nurse accepts/overrides/skips. Acceptance records an attested Provenance.

### 6.6 Acceptance criteria Phase 6

- Workflow registered in `packages/workflows/registry.json` and discoverable by the harness.
- Running the workflow against `patient-123` with a known MedicationRequest produces a correct artifact with five rights explicitly checked.
- High-alert flagging fires for at least one scenario (e.g. insulin infusion).
- End-to-end: nurse clicks Verify in MAR UI → harness invocation → artifact renders → nurse accepts → administration recorded with attestation provenance.
- Zero imports from Product B into Product A and vice versa — verification runs entirely through the MCP contract.

---

## Phase 7 — Observability Envelope v1 (shared trace contract)

The telemetry pipeline from commit 568981a is harness-shaped. Under the three-product split, each product should be able to emit traces that share a common envelope, so the dashboard can render cross-product invocations coherently.

### 7.1 Shared envelope

New contract in `packages/contracts/src/trace-envelope.ts`:

- `trace_id`, `parent_trace_id` (for cross-product call chains).
- `product` enum: `harness | ehr | sim | resources`.
- `timestamp_start`, `timestamp_end`.
- `operation` (free-form: `workflow:five-rights`, `mcp-tool:get_patient_context`, `sim:advance_clock`, etc.).
- `inputs_digest`, `outputs_digest` (hashes; full content in a companion trace body).
- `lane_coverage` (if applicable).
- `provenance_refs` (FHIR Provenance IDs produced).
- `safety_gates` (triggered + outcomes).
- `cost` (tokens, latency, wall time).
- `eval_scores` (if evaluation is attached).

### 7.2 Emission

- Product A (harness) already emits roughly this shape via `packages/agent-harness/src/telemetry-schema.ts`; refactor to import from `@noah/contracts` and extend with the new fields.
- Product B (clinical-mcp server + worker) starts emitting for each MCP tool call and each draft write.
- Product C (sim-harness) starts emitting for each scenario advance, alarm fire, and device-stream write. Requires a small emission utility that can be swapped to stdout/file/sink depending on deployment.

### 7.3 Dashboard updates

`apps/clinician-dashboard/src/components/TraceViewer` already exists. Extend to:
- filter by `product`.
- render cross-product call chains via `parent_trace_id`.
- surface provenance refs and safety-gate outcomes.

### 7.4 Acceptance criteria Phase 7

- All three products can emit traces conforming to the v1 envelope.
- A full five-rights invocation from Phase 6 produces a trace chain: harness (workflow:five-rights) → ehr (mcp-tool:get_patient_context) → ehr (mcp-tool:get_medication_list) → resources (mcp-tool:lookup_drug) → ehr (mcp-tool:queue_draft_task).
- Dashboard renders the chain coherently.
- No product imports another product's code to emit traces — all go through `@noah/contracts`.

---

## Phase 8 — Product C: Sim-Harness MCP Surface + Lanes B/C

Prepare Product C to participate as a peer product via its own MCP surface, and land the Lane B/C work needed for the ICU scenario.

### 8.1 Sim-harness MCP server

New files: `services/sim-harness/src/mcp/server.ts`, `services/sim-harness/src/mcp/tools/*.ts`.

Initial tools per Contract 4 / 6 / the waveform vision contract:
- `sim_get_vitals_snapshot(patientId)` — current L1 monitor state.
- `sim_get_waveform_samples(patientId, parameter, window)` — raw waveform access for monitor-as-avatar validation.
- `sim_get_waveform_image(patientId, parameter, window)` — rendered image for vision-capable agents.
- `sim_advance_clock(durationSeconds)` — scenario-controller-mediated time step.
- `sim_set_clock_mode(mode)` — wall/accelerated/frozen/skip-ahead.
- `sim_list_scenarios()` / `sim_load_scenario(id)` — scenario selection.
- `sim_get_active_obligations(patientId)` — Contract 7 obligations surface.

Sim MCP server runs on its own port. Agents reach it the same way they reach clinical-mcp.

### 8.2 Scenario controller unification (Lane B closure)

Resolve the two-loader problem identified in exploration:
- Retire the JSON loader in `scenario.ts`.
- Keep TypeScript fixtures in `scenarios/*.ts` as canonical.
- Add SAC-1 authoring contract fields (`charting_policy`, `provider_schedule` per amendments T5–D6).
- Remove static Map; load from the scenarios directory with an optional overlay for runtime-added scenarios.

### 8.3 Monitor bridge (Lane C)

New files: `services/sim-harness/src/monitor/bridge.ts`, `services/sim-harness/src/monitor/alarm-classifier.ts`.

- `AlarmEvent` type with IEC 60601-1-8 attention classes (critical, warning, info).
- Classifier maps L0 state transitions to alarm events per thresholds.
- Device bridge writes observations per-parameter cadence (HR/SpO2/RR at PT5M, NIBP at PT15M, temp at PT1H) per the bedside-workflow plan.
- Observations written with `agent.who = Device/{deviceId}` provenance and `source-layer = L1-device-stream`.

### 8.4 Pulse wrapping landed

If Phase 0.7 promoted the REST-sidecar decision: scaffold `infrastructure/pulse/` with docker-compose + pre-baked `.pbb` state files for the three seed scenarios. Python adapter in `services/sim-harness/pulse-sidecar/` exposing the L0 interface over REST. Node adapter in `services/sim-harness/src/reference/adapter.ts` gains a `PulseEngineAdapter` alternative to `ReferencePkEngineAdapter`.

If Phase 0.7 deferred the decision: Phase 8 uses the existing `ReferencePkEngineAdapter` for Lanes B/C and marks Pulse integration as out of scope for Phase 8.

### 8.5 Acceptance criteria Phase 8

- Sim-harness MCP server starts and exposes the tools above.
- Clinical-mcp no longer imports from sim-harness directly — all interaction is via MCP (including the `registerSimTools()` seam, which becomes a client-side registration of remote tools).
- Lane B unified: one scenario loader, SAC-1 fields present.
- Lane C partial: alarm classifier works for at least three alarm types (SpO2 critical low, MAP critical low, RR critical high).
- Device bridge writes observations at per-parameter cadences.
- If Pulse landed: REST sidecar stabilizes a scenario within stated time budget (1–3 min first-run, <5s with pre-baked state).

---

## Phase 9 — ICU Respiratory Decompensation End-to-End

The integration exercise. Proves all three products plus resource lanes round-trip through a clinically meaningful scenario.

### 9.1 Scope

The 9-beat scenario from `docs/foundations/first-bedside-workflow-spec.md`:
T=0 baseline → T=10–15 drift → T=20–25 flash edema → T=30 Lasix → T=30–45 pressor rise → T=45–55 titration → T=55–65 escalation → T=65–75 intubation → T=75–90 stabilization/deterioration.

### 9.2 Minimum harness exercises

At each beat, the harness should invoke at least one workflow that touches the MAR or the chart:
- Beat T=10: assessment workflow recognizes SpO2/RR drift.
- Beat T=20: alarm triage workflow handles flash edema alarm cascade.
- Beat T=30: five-rights verification for Lasix.
- Beat T=35: vitals interpretation workflow for post-Lasix response.
- Beat T=45: titration decision-support workflow for norepinephrine.
- Beat T=60: consult-trigger workflow produces a communication artifact.
- Beat T=70: RSI verification workflow checks hyperkalemia-contraindication rules (rocuronium vs succinylcholine).
- Beat T=85: shift-handoff workflow produces an updated Shift Report.

### 9.3 Acceptance criteria Phase 9

- Full scenario runs end-to-end with all three products contributing.
- All FHIR writes carry correct provenance (agent-authored proposed, human-attested finalized).
- Trace envelope v1 captures the full run with cross-product chains visible.
- Dashboard renders the run as a coherent timeline.
- Monitor-as-avatar invariant holds: at least one workflow validates a rhythm claim against raw waveform samples.
- A replay of the trace produces identical agent decisions (deterministic scenario).

---

## Cross-cutting: Naming & Boundary Rules

### N.1 Renaming consideration (defer decision; flag only)

`services/clinical-mcp/` is accurate today (the agent-facing boundary for chart data) but under the three-product framing its name is ambiguous — it is Product B's server side specifically. Candidate renames: `services/ehr-mcp/` or `services/nursing-station-mcp/`.

**Recommendation: defer the rename.** Renaming cascades through imports, scripts, docs, and runtime paths. It is the kind of change that should happen once the three-product shape is real in code, not during the transition. Revisit after Phase 6.

### N.2 Authority rule (write in Phase 0.5)

> `packages/agent-harness/` and `packages/workflows/*/SKILL.md` are the authoritative contract surface. `.noah-pi-runtime/extensions/*` is the live execution surface and is subordinate. On any conflict between a contract and an extension, the contract wins and the extension must update within the same change.

### N.3 Product boundary rule (write in Phase 0.6)

> No product imports code from another product. Products communicate via the clinical-MCP contract (A↔B), FHIR (C→any EHR), or the sim-harness MCP contract (A↔C). Cross-product in-process calls are boundary violations.

### N.4 Subordinate resource sharing rule (write in Phase 0.3)

> Subordinate lanes (clinical-resources, memory, observability) may be consumed by any product through their declared contracts. They do not import from products.

---

## What this plan does NOT do

- **Does not implement memory layer runtime.** Memory stays spec-only. Required memory layer must be named by the first workflow that cannot progress without it. No Phase 6 workflow requires memory.
- **Does not build a full Lexicomp clone.** Phase 5 is a 20-drug scaffold, not a comprehensive pharmacology database.
- **Does not target Epic/Cerner integration.** The clinical-MCP contract is designed to be portable, but Phase 1–9 all run against Medplum-backed Product B.
- **Does not rename `services/clinical-mcp/`.** Deferred.
- **Does not promote the Shift Report review loop to final status.** The review/acknowledge/finalize spine stays as landed; MAR UI in Phase 4 may trigger review-pane changes but does not rewrite the draft lifecycle.
- **Does not rebuild the dashboard.** Phase 7 extends TraceViewer for the shared envelope; no second chart.
- **Does not land all sim lanes.** Phase 8 lands Lanes B/C partial. Lanes D–F stay deferred until the ICU scenario demands them.
- **Does not touch `research/`, `wiki/`, or `docs/archive/`.** Per working rules.

---

## Verification (how to test end-to-end)

### Phase 0
Manual: read control-plane docs as a new contributor and confirm the three-product shape is legible without ambiguity.

### Phase 1
```
npm run test --workspace services/clinical-mcp
grep -r "packages/agent-harness" services/ | grep -v node_modules | grep -v dist
# expect: zero source imports
bash services/clinical-mcp/test-shift-report-task.sh
# expect: draft DocumentReference created identically to pre-change baseline
```

### Phase 2
```
# validate JSON schemas
npx ajv validate --schema docs/standards/schemas/*.json
npm run test --workspace services/clinical-mcp -- --grep "contract-v1-conformance"
```

### Phase 3
```
npm run build
# expect: all workspaces build; no cross-subordinate imports
```

### Phase 4
```
npm run dev:nursing-station
# manually: chart one MedicationAdministration; verify in Medplum UI
npm run playwright:nursing-station:mar
# expect: MAR charting flow passes
```

### Phase 5
```
npm run check --workspace clinical-resources
# expect: 20 drug entries validate against schema
# manual: lookup "norepinephrine", "insulin"; verify high-alert flag
```

### Phase 6
```
npm run test --workspace packages/workflows/five-rights-verification
# full stack: nursing-station + clinical-mcp + harness running
# manual: load patient-123 → MAR → Verify with Noah on a scheduled med
# expect: artifact renders with five rights explicitly checked
```

### Phase 7
```
# full stack run of Phase 6; then:
# open dashboard → TraceViewer → filter by product
# expect: cross-product trace chain visible with parent_trace_id links
```

### Phase 8
```
npm run test --workspace services/sim-harness
# start sim MCP server; invoke sim_get_vitals_snapshot from agent-side client
# expect: L1 monitor snapshot returns with correct schema
```

### Phase 9
```
# full stack + sim MCP server + scenario loaded
# run ICU respiratory decompensation scenario
# expect: 9 beats fire; all provenance correct; trace chain complete; replay deterministic
```

---

## Critical files to modify

Enumerated by phase for quick scanning.

**Phase 0 (docs only):**
- `TASKS.md`
- `PLAN.md`
- `docs/ARCHITECTURE.md`
- `README.md`
- `packages/agent-harness/README.md`
- `services/clinical-mcp/README.md`
- (optional, Phase 0.7) PLAN Decision Log + `docs/plans/sim-harness-bedside-workflow.md` header

**Phase 1:**
- `services/clinical-mcp/src/worker/shift-report-worker.ts`
- `services/clinical-mcp/src/adapters/harness-client.ts` (new)
- `packages/agent-harness/src/tools/render-shift-report.mjs` (new)
- `services/clinical-mcp/src/__tests__/worker.test.ts` (new or extended)

**Phase 2:**
- `docs/standards/clinical-mcp-contract-v1.md` (new)
- `docs/standards/schemas/*.json` (new)
- `services/clinical-mcp/src/__tests__/contract-v1-conformance.test.ts` (new)

**Phase 3:**
- `packages/contracts/` (new package, multiple files)
- `services/clinical-mcp/src/context/assembler.ts` (imports)
- `packages/agent-harness/shift-report-renderer.mjs` (imports)
- `.noah-pi-runtime/extensions/noah-router/` (imports)

**Phase 4:**
- `services/clinical-mcp/src/fhir/writes.ts` (expand)
- `services/clinical-mcp/src/context/medication.ts` (new)
- `services/clinical-mcp/src/server.ts` (register `get_medication_list`)
- `apps/nursing-station/src/pages/Mar.tsx` (new)
- `apps/nursing-station/src/App.tsx` (route registration)
- `apps/nursing-station/tests/mar.spec.ts` (new Playwright)

**Phase 5:**
- `clinical-resources/drug-reference/` (new directory)
- `clinical-resources/drug-reference/schema.json` (new)
- `clinical-resources/drug-reference/drugs/*.json` (20 new)
- `packages/contracts/src/drug-reference-client.ts` (new)
- `services/clinical-mcp/src/server.ts` (register `lookup_drug`)

**Phase 6:**
- `packages/workflows/five-rights-verification/` (new)
- `packages/workflows/registry.json` (update)
- `apps/nursing-station/src/pages/Mar.tsx` (add Verify button)

**Phase 7:**
- `packages/contracts/src/trace-envelope.ts` (new)
- `packages/agent-harness/src/telemetry-schema.ts` (refactor)
- `services/clinical-mcp/src/telemetry/*` (new)
- `services/sim-harness/src/telemetry/*` (new)
- `apps/clinician-dashboard/src/components/TraceViewer.tsx` (extend)

**Phase 8:**
- `services/sim-harness/src/mcp/server.ts` (new)
- `services/sim-harness/src/mcp/tools/*.ts` (new)
- `services/sim-harness/src/monitor/bridge.ts` (new)
- `services/sim-harness/src/monitor/alarm-classifier.ts` (new)
- `services/sim-harness/src/scenario/controller.ts` (unify)
- `services/sim-harness/scenarios/*.ts` (SAC-1 fields)
- `services/clinical-mcp/src/server.ts` (`registerSimTools()` becomes MCP client)
- (optional, if Pulse) `infrastructure/pulse/docker-compose.yml` + `services/sim-harness/pulse-sidecar/` (new)

**Phase 9:**
- Integration test under a new `tests/e2e-icu-scenario/` or workspace-specific location.
- No new source files; consumes Phases 1–8.

---

## Sequencing & dependencies

```
Phase 0 (docs) ─────┐
                    ├──▶ Phase 1 (renderer inversion) ─▶ Phase 2 (contract v1) ─▶ Phase 3 (shared contracts)
                    │                                                                    │
                    │                                                                    ├──▶ Phase 4 (MAR surface) ─┐
                    │                                                                    │                           │
                    │                                                                    ├──▶ Phase 5 (drug ref) ────┤
                    │                                                                    │                           │
                    │                                                                    │                           ▼
                    │                                                                    │                      Phase 6 (workflow)
                    │                                                                    │                           │
                    │                                                                    ├──▶ Phase 7 (trace env) ───┤
                    │                                                                    │                           │
                    │                                                                    └──▶ Phase 8 (sim MCP) ─────┘
                    │                                                                                                 │
                    │                                                                                                 ▼
                    │                                                                                          Phase 9 (ICU E2E)
```

- Phase 0 is always safe to land first; pure docs.
- Phase 1 gates everything else. Without renderer inversion, the three-product shape is not real in code.
- Phases 4, 5, 7, 8 can land in parallel after Phase 3.
- Phase 6 requires 4 + 5 minimum. 7 is valuable but not strictly required for Phase 6.
- Phase 9 requires all prior phases.

**Rough effort estimates (engineer-days, single contributor):**
- Phase 0: 0.5 day.
- Phase 1: 1–2 days (depending on whether interim IPC or full harness-as-service).
- Phase 2: 2 days.
- Phase 3: 1 day.
- Phase 4: 3–4 days.
- Phase 5: 2 days.
- Phase 6: 2–3 days.
- Phase 7: 2 days.
- Phase 8: 5–7 days (with Pulse), 3–4 days (without).
- Phase 9: 2 days integration + debugging.

Total: ~20–26 days for single contributor; parallelizable down to ~10–14 days for 2–3 contributors.

---

## Open questions for user decision before execution

Five decision points that shape execution. Listed here for explicit resolution; I recommend resolving before Phase 1 starts, but some can defer.

1. **Harness-as-service transport (Phase 1).** In-process interim adapter, or stand up the harness runner as a real service immediately? Interim is faster; service is the final shape. Recommendation: interim for speed, with the adapter file explicitly labeled as the future boundary.

2. **Pulse wrapping decision (Phase 0.7 / Phase 8).** Promote REST sidecar to PLAN Decision Log now, or keep `docs/plans/sim-harness-bedside-workflow.md` as exploratory? Recommendation: promote.

3. **Rename `services/clinical-mcp/` (Phase N.1).** Defer (recommended) or rename now? Recommendation: defer.

4. **Drug reference MCP surface (Phase 5).** Expose through EHR's MCP server (convenience) or stand up its own standalone server now (full product modularity)? Recommendation: EHR's server for Phase 5; extract later if a standalone resource product is desired.

5. **Scope of Phase 6 workflow.** Five-rights verification specifically, or a different first medication workflow? Five-rights is broadly applicable and exercises all five contract tools cleanly. Alternatives (titration decision support, high-alert double-check) are more specialized. Recommendation: five-rights.

---

## Success criteria for the whole alignment

The alignment is successful when a new contributor, reading only the updated control-plane docs and Phase 6's output, can answer each of these correctly:

1. **What is Noah RN?** The agent-native clinical workspace harness. Product A.
2. **What other products exist in this repo?** Product B (agent-native nursing EHR) and Product C (agent-native clinical simulation), both standalone-shippable and both subordinate to A's mission.
3. **How do the products connect?** Through the clinical-MCP contract (A↔B, A↔C) and FHIR (C→B).
4. **Where does the MAR live?** In Product B. The harness operates on it through MCP tools.
5. **Where do executable task functions live?** In Product A, in `packages/workflows/*/SKILL.md`.
6. **Where does drug reference data live?** In the `clinical-resources/drug-reference/` lane, consumed through a contract.
7. **What must be true if Noah RN is dropped into an Epic-backed hospital?** An Epic-facing MCP server implementing clinical-MCP contract v1 must exist. Product A runs unchanged.

A concrete deliverable — a full five-rights-verification invocation on `patient-123` — round-trips through Products A, B, and the drug reference lane, produces correct provenance, and emits a shared trace envelope. That is the alignment, proven.
