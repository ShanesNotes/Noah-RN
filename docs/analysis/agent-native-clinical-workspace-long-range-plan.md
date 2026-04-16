# Agent-Native Clinical Workspace Long-Range Plan

Purpose: define the long-running execution plan for Noah-RN's clinician workspace so future implementation lanes stay aligned to one durable doctrine.

## Core doctrine

1. **Epic is the golden workflow template.**
   - Use Epic as the reference for interface shape, workflow pacing, queueing, review discipline, chart shell, and accountability primitives.
   - Do not copy Epic's enterprise sprawl, hidden complexity, or billing/admin clutter.

2. **Medplum is the open-source substrate.**
   - Medplum remains the EHR backbone, auth layer, FHIR store, request/review plane, and clinician workspace substrate.
   - Noah-RN should not fork into a second charting platform unless Medplum proves a concrete hard boundary.

3. **Noah-RN is the agent-native kernel.**
   - Noah-RN owns orchestration, context shaping, workflow execution, draft generation, evaluation, provenance, and future charting-policy enforcement.
   - The product goal is not “AI features on top of an EHR.” The goal is an agent-native clinical workspace built from the kernel level upward.

4. **Optimize for both the nurse and the agent.**
   - Nurse: low-click navigation, worklist-first flow, explicit review state, explicit provenance, fast state comprehension.
   - Agent: stable route/state model, bounded context delivery, deterministic artifact linkage, explicit charting authority states, no hidden writes.

## Product stance

Noah-RN should evolve into:

- a Medplum-first clinician workspace that feels Epic-grade in workflow discipline
- a Noah-owned runtime layer that prepares, routes, validates, and evaluates agent work
- a future charting surface where agent actions are explicit, reviewable, provenance-backed, and policy-gated

The UI should therefore be designed around:

- assignment/worklist
- patient chart shell
- task-driven review
- draft/final distinction
- provenance visibility
- agent-native drafting and charting states

## Architectural invariants

1. `apps/nursing-station/` is the primary clinician-facing workspace.
2. `apps/clinician-dashboard/` stays sidecar-only for runtime traces, evals, context inspection, and operator workflows.
3. `services/clinical-mcp/` remains the agent-facing context and write boundary.
4. `Task` remains the universal review primitive.
5. Draft artifacts remain explicit and visually distinct from final chart truth.
6. No silent AI writeback.
7. Every meaningful UI lane needs acceptance coverage before the next widening step.

## Long-range phases

### Phase 0: Stabilize the current shell into a true review workspace

Status: in progress / partially landed.

Already landed:

- persistent patient header
- route-driven chart shell
- overview page
- task-centric review queue
- task-linked draft review detail surface
- fixture-backed Playwright coverage for the shell and review path

Remaining Phase 0 objective:

- finish the first complete nurse review loop without broadening write semantics

### Phase 1: Review accountability and attestation

Goal: move from “draft is visible” to “draft can be reviewed and dispositioned.”

Lanes:

1. **Attestation/finalization path**
   - explicit review actions in the nursing-station review pane
   - review-required vs acknowledged vs approved states
   - draft promotion path remains narrow and policy-gated
2. **Review vs acknowledge state model**
   - distinguish “I saw this” from “I accept this into clinical workflow”
   - represent these states consistently in task/worklist/review detail
3. **Provenance visibility**
   - make author, timestamp, artifact type, and policy posture visible in the review pane

Exit criteria:

- the nurse can disposition a draft artifact in a task-driven flow
- state transitions are explicit and testable
- no hidden mutation path exists

### Phase 2: Assignment and Brain-style worklist

Goal: make the workspace start from work, not raw patient browsing.

Lanes:

1. **Brain-like assignment board**
   - workload clustering
   - urgency and due-state cues
   - review-ready tasks separated from background work
2. **Patient + task hybrid entry**
   - patient browsing remains available, but the primary entry becomes assignment/worklist-first
3. **Context-preserving transitions**
   - move from worklist -> patient -> review pane with minimal navigation cost

Exit criteria:

- task/worklist becomes the default operational home
- nurse can reach the correct patient review context in one flow
- Playwright proves queue clustering and navigation stability

### Phase 3: Core nurse workflow surfaces

Goal: promote the shell into a true bedside workspace.

Lanes:

1. **Results review panel**
2. **Trend-first vitals/labs**
3. **MAR-lite**
4. **Handoff surface**

Design rule:

- each lane must reuse the shell, review, and provenance vocabulary already established
- no standalone sub-app patterns

Exit criteria:

- the workspace supports day-shift review flow, medication monitoring, and handoff preparation without leaving the main chart shell

### Phase 4: Agent-native charting primitives

Goal: introduce explicit agent charting states at the kernel level.

Core states:

- observe
- propose
- prepare
- execute
- attest
- escalate

Lanes:

1. **Narrow charting policy implementation**
   - connect nursing-station review actions to the Medplum write-path expansion work
2. **Draft-to-final pathways**
   - first for `DocumentReference`
   - then for bounded additional resource types only when needed
3. **Agent-facing charting UX**
   - make charting state machine visible to clinicians
   - preserve deterministic context and policy visibility for the agent

Exit criteria:

- agent charting is no longer implied
- charting actions are explicit, policy-cited, provenance-backed, and reviewable

### Phase 5: Live simulation-backed workspace

Goal: connect the agent-native clinical workspace to the live Clinical Simulation Harness.

Lanes:

1. **Task/review flow on sim-backed encounters**
2. **Waveform and monitor-backed review surfaces**
3. **Obligation and escalation pressure integrated into the workspace**

Design rule:

- simulation does not create a second workflow model
- the same shell, task, and review primitives must work for static and live encounters

Exit criteria:

- the workspace can support the first live-vitals workflow loop with the same review/accountability model

### Phase 6: Memory, resources, and optimization loops

Goal: deepen the kernel only after the workflow substrate is proven.

Lanes:

1. clinical memory and session continuity
2. richer clinical resources and protocol coverage
3. eval-driven optimization of nurse + agent workflow

Rule:

- no memory or optimization layer should outrun the clinician workflow surface it is meant to support

## Sequencing rules

1. Finish review accountability before broadening agent-native actions.
2. Finish assignment/worklist before deepening downstream specialty surfaces.
3. Finish draft/final review and provenance before any meaningful write expansion.
4. Keep simulation integration behind the same review/accountability contract.
5. Prefer one explicit workflow loop over broad feature breadth.

## Recommended near-term execution order

1. **Attestation/finalization lane for draft review artifacts**
2. **Review vs acknowledge state model**
3. **Brain-style assignment/worklist**
4. **Results review panel**
5. **Trend-first vitals/labs**
6. **MAR-lite**
7. **Handoff surface**

## Non-goals

- building a second chart in `clinician-dashboard`
- open-ended chat shell as the primary clinician workflow
- broad autonomous chart writing
- cosmetic redesign detached from workflow proof
- hidden agent state changes

## Why this plan is durable

It aligns all three layers at once:

- **Epic** for workflow truth
- **Medplum** for substrate truth
- **Noah-RN** for agent-native kernel truth

That keeps future work from oscillating between “better UI,” “better runtime,” and “better agent features” as separate projects. They become one sequenced program.
