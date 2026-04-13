# Memory

Memory is context. This directory is the future home of Noah RN's memory architecture.

## Tiers

From TASKS.md #6:

| Tier | Scope | Lifetime | Description |
|------|-------|----------|-------------|
| **Encounter canvas** | Single patient encounter | Encounter duration | Mutable working surface — active problems, lines, drips, assessments. The nurse's scratchpad for this shift. |
| **Provider session** | Provider login session | Session duration | What the nurse has seen, asked, and been told this session. Prevents re-asking, enables continuity within a shift. |
| **Provider persistent** | Provider across sessions | Persistent | Provider preferences, workflow patterns, learned context that persists across logins. |
| **Longitudinal patient** | Patient across encounters | Persistent | H&P, problem list evolution, care patterns. The patient's story over time. |
| **Task-local agent** | Single agent invocation | Task duration | Scratch memory for a single skill execution. Discarded after output. |

## Architecture status

Placeholder. See `docs/foundations/memory-tier-boundary.md` for the current boundary definition.

## Design constraints

- Memory retrieval is context assembly — it feeds into the same pipeline as FHIR data.
- Memory writes are explicit, never silent. The nurse knows what was remembered.
- Encounter canvas is the first tier to implement — it's the one the shift report needs.
- Longitudinal memory is the hardest — it requires decisions about persistence, staleness, and provenance that aren't made yet.
- Task-local memory already exists implicitly (the LLM's context window during a skill invocation). Making it explicit is a future optimization, not a current need.
