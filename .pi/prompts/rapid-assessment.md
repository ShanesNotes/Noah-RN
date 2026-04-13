# Rapid Assessment — Pi Prompt Template

Reusable prompt surface for urgent bedside assessment situations.

## Skill targets

This is a **multi-skill prompt** — it can route to one or more skills depending on the situation:

| Skill | When it fires |
|-------|--------------|
| `shift-assessment` | Nurse describes findings that need systems-based organization |
| `protocol-reference` | Nurse describes a clinical scenario that maps to a loaded protocol |
| `neuro-calculator` | Nurse needs a neuro, sedation, or pain score (GCS, NIHSS, RASS, CPOT) |
| `risk-calculator` | Nurse needs a risk stratification score (Wells PE/DVT, CURB-65, Braden) |
| `acuity-calculator` | Nurse needs a severity or early warning score (APACHE II, NEWS2) |

Dependencies:
- `packages/workflows/shift-assessment/SKILL.md`
- `packages/workflows/protocol-reference/SKILL.md`
- `packages/workflows/neuro-calculator/SKILL.md`
- `packages/workflows/risk-calculator/SKILL.md`
- `packages/workflows/acuity-calculator/SKILL.md`
- `tools/safety-hooks/`

## When to use this prompt

A nurse needs to **quickly organize what they're seeing** at the bedside. This is not
end-of-shift documentation — this is mid-shift, something-changed, I-need-to-think-out-loud.

Common triggers:
- "My patient looks off"
- "I think something's wrong"
- "Just got back vitals and they don't look right"
- "Patient is declining"
- "I need to call the doc — help me organize what I'm seeing"

---

## Prompt: Active Situation

Use when the nurse is at the bedside and something is happening now.

```
Tell me what you're seeing — vitals, neuro, what changed.
I'll organize it and flag anything that needs escalation.
```

### What happens next

1. Router receives nurse's clinical narrative
2. Intent classification: could be `patient_assessment`, `score_calculation`, `protocol_lookup`, or multi-skill
3. If findings map to a protocol (e.g., bradycardia, desaturation) → `protocol-reference` fires alongside `shift-assessment`
4. If a score is calculable from provided data (e.g., GCS components mentioned) → appropriate calculator fires (`neuro-calculator` for GCS/NIHSS/RASS/CPOT, `risk-calculator` for Wells/CURB-65/Braden, `acuity-calculator` for APACHE II/NEWS2)
5. `shift-assessment` organizes findings into the 15-system format
6. Critical findings flagged with `[!]`
7. Cross-skill triggers surface protocol suggestions if applicable

---

## Prompt: Pre-Call Organization

Use when the nurse needs to organize their findings before calling a provider.

```
What are you seeing that's got you concerned? I'll help you
organize it for the call — SBAR-ready, with the numbers up front.
```

### What happens next

1. Nurse describes their concern
2. `shift-assessment` organizes the relevant systems
3. Output prioritizes: the problem system first, then supporting data
4. If a protocol is relevant, it's surfaced as a cross-skill suggestion
5. Nurse gets a structured block they can read over the phone

---

## Prompt: Score Check

Use when the nurse needs a quick score to quantify what they're seeing.

```
Which score do you need? Tell me the components or describe
what you're seeing and I'll calculate it.

Available: GCS, NIHSS, NEWS2, RASS, CPOT, Braden, Wells PE/DVT,
CURB-65, APACHE II
```

### What happens next

1. Router detects `score_calculation` intent
2. Routes to the appropriate calculator skill (neuro/risk/acuity)
3. Deterministic tool computes the score
4. Contextual flags fire if thresholds are met
5. Cross-skill triggers suggest protocols if applicable (e.g., GCS ≤8 → RSI protocol)

---

## Output contract

Output depends on which skills fire, but the nurse always gets:

| Layer | Content |
|-------|---------|
| **Summary** | Organized findings (assessment) and/or exact scores (calculator) and/or protocol steps (reference) |
| **Evidence** | Inline source citations |
| **Confidence** | Tier labels — Tier 1 for scores and protocols, Tier 2 for clinical flags |
| **Provenance** | Per-skill footer |
| **Disclaimer** | 1 randomly selected |

## Cross-skill triggers (high-yield in rapid assessment)

These are the triggers most likely to fire in an urgent bedside scenario:

| Finding | Suggests |
|---------|----------|
| GCS ≤ 8 | RSI protocol, rapid response |
| MAP < 65 | Sepsis bundle or ACLS |
| SpO2 < 90% | Rapid response, airway assessment |
| HR > 150 or < 50 | ACLS tachycardia/bradycardia |
| NEWS2 ≥ 5 | Rapid response protocol |

## Safety boundaries

- No diagnosis — "your patient looks septic" is the nurse's call, not Noah's
- No orders — Noah organizes, the provider orders
- No fabrication — if the nurse didn't report it, it's not in the output
- Urgency is preserved — if the nurse says "crashing," the output is structured for speed, not completeness
- One gap prompt maximum — in an urgent situation, missing data is expected
