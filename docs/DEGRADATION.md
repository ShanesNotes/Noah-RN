# Noah RN — Degradation & Fallback

> **Scope note (2026-04-14):** this matrix was authored against the legacy Claude Code plugin surface (skills, router, Tier 1 hooks). The active agent harness foundation is now `pi.dev` (Decision 2026-04-10) and Medplum is the primary clinician workspace. The principles below (augment-never-replace, return-to-baseline, loud failure) still govern; the specific component rows refer to legacy skill surfaces and should be read as a reference for that era.

## Availability Tier

**Tier 2 — 99.9% / ~8.76 hr annual downtime acceptable.**
Noah is documentation AI, not life-critical infrastructure. When unavailable, the nurse returns to pre-noah-rn workflow. No PHI is stored, no state to recover.

## Component Degradation Matrix

| Component | Depends On | Failure Mode | Nurse Impact | Fallback |
|-----------|-----------|--------------|-------------|---------|
| Clinical skills (legacy surface) | Claude Code + model | Model unavailable or rate-limited | No structured output | Chart manually, paper references |
| Calculators | Bash + jq | Local execution — near-zero failure risk | None unless OS down | Bedside reference cards, manual calc |
| Drug lookup | Network + OpenFDA API | API down, 429 rate-limit, or network outage | No drug reference | Facility formulary, Lexicomp, call pharmacy |
| Knowledge files | Local filesystem | Only if filesystem corrupted | None practically | Paper protocol binders |
| Tier 1 hooks | Bash + jq | Same as calculators — local execution | Safety checks unavailable | Nurse's clinical judgment (always primary) |
| Router agent (legacy) | Claude Code + model | Same as skills | No intelligent routing | Invoke skills directly by name |

## Core Principle

Noah augments, never replaces. Every process Noah touches has a pre-existing fallback. Degradation is a return to baseline, not a gap.

## Model Version Changes

21.5% of appropriate responses became inappropriate after model updates in observed LLM deployments. When the model version changes:

1. Re-run the golden test suite against all 7 skills before trusting output quality.
2. Flag any skill where clinical tone, tier labeling, or safety disclaimers drift.
3. Do not assume backward compatibility. Validate before deploying to active clinical use.

## Error Handling Conventions

- Exit 0: success
- Exit 1: input / no-match error
- Exit 2: API / system error

Calculators and hooks fail loudly (non-zero exit + stderr message). Skills surface model errors directly — no silent bad data.
