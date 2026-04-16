# Noah RN Tasks

This is the active execution queue. Keep it short, ordered, and concrete. Historical task maps live in `docs/archive/legacy-control-plane/`.

## Now

1. ~~Reconcile the refreshed Graphify output against the current plan~~ — **Done 2026-04-12.** Graph rebuild (456 nodes, 533 edges) confirmed clinical-mcp as structural center. 8 wiki concepts promoted to stable. No dependency order changes needed.

2. ~~Run the Medplum preliminary-resource visibility test~~ — **Done 2026-04-12.** Preliminary DocumentReference surfaces in unfiltered search but `doc-status` SearchParameter works natively. Decision: task-scoped filtering sufficient. See `docs/foundations/medplum-draft-review-lifecycle.md` §Empirical results.

3. **Harden the first Medplum-native Shift Report review loop**
   - Treat `Task -> clinical-mcp -> agent-harness -> shift-report -> DocumentReference` as the active forcing path.
   - Keep write semantics narrow and explicit while `services/clinical-mcp/src/fhir/writes.ts` remains scaffold-only.
   - Use the current operator path under `infrastructure/medplum/` as the proof surface.
   - Landed 2026-04-15:
     - shared Shift Report renderer in `packages/agent-harness/shift-report-renderer.mjs`
     - worker draft body now uses the shared renderer instead of raw JSON
     - renderer now exposes explicit lane coverage, bounded evidence, provider-note/lines-access coverage, and bounded trigger suggestions
     - Pi router/context tools now emit `renderer_lane_coverage`
   - Landed in `apps/nursing-station/` so far:
     - task-driven draft review detail
     - nurse attestation/finalization path
     - explicit review-vs-acknowledge state model
     - results review panel
     - trend-first vitals/labs
   - Next slice: implement `MAR-lite`.

4. **Keep Medplum primary and the dashboard narrow**
   - Keep `apps/nursing-station/` as the main clinician-facing patient/task surface.
   - Keep `apps/clinician-dashboard/` scoped to evals, traces, context inspection, skill visibility, and terminal/runtime support.
   - Do not re-grow the dashboard into a second chart unless a concrete Medplum limitation forces it.

5. **Choose and prove one bounded patient path**
   - Confirm the smallest viable patient context bundle.
   - Keep `patient-123` or one equivalent path as the bounded proof target.
   - Extend context/resources only when that path needs them.
   - Current bounded path: queue -> patient review pane -> draft artifact review.

6. **Re-indexing & control-doc refresh pass** — *in progress 2026-04-15*
   - Top-down sweep: reconcile control documents against current filesystem.
   - Fix `.mcp.json` cwd to `services/clinical-mcp/` (done 2026-04-15).
   - Verify disabled artifacts (`AGENTS.md.disabled-*`, `.pi.disabled-*`) — content is unique, deferred decision.
   - Refresh `wiki/` via `/wiki` ingest pass (Ingest #35 backlog).
   - Rebuild `graphify-out/` via `/graphify`.

## Next

7. **Implement the minimal `pi.dev` harness foundation inside the new layout**
   - Use `.pi/` as the project-level pi.dev bridge surface.
   - Consume the registry + contract + selection structures before adding new runtime layers.
   - Keep `packages/workflows/` authoritative until a promotion decision is explicitly recorded.
   - Landed bridge pieces so far:
     - `noah-router`
     - `medplum-context`
     - `noah-context`
     - `noah-clinical-tools`
     - `noah-guardrails`
   - Next harness slice: let preview/dry-run surfaces consume the same renderer-input contract used by the worker.

8. **Promote the next bedside workflow surface after review/trend**
   - `MAR-lite` is the next sequenced clinician-workspace lane.
   - Keep it task/review/provenance aligned rather than building a separate medication app.
   - Preserve worklist-first entry and patient-context continuity.

9. **Memory architecture spec**
   - Longitudinal patient H&P.
   - Present encounter mutable Markdown/canvas.
   - Provider session memory.
   - Provider persistent memory.
   - Task-local agent memory.

10. **Clinical resources catalog plan**
   - Guidelines and protocols.
   - Joint Commission as institution-policy stand-in where useful.
   - AHA and other established references.
   - Pocket manual corpus structure.
   - Publication/update source strategy.
   - Lexicomp-like agent-centric drug reference path.

11. **Meta-harness observability plan**
   - Define what every workflow invocation should log under `evals/`.
   - Decide minimum metrics for quality, safety, cost, and latency.
   - Connect evaluation traces to future eval harness work.

12. **Clinical Simulation Harness runtime state** — *superseded by three-product alignment plan.*
   - **Lane A partial landed**: simulation clock (`src/clock.ts`) with wall/accelerated/frozen/skip-ahead modes, engine-adapter boundary, reference pharmacokinetics.
   - **Lane B partial**: scenario controller exists but competing JSON vs TypeScript loaders require unification; static Map of three fixture scenarios (pressor-titration, fluid-responsive, hyporesponsive); SAC-1 authoring contract not yet implemented.
   - **Lanes C–F deferred**: monitor bridge with IEC alarm classification, charting authority surface, obligation runtime, eval recorder, and E2E integration all pending.
   - **MCP surface skeleton landed 2026-04-16 (alignment plan Phase 8a)**: `services/sim-harness/src/mcp/server.ts` exposes `sim_list_scenarios`, `sim_load_scenario`, `sim_get_vitals_snapshot`, `sim_advance_clock`, `sim_set_clock_mode`. Backed by a deterministic stub store; real physiology wiring lands in Phase 8b. Cross-product rule enforced: clinical-mcp `registerSimTools()` seam remains a no-op; any bridge must use MCP transport, not imports.
   - Runtime promotion now sequenced through `docs/plans/three-product-alignment-2026-04-16.md` Phase 8. See also `services/sim-harness/README.md` and `docs/foundations/execution-packet-simulation-architecture.md`.

## Later

13. **Research organization pass**
    - Lightly organize and lint `research/` without damaging source value.
    - Distill durable findings into `PLAN.md` or focused docs.

14. **GitHub cleanup pass**
    - Clean issues, labels, projects, and repo-facing metadata after local docs stabilize.
    - Keep `wiki/` out of this path unless explicitly requested.

15. **Runtime component evaluation**
    - Consider NemoClaw/OpenClaw components only when a specific `pi.dev` limitation appears.
    - Record any adoption decision as an ADR before implementation.

## Working Rules

- Do not let archived plans become active instructions again.
- Do not rewrite `research/` drastically without a dedicated pass.
- Do not touch `wiki/` unless explicitly requested.
- Do not move runnable surfaces before the workspace-orchestration approach in `docs/topology/workspace-orchestration.md` is reflected in the move batch.
- Do not let local grounding and generated artifacts masquerade as deliverable topology.
- Do not build runtime code before the relevant task has acceptance criteria.
- Prefer small, reversible changes that make the next coding session easier.
