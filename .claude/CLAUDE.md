# Noah RN — Project Directives

## Identity

Noah RN is an agentic nurse assistant — a Claude Code plugin + companion project.
Clinical decision support and structured nursing workflows, NOT documentation/scribing.
Complements ambient documentation platforms (ChartWell AI's lane), doesn't compete.

## Hard Constraints

- No EHR integration. No FHIR. No HL7. Not even stubs.
- No PHI handling, storage, or logging. Nurse provides context, Noah provides structure.
- No web UI. This is a CLI plugin.
- No dependencies without Shane's approval.
- No medical device claims. This is a clinical knowledge tool.
- Deterministic before generative: if it can be computed (scores, interactions, conversions), use a tool — don't ask an LLM to do math.

## Current Phase

**Phase 0: Scaffold** — get project structure up, plugin manifest valid, one trivial skill working.
See `docs/ARCHITECTURE.md` for full phase plan and completion criteria.

## Session Rules

- One phase at a time. One skill at a time. Finish completely before moving on.
- Read `docs/ARCHITECTURE.md` before building any skill or starting a new phase.
- Use the harness: superpowers (TDD, worktrees, subagents), plugin-dev (skill authoring), context7 (API docs).
- Test every skill against realistic clinical scenarios. Bar: "Would a 13-year ICU nurse actually use this output?"
- Skills produce copy-paste-ready text, not conversational responses.
- Every skill includes a clinical safety disclaimer.
- Fail loudly. No silent bad data from tools.

## Architecture (summary)

Hybrid plugin + project. Plugin lives in `plugin/` with skills, agents, commands.
Tools (deterministic) live in `tools/`. Curated clinical data in `knowledge/`.
Full structure and specs in `docs/ARCHITECTURE.md`.

## What Shane Brings

14yr licensed RN, 13yr critical care at Level 1 trauma center (Grand Rapids, MI).
Deep ICU, ventilator management, hemodynamic monitoring, code/rapid response, complex drips.
Self-taught engineer. First-principles thinker. Subtractive bias. No tolerance for slop.
