# New Admission — Pi Prompt Template

Reusable prompt surface for onboarding a new patient at the start of care.

## Skill targets

This is a **multi-skill prompt** with a sequential workflow:

| Phase | Skill | Purpose |
|-------|-------|---------|
| 1. Initial assessment | `shift-assessment` | Organize the admission assessment into 15 systems |
| 2. Handoff structure | `shift-report` | Build the first shift report for the next nurse |
| 3. Reference lookups | `drug-reference`, `protocol-reference` | As needed based on admission diagnosis and orders |

Dependencies:
- `packages/workflows/shift-assessment/SKILL.md`
- `packages/workflows/shift-report/SKILL.md`
- `packages/workflows/drug-reference/SKILL.md`
- `packages/workflows/protocol-reference/SKILL.md`
- Future: memory layer for patient continuity across shifts (see PLAN.md)

## When to use this prompt

A nurse just received a new patient. They need to:
1. Get their initial assessment organized
2. Start building the handoff for the next nurse
3. Look up anything unfamiliar (meds, protocols)

Common triggers:
- "New admit"
- "Just got a patient from the ED"
- "Post-op patient coming to the floor"
- "Transfer from ICU"
- "I need to get organized on this new patient"

---

## Prompt: Full Admission

Use when the nurse is ready to work through the whole admission.

```
New patient? Walk me through what you've got — who they are, why
they're here, what you're seeing. I'll build your assessment and
start the handoff structure.
```

### What happens next

1. Nurse provides admission data (demographics, diagnosis, initial assessment, orders, lines)
2. Router detects multi-domain input: `patient_assessment` + `shift_handoff`
3. Phase 1: `shift-assessment` organizes findings into 15-system format
4. Phase 2: `shift-report` builds the initial 7-section handoff
5. If unfamiliar meds or diagnoses are mentioned, cross-skill triggers suggest `drug-reference` or `protocol-reference`
6. Gap detection fires for both assessment and report — one prompt each

---

## Prompt: Patient ID Mode

Use when the patient is already in the system.

```
What's the patient ID? I'll pull what's in the chart and we can
build from there. You fill in what the chart doesn't know —
your assessment, your gut, the stuff that matters.
```

### What happens next

1. `medplum-context` extension fetches patient context via `get_patient_context(id)`
2. Timeline arrives — demographics, orders, labs, meds
3. `shift-assessment` organizes the chart data into 15 systems
4. Nurse supplements with their bedside findings
5. `shift-report` builds the initial handoff combining chart data + nurse input

---

## Prompt: Quick Start

Use when the nurse just wants to get the basics down and come back later.

```
Let's start with the basics — room, age, diagnosis, code status,
allergies, and what brought them in. We can fill in the rest as
you go.
```

### What happens next

1. Nurse provides minimum data
2. `shift-report` builds a partial PATIENT + STORY section
3. Output notes which sections are incomplete
4. Nurse can return later with additional data — incremental mode

---

## Output contract

The new admission prompt produces layered output across two skills:

| Phase | Output |
|-------|--------|
| **Assessment** | 15-system structured assessment with [!] flags on critical findings |
| **Handoff** | 7-section shift report (may be partial on first pass) |
| **Lookups** | Drug reference or protocol reference if triggered by cross-skill rules |

Each skill output carries its own provenance footer and disclaimer.

## Future: Memory Layer Integration

When the memory layer is implemented (see PLAN.md), the new-admission prompt
will also:

- Store the initial assessment as the patient's baseline
- Track subsequent assessments as deltas from baseline
- Surface trending data across shifts ("K was 5.2 on admit, now 5.7")
- Carry forward the "pay attention here" items from the initial handoff

This is not implemented yet. The prompt works without it — memory makes it better.

## Cross-skill triggers

New admissions are high-yield for cross-skill triggers because the nurse is
encountering the patient for the first time:

| Finding | Suggests |
|---------|----------|
| Sepsis diagnosis + vitals | Sepsis bundle protocol |
| Stroke diagnosis + timing | Stroke protocol (tPA window?) |
| Multiple high-alert meds | Drug reference for each |
| GCS documented | Clinical calculator to verify |
| Fall risk factors | Braden score if skin concerns noted |

## Safety boundaries

- No diagnosis — the admission diagnosis comes from the provider, not Noah
- No orders — Noah doesn't suggest admission orders
- No fabrication — chart data is organized as-is, nurse data is preserved as reported
- No assumptions about acuity — inferred from content, never asked
- Partial is fine — a new admission prompt with minimal data still produces useful output
