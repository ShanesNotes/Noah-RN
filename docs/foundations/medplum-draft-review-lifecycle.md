# Medplum Draft Review Lifecycle

## Purpose

Resolve the first workflow's draft/review posture enough to support implementation without reopening the whole Medplum boundary on every edit.

This document is intentionally narrow. It applies first to the Shift Report path and sets the default posture for similar documentation-style artifacts until a stronger reason appears.

## Decision

For the first Shift Report workflow:

- **Use FHIR-queued drafts in Medplum**
- **Use `Task` as the universal review primitive**
- **Use draft `DocumentReference` as the first review artifact**
- **Keep Noah RN as execution owner**
- **Keep `clinical-mcp` as the read/context boundary**

In shorthand:

```text
Task(requested)
  -> Noah RN runtime
  -> draft DocumentReference(preliminary/current)
  -> Task(completed, output -> DocumentReference)
  -> nurse review in Medplum
```

## Why this decision wins for the first workflow

### 1. It preserves the Medplum rails / Noah runtime split

Medplum remains the clinician-facing request/review plane.
Noah RN remains the runtime and orchestration plane.

This keeps the project aligned with:

- `docs/foundations/medplum-primary-workspace-note.md`
- `docs/foundations/medplum-rails-noah-runtime.md`

### 2. It is more restart-safe than volatile-only drafts

Volatile-only drafts are stricter in one sense, but they create real operational fragility:

- tab loss
- session interruption
- cross-device handoff problems
- no first-class audit/version surface before approval

For a nurse-review workflow, draft persistence is acceptable **if** it is explicitly marked, constrained, and segregated from final truth.

### 3. It matches the first artifact type cleanly

Shift Report is a documentation artifact.
`DocumentReference` already fits that shape well.
It supports:

- explicit draft semantics
- FHIR-native attachment/linkage
- Medplum-native review
- provenance and later promotion rules

### 4. `Task` cleanly generalizes beyond Shift Report

`Task` should be the review queue regardless of future artifact type.

- If the artifact supports preliminary state, `Task.focus` / `Task.output` can point at it.
- If the artifact does **not** support preliminary state, the proposal can live in `Task.input` until approval.

This means the first decision does not trap Noah RN into `DocumentReference` forever.

## What this does **not** mean

This decision does **not** approve broad agent writes into Medplum.

It does **not** mean:

- the agent can write final chart truth
- the agent can create arbitrary draft resource types
- every workflow should persist drafts immediately
- the dashboard should become the review surface

This is a narrow first-workflow posture, not a general write expansion.

## The exact first-workflow lifecycle

### 1. Request

The nurse requests work in Medplum by creating or triggering a `Task` with:

- workflow code = `shift-report`
- `status=requested`
- patient reference required
- encounter reference preferred when known

### 2. Execution

Noah RN discovers the `Task` and executes through the existing path:

```text
Task
  -> clinical-mcp
  -> agent-harness
  -> shift-report workflow contract
```

### 3. Draft artifact creation

Noah RN writes back a draft `DocumentReference` with:

- `status=current`
- `docStatus=preliminary`
- draft Shift Report type coding
- same patient reference as the request
- encounter copied when available
- clear review-required description

### 4. Review linkage

The originating `Task` is updated:

- `status=completed`
- `output` points to the draft `DocumentReference`

### 5. Nurse review

The nurse reviews the draft in Medplum.
Promotion/finalization semantics are a separate later step and are not part of this first decision.

## Guardrails

### Guardrail 1: Drafts must be unmistakably draft

The artifact must be impossible to confuse with finalized chart truth by structure alone:

- preliminary status
- explicit draft type
- explicit review-required description
- linked review `Task`

### Guardrail 2: Review happens through `Task`, not raw search alone

The nurse-facing review queue should be task-driven:

- assigned/relevant Tasks
- not broad unfiltered resource browsing

This reduces the risk that draft resources are surfaced outside intended review flows.

### Guardrail 3: Non-preliminary resources stay off this path

For resource types without clean preliminary semantics, the proposal should remain carried in `Task.input` until explicit approval.

This is especially important for:

- `MedicationAdministration`
- other clinically authoritative write surfaces that should not exist as agent-written drafts

### Guardrail 4: Reads remain on `clinical-mcp`

This decision does not widen normal read behavior.
The agent still reads through the bounded context assembly path, not directly from arbitrary Medplum resource queries.

## The one open question that must be closed empirically

The remaining load-bearing unknown is:

**Does standard Medplum UI surface preliminary resources by default in ways that could confuse clinicians outside the intended review flow?**

This cannot be settled by prose alone.

It must be closed by an empirical Medplum visibility test:

1. create a preliminary draft artifact
2. inspect the relevant Medplum UI surfaces
3. record exactly where it appears
4. decide whether task-scoped review plus filtering is sufficient

### Empirical results (2026-04-12)

Test performed: created a preliminary `DocumentReference` (`docStatus=preliminary`, LOINC 28651-8 Nurse transfer note, author=Noah RN Agent) for patient `04fd71c5-3a02-4ad4-8712-3317ed86fd49` (Ivan258 Goodwin327). Resource ID: `fc811c55-8c10-452b-9bd3-e1d260aeeb31`.

**Findings:**

1. **Unfiltered search surfaces drafts.** `DocumentReference?patient=X` returns preliminary docs in the same result set as final docs. No automatic exclusion. The default Medplum UI patient document list will show drafts.
2. **`doc-status` SearchParameter works.** `DocumentReference?patient=X&doc-status=preliminary` returns only drafts. `doc-status=final` excludes them. Medplum supports this filter natively.
3. **Multiple prior drafts are visible.** 5+ preliminary DocumentReferences from prior test runs are visible in the unfiltered search, confirming the pattern is durable.
4. **Direct resource read works.** `DocumentReference/{id}` returns the full resource with `docStatus=preliminary` intact.

**Decision: task-scoped filtering is sufficient.**

- The nursing-station app should use `doc-status=final` in default patient document views to exclude agent drafts.
- The review queue should use `doc-status=preliminary` to show only pending drafts.
- No additional AccessPolicy or SearchParameter work is needed for the first workflow.

This decision is now:

- **approved for implementation planning**
- **approved for runtime rollout** (visibility gate closed)

## Default rule going forward

Until a stronger contrary decision is recorded:

- documentation-style artifacts with clean draft semantics should use:
  - `Task` review primitive
  - FHIR-queued draft artifact
- authoritative action/event resources without clean draft semantics should use:
  - `Task.input` proposal
  - explicit human promotion before any final write

## Consequences

### Good

- gives the first workflow a concrete Medplum-native review path
- preserves Noah RN runtime ownership
- avoids volatile-only fragility
- establishes a reusable review primitive

### Costs

- requires clear draft filtering discipline (use `doc-status=final` in production views)
- ~~requires one empirical Medplum UI visibility test~~ (completed 2026-04-12 — task-scoped filtering sufficient)
- requires later explicit promotion/finalization design

## Related

- `docs/foundations/medplum-shift-report-contract.md`
- `docs/foundations/medplum-primary-workspace-note.md`
- `docs/foundations/medplum-rails-noah-runtime.md`
- `wiki/concepts/volatile-draft-vs-fhir-queuing.md`
- `wiki/concepts/task-as-review-primitive.md`
- `wiki/questions/medplum-preliminary-visibility-in-ui.md`
