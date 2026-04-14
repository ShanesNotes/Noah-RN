# Scaffold Salvage Audit: Simulation Architecture

## Governing Artifact

This audit is Lane 1 of the approved planning lane defined in:
- `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`

Every classification is scored against the invariant kernel:
- `docs/foundations/invariant-kernel-simulation-architecture.md`

## Audit Method

Each surface is classified as `keep`, `rewrite`, `delete`, `defer`, or `unknown` using the PRD rubric:

1. Preserves L0–L4 truth/projection model
2. Preserves agent-native framing
3. Preserves monitor-as-avatar invariant
4. Preserves charting as workflow, policy, and provenance surface
5. Preserves intervention closure back into physiology and obligations
6. Avoids premature vendor/UI/repo-locking
7. Creates useful future execution seams
8. Supports clinically meaningful agent pressure under time and interruption
9. Justifies its retained complexity in terms of agent pressure

---

## Classification Matrix

### A. Documentation Surfaces

#### A1. `docs/foundations/sim-harness-scaffold.md`

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ⚠️ partial | Implicitly separates engine truth from FHIR writes, but never names L0–L4. No explicit projection semantics. |
| Agent-native | ⚠️ partial | Frames agent access through clinical-mcp correctly, but the 7-layer architecture is implementation-shaped (Layers 0–6 are repo layers, not truth/projection layers). |
| Monitor-as-avatar | ❌ absent | Monitor is mentioned only as a dashboard surface (Layer 6). Not framed as the primary patient avatar. No alarm burden, artifact, or signal quality architecture. |
| Charting as workflow | ❌ absent | FHIR write-back (Layer 4) is a mechanical sink — writes Observations on a cadence. No charting authority states, no provenance model, no validation decision boundary. |
| Intervention closure | ✅ present | Layer 0 engines accept insults/interventions; waveform/vitals are emergent. The closure loop concept is there. |
| Premature locking | ⚠️ partial | Names Pulse as primary and specific Layer 3 rhythm templates. Acceptable as scaffold context but must not bind contracts. |
| Execution seams | ✅ good | Layer separation creates clean adapter boundary. Agent access through clinical-mcp is correct. |
| Agent pressure | ❌ absent | No alarm model, no obligation model, no documentation pressure. The scaffold is infrastructure, not pressure-generation architecture. |

**Rewrite rationale:** The 7-layer scaffold architecture (Layers 0–6) conflates implementation topology with truth/projection semantics. The invariant kernel's L0–L4 model is the governing separation. The scaffold should be rewritten to align its boundary language with L0–L4, add monitor-as-avatar and charting authority, and reframe the layers as projection boundaries rather than code layers. The physical wrapping concepts (engine adapter, clock, scenario director) remain useful but need re-framing.

---

#### A2. `docs/foundations/sim-harness-runtime-access-contract.md`

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ⚠️ partial | Mode 1 (FHIR reads) correctly surfaces L3. Mode 2 (sim tools) surfaces a mix of L1 (live vitals, waveforms) and L0 (engine state leaked through `sim_read_current_encounter`). The distinction is not named. |
| Agent-native | ✅ good | Agent-access-through-clinical-mcp is correct and well-specified. |
| Monitor-as-avatar | ⚠️ weak | `sim_get_live_vitals` and waveform tools are the monitor projection but aren't framed that way. No alarm tools. No signal quality. No artifact state. |
| Charting as workflow | ❌ absent | No charting tools. No authority states. The agent can read and intervene but cannot chart. |
| Intervention closure | ✅ present | `sim_administer_medication` and `sim_order_intervention` feed back to the engine. |
| Premature locking | ✅ clean | Tool shapes are contract-level, not implementation-bound. |
| Agent pressure | ⚠️ partial | Intervention tools create some pressure, but no alarm, obligation, or documentation tools. |

**Rewrite rationale:** The 8-tool surface is a reasonable starting shape but has three gaps against the kernel: (1) no tools expose L4 obligations, (2) no tools support charting authority states, (3) `sim_read_current_encounter` leaks scenario internals that should be L0-only. The tool surface needs to be re-specified with explicit layer annotations and expanded to cover alarm state, charting actions, and obligation queries.

---

#### A3. `docs/foundations/sim-harness-waveform-vision-contract.md`

**Classification: KEEP**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ✅ aligned | Waveform is an L1 surface. The contract correctly positions it as the agent's perception layer for rhythm/hemodynamic claims, distinct from L3 chart labels. |
| Agent-native | ✅ strong | Written for agent consumers. The "how do you know this is v-tach?" framing is exactly the agent-native reasoning the kernel demands. |
| Monitor-as-avatar | ✅ aligned | Waveform vision is the core enforcement mechanism for monitor-as-avatar. |
| Charting as workflow | n/a | Not this contract's scope. |
| Intervention closure | n/a | Not this contract's scope. |
| Premature locking | ✅ clean | Specifies capability, not engine. |
| Agent pressure | ✅ justified | Forces the agent to validate claims against raw signal — directly creates reasoning pressure. |

**Keep rationale:** This contract is fully aligned with the invariant kernel. It enforces the monitor-as-avatar invariant at the waveform level, preserves the L1/L3 distinction (labels are advisory, waveforms are evidence), and creates justified agent pressure. Minor wording updates may be needed to reference L0–L4 terminology, but the substance is sound.

---

#### A4. `docs/foundations/sim-harness-engine-wrapping.md`

**Classification: DEFER**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ✅ compatible | Engine wrapping is an L0 implementation detail. The adapter boundary is correctly specified. |
| Agent-native | ✅ compatible | Wrapping strategy doesn't conflict with agent-native framing. |
| Premature locking | ⚠️ tension | Names specific engines, transport options, cultural notes. This is useful research context but the invariant kernel explicitly defers engine choice behind a Research-Hook Decision Contract. |
| Agent pressure | n/a | Engine choice doesn't directly create pressure — projections do. |

**Defer rationale:** This document is valuable research synthesis and reference material, but it makes decisions the invariant kernel explicitly defers. The adapter boundary concept (swap engines without touching projection layers) is sound and should be preserved. The specific engine evaluations should be relocated to the Research-Hook Decision Contract scope. Keeping this in `docs/foundations/` risks treating engine decisions as settled architecture.

---

#### A5. `docs/foundations/sim-harness-first-batch.md`

**Classification: DELETE**

**Rationale:** This is a completed batch-tracking artifact. It describes what the first scaffolding pass should establish — and that pass is done. The invariant kernel and this audit now supersede it as the governing document for what comes next. Retaining it creates confusion about whether the scaffold batch's framing or the kernel's framing governs. The useful content (workspace center existence, doc set inventory) is now historical context only.

---

### B. Code Surfaces

#### B1. `services/sim-harness/src/index.ts`

**Classification: KEEP (as type contract scaffold)**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ⚠️ partial | Types implicitly model L1 (vitals snapshot, waveforms), intervention (medication, intervention requests), and scenario state. But no L0/L1/L2/L3/L4 annotations. |
| Agent-native | ✅ present | Types are shaped for agent consumption through clinical-mcp. |
| Monitor-as-avatar | ⚠️ absent | No alarm types, no signal quality types, no artifact state. |
| Charting as workflow | ❌ absent | No charting types. |
| Intervention closure | ✅ present | `SimAdministerMedicationResponse` and `SimOrderInterventionResponse` return `new_vitals` — the closure loop is typed. |
| Premature locking | ⚠️ minor | `SimulationFidelityContract` hardcodes values (`waveformBufferSeconds: 60`, `supportsWaveformVision: true`). These are reasonable defaults but shouldn't be const-asserted as architecture. |

**Keep rationale:** The type definitions are a useful starting vocabulary. They need to be expanded (alarm, artifact, charting, obligation types) and annotated with layer semantics, but the existing shapes for vitals, waveforms, interventions, and scenarios are compatible with the kernel. The `simulationFidelityContract` const should be removed — it asserts implementation facts as architecture.

---

#### B2. `services/clinical-mcp/src/events/physiology.ts`

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ❌ violation | This file IS an in-house physiology engine. Hill equation, baroreceptor reflex, fluid bolus decay, AR(1) noise — this is L0 computation implemented in TypeScript inside `clinical-mcp`. The kernel says L0 is always an adapter over a wrapped external engine. |
| Agent-native | n/a | Infrastructure, not agent-facing. |
| Premature locking | ❌ violation | Binds the architecture to an in-house MAP/HR pharmacokinetic model, contradicting the wrap-don't-rebuild principle. |
| Agent pressure | ✅ conceptually valid | The pharmacokinetic concepts (onset delay, diminishing returns, baroreceptor compensation) are exactly the right complexity. The problem is where they live, not what they model. |

**Rewrite rationale:** The physiology modeling concepts are sound and clinically valid. Hill equation dose-response, first-order onset delay, and baroreceptor compensation are exactly what the kernel's intervention closure invariant demands. But this code lives in `clinical-mcp` (the context boundary), implements physiology in-house (violating wrap-don't-rebuild), and bypasses the engine adapter boundary. The concepts should be preserved as reference material or test fixtures, but the production physiology path must go through a wrapped engine adapter in `sim-harness`.

---

#### B3. `services/clinical-mcp/src/events/generator.ts`

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ❌ violation | Scenario state management with in-memory state, disk persistence, and direct physiology computation. This is an L0+L2 hybrid living inside clinical-mcp (the L3 boundary). |
| Charting as workflow | ❌ absent | No chart writes, no provenance, no validation gate. Scenarios advance silently. |
| Intervention closure | ⚠️ present but misplaced | `advanceScenario()` feeds actions into physiology and returns new state. Closure works, but it's wired wrong architecturally. |
| Premature locking | ⚠️ | Hardcodes 3 scenarios, 5-minute time steps, JSON disk persistence. |

**Rewrite rationale:** Same boundary violation as B2 — this is sim-harness logic living in clinical-mcp. The generator conflates the scenario director (L2 event scheduling), the physiology engine (L0), and the agent-facing tool surface. The scenario definitions (pressor-titration, fluid-responsive, hyporesponsive) are clinically valid and should be preserved as scenario seeds. The generator architecture needs to be rebuilt behind the sim-harness boundary.

---

#### B4. `services/clinical-mcp/src/events/scenarios/*.ts`

**Classification: KEEP (as scenario seeds)**

| Rubric | Score | Note |
|--------|-------|------|
| Clinical validity | ✅ | Pressor titration at 0.08 mcg/kg/min with MAP 58–63, fluid-responsive hypotension without pressors, refractory shock on dual pressors — these are common ICU scenarios. |
| L0–L4 model | ⚠️ | Scenario data is fine; the import path (`../generator.js`) ties them to the misplaced generator. |

**Keep rationale:** The three scenario definitions are good clinical content. They need to be relocated to `services/sim-harness/` (or a scenario data directory) and their type import updated, but the clinical content is valid and reusable.

---

#### B5. `services/clinical-mcp/src/server.ts` (sim-related tools only)

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ❌ violation | `get_scenario`, `advance_scenario`, `reset_scenario` are registered directly on clinical-mcp but invoke in-house physiology. They expose scenario internals (active drugs, MAP computation) that mix L0 engine state with L1 projection. |
| Agent-native | ⚠️ | Tool shapes are agent-facing, which is correct. But they should be sim-prefixed and conditionally registered per the runtime-access contract. |
| Monitor-as-avatar | ❌ | No monitor framing. Returns raw state, not monitor projection. |

**Rewrite rationale:** The tools should be re-specified as the `sim_` prefixed tools from the runtime-access contract, conditionally registered when a sim-harness is present, and backed by the sim-harness boundary rather than in-house physiology.

---

#### B6. `services/clinical-mcp/src/config.ts` (pharmacokinetics section)

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ❌ | Pharmacokinetic parameters (norepinephrine emax/ed50/Hill-N, vasopressin, fluid bolus decay, noise, baroreceptor gain) are L0 engine configuration embedded in the L3 context service config. |

**Rewrite rationale:** These parameters are clinically valid and well-researched. They should move to the sim-harness configuration or become reference data for engine adapter validation. They do not belong in clinical-mcp config.

---

#### B7. `services/sim-harness/README.md`

**Classification: REWRITE**

| Rubric | Score | Note |
|--------|-------|------|
| L0–L4 model | ❌ absent | Describes the sim-harness in terms of "tickable physiology, waveform generation, scenario direction, FHIR write-back" without L0–L4 framing. |
| Monitor-as-avatar | ⚠️ partial | Mentions waveform vision as non-negotiable but doesn't frame the monitor as the patient avatar. |
| Charting as workflow | ❌ absent | FHIR write-back is described as a mechanical sink. |
| Agent pressure | ❌ absent | No alarm, obligation, or documentation pressure concepts. |

**Rewrite rationale:** Needs to be rewritten to align with the invariant kernel. The workspace center framing is correct (sim-harness as live-runtime boundary), but the description must adopt L0–L4 language, monitor-as-avatar framing, and charting authority concepts.

---

### C. Package/Build Surfaces

#### C1. `services/sim-harness/package.json` and `tsconfig.json`

**Classification: KEEP**

**Rationale:** Minimal scaffold. Correct package name, correct build configuration. No content decisions embedded. Ready to receive future code.

---

## Summary Matrix

| ID | Surface | Classification | Key Issue |
|----|---------|---------------|-----------|
| A1 | `docs/foundations/sim-harness-scaffold.md` | **REWRITE** | 7-layer model is implementation topology, not L0–L4 projections. Missing monitor-as-avatar, charting authority, obligation model. |
| A2 | `docs/foundations/sim-harness-runtime-access-contract.md` | **REWRITE** | Tool surface lacks alarm, charting, and obligation tools. Leaks L0 through encounter view. Needs layer annotations. |
| A3 | `docs/foundations/sim-harness-waveform-vision-contract.md` | **KEEP** | Fully aligned with kernel. Enforces monitor-as-avatar at waveform level. |
| A4 | `docs/foundations/sim-harness-engine-wrapping.md` | **DEFER** | Valid research context but makes decisions the kernel defers. Move to research-hook scope. |
| A5 | `docs/foundations/sim-harness-first-batch.md` | **DELETE** | Completed batch tracker. Superseded by kernel + audit. |
| B1 | `services/sim-harness/src/index.ts` | **KEEP** | Type vocabulary is useful. Needs layer annotations, alarm/charting types. Remove fidelity const. |
| B2 | `services/clinical-mcp/src/events/physiology.ts` | **REWRITE** | In-house physiology in clinical-mcp violates wrap-don't-rebuild and boundary placement. Concepts valid, location wrong. |
| B3 | `services/clinical-mcp/src/events/generator.ts` | **REWRITE** | Scenario director + physiology engine conflated inside clinical-mcp. Architecture violation. |
| B4 | `services/clinical-mcp/src/events/scenarios/*.ts` | **KEEP** | Valid clinical scenarios. Relocate to sim-harness scope. |
| B5 | `services/clinical-mcp/src/server.ts` (sim tools) | **REWRITE** | Tools invoke in-house physiology directly. Should be sim-prefixed, conditional, backed by sim-harness. |
| B6 | `services/clinical-mcp/src/config.ts` (PK section) | **REWRITE** | L0 engine params in L3 service config. Relocate. |
| B7 | `services/sim-harness/README.md` | **REWRITE** | Missing L0–L4 framing, monitor-as-avatar, charting authority. |
| C1 | `services/sim-harness/package.json` + `tsconfig.json` | **KEEP** | Minimal scaffold, no content decisions. |

**Totals:** 3 KEEP, 7 REWRITE, 1 DELETE, 1 DEFER, 0 UNKNOWN

---

## Systemic Findings

### Finding 1: Boundary Violation — Physiology in Clinical-MCP

The most significant structural issue is that `services/clinical-mcp/src/events/` contains a working physiology engine (Hill equation PK/PD, baroreceptor reflex, scenario state management) that belongs behind the sim-harness adapter boundary. This violates three kernel invariants simultaneously:

- **Patient Truth**: L0 computation lives inside the L3 context service.
- **L0–L4 Separation**: No projection boundary exists between engine state and agent-visible state.
- **Intervention Closure**: The closure loop works but bypasses the architectural boundary.

**Recommended action:** Preserve the pharmacokinetic models as reference/test fixtures. Relocate scenario management to sim-harness. Clinical-mcp should never import from an `events/physiology` module.

### Finding 2: Missing Architectural Surfaces

The current scaffold has no representation of:

- **Alarm model** — no types, no tools, no contract language for alarm burden, nuisance alarms, signal quality, or artifact
- **Charting authority** — no types, no tools, no contract language for observe/propose/prepare/execute/attest/escalate
- **Obligation lifecycle** — no types, no tools, no contract language for documentation duties, follow-up windows, or overdue escalation
- **L4 as a projection layer** — obligations are completely absent from the scaffold

These are not gaps to fill in the audit — they are gaps the foundational contracts (Lane 2) must address.

### Finding 3: Scaffold Documentation Predates Agent-Native Framing

All five `sim-harness-*.md` foundation docs were written before the deep interview established the agent-native architecture. They use infrastructure language (layers, engines, write-back) rather than projection/truth language (L0–L4, monitor-as-avatar, charting authority). The waveform vision contract is the exception — its framing accidentally aligned with the kernel because it was written from the nurse's validation perspective.

### Finding 4: Clinically Valid Content Worth Preserving

Despite boundary violations, the following content is clinically sound and should be carried forward:

- Pharmacokinetic models in `physiology.ts` (Hill equation, onset delay, baroreceptor reflex, fluid bolus diminishing returns)
- Three scenario definitions (pressor titration, fluid-responsive, hyporesponsive)
- Waveform vision contract (entire document)
- Engine adapter boundary concept from `sim-harness-scaffold.md`
- Type vocabulary in `sim-harness/src/index.ts`
- The principle of agent-access-through-clinical-mcp (never direct to sim-harness)

---

## Provenance

- **Governing kernel:** `docs/foundations/invariant-kernel-simulation-architecture.md`
- **Governing PRD:** `.omx/plans/prd-simulation-architecture-scaffold-audit-and-contract-foundations.md`
- **Surfaces audited:** 13 files across `docs/foundations/`, `services/sim-harness/`, and `services/clinical-mcp/src/events/`
- **Classification method:** per PRD rubric (9 criteria) scored against 8 kernel invariants
