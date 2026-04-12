# Medplum as Primary Clinician Workspace

## Purpose

Record the intended posture change for Noah RN after the first scaffold hardening pass:

- **Medplum** becomes the primary clinician-facing workspace and EHR surface.
- The custom React dashboard at `apps/clinician-dashboard/` remains a **sidecar runtime console**, not the main chart UI.

This note is directional guidance for the next implementation wave. It is not a broad rewrite plan.

## Why this shift is correct

The current scaffold now has:

- a real harness path for `shift-report`
- a working `patient_id -> clinical-mcp -> shift-report` loop
- Medplum as the live FHIR backbone
- a custom dashboard that is useful, but still fundamentally a sidecar

If the custom dashboard keeps growing into the primary clinician UI, Noah RN risks building a parallel EHR-like product surface too early. That would split attention across two truths:

1. Medplum as the actual clinical workspace
2. the custom dashboard as a second quasi-clinical workspace

That is the wrong shape for the next phase.

## Primary rule

**The nurse should primarily experience patient context inside Medplum.**

The custom dashboard should primarily experience:

- runtime traces
- eval results
- context inspection
- agent behavior visibility
- simulation observability
- debug/operator workflows

## Surface roles

### 1. Medplum

Use Medplum as the canonical clinician-facing workspace for:

- patient chart review
- encounter context
- medications, vitals, labs, and notes
- future draft/final artifact review
- patient/encounter-scoped agent entry points

This is the surface that should feel most like the working EHR.

### 2. `services/clinical-mcp/`

Keep `services/clinical-mcp/` as the agent-facing contract boundary:

- patient context assembly
- timeline shaping
- FHIR normalization
- read-path stability
- future sim-backed patient context exposure

Medplum remains the source of truth. `clinical-mcp` remains the agent-facing boundary.

### 3. `packages/agent-harness/`

Keep the harness focused on:

- intake
- workflow resolution
- execution of the forcing-function path
- traceability for that path

The harness should not become the place where clinician UI logic lives.

### 4. `apps/clinician-dashboard/`

Re-scope the dashboard toward a runtime console:

- trace views
- context inspection
- workflow/eval visibility
- sidecar debugging
- future simulation waveform/vitals monitoring

It should stop trying to become the primary bedside chart surface unless a concrete Medplum limitation forces that decision later.

## Immediate architectural consequence

The next workflow work should answer:

**How does a nurse trigger and review `shift-report` from Medplum patient/encounter context?**

Not:

**How do we make the custom dashboard into a richer chart?**

## Recommended next moves

### Move 1 — Define the Medplum entry surface

Pick the first real agent entry pattern inside the Medplum workspace, for example:

- a patient-context launch action
- an encounter-scoped draft generation action
- a Medplum Bot / Task / DocumentReference review flow
- a lightweight embedded/linked panel

The exact shape is still open, but it should be Medplum-first.

### Move 2 — Keep the current sidecar dashboard narrow

Only add dashboard features that help:

- observe runtime behavior
- debug context assembly
- inspect evals/traces
- inspect future sim-backed runtime state

### Move 3 — Keep write semantics narrow and review-shaped

The first-workflow draft posture is now defined in:

- `docs/foundations/medplum-draft-review-lifecycle.md`

Default rule for the current phase:

- documentation-style review artifacts may use FHIR-queued drafts
- broad write expansion remains deferred
- the one remaining gate is empirical Medplum UI visibility testing for preliminary artifacts

## Anti-pattern to avoid

Do not let the custom dashboard become:

- a second chart
- a second encounter workspace
- a second source of workflow truth
- a second artifact review system

That would recreate the same architectural split Noah RN is currently trying to remove.

## Decision summary

For the next phase:

- **Medplum = primary clinician workspace**
- **clinical-mcp = agent-facing context boundary**
- **agent-harness = workflow runtime spine**
- **clinician-dashboard = runtime console / sidecar observability**

That is the simplest shape that preserves the current scaffold while moving the project toward a more real clinical operating environment.
