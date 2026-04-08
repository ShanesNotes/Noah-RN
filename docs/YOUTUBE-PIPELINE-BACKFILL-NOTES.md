# YouTube Pipeline Backfill Notes: references.md Gap

## Overview
Per the `youtube-research` skill specification (Phase 3.5), the ingestion pipeline now produces a companion `references.md` file for every ingested video. This file extracts key entities, links, and citations mentioned in the video, keyed by timestamps rather than line indices.

## Current Status

### Videos WITH `references.md`
The following 2 videos have the canonical companion file:
- **kVPVmz0qJvY** (Nate B Jones 100x): `~/university/nate-b-jones/100x/references.md`
- **FtCdYhspm7w** (Nate B Jones 2.5B Leak): `~/university/nate-b-jones/2.5b-leak/references.md`

### Videos MISSING `references.md`
The following 5 videos require a backfill to generate the companion file:
- **hV5_XSEBZNg** (Nate B Jones Claude Mythos): `~/university/nate-b-jones/claude-mythos/references.md`
- **0cVuMHaYEHE** (Nate B Jones One File Format): `~/university/nate-b-jones/one-file-format/references.md`
- **4cuT-LKcmWs** (Nate B Jones AI Job Market Split): `~/university/nate-b-jones/ai-job-market-split/references.md`
- **61JUHDK-em8** (Matthew Berman Meta-Harness): `~/university/matthew-berman/meta-harness/references.md`
- **RpFh0Nc7RvA** (Ray Fernando 100k Stars): `~/university/ray-fernando/100k-stars/references.md`

## Backfill Options

1. **Option (a): Skill-Based Regeneration**  
   Run the `youtube-research` skill in a "references-only" mode for each missing video. This ensures consistency with the primary ingestion logic but may require re-downloading or re-processing metadata.

2. **Option (b): Lazy-Generation during Wiki Ingest (Recommended)**  
   The wiki builder already reads the raw `transcript.md`. It can be updated to extract references on-the-fly as it builds the knowledge base. This is the lowest-effort path as it leverages existing context and prevents redundant processing.

3. **Option (c): Standalone CLI Tool**  
   Write a utility that reads `segments.json` and `transcript.md` to emit `references.md` using timestamp extraction. This provides a clean separation of concerns but adds another tool to the maintenance surface.

## Recommendation
**Option (b)** is recommended. Since the wiki builder is the primary consumer of these transcripts, integrating the reference extraction into the ingest flow ensures that the wiki remains the "source of truth" while filling the gap lazily.

## Implementation Notes
- All backfilled files MUST use the **timestamp-keyed format** (e.g., `[02:15]`) rather than line-indexed markers, as per the Phase 3.5 specification in `SKILL.md`.
