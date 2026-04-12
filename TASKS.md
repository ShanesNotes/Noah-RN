# Noah RN Tasks

This is the active execution queue. Keep it short, ordered, and concrete. Historical task maps live in `docs/archive/legacy-control-plane/`.

## Now

1. **Reconcile the refreshed Graphify output against the current plan**
   - Check whether the rebuilt `graphify-out/` changes the dependency order of the current scaffolding work.
   - Update sequencing only if the new graph shows a stronger cross-surface dependency than the current plan.

2. **Run the Medplum preliminary-resource visibility test**
   - Use `docs/foundations/medplum-draft-review-lifecycle.md` as the governing decision.
   - Create a representative preliminary Shift Report draft artifact.
   - Inspect the relevant Medplum UI surfaces and record exactly where draft artifacts appear.
   - Decide whether task-scoped filtering is sufficient before wider rollout.

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

5. **Implement the minimal `pi.dev` harness foundation inside the new layout**
   - Use `.pi/` as the project-level pi.dev bridge surface.
   - Consume the registry + contract + selection structures before adding new runtime layers.
   - Keep `packages/workflows/` authoritative until a promotion decision is explicitly recorded.

6. **Memory architecture spec**
   - Longitudinal patient H&P.
   - Present encounter mutable Markdown/canvas.
   - Provider session memory.
   - Provider persistent memory.
   - Task-local agent memory.

7. **Clinical resources catalog plan**
   - Guidelines and protocols.
   - Joint Commission as institution-policy stand-in where useful.
   - AHA and other established references.
   - Pocket manual corpus structure.
   - Publication/update source strategy.
   - Lexicomp-like agent-centric drug reference path.

8. **Meta-harness observability plan**
   - Define what every workflow invocation should log under `evals/`.
   - Decide minimum metrics for quality, safety, cost, and latency.
   - Connect evaluation traces to future eval harness work.

9. **Land the Clinical Simulation Harness runtime only when needed**
   - Keep the scaffold docs canonical for now.
   - Start runtime work only when the first bedside workflow actually needs live vitals and waveforms.

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
