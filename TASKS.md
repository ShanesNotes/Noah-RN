# Noah RN Tasks

This is the active execution queue. Keep it short, ordered, and concrete. Historical task maps live in `docs/archive/legacy-control-plane/`.

## Now

1. ~~Reconcile the refreshed Graphify output against the current plan~~ — **Done 2026-04-12.** Graph rebuild (456 nodes, 533 edges) confirmed clinical-mcp as structural center. 8 wiki concepts promoted to stable. No dependency order changes needed.

2. ~~Run the Medplum preliminary-resource visibility test~~ — **Done 2026-04-12.** Preliminary DocumentReference surfaces in unfiltered search but `doc-status` SearchParameter works natively. Decision: task-scoped filtering sufficient. See `docs/foundations/medplum-draft-review-lifecycle.md` §Empirical results.

3. **Harden the first Medplum-native Shift Report review loop**
   - Treat `Task -> clinical-mcp -> agent-harness -> shift-report -> DocumentReference` as the active forcing path.
   - Keep write semantics narrow and explicit while `services/clinical-mcp/src/fhir/writes.ts` remains scaffold-only.
   - Use the current operator path under `infrastructure/medplum/` as the proof surface.

4. **Keep Medplum primary and the dashboard narrow**
   - Keep `apps/nursing-station/` as the main clinician-facing patient/task surface.
   - Keep `apps/clinician-dashboard/` scoped to evals, traces, context inspection, skill visibility, and terminal/runtime support.
   - Do not re-grow the dashboard into a second chart unless a concrete Medplum limitation forces it.

5. **Choose and prove one bounded patient path**
   - Confirm the smallest viable patient context bundle.
   - Keep `patient-123` or one equivalent path as the bounded proof target.
   - Extend context/resources only when that path needs them.

## Next

6. **Implement the minimal `pi.dev` harness foundation inside the new layout**
   - Use `.noah-pi-runtime/` as the repo-hosted pi.dev bridge surface (mounted as `/runtime/.pi` in the isolated lane).
   - Consume the registry + contract + selection structures before adding new runtime layers.
   - Keep `packages/workflows/` authoritative until a promotion decision is explicitly recorded.

7. **Memory architecture spec**
   - Longitudinal patient H&P.
   - Present encounter mutable Markdown/canvas.
   - Provider session memory.
   - Provider persistent memory.
   - Task-local agent memory.

8. **Clinical resources catalog plan**
   - Guidelines and protocols.
   - Joint Commission as institution-policy stand-in where useful.
   - AHA and other established references.
   - Pocket manual corpus structure.
   - Publication/update source strategy.
   - Lexicomp-like agent-centric drug reference path.

9. **Meta-harness observability plan**
   - Define what every workflow invocation should log under `evals/`.
   - Decide minimum metrics for quality, safety, cost, and latency.
   - Connect evaluation traces to future eval harness work.

10. **Land the Clinical Simulation Harness runtime only when needed**
   - ~~Scaffold docs canonical~~ — **Superseded 2026-04-13.** Canonical authority is now the invariant kernel + nine foundational contracts (`docs/foundations/invariant-kernel-simulation-architecture.md`, `docs/foundations/foundational-contracts-simulation-architecture.md` — amended with D1–D4 + M1–M3 on 2026-04-13).
   - ~~Physiology boundary violation in clinical-mcp~~ — **Resolved 2026-04-13.** Pharmacokinetic reference models + scenario controller + scenario seeds relocated to `services/sim-harness/`. Clinical-mcp no longer owns any L0 computation. Sim tools removed from `services/clinical-mcp/src/server.ts` and replaced with a `registerSimTools()` no-op seam pending Lane F.
   - Start runtime work (execution-packet Lane A: Clock + Engine adapter) only when the first bedside workflow actually needs live vitals and waveforms. Lanes B–F sequence after.

## Later

11. **Research organization pass**
   - Lightly organize and lint `research/` without damaging source value.
   - Distill durable findings into `PLAN.md` or focused docs.

12. **GitHub cleanup pass**
   - Clean issues, labels, projects, and repo-facing metadata after local docs stabilize.
   - Keep `wiki/` out of this path unless explicitly requested.

13. **Runtime component evaluation**
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
