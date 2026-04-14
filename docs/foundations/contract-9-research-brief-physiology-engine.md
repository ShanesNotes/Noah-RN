# Contract 9 Research Brief: L0 Physiology Engine Selection

## Purpose

First exercise of **Contract 9 (Research-Hook Decision Contract)** from `docs/foundations/foundational-contracts-simulation-architecture.md`. Triggered by a specific, testable gap between the reference PK adapter currently backing L0 and the acceptance criteria of the first bedside workflow. Scoped to resolve that gap — not a general survey.

Produces: a Contract 9 decision record that locks the engine choice for the first workflow, names what the decision covers, and names what remains open for future triggers.

## Trigger condition

Per Contract 9 invariant 2: every trigger must cite the specific contract and acceptance criterion that cannot be met.

**Blocked contract:** Contract 1 (Hidden Patient Truth) — acceptance criteria that L0 must produce emergent vital-sign changes from insults and interventions with temporal response profiles; engine adapter must be replaceable without modifying L1–L4 code.

**Blocked acceptance surface:** `docs/foundations/first-bedside-workflow-spec.md` — the nine timeline beats cannot be driven to completion by the reference PK adapter.

**Specific capability gaps** (from §Physiology fidelity requirements of that spec):

1. SpO₂ dynamics coupled to pulmonary fluid state
2. Respiratory rate reflex response to hypoxemia / acidosis + vent-override
3. Lung compliance / pulmonary edema progression + recovery
4. Capnography (etCO₂) waveform and numeric, vent-dependent
5. Diuretic response (Lasix → urine output → preload → BP loop)
6. Fluid balance state tracked at L0
7. Positive-pressure ventilation effect on venous return
8. Pleth waveform amplitude degradation as physiology (not artifact)

All eight are cardiopulmonary-coupled outputs. Reference PK produces MAP + HR only via Hill-equation dose-response + baroreflex. Gap is not a parameter tune — it is an architectural scope mismatch.

**Consequence if unresolved:** Lane A stabilizes an engine-adapter interface shape against MAP/HR-only semantics; Lane B scenario controller releases events the engine cannot ground; Lane C monitor projection has nothing to project for SpO₂ / RR / etCO₂; Lane F eval scoring rubric cannot run.

**Decision boundary:** the brief must produce a locked engine for cardiopulmonary-coupled outputs. It does not need to lock engine choice for nervous-system, endocrine, renal clearance beyond urine-output, hepatic, or tissue-level modeling — those are future triggers.

## Existing research consulted first

Per Contract 9 invariant 5: existing research is the first source, not re-generated.

- `wiki/entities/pulse-physiology-engine.md` — updated 2026-04-12 with WASM production-viability confirmed, C API wrapper pattern, 5–10× real-time perf at 20 ms step, active maintenance through Feb 2026. Forked from BioGears 6.1 in 2017 by the original physiology, integration, and software leads after disagreements over energy/exercise modeling.
- `wiki/entities/biogears.md` — Apache-2.0, C++ core, older than Pulse.
- `wiki/entities/infirmary-integrated.md` — reference pattern only (rhythm taxonomy, device UX). Not a physiology substrate candidate.
- `wiki/concepts/computational-physiology-engine.md` — architectural pattern the candidates implement.
- `wiki/concepts/emergent-vitals-from-physics.md` — why L0 outputs must be emergent from physics, not settable.
- `research/Open Source Clinical Simulation.md` and `research/Open Source Clinical Simulation.original.md` — source material for the wiki entities.
- `research/Architectural integration for noah-rn clinical simulation.md` — integration topology thinking.
- `research/simulation-environments/` — broader landscape notes.

No additional external research is required to resolve this trigger. The wiki synthesis is sufficient.

## Candidate evaluation

Four options considered. Only two are real substrate candidates.

### Candidate 1 — Pulse Physiology Engine (Kitware, Apache-2.0)

**Substrate status:** real.

**Coverage against capability gaps:**

| Gap | Pulse | Source |
|-----|-------|--------|
| 1. SpO₂ dynamics + pulm fluid coupling | ✅ native respiratory + cardiovascular + gas-exchange models; pulmonary edema is a modeled condition | Kitware docs + wiki entity + V&V suite |
| 2. RR reflex + vent override | ✅ respiratory control loop with chemoreceptor input; vent interface exists | Pulse respiratory subsystem |
| 3. Lung compliance dynamics | ✅ mechanical lung model with compliance state | Pulse respiratory subsystem |
| 4. Capnography | ✅ CO₂ production + alveolar ventilation → etCO₂ native | Pulse respiratory subsystem |
| 5. Diuretic response | ✅ renal subsystem with perfusion-pressure coupling + diuretic action | Pulse renal subsystem |
| 6. Fluid balance at L0 | ✅ whole-body volume compartments; intake + output tracked | Pulse cardiovascular + renal |
| 7. PPV effect on venous return | ✅ mechanical ventilation interface with cardiac-output coupling | Pulse cardiovascular + respiratory |
| 8. Pleth amplitude degradation | ✅ arterial pulsatility emergent from cardiovascular dynamics | Pulse cardiovascular |

**Performance:** 5–10× real-time at 20 ms step on desktop. Accelerated clock (N×) scenarios are achievable up to ~8× before engine becomes the bottleneck. Frozen-mode snapshot is straightforward (serialization is protobuf).

**Integration shape:** C API surface (`PulseHash`, `PulseVersion`, lifecycle) wrapped in a REST/WS sidecar is the recommended pattern per the wiki entity. Phase 2 is a sidecar. Phase 3 is WASM in-browser (production-viable as of Aug 2025). Noah-rn's Lane A engine-adapter boundary is the natural seam for this.

**Initialization cost:** Pulse stabilization takes minutes from cold. Pre-baked state files load instantly as protobuf binary. Scenario seeds → pre-baked states is the right pattern; do not stabilize per scenario invocation.

**V&V pedigree:** every Pulse code change runs a PK/PD baseline suite; physiological outputs deviating >2% from baseline fail CI. In comparative hemorrhage validation against BioGears, HumMod, and Muse, Pulse outperformed all three on MAP + cardiac-output realism. This is exactly the regression-gate pattern Noah-rn needs.

**Intervention/insult coverage for first workflow:**
- Medication administration: native (MedicationAdministration actions)
- Fluid bolus: native
- Intubation: native (Airway action + mechanical ventilation)
- FiO₂ / PEEP / vent-mode change: native
- Tension pneumothorax / airway obstruction: native (already in dataset-generation tooling)
- Diuretic: native

**Risks / gaps:**
- No native REST / WebSocket / FHIR — wrapper unavoidable. True of every candidate.
- Stabilization time requires pre-baked scenario states (not runtime blocker if planned).
- 256 MB default WASM memory (growable) — not a near-term concern.

### Candidate 2 — BioGears (Apache-2.0)

**Substrate status:** real but superseded.

**Coverage:** modeled whole-body physiology including respiratory and cardiovascular. Historically strong on sepsis. Forked-from source for Pulse.

**Why not chosen:**
- Pulse is the live fork with the original leads; BioGears divergence predates Pulse's respiratory + V&V modernization.
- Comparative hemorrhage validation showed Pulse outperforming BioGears on MAP + CO realism.
- WASM port status for BioGears is unclear; Pulse's is confirmed.
- Active maintenance momentum is on Pulse.

Kept as **fallback candidate for capabilities Pulse does not cover cleanly** — consistent with the existing scaffold language. Not the primary pick.

### Candidate 3 — In-house cardiopulmonary extension of the reference PK module

**Substrate status:** feasible but forbidden by the kernel.

**Coverage:** could implement purpose-built models for the eight gaps.

**Why not chosen:**
- Directly violates invariant 1 (Patient Truth) and the wrap-don't-rebuild policy. The whole point of the L0 adapter boundary is that in-house physiology does not back it.
- Creates maintenance burden that a validated engine already discharges.
- No V&V pedigree equivalent to Pulse's PK/PD regression suite.
- Blocks the `physiologySource` enum from meaningfully reporting engine provenance.

Rejected.

### Candidate 4 — No engine yet; block runtime until engine chosen via different trigger

**Substrate status:** null.

**Why not chosen:**
- TASKS.md #9 is open. This is the trigger. Deferring defeats Contract 9's purpose.
- Lane A engineer is active; the engine-adapter interface stabilizes wrong without a target.
- First-bedside-workflow spec already identifies eight specific acceptance gaps; waiting for a different trigger is unnecessary.

Rejected.

## Decision

**Pulse Physiology Engine** is selected as the L0 substrate for the Clinical Simulation Harness.

**Scope of this decision:**

- Locks the engine for cardiopulmonary-coupled L0 outputs required by the first bedside workflow and all derived scenarios that stay within cardiopulmonary + hemodynamic + basic renal scope.
- Locks the integration pattern: Phase 2 sidecar (REST/WS wrapper around Pulse C API). Phase 3 WASM in-browser remains an option, not a commitment.
- Locks the engine-adapter `physiologySource` field value `"pulse"` as the authoritative L0 attribution for this scenario.
- Locks the V&V pattern: Pulse's PK/PD baseline-deviation regression gate is adopted as the engine-regression contract under Contract 8 (Eval/Trace).

**What this decision does not lock:**

- Neurological, endocrine, advanced renal clearance, hepatic, tissue-level, or exercise modeling. Future triggers if scenarios require them. BioGears remains a fallback candidate for capabilities Pulse does not cover.
- UI rendering surface for waveforms. Contract-layer decision independent of engine choice.
- Whether the Pulse sidecar runs in-process, in the same container, or remote. Implementation-topology choice under Contract 2 deferred decisions.
- Whether Phase 3 WASM-in-browser ships. Future decision when an acceptance criterion forces it.

## Required Contract 1 amendment

Per Contract 9 invariant 3 (amendment when decision affects a foundational contract):

Amend Contract 1 (Hidden Patient Truth) deferred-decisions list:

- **Before:** "Which engine (Pulse, BioGears, other). Governed by Contract 9 (Research-Hook)."
- **After:** "Engine choice: **Pulse Physiology Engine** (Apache-2.0, Kitware). Locked 2026-04-13 via Contract 9 research brief `docs/foundations/contract-9-research-brief-physiology-engine.md`. Scope: cardiopulmonary + hemodynamic + basic renal outputs for the first bedside workflow and derived scenarios. BioGears retained as fallback substrate for capabilities Pulse does not cover cleanly. Tick cadence: Pulse-native 20 ms. Integration pattern: Phase 2 sidecar wrapping the Pulse C API; Phase 3 WASM-in-browser deferred."

This is a targeted amendment, not a rewrite. Append under the existing Deferred Decisions section as the **engine-choice resolution entry**, following the Amendments Log pattern established 2026-04-13.

## Implementation plan outline

Not the implementation itself — the plan for Lane A / Lane A follow-on to absorb the decision.

### Lane A follow-on — adapter interface absorption

1. Extend `EngineIntervention` union in `services/sim-harness/src/engine-adapter.ts` beyond `medication | fluid-bolus`:
   - `procedure` variant with typed parameters (intubation: tube size, RSI meds, initial vent settings; central-line: site, size)
   - `respiratory-support` variant (FiO₂, PEEP, vent mode, NIV apply/remove)
   - Actor-tagged wrapper for provenance (actor: `agent` | `nurse` | `provider` | `scenario-director`) — Contract 5 will need this.
2. Extend `EngineInsult` union beyond `hemodynamic-shift`:
   - `respiratory-insult` (compliance change, shunt, airway resistance)
   - `volume-shift` (preload change independent of drug)
3. Extend `EngineAgentProjection.vitals` population to include real engine-driven values for `spo2`, `etco2`, `rr` (shape already supports; reference PK returns zeros today; Pulse will return emergent values).
4. Author `services/sim-harness/src/pulse/adapter.ts` implementing `SimulationEngineAdapter<PulseSerializedState>` — thin wrapper around the Pulse sidecar client. Mirrors `ReferencePkEngineAdapter` shape.
5. Keep `ReferencePkEngineAdapter` in place for existing hemodynamic-only scenarios (pressor-titration, fluid-responsive, hyporesponsive). The three seed scenarios continue to run against reference PK; the first bedside workflow runs against Pulse.
6. `physiologySource` field returns `"pulse"` when Pulse-backed, `"fallback"` when reference-PK-backed.

### Sidecar infrastructure

- Package the Pulse C API wrapper as a sidecar service under `infrastructure/pulse/` or `services/pulse-sidecar/` — placement decision for brownfield pass, not this brief.
- REST or WS transport. WS if tick streaming is needed at 20 ms cadence; REST if per-action invocation is sufficient for first workflow.
- Pre-baked patient states under version control (initial conditions for each scenario serialized as Pulse protobuf).
- Health check + version endpoint. `PulseVersion` is the adapter's version attribution.

### V&V regression gate

- Adopt Pulse's PK/PD baseline-deviation pattern as the Contract 8 engine-regression surface. CI runs a baseline scenario suite; any vital output deviating >2% from recorded baseline fails the build. This is a Lane F deliverable.
- Golden-test scenarios use frozen-clock mode for deterministic replay.

## Remaining open questions (explicit non-locks)

- **Pulse version pin.** Pulse 4.3.x was current Feb 2026. Pin a specific tag when the sidecar lands.
- **Sidecar transport.** REST vs WS decision deferred to sidecar implementation PR.
- **Sidecar placement.** `infrastructure/` vs `services/`. Brownfield pass decision.
- **Pulse state serialization strategy.** Per-scenario cached states vs on-demand stabilization. Performance measurement during Lane A follow-on.
- **Vision-capable waveform rendering.** Separate concern; Pulse produces sample data; rendering is Contract 4's L1 output surface.
- **Engine swap mechanics under a running encounter.** Not needed for first workflow; deferred.

## Validation method for this brief

Per Contract 9 invariant 4 (decision record is explicit about what it locks and what remains open):

- Every numbered capability gap in §Trigger condition is addressed under Pulse coverage in §Candidate evaluation. None left unanswered.
- The Contract 1 amendment text is drafted and ready to apply.
- Implementation plan names the files and extension points. Lane A engineer can act on it directly.
- Remaining open questions are enumerated explicitly; no silent gaps.

## Provenance

- **Triggering contract:** Contract 1 acceptance criteria as expressed in `docs/foundations/first-bedside-workflow-spec.md` §Physiology fidelity requirements.
- **Brief author:** Shane + sim-architecture working session, 2026-04-13.
- **Research inputs:** `wiki/entities/pulse-physiology-engine.md`, `wiki/entities/biogears.md`, `wiki/entities/infirmary-integrated.md`, `wiki/concepts/computational-physiology-engine.md`, `wiki/concepts/emergent-vitals-from-physics.md`, `wiki/sources/2026-04-12-sim-integration-architecture.md`, `research/Open Source Clinical Simulation.md`, `research/Architectural integration for noah-rn clinical simulation.md`.
- **Decision date:** 2026-04-13 (subject to Contract 1 amendment application).
