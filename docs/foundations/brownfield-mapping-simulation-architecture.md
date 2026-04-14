# Brownfield Mapping: Simulation Architecture

## Governing Artifacts

- Scaffold audit: `docs/foundations/scaffold-salvage-audit-simulation.md`
- Foundational contracts: `docs/foundations/foundational-contracts-simulation-architecture.md`
- Consistency review: `docs/foundations/contract-consistency-review-simulation-architecture.md`

This is the Lane 5 deliverable. Maps every current scaffold surface to its future: reuse, supersede, or retire.

---

## Mapping Table

### Documentation Surfaces

| Current Surface | Audit Class | Future | Action |
|----------------|-------------|--------|--------|
| `docs/foundations/sim-harness-scaffold.md` | REWRITE | **Superseded** by invariant kernel + foundational contracts. | Retire and replace with a short pointer document: "The canonical simulation architecture is defined by `invariant-kernel-simulation-architecture.md` and `foundational-contracts-simulation-architecture.md`. This file is historical." |
| `docs/foundations/sim-harness-runtime-access-contract.md` | REWRITE | **Superseded** by Contract 4 (Monitor) + Contract 6 (Scenario/Intervention) tool specifications. | Retain as a working reference during implementation. Replace incrementally as contracts produce concrete tool specs. |
| `docs/foundations/sim-harness-waveform-vision-contract.md` | KEEP | **Reuse as-is.** Referenced by Contracts 4 and 8. | Add a header note linking it to the invariant kernel. Minor terminology updates (add L1 layer reference). |
| `docs/foundations/sim-harness-engine-wrapping.md` | DEFER | **Relocate** to a research-context directory or retain with a "not-yet-decided" header. | Add a prominent header: "This document is research context for the Research-Hook Decision Contract (Contract 9). No engine decisions are binding." |
| `docs/foundations/sim-harness-first-batch.md` | DELETE | **Retire.** | Delete or move to `docs/archive/`. Completed batch tracker with no forward value. |
| `docs/foundations/invariant-kernel-simulation-architecture.md` | — (new) | **Canonical.** Governs all simulation architecture. | Already in place. |
| `docs/foundations/scaffold-salvage-audit-simulation.md` | — (new) | **Reference.** Audit findings inform implementation priorities. | Already in place. |
| `docs/foundations/foundational-contracts-simulation-architecture.md` | — (new) | **Canonical.** Nine contracts govern implementation. | Already in place. |
| `docs/foundations/encounter-validation-simulation-architecture.md` | — (new) | **Reference.** Acceptance test blueprints. | Already in place. |
| `docs/foundations/contract-consistency-review-simulation-architecture.md` | — (new) | **Reference.** Amendment backlog for contracts. | Already in place. |

### Code Surfaces

| Current Surface | Audit Class | Future | Action |
|----------------|-------------|--------|--------|
| `services/sim-harness/src/index.ts` | KEEP | **Reuse and extend.** Type vocabulary for L1 telemetry, waveforms, interventions, scenarios. | Add layer annotations to types. Add alarm, signal quality, charting authority, obligation types. Remove `simulationFidelityContract` const. |
| `services/sim-harness/package.json` + `tsconfig.json` | KEEP | **Reuse as-is.** | No changes needed. |
| `services/sim-harness/README.md` | REWRITE | **Supersede** with kernel-aligned README. | Rewrite to reference the invariant kernel and foundational contracts. Frame the workspace center in L0–L4 terms. |
| `services/clinical-mcp/src/events/physiology.ts` | REWRITE | **Relocate concepts, retire code location.** | Move pharmacokinetic functions to `services/sim-harness/src/` as reference implementations or test fixtures. Delete the `events/physiology.ts` file from clinical-mcp. |
| `services/clinical-mcp/src/events/generator.ts` | REWRITE | **Decompose and relocate.** | Scenario state management → `services/sim-harness/` scenario controller. Physiology computation → sim-harness engine adapter. MCP tool wiring → conditional sim-tool registration in clinical-mcp server. Delete `events/generator.ts`. |
| `services/clinical-mcp/src/events/scenarios/*.ts` | KEEP | **Relocate to sim-harness.** | Move scenario seed definitions to `services/sim-harness/scenarios/` or a data directory. Update type imports. |
| `services/clinical-mcp/src/server.ts` (sim tools) | REWRITE | **Replace** with Contract 4/6 compliant sim-prefixed tools, conditionally registered. | Remove current `get_scenario`, `advance_scenario`, `reset_scenario`. Replace with `sim_` prefixed tools from the runtime-access contract, registered only when sim-harness is present. |
| `services/clinical-mcp/src/config.ts` (PK section) | REWRITE | **Relocate** pharmacokinetic config to sim-harness. | Move `pharmacokinetics` and `scenarios` config sections to `services/sim-harness/src/config.ts`. Clinical-mcp config should not contain L0 parameters. |

### Research and Wiki Surfaces

| Current Surface | Future | Action |
|----------------|--------|--------|
| `research/simulation-environments/*.md` | **Retain as research context.** Input to Contract 9 (Research-Hook). | No action needed. Already correctly positioned. |
| `wiki/concepts/clinical-simulator-as-eval-substrate.md` | **Retain.** Grounding for Contract 8. | No action needed. |
| `wiki/concepts/computational-physiology-engine.md` | **Retain.** Grounding for Contract 1, 9. | No action needed. |
| `wiki/concepts/monitor-as-primary-signal-surface.md` | **Retain.** Grounding for invariant 3 and Contract 4. | No action needed. |
| `wiki/sources/2026-04-13-simulation-vision-and-icu-charting-reality.md` | **Retain.** Empirical evidence base for Contracts 4, 5, 7. | No action needed. |
| `wiki/sources/2026-04-13-clinical-sim-architecture-documentation-emergence.md` | **Retain.** Ontological foundation for L0–L4 model. | No action needed. |

---

## Summary of Required File Operations

### Immediate (before implementation starts)

| Operation | File | Reason |
|-----------|------|--------|
| Delete or archive | `docs/foundations/sim-harness-first-batch.md` | Completed, superseded |
| Add header | `docs/foundations/sim-harness-engine-wrapping.md` | Mark as research-context, not binding |
| Add header | `docs/foundations/sim-harness-waveform-vision-contract.md` | Link to kernel, add L1 terminology |

### During implementation

| Operation | Source | Destination | Reason |
|-----------|--------|-------------|--------|
| Move | `clinical-mcp/src/events/physiology.ts` | `sim-harness/src/reference/pharmacokinetics.ts` | Boundary correction |
| Move | `clinical-mcp/src/events/scenarios/*.ts` | `sim-harness/scenarios/` | Boundary correction |
| Decompose | `clinical-mcp/src/events/generator.ts` | Multiple sim-harness modules | Boundary correction |
| Move | `clinical-mcp/src/config.ts` PK section | `sim-harness/src/config.ts` | Boundary correction |
| Rewrite | `clinical-mcp/src/server.ts` sim tools | Conditional sim-prefixed tools | Contract compliance |
| Rewrite | `sim-harness/README.md` | Kernel-aligned README | Terminology alignment |
| Extend | `sim-harness/src/index.ts` | Add alarm, charting, obligation types | Contract coverage |
| Retire | `docs/foundations/sim-harness-scaffold.md` | Pointer to kernel + contracts | Superseded |
| Retire | `docs/foundations/sim-harness-runtime-access-contract.md` | Incremental replacement | Superseded by contracts |

---

## Provenance

- **Audit source:** `docs/foundations/scaffold-salvage-audit-simulation.md`
- **Contract source:** `docs/foundations/foundational-contracts-simulation-architecture.md`
- **Consistency amendments:** `docs/foundations/contract-consistency-review-simulation-architecture.md`
