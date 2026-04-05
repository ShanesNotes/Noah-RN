---
video_id: "RpFh0Nc7RvA"
title: "100k Stars in a day. I Found the Founders Sigrid Jin & Bellman"
channel: "Ray Fernando"
published: "2026-04-03T22:39:04Z"
ingested: "2026-04-04T00:32:05-04:00"
tags: ["agents", "agent-orchestration", "coding-agents", "claude-code"]
source_quality: medium
relevance_score: 4
relevance_rationale: "Explores advanced agentic scaffolding (OhMyCodex, clawhip) which informs our future clinical-router and hook structures."
---

## TL;DR

The founders of wildly successful GitHub repositories (OhMyCodex, Clawhip) discuss their advanced agentic coding frameworks. They highlight the use of "pointer-based" skills to minimize context pollution, auto-routing multi-agent systems via specialized runtimes, and the use of tools like Clawhip as a gateway to bypass context limits during continuous agent loops.

## Key Transcript Segments

> [10:01] it spawns a lot of codex sessions in once, and it swarms across codex session automatically. So the codex session spawns a teammate codex session, which is a Tmox pane represented thing, and it auto-swarms.

> [60:07] I really recommend to use OMX D-sloper skill. and i got rid of one thousand lines one thousand lines of code and it works identically

> [64:44] Skills should be pointers for agents and other skills. That reduced a lot of context. So you never get connection with this approach.

## External References

| Name | Type | URL | Notes |
|------|------|-----|-------|
| oh-my-codex | repo | https://github.com/Yeachan-Heo/oh-my-codex | Orchestration layer for OpenAI Codex CLI; adds teams, HUDs, skills |
| clawhip | repo | https://github.com/Yeachan-Heo/clawhip | Event-to-channel notification router bypassing gateway sessions |
| OhMyOpenAgent | repo | URL not stated | Related agent framework mentioned |
| Cursor | tool | URL not stated | Agent-based IDE |
| GPT-5.4 | model | URL not stated | Model cited for high reasoning |

## Actionable Mapping

| Concept | Noah RN Touchpoint | File/Area | Priority | Notes |
|---------|-------------------|-----------|----------|-------|
| Pointer-based skills | Clinical Router | `plugin/agents/clinical-router.md` | Medium | Instead of injecting full clinical context, the router should point sub-agents to specific `knowledge/` files to avoid polluting context. |
| Automated validation loops | Tests | `tests/clinical-calculators/` | Low | Consider using a Ralph-like loop for automatically running our clinical calculator test fixtures when tweaking tool scripts. |

## Strategic Implications

- Advanced agent orchestration relies heavily on bypassing full context windows. We must ensure our `knowledge/` references (like `mimic-mappings.json` or `drug-ranges.json`) are selectively read by tools rather than dumped into the LLM context.

## Suggested Deep Dives

1. **Pointer-Based Knowledge Retrieval** — Investigate how to adjust the `clinical-router.md` so it uses pointer files to delegate to sub-skills rather than carrying the entire patient context across all hops.
2. **De-slopping the Codebase** — Run an AI slop cleaner skill over the existing calculator bash scripts to look for simplifications.

## Related Reports

- None yet.

## Metadata

- Full transcript: ~/university/ray-fernando/2026-04-01-100k-stars-in-a-day-i-found-the-founders-sigrid-jin-bellman-RpFh0Nc7RvA/transcript.md
- Source quality: medium — competent practitioners, unscripted interview
- Ingestion method: ingest.sh + whisperx (tower GPU)