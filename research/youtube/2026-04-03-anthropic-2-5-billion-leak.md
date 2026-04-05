---
video_id: "FtCdYhspm7w"
title: "I Broke Down Anthropic's $2.5 Billion Leak. Your Agent Is Missing 12 Critical Pieces."
channel: "AI News & Strategy Daily | Nate B Jones"
published: "2026-04-03T22:49:00Z"
ingested: "2026-04-04T00:33:22-04:00"
tags: ["architecture", "security", "claude-code", "agents"]
source_quality: high
relevance_score: 5
relevance_rationale: "Extracted 12 architectural primitives from Claude Code that map directly to our router and safety floor."
---

## TL;DR

An analysis of the leaked Claude Code repository reveals 12 core primitives of successful production agents. Key lessons include strict tool registries with metadata-first design, tiered permission architectures (with 18-module security for shell execution), robust session persistence recovering workflow state, and rigorous verification of harness changes.

## Key Transcript Segments

> [07:44] The registry should answer what exists and what does it do without executing anything so how does this look inside cloud code what i found is that cloud code maintains two parallel registries a command registry with 207 entries for user-facing actions and a parallel tool registry with 184 entries for model-facing capabilities

> [08:47] Claude segments its capabilities into three different trust tiers. built-in, always available, highest trust tier tools. There are plug-in tools, which are medium trust... And then there are skills, which are user-defined and are lowest trust by default.

> [13:32] When you resume a conversation, it is not the same thing as resuming a workflow... A workflow state answers, what step are we in? What side effects have happened as a result of that workflow?

## External References

| Name | Type | URL | Notes |
|------|------|-----|-------|
| Claude Code | tool | URL not stated | Reference architecture for agentic systems |
| Claude Mythos | model | URL not stated | New model referenced in recent Anthropic leaks |

## Actionable Mapping

| Concept | Noah RN Touchpoint | File/Area | Priority | Notes |
|---------|-------------------|-----------|----------|-------|
| Metadata-first Tool Registry | Skill Metadata Schema | `plugin/.claude-plugin/plugin.json` & `knowledge/templates/skill-metadata-schema.md` | High | Our metadata must be rich enough to allow the `clinical-router` to understand skills without executing them. |
| Three Trust Tiers | Hooks Architecture | `plugin/hooks/hooks.json` | High | Maps perfectly to our three-tier confidence model. We need to ensure local/user skills cannot bypass the deterministic safety hooks. |
| Workflow State | Shift Assessment / Sepsis | `plugin/skills/shift-assessment/` | Medium | Clinical workflows are long-running. If a nurse gets interrupted mid-assessment, we need a way to persist that state safely. |

## Strategic Implications

- Noah RN's architecture is on the right path with a strict division between deterministic tools and generative reasoning. We should adopt the idea of saving explicit workflow states for multi-step protocols like ACLS and Sepsis so interruptions don't cause data loss.

## Suggested Deep Dives

1. **Workflow State Persistence** — Evaluate how a clinical protocol (e.g., Sepsis bundle) could save a "checkpoint" state to a local JSON file to survive Claude Code restarts.
2. **Metadata Registry Audit** — Cross-check our `plugin.json` structure against the leaked Claude Code metadata schema to ensure compatibility.

## Related Reports

- None yet.

## Metadata

- Full transcript: ~/university/ai-news-strategy-daily-nate-b-jones/2026-04-03-i-broke-down-anthropic-s-2-5-billion-leak-your-agent-is-missing-12-critical-piec-FtCdYhspm7w/transcript.md
- Source quality: high — recognized expert, deep codebase analysis
- Ingestion method: ingest.sh + whisperx (tower GPU)