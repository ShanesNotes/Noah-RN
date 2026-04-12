# Medplum Rails, Noah RN Runtime

## Purpose

State the intended execution boundary between Medplum and Noah RN for the next phase of the project.

This note defines a simple rule:

- **Medplum provides the rails**
- **Noah RN provides the runtime**

The goal is to leverage Medplum's existing clinical plumbing without moving the core Noah RN agent runtime out of the Noah RN domain.

## The rule

Use Medplum for:

- clinician-facing chart context
- request and result resources
- policy enforcement
- audit surfaces
- review surfaces
- FHIR-native workflow primitives

Use Noah RN for:

- agent execution
- workflow orchestration
- context assembly
- traces and evals
- simulation/runtime behavior
- future multi-step runtime evolution

## What "rails" means

Medplum is the **workflow substrate**, not the cognitive engine.

The rails are:

- `Task`
- `Subscription`
- `AccessPolicy`
- `writeConstraint`
- `AuditEvent`
- `DocumentReference`
- future `ClinicalImpression` / `ServiceRequest` / other review resources as needed

These are the primitives that shape:

- how the nurse asks for work
- how work is tracked
- how outputs are attached to the chart
- how writes are constrained
- how auditability is enforced

## What "runtime" means

Noah RN remains the execution engine.

That means:

- `packages/agent-harness/` remains the workflow spine
- `services/clinical-mcp/` remains the context boundary
- `packages/workflows/shift-report/` remains the forcing-function workflow contract
- `evals/` and `tools/trace/` remain the main observability and evaluation surfaces

Noah RN should continue to own:

- how a request is executed
- how patient context is assembled
- how agent output is produced
- how runtime quality is measured

## The preferred hybrid interaction

The intended near-term pattern is:

1. **Nurse triggers in Medplum**
   - create `Task(status=requested, code=shift-report, for=Patient/...)`

2. **Noah RN worker executes**
   - picks up the Task
   - runs the existing Noah RN path:
     `Task -> clinical-mcp -> agent-harness -> shift-report`

3. **Noah RN writes draft result back**
   - draft `DocumentReference`
   - update `Task.status=completed`
   - link output from `Task.output`

4. **Nurse reviews in Medplum**
   - Medplum remains the primary clinician workspace

## What Bots are for

Medplum Bots are useful, but only as **thin deterministic glue**.

Good uses:

- validate a trigger
- normalize or route a request
- enforce policy
- create or annotate a Task
- bridge a FHIR event into a Noah RN worker lane

Bad uses:

- full agent orchestration
- long-running LLM inference
- duplicating context assembly
- duplicating Shift Report formatting
- becoming the real Noah RN runtime

## Why not Bot-first runtime

Making the Bot layer the primary runtime creates several problems too early:

1. **Runtime constraint mismatch**
   - Bot execution constraints are optimized for deterministic event handling, not general agent runtime ownership

2. **Split authority**
   - part of the runtime lives in Medplum deployment artifacts
   - part lives in Noah RN
   - the boundary becomes harder to reason about

3. **Split observability**
   - Medplum captures some execution evidence
   - Noah RN captures the rest
   - the primary runtime trace no longer lives in one place

4. **Duplication pressure**
   - context assembly or workflow logic gets reimplemented "just for the Bot"

## Design consequence

When choosing between:

- "Can Medplum do this?"
- and "Should Medplum own this?"

the default answer should be:

- Medplum may expose or constrain the workflow
- Noah RN should still execute the workflow

Unless a specific deterministic infrastructure concern clearly belongs inside Medplum.

## Immediate implication for Shift Report

The first Medplum-native entry surface should be:

- Medplum-native **trigger**
- Noah RN-owned **execution**
- Medplum-native **draft review**

Not:

- Medplum-native trigger
- Medplum Bot-owned Shift Report execution

## Anti-pattern to avoid

Do not let Medplum become:

- the chart
- the trigger surface
- and the primary agent runtime

That would give away the most important part of Noah RN too early.

The correct shape is:

- **Medplum as clinical rails**
- **Noah RN as agent runtime**

## Summary

For the next phase:

- **Medplum = request/review/control plane for the clinician**
- **Noah RN = execution/runtime plane for the agent**

That is the cleanest way to get Medplum-native user experience while preserving Noah RN as the real system under development.
