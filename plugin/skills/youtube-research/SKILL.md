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

- The transcript is the canonical source artifact. Research interprets it.
- Deterministic layer (poll + ingest) is separated from generative layer (research + report).
- Cross-reference prior reports to build cumulative knowledge graph.
- This skill does NOT make architectural decisions — it surfaces knowledge for CEO to delegate.
- This skill does NOT modify project code — it produces research artifacts only.

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

```bash
bash ~/university/tools/ingest.sh \
  --url "https://youtube.com/watch?v=$VIDEO_ID" \
  --profile ~/university/tools/whisperx_tower_profile.yaml
```

**Always use the tower GPU profile** (`whisperx_tower_profile.yaml`) — the tower (10.0.0.184) has an RTX 4060 Ti and handles transcription significantly faster than local CPU. If tower is unreachable, ingest.sh will fall back to CPU automatically.

Check exit code on each call. On failure: log a warning with VIDEO_ID and error, skip that video, continue to next. Do not abort the batch.

### Phase 3: Analyze

Read the transcript from `~/university/<channel-slug>/<date-title-slug>/transcript.md`.

Extract 3-5 key segments — timestamped, most relevant passages AND read the full transcript for inclusion in the report.

Focus on:
- Novel techniques or tool announcements
- Architectural patterns
- Clinical/healthcare relevance to noah-rn

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
relevance_score: 1-5
relevance_rationale: "<one line>"
---

## TL;DR

<one paragraph>

## Key Transcript Segments

> [MM:SS] <timestamped excerpt 1 — most relevant passage>

> [MM:SS] <timestamped excerpt 2>

> [MM:SS] <timestamped excerpt 3>

## External References

| Name | Type | URL | Notes |
|------|------|-----|-------|
| <project/tool/model/skill name> | repo / tool / model / skill / framework / service | <URL if stated or findable> | <brief context on what it is and why it was mentioned> |

Capture every project, repository, tool, model, skill, library, framework, or service mentioned in the video. Types: `repo`, `tool`, `model`, `skill`, `framework`, `service`, `paper`, `dataset`, `standard`. If a URL was stated in the video, use it. If not stated but the project is well-known (e.g., a GitHub repo), find and include the canonical URL. If unfindable, leave URL blank and note "URL not stated".

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

- Full transcript: ~/university/<channel>/<slug>/transcript.md
- Source quality: <rating> — <rationale>
- Ingestion method: ingest.sh + whisperx (tower GPU)

## Full Transcript

<complete transcript text from ~/university/<channel>/<slug>/transcript.md>
```

### Phase 6: Index

Update `research/youtube/index.json`:

- Append to `"reports"` array: `{video_id, title, channel, published, ingested, tags, source_quality, relevance_score, report_path, related_report_ids}`
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
