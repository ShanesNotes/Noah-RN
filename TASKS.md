# Noah RN Tasks

This is the active execution queue. Keep it short, ordered, and concrete. Historical task maps live in `docs/archive/legacy-control-plane/`.

## Now

1. **Use the new control plane and workflow substrate to start the first pi-native bridge**
   - Use `PLAN.md`, `TASKS.md`, and `docs/ARCHITECTURE.md` as the active control plane.
   - Use `packages/workflows/registry.json`, workflow `contract:` blocks, and `packages/agent-harness/*` consumers as the structural basis for the next step.
   - Keep `packages/workflows/` authoritative until a source-of-truth promotion is explicitly recorded.
   - Treat transition handoff memos as local/internal context, not product-repo control documents.

2. **Stabilize Medplum workspace path**
   - Confirm current Medplum local/tower setup.
   - Decide the smallest viable patient context bundle.
   - Choose one MIMIC/Synthea patient path for end-to-end testing.
   - Keep dashboard and MCP work scoped to that first path in the new layout.

3. **Define the first workflow to build**
   - Pick one realistic bedside workflow.
   - Specify required chart context, tools, memory, and output shape.
   - Create acceptance criteria before implementation.

4. **Land the Clinical Simulation Harness scaffold (docs-only pass)**
   - Canonical scaffold doc: `docs/foundations/sim-harness-scaffold.md`.
   - First-batch doc: `docs/foundations/sim-harness-first-batch.md`.
   - Runtime access contract: `docs/foundations/sim-harness-runtime-access-contract.md`.
   - Waveform vision contract (non-negotiable: agent must see the raw strip): `docs/foundations/sim-harness-waveform-vision-contract.md`.
   - Engine wrapping spec (Pulse primary, BioGears fallback, Infirmary Integrated / rohySimulator / Auto-ALS as reference patterns): `docs/foundations/sim-harness-engine-wrapping.md`.
   - Workspace center scaffold only: `services/sim-harness/README.md`.
   - No runtime code in this pass. Runtime work is gated on the first bedside workflow needing live vitals.

## Next

4. **Implement the minimal `pi.dev` harness foundation inside the new layout**
   - Use `.pi/` as the project-level pi.dev scaffold surface.
   - Start with the first Shift Report path.
   - Consume the registry + contract + selection structures before adding new runtime layers.

5. **Memory architecture spec**
   - Longitudinal patient H&P.
   - Present encounter mutable Markdown/canvas.
   - Provider session memory.
   - Provider persistent memory.
   - Task-local agent memory.

6. **Clinical resources catalog plan**
   - Guidelines and protocols.
   - Joint Commission as institution-policy stand-in where useful.
   - AHA and other established references.
   - Pocket manual corpus structure.
   - Publication/update source strategy.
   - Lexicomp-like agent-centric drug reference path.

7. **Meta-harness observability plan**
   - Define what every workflow invocation should log under `evals/`.
   - Decide minimum metrics for quality, safety, cost, and latency.
   - Connect evaluation traces to future eval harness work.

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
