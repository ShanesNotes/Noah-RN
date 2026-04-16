# Memory Layer Gap Analysis

## Scope

This document grounds Noah RN's memory-layer next steps in the repo's active control-plane docs, memory-specific foundation notes, current runtime seams, and local research corpus. It also compares those findings against current OpenClaw and Hermes Agent memory capabilities to identify what Noah RN should reuse, adapt, or reject.

Date of this pass: April 15, 2026.

## Corpus reviewed

### Control plane and active doctrine

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/ARCHITECTURE.md`
- `services/clinical-mcp/README.md`

### Memory and context foundation docs

- `docs/foundations/memory-layer-scaffold.md`
- `docs/foundations/memory-layer-first-batch.md`
- `docs/foundations/memory-tier-boundary.md`
- `docs/foundations/patient-context-bundle-contract.md`
- `docs/foundations/shift-report-output-boundary.md`
- `docs/foundations/shift-report-canonical-patient-path.md`
- `docs/foundations/wiki-architecture-readiness.md`
- `docs/foundations/metadata-registry-spec.md`
- `docs/foundations/observability-context-addendum.md`

### Current code seams

- `services/clinical-mcp/src/context/types.ts`
- `services/clinical-mcp/src/context/assembler.ts`
- `services/clinical-mcp/src/context/filters.ts`
- `services/clinical-mcp/src/context/temporal.ts`
- `packages/workflows/registry.json`

### Memory-specific research

- `research/Noah RN Memory Architecture Research.md`
- `research/Memory architecture for agent-native clinical workflows.md`
- `research/Designing the clinical context boundary.md`
- `research/Architectural foundations for an agent-native clinical workspace.md`
- `research/agent-orchestration/Orchestration topologies and federated memory for agentic AI in healthcare.md`

### Historical / salvage-only context

- `docs/reference/competitive-analysis.md`
- `wiki/entities/openclaw.md`
- `notes/nemoclaw-for-clinical-intelligence.md`

### External current references

- OpenClaw Memory Overview, Builtin Memory Engine, Honcho Memory, and Memory Wiki docs
- Hermes Agent GitHub README and release notes through `v2026.4.13` on April 13, 2026
- Honcho docs overview

## Executive read

Noah RN does not have a memory-layer strategy problem. It has a runtime execution gap.

The repo already made the important decisions:

- memory is not chat history
- memory has multiple tiers
- persistent patient memory must not be silently inferred or promoted
- `clinical-mcp` is a context boundary, not the memory system
- first workflow scope is narrow

What is missing is a real runtime that enforces those boundaries.

The best reusable open-source pieces are not "agent memory" in the broad sense. They are:

- local-first indexing and recall patterns from OpenClaw
- provider abstraction from Hermes
- claims / evidence / contradiction / freshness handling from OpenClaw `memory-wiki`

The things Noah RN should not adopt directly are just as important:

- generic cross-session user modeling for clinical state
- automatic promotion of remembered facts
- opaque hosted memory as a patient-truth layer
- treating conversation logs as clinical continuity

## What Noah RN already implements

### 1. A strong patient-context boundary

`services/clinical-mcp/src/context/assembler.ts` already does real work:

- loads patient, observations, conditions, meds, MAR, encounters, notes, and devices in parallel
- creates a normalized timeline
- computes relative time and trends
- emits explicit gaps
- applies a context-budget truncation policy

That is a good foundation for **selection** and partial **compression**.

### 2. Explicit memory doctrine

The foundation docs already define four runtime boundaries:

- encounter canvas
- session memory
- longitudinal patient boundary
- task-local agent memory

The same docs also already forbid silent promotion and generic chat-history substitution.

### 3. Metadata-first and context-primitive doctrine

`docs/foundations/wiki-architecture-readiness.md` and `docs/foundations/observability-context-addendum.md` already name the primitives Noah RN needs:

- write
- select
- compress
- isolate

This is the right vocabulary for the runtime. It just has not been attached to a memory package yet.

## What is still missing

### Gap 1: No encounter canvas runtime

The repo documents a Tier 1 encounter canvas, but there is no concrete store or lifecycle for it.

Missing pieces:

- canvas record shape
- draft / reviewed / approved transitions
- nurse-visible edit surface
- explicit promotion path
- close / discard / archive rules

### Gap 2: No session continuity runtime

The repo acknowledges session memory but currently has no bounded implementation for it.

Missing pieces:

- session-scoped storage
- expiry semantics
- summary / compaction rules
- explicit separation from clinical record

### Gap 3: No governed knowledge-memory layer

Noah RN has a large and valuable docs/research corpus, but retrieval is still mostly manual search plus human memory. That creates recurring doctrinal drift.

Missing pieces:

- searchable doctrine index
- evidence-backed claims layer
- contradiction tracking
- freshness review
- machine-facing compact digest

### Gap 4: No shared memory interfaces

Today, "memory" would be forced into ad hoc storage if implemented. There is no shared abstraction layer yet.

Missing pieces:

- `EncounterCanvasStore`
- `SessionMemoryStore`
- `TaskMemoryStore`
- `KnowledgeMemoryIndex`
- `MemoryPromotionPolicy`

### Gap 5: No memory observability

The repo wants explicit context engineering, but there is no runtime proof for:

- what memory was selected
- what was compressed
- what stayed draft
- what was promoted
- what was stale or contradictory

## OpenClaw and Hermes: what exists now

### OpenClaw

OpenClaw's current memory model is local-first and explicit:

- durable memory lives in Markdown files
- builtin memory indexes those files in per-agent SQLite
- search can use FTS5 keyword, vector, or hybrid retrieval
- Honcho can be added for cross-session memory and user modeling
- `memory-wiki` adds a provenance-rich wiki layer with claims, evidence, contradiction tracking, stale-page reporting, compiled digests, and dashboards

The strongest parts for Noah RN are the structural ones:

- local-first index
- deterministic recall surface
- compiled digest output
- claims/evidence model
- contradiction/freshness dashboards

### Hermes Agent

Hermes is now a broader agent platform with a pluggable memory-provider interface and current Honcho integration. Its recent release history also makes memory an explicit plugin surface rather than a hard-coded one.

The most relevant reusable idea is not Hermes' learning loop. It is the provider boundary:

- one memory API
- multiple backends later
- migration path from existing local memory

That abstraction is useful for Noah RN. The default behavior is not.

### Honcho

Honcho is compelling for cross-session context, user modeling, and observation search. But those strengths map much more naturally to:

- non-clinical user preference memory
- agent/operator continuity
- multi-agent coordination

They do not automatically justify use for patient-facing memory.

## Salvage matrix

| Capability | Noah RN current state | OpenClaw / Hermes pattern | Recommendation |
| --- | --- | --- | --- |
| Local-first durable recall | Missing for memory layer; repo uses manual files plus search | OpenClaw builtin SQLite + FTS5 + hybrid search | Reuse for doctrine / research memory first |
| Cross-session session continuity | Missing | Hermes provider abstraction; Honcho-backed recall | Add a thin local-first session store behind an interface |
| Patient encounter working memory | Missing | No direct clinical equivalent | Build repo-native encounter canvas; do not outsource the model |
| Knowledge claims and provenance | Missing as a runtime system | OpenClaw `memory-wiki` claims/evidence model | Reuse heavily for repo knowledge memory |
| Contradiction / freshness review | Missing | `memory-wiki` dashboards and linting | Reuse for docs/research governance |
| Background promotion | Missing | OpenClaw dreaming / flush; Hermes learning loop | Reject for clinical state; maybe later for doctrine suggestions only |
| User modeling | Missing | Honcho automatic profiles | Defer; only consider for non-clinical operator preferences |
| Multi-agent memory awareness | Missing | Honcho parent/child awareness | Defer until Noah RN actually needs multi-agent shared memory |
| Prompt supplement digest | Missing | `memory-wiki` compiled digests | Reuse for doctrine memory; useful for agent grounding |

## Recommended architecture split

### 1. Clinical memory plane

Purpose:

- encounter-local working state
- explicit reviewable draft artifacts
- no silent finalization

Recommended posture:

- build repo-native
- attach to `clinical-mcp` and nursing-station seams
- do not inherit generic agent-memory semantics

### 2. Session continuity plane

Purpose:

- short-horizon provider / workflow continuity
- session recovery and bounded recall

Recommended posture:

- local-first only
- clearly non-authoritative
- explicit expiry
- interface first, backend second

### 3. Knowledge memory plane

Purpose:

- searchable design doctrine
- research recall
- contradiction and freshness visibility
- high-signal digests for agents

Recommended posture:

- borrow OpenClaw-style local indexing
- borrow `memory-wiki`-style claims/evidence/dashboards
- keep it separate from patient memory

## Concrete build plan

### Phase 1: Create the interface layer

Add a future `packages/memory/` package with:

- `EncounterCanvasStore`
- `SessionMemoryStore`
- `TaskMemoryStore`
- `KnowledgeMemoryIndex`
- `MemoryPromotionPolicy`

This package should define types and lifecycle rules first, not commit to a backend.

### Phase 2: Implement encounter canvas for the canonical patient path

Start with the existing `patient-123` workflow.

The encounter canvas should:

- accept selected facts from `clinical-mcp`
- hold nurse-visible draft state
- encode explicit transitions
- never silently become longitudinal memory

### Phase 3: Add thin local session continuity

Use a local-first store with explicit session lifetime.

Good enough for first implementation:

- SQLite or file-backed local state
- summary records
- task linkage
- explicit session end cleanup

### Phase 4: Add doctrine knowledge memory

Index:

- `docs/`
- `research/`
- promoted `notes/` / `wiki` material when explicitly approved

Add:

- claims
- evidence references
- contradictions
- stale pages
- compact digest for agent grounding

### Phase 5: Add observability and linting

Every memory lane should expose:

- selection
- compression
- promotion
- omission
- lint status

## What Noah RN should explicitly not do next

1. Do not build a separate patient-truth memory database.
2. Do not adopt hosted memory as the default patient-memory backend.
3. Do not auto-promote remembered conversation content into clinical state.
4. Do not conflate repo knowledge memory with patient memory retrieval.
5. Do not import Hermes / OpenClaw learning loops wholesale.
6. Do not let memory files directly mutate workflow behavior without provenance and linting.

## Recommended next implementation target

If the team wants the highest-leverage next step, it is this:

1. create `packages/memory/` interfaces
2. implement encounter canvas for the `patient-123` path
3. add a separate doctrine knowledge-memory index for `docs/` + `research/`

That sequence builds the real missing boundaries without overcommitting to a backend.

## Remaining risks

- The repo may still be tempted to solve patient memory and doctrine memory with one system.
- Hosted cross-session memory will remain attractive before PHI rules are ready.
- If the encounter canvas is skipped, session memory may become a proxy for clinical state, which is the wrong architecture.

## External references

- OpenClaw Memory Overview: <https://docs.openclaw.ai/concepts/memory>
- OpenClaw Memory Wiki: <https://docs.openclaw.ai/plugins/memory-wiki>
- Hermes Agent repository: <https://github.com/NousResearch/hermes-agent>
- Hermes Agent releases: <https://github.com/NousResearch/hermes-agent/releases>
- Honcho docs: <https://docs.honcho.dev/>
