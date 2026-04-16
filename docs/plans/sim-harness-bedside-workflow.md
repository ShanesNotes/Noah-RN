# Sim-Harness: First Bedside Workflow End-to-End

**Status:** Consensus-plan source, superseded by approved PRD/test spec
**Owner:** Sim-harness lane
**Created:** 2026-04-16
**Target outcome:** One dense ICU MVP patient supports a full `0700 -> 1900` nursing-shift simulation, driven by Pulse-backed monitor behavior and a hybrid MIMIC-plus-synthetic chart substrate, with FHIR writes landing in Medplum and visible across `apps/nursing-station` and `apps/clinician-dashboard`.

Approved execution-planning artifacts:
- [prd-sim-harness-bedside-workflow-mvp.md](/home/ark/noah-rn/docs/plans/prd-sim-harness-bedside-workflow-mvp.md)
- [test-spec-sim-harness-bedside-workflow-mvp.md](/home/ark/noah-rn/docs/plans/test-spec-sim-harness-bedside-workflow-mvp.md)

---

## Context

The simulation harness already runs end-to-end at the *vitals* level: `services/sim-harness/src/demo.ts` ticks a reference pharmacokinetic engine and writes preliminary `Observation` resources to Medplum every 60 s via `services/sim-harness/src/device-bridge.ts`. The downstream UIs already speak FHIR through Medplum's OAuth2 client-credentials flow (`apps/clinician-dashboard/src/fhir/client.ts:33-49`).

What's missing — and what blocks executing the workflow specified in `docs/foundations/first-bedside-workflow-spec.md`:

1. **No real physiology engine.** The reference PK adapter (`src/reference/adapter.ts`) handles MAP/HR with Hill kinetics; SpO₂/RR/etCO₂ are derived from MAP shock-severity (lines 230-233), which cannot drive beats T=10 onward (SpO₂ drift → flash pulmonary edema → intubation → post-vent recovery). Contract 9 locked Pulse Physiology Engine as the L0 substrate; it is not yet integrated.
2. **Two competing scenario systems.** `src/scenario.ts` loads JSON files that don't exist on disk; `src/scenario/controller.ts` uses TS `ScenarioDefinition` from `scenarios/*.ts`. Neither honors the SAC-1 authoring contract (`docs/foundations/scenario-authoring-contract-simulation-architecture.md`).
3. **No charting authority surface.** `services/clinical-mcp/src/fhir/writes.ts:126-132,216-224` are stubs returning `Promise<never>`. Without Provenance, MedicationAdministration, Procedure, Task, Communication writers, the workflow has nowhere to chart.
4. **No monitor bridge with alarm classification.** Device-bridge writes vitals but no per-parameter cadence, no IEC 60601-1-8 alarm classification (Contract 4 amendment D7), no preliminary→final promotion path.
5. **MIMIC data is sparse for full ICU scenarios.** Per user concern, MIMIC alone cannot supply a complete 90-min ICU workflow's worth of structured + narrative + waveform data. A synthesis layer that grounds in MIMIC then creatively augments is a parallel sub-project.

**Deep-interview decisions locked (2026-04-16):**
- Scope: first bedside workflow end-to-end for one dense ICU MVP patient, not a broad patient corpus.
- Acceptance bar: a full `0700 -> 1900` nursing shift inside a believable live clinical chart environment.
- Pulse: bind now via REST sidecar in docker-compose.
- Patient sourcing: hybrid MIMIC-backed synthetic data, not strict raw-MIMIC purity.
- Narrative fidelity: required. Notes and chart structure are first-class context, not optional polish.
- Patient stitching: must be robust enough to feel like a complete medical record.
- Monitor target: near-term realism bar is Philips IntelliVue-like behavior and built-in monitor alarm conventions.
- Deferred subproject: real-time waveform interpretation by the AI agent.
- Decision boundary: OMX may choose the exact MIMIC blend, augmentation method, event timeline, and alarm/UI details without further approval as long as the realism bar is preserved.

## Clarified Milestone Frame

The first accepted milestone is no longer a narrow short-form respiratory scenario by itself. The true acceptance bar is:

- one dense ICU MVP patient
- one full nursing shift from incoming report at `0700` to outgoing report at `1900`
- live chart + robust longitudinal and intra-encounter history
- coherent notes, labs, vitals, medications, procedures, and events
- Noah-RN operating as a harness inside that environment

This plan should therefore optimize for dense chart realism and immersive workflow continuity over breadth of scenario count.

---

## Workstream decomposition

Six tracks. **Bold = critical path; italics = parallel-safe.**

| # | Track | Blocks | Blocked by |
|---|---|---|---|
| W1 | **Scenario controller unification + SAC-1 loader** | W4, W5, W6 | none |
| W2 | *MIMIC synthesis sub-project* | W6 (final scenario file) | none |
| W3 | **Pulse sidecar (docker + REST + Node adapter)** | W6 | none |
| W4 | *Monitor bridge + alarm classification* | W6 | W1 |
| W5 | *Charting authority surface (Provenance + writers)* | W6 | W1 |
| W6 | **End-to-end integration + verification** | — | all of W1–W5 |

W1 and W3 are the longest-pole items and run truly in parallel (TypeScript refactor vs. Docker/Python). W2 is not a fallback convenience lane; it is part of the intended MVP because hybrid MIMIC-backed synthetic data is now the accepted strategy for achieving dense chart realism.

---

## Phased deliverables

### Phase 0 — repo prep (~0.5 day)

- Decision artifact: SAC-1 scenarios authored as **TypeScript modules** (matches existing `scenarios/pressor-titration.ts` shape; types catch SAC-1 field violations at compile time; no runtime parser).
- Move `services/sim-harness/scenarios/{pressor-titration,fluid-responsive,hyporesponsive}.ts` → `services/sim-harness/scenarios/__fixtures__/` (engine unit-test fixtures only).
- Mark `services/sim-harness/src/scenarios/{nsr-baseline,tension-pneumothorax}.json` for deletion at end of Phase 1.

### Phase 1 — W1: scenario controller unification (~2-3 days)

**Goal:** one `ScenarioDefinition` type covering both fixture and SAC-1 usage; engine-adapter selection per scenario.

**New files:**
- `services/sim-harness/src/scenario/sac1-types.ts` — full SAC-1 shape (`metadata`, `source_patient`, `history_window`, `initial_engine_state`, `ordered_cadence`, `provider_schedule`, `scenario_timeline`, `charting_policy`, `monitor_bridge`, `termination_conditions`, `eval_hooks`).
- `services/sim-harness/src/scenario/loader.ts` — `loadScenario(def)` + `validateScenario(def)` (required-field presence, closed-set `agent.who` checks, reactive-trigger registry validation).
- `services/sim-harness/src/scenario/historical-seed-loader.ts` — Contract 6 T6 one-shot pre-T=0 bundle POST to Medplum with `agent.who = historical-seed`. Only place in runtime allowed to author historical-seed; subsequent runtime writes carrying that author throw.
- `services/sim-harness/src/scenario/instance-store.ts` — replaces module-level `liveScenarios` Map (`src/scenario/controller.ts:42`). Per-instance keying for CCPS-1 FM-4/FM-5 enforcement.

**Modified:**
- `services/sim-harness/src/scenario/controller.ts:29-33,41` — replace static `scenarios` map with loader; replace `adapter` constant with engine selection from `initial_engine_state.engine` (`"pulse"` | `"reference-pk"`); extend `applyAction` switch (lines 148-198) for SAC-1 intervention/insult set.
- `services/sim-harness/src/engine-adapter.ts` — extend `EngineIntervention` union with `procedure`, `respiratory-support`; extend `EngineInsult` with `respiratory-insult`, `volume-shift`; add actor-tagged wrapper.
- `services/sim-harness/src/demo.ts:14-20` — replace JSON loader call with SAC-1 loader.

**Deleted:** `services/sim-harness/src/scenario.ts`, `services/sim-harness/src/scenarios/*.json`.

### Phase 2 — W3: Pulse sidecar (~3-4 days)

**Locked technical decisions:**

| Decision | Choice | Why |
|---|---|---|
| Transport | HTTP/REST | Matches existing OAuth2 fetch patterns; no sticky-session complexity |
| Image source | Build from `python:3.11-slim-bookworm` + `pip install pulse-physiology-engine` | No official Pulse Docker image; PyPI binding is Kitware-published |
| Patient init | Pre-baked Pulse `.pbb` per scenario (W2 step 6 emits) | Cold stabilization is minutes; bake offline |
| Tick cadence | Pulse-native 20 ms internal; sidecar batches to caller cadence (default 1 Hz) | Honors Contract 1 deferred-decisions resolution |
| Adapter | `services/sim-harness/src/pulse/adapter.ts` mirroring `src/reference/adapter.ts` | One-line swap in `controller.ts:41` |

**New files:**
- `infrastructure/pulse/Dockerfile` — Python 3.11-slim-bookworm, `pulse-physiology-engine`, `fastapi`, `uvicorn`, expose 8104.
- `infrastructure/pulse/server.py` — FastAPI sidecar:
  - `POST /engines` — load pre-baked state or stabilize; returns `engine_id`.
  - `POST /engines/{id}/tick` — `{ delta_ms }` → projection JSON.
  - `POST /engines/{id}/actions/{medication|intubation|ventilator|insult}` — typed action endpoints.
  - `GET /engines/{id}/snapshot` — protobuf state for eval recorder.
  - `DELETE /engines/{id}` — teardown.
  - `GET /healthz` — version + engine count.
- `infrastructure/pulse/states/respiratory-decompensation-baseline.pbb` — pre-baked state (output of W2 step 6).
- `services/sim-harness/src/pulse/client.ts` — typed HTTP client (fetch wrapper with retry + timeout).
- `services/sim-harness/src/pulse/adapter.ts` — `PulseEngineAdapter implements SimulationEngineAdapter<PulseSerializedState>`. `physiologySource = 'pulse'`. Translates new intervention/insult variants into sidecar action calls.
- `services/sim-harness/src/pulse/__tests__/adapter.parity.test.ts` — runs `pressor-titration` fixture through both adapters; asserts MAP trajectory agreement within 10% over 30 sim-min. Smoke test for sidecar regressions.

**Modified:**
- `infrastructure/docker-compose.yml` — add `pulse-sidecar` service: build context `./pulse/`, port `8104:8104`, healthcheck on `GET /healthz`.
- `services/sim-harness/src/config.ts` — add `pulse: { url: process.env.PULSE_URL ?? 'http://localhost:8104' }`.

### Phase 3 — W4: monitor bridge + alarm classification (~2 days)

**New files:**
- `services/sim-harness/src/projections/alarms.ts` — `evaluateAlarms(snapshot, thresholds): AlarmEvent[]`. Each event carries `priority: 'high'|'medium'|'low'` (IEC 60601-1-8) and `attention_class: 'wake'|'notify'|'ambient'` (D7).
- `services/sim-harness/src/projections/alarm-thresholds.ts` — per-parameter table (SpO₂ < 92 medium, < 88 high; MAP < 65 medium, < 55 high; HR > 120/140; RR > 24/30).

**Modified:**
- `services/sim-harness/src/device-bridge.ts:267` — add `meta.tag` for `agent.who = device-auto` (system `https://noah-rn.dev/authored-actor`).
- `services/sim-harness/src/device-bridge.ts:294-299,117` — read cadence per-parameter from `scenario.monitor_bridge.cadence` instead of one global `writeCadenceSeconds`. Per spec: HR/SpO₂/RR PT5M, NIBP PT15M, temp PT1H, etCO₂ PT5M post-intubation only.

### Phase 4 — W5: charting authority surface (~3 days)

**Modified:**
- `services/clinical-mcp/src/fhir/writes.ts:216-224` — replace `recordDraftProvenance` stub with real `recordProvenance(target, authorityState, sourceLayer, attesterRef?, policyUrl?)` per `docs/foundations/medplum-write-path-expansion.md` §Provenance model.
- `services/clinical-mcp/src/fhir/writes.ts:126-132` — replace `queueDraftTask` and `queueDraftMedicationAdministration` stubs.

**New files (per write-path-expansion staged plan, Stages 2-5):**
- `services/clinical-mcp/src/fhir/observation-writes.ts` — `writeObservationBatch` (Bundle transaction); `attestObservation` for preliminary→final PATCH.
- `services/clinical-mcp/src/fhir/medication-writes.ts` — single + RSI-bundle MedicationAdministration writers.
- `services/clinical-mcp/src/fhir/procedure-writes.ts` — `writeProcedure` + `partOf`-linked MedAdmin bundling for intubation.
- `services/clinical-mcp/src/fhir/encounter-writes.ts` — `openEncounter`, `closeEncounter` (replaces implicit Encounter PUT in `device-bridge.ts:144-147`).
- `services/clinical-mcp/src/charting/policy.ts` — Stage 6 stub (always allows configured ceiling; real downgrade logic deferred).
- `services/clinical-mcp/src/worker/review-worker.ts` — generic review queue generalizing `services/clinical-mcp/src/worker/shift-report-worker.ts`. Polls `Task?status=requested`, routes by `focus.reference`.

**Out of scope (cut from first run):** Stage 7 (amendment/cancellation); full `charting_policy` enforcement.

### Phase 5 — W2: MIMIC synthesis sub-project (parallel; design in §3 below)

### Phase 6 — W6: integration + verification (~2 days)

**New files:**
- `services/sim-harness/scenarios/respiratory-decompensation-mimic.ts` — SAC-1 scenario object hand-authored from `docs/foundations/reference-scenario-respiratory-decompensation-mimic.md` §SAC-1 Scenario Authoring Shape. Subject + cut-point fields populated by W2 output (or `synthea-fallback` until then).
- `services/sim-harness/src/run-respiratory-decompensation.ts` — top-level driver replacing `demo.ts`. Wires loader → historical-seed → Pulse adapter → device-bridge with monitor_bridge cadence → controller advance loop → 9-beat sequencing → terminate at T=90.
- `services/sim-harness/src/__tests__/integration.respiratory-decompensation.test.ts` — end-to-end against in-process Medplum mock. Asserts: 9 beats fire in order, no `historical-seed` runtime writes, every Provenance `agent.who` ∈ closed D5 set, Pulse SpO₂ trajectory crosses 92/86/recovery boundaries within ±3 sim-min.

**Modified:**
- `services/sim-harness/package.json` — add `"demo:respiratory": "tsx src/run-respiratory-decompensation.ts"`.

---

## MIMIC synthesis sub-project (W2)

### Location

`services/mimic-synthesis/` — new sibling package. Not under `services/sim-harness/` because it is reused across scenarios, runs offline-batch (not runtime hot path), and has heavier deps (DuckDB/Polars for MIMIC Parquet, Anthropic SDK for narrative augmentation).

**Outputs** → `services/sim-harness/scenarios/__data__/<scenario-id>/` (historical bundle JSON + `provider-schedule.json`) + `infrastructure/pulse/states/<scenario-id>.pbb` + `services/sim-harness/scenarios/<scenario-id>.ts`.

### Pipeline

```
[MIMIC-IV Parquet on disk]
  → 1. Subject selector (DuckDB SQL: post-op + SpO₂ drift + Lasix + norepi + intubation)
  → 2. Cut-point picker (first SpO₂ ≤ 94% prior to escalation)
  → 3. Historical extractor (chartevents/labevents/prescriptions/noteevents pre-T=0 → FHIR JSON)
  → 4. Post-T=0 classifier (engine-input | provider-authored | reactive-provider | discarded)
  → 5. Augmentation layer (template-fill + LLM narrative synthesis; numbers MUST trace to MIMIC rows)
  → 6. Pulse-state baker (Python: instantiate engine, apply cut-point cardiopulmonary params, stabilize, serialize .pbb)
  → 7. SAC-1 emitter (assembles into ScenarioDefinition TS module)
  → 8. Validator (SAC-1 loader + CCPS-1 leak detector; fails build on any FM-1..FM-9)
```

### Validation gate (drift control — load-bearing)

The augmentation layer is where MIMIC ground truth can be lost. Three enforcements:

1. **Provenance tagging on every augmented field** — `_synthesis_provenance: { source: 'mimic-row' | 'template' | 'llm', mimic_row_ref?, llm_prompt_hash? }`. Stripped at runtime, read by Lane F eval.
2. **Numeric-anchor invariant** — every numeric value (vitals, labs, doses) MUST trace to a MIMIC row. Templates and LLM may only author free-text narrative. Validator rejects if any number lacks `mimic_row_ref`.
3. **MIMIC licensing** — synthesis reads from `MIMIC_DATA_ROOT` env var; raw MIMIC never committed. Derived structured JSON + Pulse `.pbb` may be committed (verify against PhysioNet DUA before any public commit).

### Reusability

Pipeline takes scenario "shape" as input. Shape file under `services/mimic-synthesis/shapes/<scenario>.ts` declares subject-selection SQL, cut-point heuristic, augmentation system prompt. New scenarios = add a new shape file.

**Files created:**
- `services/mimic-synthesis/package.json`
- `services/mimic-synthesis/src/select-subject.ts`
- `services/mimic-synthesis/src/extract-historical.ts`
- `services/mimic-synthesis/src/classify-post-cutpoint.ts`
- `services/mimic-synthesis/src/augment-narratives.ts`
- `services/mimic-synthesis/prompts/narrative-synthesis.md`
- `services/mimic-synthesis/src/bake-pulse-state.py`
- `services/mimic-synthesis/src/emit-sac1.ts`
- `services/mimic-synthesis/bin/synthesize.ts` — CLI: `npx tsx bin/synthesize.ts --subject <id> --scenario respiratory-decompensation`

---

## Verification plan

### Services up

```sh
cd /home/ark/noah-rn/infrastructure
docker compose up -d postgres redis medplum-server medplum-app pulse-sidecar
```

Verify:
- `curl http://localhost:8103/healthcheck` → `{ ok: true }` (Medplum)
- `curl http://localhost:8104/healthz` → `{ engines: 0, version: "pulse-4.x.x" }` (Pulse sidecar)
- `curl http://localhost:3000` → Medplum admin UI loads

### Run

```sh
cd /home/ark/noah-rn/services/sim-harness
PULSE_URL=http://localhost:8104 npm run demo:respiratory -- <patient-id>
```

Expect: 9 beats logged with L0/L1/L3 transitions; exit 0.

### Confirm in Medplum (FHIR queries)

- `Observation?patient=<id>&code=http://loinc.org|59408-5` (SpO₂) → ≥18 entries across 90-min window; mix of `preliminary` and `final` (latter from validation-promote path).
- `Observation?patient=<id>&code=8867-4` (HR) → similar shape.
- `MedicationAdministration?patient=<id>` → ≥3 entries: furosemide T+30, norepinephrine T+45, RSI bundle (propofol/rocuronium/fentanyl) T+65-75.
- `Procedure?patient=<id>` → 1 intubation, `status: completed`, with `partOf` MedAdmin links.
- `Provenance?target=Observation/<one-id>` → ≥1 per Observation, `agent.who.display` ∈ closed D5 set.
- `DocumentReference?patient=<id>&type=...escalation` → 1 entry for intubation request.
- `Communication?patient=<id>` → 1 entry from Noah → provider for consult.

### Confirm in nursing-station UI

`apps/nursing-station/src/pages/PatientChartPage.tsx`:
- `VitalsPanel.tsx` — vitals trend: stable T=0–10, SpO₂ drift T=10–20, sharp drop T=20–25, partial recovery T=30–45, post-intubation recovery T=65+.
- `MedicationList.tsx` — furosemide + norepinephrine; click reveals Provenance trail.
- `LabResultsPanel.tsx` — ABG result released at T+50.
- `TaskReviewPanel.tsx` — nurse-attest tasks for medication, intubation procedure note awaiting provider attest, consult Communication. Provider-consult Task should transition `requested → completed` when SAC-1 reactive policy fires.

### Confirm in clinician-dashboard

Encounter timeline open (T=0) → close (T=90); written Observations charted in their tabs.

### Eval rubric (smoke)

`services/sim-harness/src/__tests__/integration.respiratory-decompensation.test.ts` must pass: 9-beat assertion, closed-set author assertion, Pulse SpO₂ trajectory bounds, no FM-1..FM-9 leaks (load + replay).

---

## Risk callouts

1. **Pulse pip install on Linux** — PyPI wheel is glibc-bound. *Mitigation:* pin `python:3.11-slim-bookworm`; verify install at CI build; build from source as fallback.
2. **Pulse stabilization time** (1-3 min cold) kills startup feel. *Mitigation:* pre-bake `.pbb` per scenario; commit under `infrastructure/pulse/states/`.
3. **MIMIC subject selection time** (Open Question O1 in `reference-scenario-respiratory-decompensation-mimic.md`). *Mitigation:* use Synthea fallback profile for first runnable demo; real MIMIC binding follows.
4. **Scenario controller refactor regression** breaking the 3 fixture scenarios. *Mitigation:* leave `__fixtures__/` legacy adapter wrapping old `ScenarioDefinition` into SAC-1 shape; run existing tests against wrapper before deleting old code.
5. **FHIR resource cardinality blowup** (~400 resources/run). *Mitigation:* verify `_count` + `_sort=-date&_count=20` on all panel queries before W6.
6. **Charting authority scope creep** — Stages 1-7 of write-path-expansion is multi-week. *Mitigation:* cut Stage 7 entirely; cut Stage 6 to a stub.
7. **Provider reactive policy non-determinism** — `Math.random()` in latency window kills golden-replay. *Mitigation:* pass seeded RNG (reuse `createSeededRng` from `src/reference/pharmacokinetics.ts`).
8. **Cross-instance write bleed (CCPS-1 FM-5)** from module-level `liveScenarios` Map (`src/scenario/controller.ts:42`). *Mitigation:* Phase 1 `instance-store.ts` fixes this; integration test asserts disjoint resource ID prefixes across parallel runs.

---

## Critical files to modify

- `services/sim-harness/src/scenario/controller.ts` — central refactor site (engine selection, instance scoping, intervention-union extension).
- `services/sim-harness/src/engine-adapter.ts` — Lane A boundary; extending `EngineIntervention`/`EngineInsult` unions unblocks Pulse adapter and SAC-1 authoring.
- `services/sim-harness/src/pulse/adapter.ts` — *new* L0 swap-in; conformance to `SimulationEngineAdapter<T>` keeps L1-L4 untouched.
- `infrastructure/pulse/Dockerfile` + `infrastructure/pulse/server.py` — *new* runtime substrate; without it SpO₂/RR/etCO₂ stay shock-derived and the spec's beats T=10+ cannot fire.
- `services/clinical-mcp/src/fhir/writes.ts:126-132,216-224` — L3 destination stubs that must become real before any beat past T=0 can chart.
- `services/sim-harness/scenarios/respiratory-decompensation-mimic.ts` — *new*; the single integration point where W1, W2, W3, W4, W5 outputs converge.

---

## Effort estimate

- Phase 0: 0.5 day
- Phase 1 (W1): 2-3 days
- Phase 2 (W3): 3-4 days (parallel with W1)
- Phase 3 (W4): 2 days
- Phase 4 (W5): 3 days (parallel with W4)
- Phase 5 (W2): 5-7 days for first scenario (parallel with W1+W3); reusable thereafter
- Phase 6 (W6): 2 days

**Total:** ~10-14 working days with parallelism; ~18-21 sequential.

**First runnable demo (Synthea fallback path):** ~6-8 working days — skip W2 MIMIC selection; use Synthea-generated patient + hand-authored cut-point.
