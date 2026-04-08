---
name: youtube-research
description: >-
  Poll the YouTube "gold" playlist for new videos, ingest via university pipeline,
  and produce project-contextualized research reports for noah-rn. Use when the
  Research Analyst agent runs its heartbeat loop, when asked to "research video",
  "youtube research", "process gold playlist", "ingest and analyze", or when
  checking for new videos to research.
---

> **Conventions**: This skill follows `plugin/CONVENTIONS.md` for trace logging. Clinical-specific conventions (disclaimers, provenance footer, acuity, clinical tiers) do not apply — this is an internal research skill. Confidence tiers below are research-specific overrides.

## Doctrine

- **`segments.json` (WhisperX raw output) is the canonical source.** `transcript.md` is a rendered view of it — regenerate, never hand-edit. Reports are non-canonical interpretations.
- **The downstream wiki builder (`noah-rn/wiki/`) consumes raw transcripts directly.** Do not synthesize, clean, or rewrite the transcript — the wiki builder handles all synthesis. Your job here is to produce a *research report* for humans, not to pre-chew the raw signal.
- Deterministic layer (poll + ingest + render) is separated from generative layer (research + report).
- Cross-reference prior reports to build cumulative knowledge graph.
- This skill does NOT make architectural decisions — it surfaces knowledge for CEO to delegate.
- This skill does NOT modify project code — it produces research artifacts only.
- **Never modify `transcript.md` or `segments.json`** under `~/university/`. They are immutable artifacts of the ingest tool.

## Pipeline

### Phase 1: Poll

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
source "$REPO_ROOT/tools/youtube-poll/config.env"
NEW_VIDEOS=$(bash "$REPO_ROOT/tools/youtube-poll/poll.sh" --playlist-id "$GOLD_PLAYLIST_ID")
```

If NEW_VIDEOS is empty, log "YouTube Research — playlist caught up. No new videos in gold playlist." and exit gracefully. This is the happy path for an empty queue — see Graceful Close-Out below.

### Phase 2: Ingest

For each line in NEW_VIDEOS (format: `VIDEO_ID|TITLE|PUBLISHED_DATE`):

Before invoking, classify the video as `solo` (single speaker monologue/talk), `multi_speaker` (interview/panel/podcast with 2+ distinct voices), or `unknown`. Pass it through:

```bash
bash ~/university/tools/ingest.sh \
  --url "https://youtube.com/watch?v=$VIDEO_ID" \
  --profile ~/university/tools/whisperx_tower_profile.yaml \
  --source-kind solo   # or multi_speaker / unknown
```

**Always use the tower GPU profile** (`whisperx_tower_profile.yaml`) — the tower (10.0.0.184) has an RTX 4060 Ti and handles transcription significantly faster than local CPU. If tower is unreachable, ingest.sh will fall back to CPU automatically.

The ingest tool produces a deterministic `transcript.md` with inline `[HH:MM:SS]` timestamps rendered from `segments.json`. Treat both files as immutable — never edit them.

Check exit code on each call. On failure: log a warning with VIDEO_ID and error, skip that video, continue to next. Do not abort the batch.

### Phase 3: Analyze

Read the transcript from `~/university/<channel-slug>/<date-title-slug>/transcript.md`. It already has inline `[HH:MM:SS]` timestamps at every paragraph.

Extract 3-5 key segments — timestamped, most relevant passages. Do NOT copy the full transcript into the report; the wiki builder reads it directly from `~/university/...`. The report only needs *excerpts* + analysis.

Focus on:
- Novel techniques or tool announcements
- Architectural patterns
- Clinical/healthcare relevance to noah-rn

### Phase 3.5: Extract References (companion file)

Write a companion `references.md` alongside the transcript at `~/university/<channel-slug>/<date-title-slug>/references.md`. Capture every named external resource spoken in the video — tool/project names, paper citations, person names, URLs stated aloud, benchmarks, datasets, frameworks.

Use **timestamps as the primary key**, not line numbers (line numbers drift if the transcript is re-rendered):

```markdown
---
video_id: "<id>"
extracted_at: "<ISO-8601>"
---

# References — <title>

| Name | Kind | Timestamp | Context |
|------|------|-----------|---------|
| OpenBrain | tool | [02:14] | mentioned while discussing memory hygiene |
| Karpathy's autoresearch | project | [08:47] | cited as prior art for LLM wikis |
| <name> | tool / project / paper / person / url / benchmark / dataset / framework | [MM:SS] | brief context |
```

Kind vocabulary: `tool`, `project`, `paper`, `person`, `url`, `benchmark`, `dataset`, `framework`, `model`, `service`, `standard`.

Idempotency: if `references.md` already exists, regenerate it — do not append. Overwrite is safe because the input (transcript.md) is deterministic.

### Phase 4: Research

Generate project-contextualized analysis in this order:

1. Read `docs/ARCHITECTURE.md` for current noah-rn project state and phase plan
2. Scan `plugin/`, `tools/`, `knowledge/` directories for feature inventory
3. Read `research/youtube/index.json` for prior reports and tag_graph
4. Extract all external references — every project, repo, tool, model, skill, framework, service, paper, or dataset mentioned. Find canonical URLs where possible. Produce External References table.
5. Map video concepts to specific noah-rn files, features, and open concerns — produce Actionable Mapping table
6. Identify strategic implications — what this means for project direction. Flag architectural decisions for CEO/other agents. Do NOT make them.
7. Suggest 2-4 deep dive directions with rationale for each
8. Find shared tags/concepts with prior reports — generate Related Reports cross-reference links
9. Assign `relevance_score` (1-5) with one-line rationale
10. Assign `source_quality` using this heuristic:
   - **high**: recognized expert, primary source, recent, with evidence
   - **medium**: competent practitioner, secondhand, or slightly dated
   - **low**: speculative, clickbait, unverified claims, outdated

### Phase 5: Write

Produce report at `research/youtube/YYYY-MM-DD-<title-slug>.md`:

```markdown
---
video_id: "<id>"
title: "<title>"
channel: "<channel>"
published: "<date>"
ingested: "<ISO-8601>"
tags: [<tags>]
source_quality: high|medium|low
source_kind: solo|multi_speaker|unknown
relevance_score: 1-5
relevance_rationale: "<one line>"
canonical: false
raw_transcript_path: "~/university/<channel>/<slug>/transcript.md"
references_path: "~/university/<channel>/<slug>/references.md"
segments_json_path: "~/university/<channel>/<slug>/transcript/source.json"
---

> **⚠ NON-CANONICAL AUTO-SUMMARY.** The raw transcript at `raw_transcript_path` is the
> source of truth. This report was produced by the research pipeline for human skimming
> and may omit structurally important content. The downstream LLM Wiki builder reads only
> the raw transcript, not this report.

## TL;DR

<one paragraph>

## Key Transcript Segments

> [MM:SS] <timestamped excerpt 1 — most relevant passage>

> [MM:SS] <timestamped excerpt 2>

> [MM:SS] <timestamped excerpt 3>

## External References

See the companion `references.md` at `references_path` for the full timestamp-keyed table. In the report, include only the **top 5-10 most strategically relevant** references with URLs:

| Name | Type | Timestamp | URL | Notes |
|------|------|-----------|-----|-------|
| <name> | repo / tool / model / framework / paper / dataset / standard | [MM:SS] | <URL if stated or findable> | <why it matters> |

Types: `repo`, `tool`, `model`, `skill`, `framework`, `service`, `paper`, `dataset`, `standard`. If a URL was stated in the video, use it. If not stated but the project is well-known, find and include the canonical URL. If unfindable, leave URL blank and note "URL not stated".

## Actionable Mapping

| Concept | Noah RN Touchpoint | File/Area | Priority | Notes |
|---------|-------------------|-----------|----------|-------|
| ... | ... | ... | ... | ... |

## Strategic Implications

- <implication>: <what it means for the project direction>

## Suggested Deep Dives

1. **<topic>** — <why this warrants further investigation, what we'd learn>
2. **<topic>** — ...

## Related Reports

- [<title>](<relative-path>) — shared concepts: <tag1, tag2>

## Metadata

- Raw transcript (canonical): `~/university/<channel>/<slug>/transcript.md`
- Segments JSON (immutable source): `~/university/<channel>/<slug>/transcript/source.json`
- References: `~/university/<channel>/<slug>/references.md`
- Source quality: <rating> — <rationale>
- Source kind: <solo|multi_speaker|unknown>
- Ingestion method: ingest.sh + whisperx (tower GPU) + deterministic render_transcript.py

**DO NOT** paste the full transcript into this report. The wiki builder reads directly
from `raw_transcript_path`. Duplicating it here wastes context and risks drift.
```

### Phase 6: Index

Update `research/youtube/index.json`. Each entry in the `"reports"` array must include:

```json
{
  "video_id": "<id>",
  "title": "<title>",
  "channel": "<channel>",
  "published": "<date>",
  "ingested": "<ISO-8601>",
  "tags": ["..."],
  "source_quality": "high|medium|low",
  "source_kind": "solo|multi_speaker|unknown",
  "relevance_score": 1,
  "canonical_report_path": "research/youtube/<date>-<slug>.md",
  "raw_transcript_path": "/home/ark/university/<channel>/<slug>/transcript.md",
  "segments_json_path": "/home/ark/university/<channel>/<slug>/transcript/source.json",
  "references_path": "/home/ark/university/<channel>/<slug>/references.md",
  "wiki_ingested": false,
  "related_report_ids": ["..."]
}
```

- `canonical_report_path` is the research report (marked `canonical: false` in its frontmatter — it exists for human skimming, not as a wiki source).
- `raw_transcript_path` is the source of truth for the downstream wiki builder.
- `wiki_ingested` defaults to `false`. The wiki pipeline flips it to `true` externally — **this skill never writes `true`**.
- Update `"tag_graph"`: for each pair of tags in this report, increment the co-occurrence count. Format: `{"tag1|tag2": count}`

### Phase 7: Mark

```bash
bash "$REPO_ROOT/tools/youtube-poll/poll.sh" --mark-processed "$VIDEO_ID"
```

### Phase 8: Notify

**8a. Post to own task thread** using the paperclip skill:

- Video title and channel
- Relevance score and rationale
- Top 3 actionable items from the mapping table
- Link to the report file
- If `relevance_score >= 4`: flag as "HIGH RELEVANCE — recommend priority review"

**8b. Create CEO review subtask** using the paperclip skill:

Create a Paperclip subtask assigned to the CEO agent (`8a9b7a27-d10b-4487-8754-c456c02e1d1d`):

- **Title**: `Review: <video title>` (prefix with `[HIGH RELEVANCE]` if `relevance_score >= 4`)
- **Parent**: the current Gemini research task that produced the report
- **Status**: `todo`
- **Description** must include:
  - Video title and channel
  - Relevance score + rationale
  - Top 3 actionable items from the mapping table
  - Report file path
  - Transcript file path (`~/university/<channel>/<slug>/transcript.md`)

This ensures the CEO gets a heartbeat wake and can review + delegate optimization proposals. Posting to your own thread alone is NOT sufficient.

## Tagging Vocabulary

Reuse from university: `agents`, `mcp`, `claude-code`, `prompting`, `rag`, `embeddings`, `infra`, `models`, `benchmarks`, `tooling`, `workflows`, `architecture`, `security`, `testing`, `deployment`, `local-models`, `fine-tuning`, `multimodal`, `voice`, `coding-agents`

Noah-rn specific: `clinical-ai`, `healthcare-infra`, `nursing-workflows`, `fhir`, `patient-safety`, `agent-orchestration`, `clinical-decision-support`, `ehr-integration`, `medical-knowledge`, `deterministic-tools`

## Confidence Tiers

- **Tier 1**: Direct quotes, published data, verifiable claims — present as fact with citation
- **Tier 2**: Inferred implications, reasonable extrapolations — label as "inferred" or "suggested"
- **Tier 3**: Speculative deep dives, emerging patterns — label as "speculative" or "exploratory"

## Boundaries

- Does NOT make architectural decisions — flags them for CEO delegation
- Does NOT modify project code or configuration
- Does NOT auto-apply learnings — surfaces knowledge for agents and humans to act on
- Transcripts may contain errors — verify specific claims before acting
- Cross-references are based on tag overlap, not semantic similarity

## Graceful Close-Out

When poll returns 0 new videos:

1. Log: "YouTube Research — playlist caught up. No new videos in gold playlist."
2. If running in loop context: return cleanly so loop.sh can sleep
3. If running standalone: report "Nothing to process" to user
