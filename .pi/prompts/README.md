# `.pi/prompts/`

Reusable prompt templates for Pi-native workflow invocation.

## Prompt inventory

| Template | Type | Skill targets | Status |
|----------|------|--------------|--------|
| `shift-handoff.md` | Single-skill | `shift-report` | **wired** |
| `rapid-assessment.md` | Multi-skill | `shift-assessment` + `protocol-reference` + `neuro-calculator` / `risk-calculator` / `acuity-calculator` | **wired** |
| `new-admission.md` | Multi-skill (sequential) | `shift-assessment` → `shift-report` → `drug-reference` / `protocol-reference` | **wired** |

## Prompt types

### Single-skill prompts
Route to exactly one skill. The prompt's job is to get the nurse into the right
input mode (narrative, patient ID, or unclear) and hand off to the skill.

Example: `shift-handoff.md` → always routes to `shift-report`.

### Multi-skill prompts
Route to two or more skills based on what the nurse provides. The prompt handles
a broader clinical scenario where multiple skills contribute.

Example: `rapid-assessment.md` → could fire `shift-assessment` alone, or
`shift-assessment` + `neuro-calculator` + `protocol-reference` together.

### Sequential multi-skill prompts
Route through skills in phases — the output of one feeds the next.

Example: `new-admission.md` → Phase 1 assessment → Phase 2 handoff → Phase 3 lookups.

## The Three-Mode Pattern

Every prompt should offer up to three entry modes:

1. **Data-ready mode** — The nurse has information and is ready to go.
   Prompt invites them to dump it all.
2. **Structured mode** — The nurse has a patient ID. System pulls context,
   nurse supplements.
3. **Unclear mode** — The nurse stated intent but didn't provide data.
   Prompt offers the available paths and lets the nurse choose.

Not every prompt needs all three (score-check in rapid-assessment only has one),
but the pattern should be considered for each.

## How prompts connect to the Pi runtime

```
Nurse speaks
    ↓
Prompt template defines the entry surface
    ↓
Router reads prompt metadata + skill frontmatter + dependencies.yaml
    ↓
Intent classified → input mode detected → skill(s) selected
    ↓
Extensions resolve dependencies (context fetch, tools, safety)
    ↓
Skill(s) execute → output rendered with four-layer format
    ↓
Cross-skill triggers checked → suggestions surfaced (max 2)
    ↓
Nurse receives structured, copy-paste-ready output
```

## Safety boundaries (all prompts)

- No diagnosis, no orders, no fabrication
- Preserve nurse language and clinical voice
- Deterministic-first for anything computable
- One gap prompt, one chance — then render with what's available
- Cross-skill suggestions only, never autonomous skill invocation
