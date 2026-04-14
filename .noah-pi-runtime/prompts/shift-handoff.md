# Shift Handoff — Pi Prompt Template

Reusable prompt surface for invoking the shift-report skill through the Pi runtime.

Repo note: this prompt lives at `.noah-pi-runtime/prompts/shift-handoff.md` and mounts as `/runtime/.pi/prompts/shift-handoff.md`.

## Skill target

- `.pi/skills/shift-report/SKILL.md`
- Dependencies: `.pi/skills/shift-report/dependencies.yaml`

## When to use this prompt

A nurse needs to hand off a patient at end of shift. They have either:
- A **patient ID** (structured data path), or
- A **free-text brain dump** (narrative path)

This prompt bridges natural nurse language to the shift-report skill's input contract.

---

## Prompt: Narrative Mode

Use when the nurse is ready to dictate their report.

```
Give me the rundown on your patient — I'll structure the handoff.

Dump everything: room, history, what happened this shift, lines, drips,
active issues, family, housekeeping — whatever you've got. Dense is fine.
Abbreviations are fine. I'll organize, you verify.
```

### What happens next

1. Router detects `shift_handoff` intent from nurse's response
2. Input mode resolves to `clinical_narrative` (no patient ID detected)
3. Skill invokes directly — no extension call needed
4. Output: 7-section structured handoff, copy-paste ready

---

## Prompt: Patient ID Mode

Use when the nurse has a patient loaded in the system.

```
Which patient are you handing off? Give me the ID and I'll pull the chart
and build the handoff structure. You can add or correct anything after.
```

### What happens next

1. Router detects `shift_handoff` intent + `patient_id` input
2. `medplum-context` extension calls `get_patient_context(patient_id)`
3. Clinical-MCP returns patient timeline
4. Skill organizes timeline into 7-section handoff
5. Gap detection fires — nurse gets one chance to fill in missing sections
6. Output: 7-section structured handoff, copy-paste ready

---

## Prompt: Unclear Mode

Use when the nurse says something like "shift report" without providing data.

```
I can build your handoff two ways:

1. **Patient ID** — give me the ID and I'll pull the chart
2. **Brain dump** — just start talking and I'll organize it

Which works for you right now?
```

---

## Output contract

Regardless of input mode, the nurse gets:

| Layer | Content |
|-------|---------|
| **Summary** | 7-section structured handoff (PATIENT → STORY → ASSESSMENT → LINES & ACCESS → ACTIVE ISSUES & PLAN → HOUSEKEEPING → FAMILY) |
| **Evidence** | Inline source citations where applicable |
| **Confidence** | Tier labels on each section (Tier 1 facts, Tier 2 bedside guidance, Tier 3 facility-specific) |
| **Provenance** | `noah-rn v0.2 | shift-report v1.1.0 | nurse-reported data` |
| **Disclaimer** | 1 randomly selected from disclaimer pool |

## Cross-skill triggers

If the handoff content contains clinical findings that match `clinical-resources/templates/cross-skill-triggers.md`, up to 2 suggestions surface:

```
---
💡 Based on [finding]: consider reviewing [protocol/skill].
   [One-line clinical rationale.]
```

## Safety boundaries

- No fabrication — if the nurse didn't say it, it's not in the report
- No diagnosis — this is a handoff organizer, not a clinical decision tool
- No orders — Noah doesn't suggest, place, or imply orders
- Nurse voice preserved — "ABG was trash" stays, "maps haven't been an issue" stays
- One gap prompt, one chance — then output renders with what's available
