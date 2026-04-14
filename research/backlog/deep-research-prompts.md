# Deep Research Prompts

Copy-paste prompt bank for external deep-research runs that should inform future Noah RN architecture and development.

This file is intentionally model-agnostic.
Use it with Gemini Deep Research, Claude research modes, or any comparable external research agent.

Use this file when you want:
- one bounded research packet per topic
- primary-source-heavy output
- conclusions that can drive repo decisions

Do not use this file as a dumping ground for finished research.
Completed research outputs should become separate files under `research/backlog/`.

## How To Use

1. Paste the shared preamble.
2. Paste exactly one packet prompt from this file.
3. If needed, add a short local note about why the packet is being commissioned now.
4. Save the output as its own file in `research/backlog/`.

## Shared Preamble

Use this at the top of each prompt:

```text
You are doing deep external research for an early-stage project called Noah RN.

Project posture:
- Noah RN is an agent-native clinical workspace harness for critical care nursing.
- It is not trying to be a generic healthcare chatbot or ambient scribe.
- The near-term goal is bounded bedside workflow support with explicit nurse review.

Current architecture snapshot:
- `packages/workflows/` holds authoritative workflow contracts.
- `packages/agent-harness/` is the routing and harness-consumer layer.
- `.pi/` is a bridge/scaffold surface, not the canonical source of runtime truth.
- `services/clinical-mcp/` is the agent-facing clinical workspace boundary for context assembly, timeline shaping, provenance, gap reporting, and tool-safe access.
- `services/sim-harness/` is the live simulation runtime boundary; agents should reach it only through `services/clinical-mcp/`.
- `clinical-resources/` is the curated runtime clinical knowledge surface.
- `evals/` and trace surfaces are the observability/evaluation lane.
- `apps/clinician-dashboard/` is a sidecar observability/prototyping surface, not the canonical clinician workspace.
- Medplum is the clinical workspace / FHIR backbone.

Project preferences:
- minimal surface
- dense context
- explicit contracts
- deterministic support wherever exactness matters
- metadata-first discovery where useful
- boring, legible runtime behavior
- no silent chart writes
- no hidden memory that changes behavior without clear boundaries

Important constraints:
- You do not have access to local repo files beyond what is stated in this prompt.
- Do not assume implementation details unless they are explicitly stated.
- Prefer primary sources: official docs, standards, architecture writeups, maintainer materials, technical talks, regulatory guidance, or public design references.
- Use secondary sources only when they add real synthesis or when primary sources are missing; label them clearly.
- Distinguish clearly between:
  - well-supported recommendations
  - plausible but weaker recommendations
  - open questions
- Avoid broad survey sprawl. Optimize for decisions Noah RN can act on.
- Use exact dates when a source or recommendation is time-sensitive.

Required output format:
1. Executive summary
2. Key external sources
3. Constraints and invariants Noah RN should respect
4. Architectural options
5. Recommended posture
6. First implementation slice
7. What to defer
8. Risks / tradeoffs
9. Concrete implications for Noah RN repo surfaces
10. Open questions
```

## Tier 1

### 1. `pi.dev` Integration Packet

Suggested output file:
- `pi-dev-integration-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate `pi.dev` as the harness foundation for Noah RN.

I want to know:
- what the core `pi.dev` primitives are
- which primitives belong at a project-level runtime/config layer
- which primitives belong in a harness/routing package
- what a minimal first adoption path looks like for a project that already has:
  - workflow contracts
  - deterministic tools
  - a separate clinical workspace boundary
  - metadata-first routing pressure
- how to avoid duplicating source-of-truth surfaces when introducing `pi.dev`
- what migration patterns exist for introducing `pi.dev` incrementally rather than all at once

Please focus on:
- official `pi.dev` docs and maintainer materials
- project structure conventions
- extension/skill/runtime boundaries
- discovery, routing, and contract patterns
- migration or adoption examples if they exist

Please answer specifically for a project that wants:
- `packages/workflows/` to remain authoritative at first
- `packages/agent-harness/` to stay the main consumer layer
- `.pi/` to remain bridge/scaffold until proven
- future runtime promotion without immediate full migration

End with:
- “What should live in `packages/agent-harness/` now”
- “What should stay in `.pi/` for now”
- “What should not be adopted yet”
```

### 2. Medplum Extension and Write-Back Packet

Suggested output file:
- `medplum-extension-writeback-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate the best architectural patterns for using Medplum as the clinical workspace backbone in an agent-native nursing workflow system.

I want to know:
- how Medplum Bots, Apps, and external services should be divided by responsibility
- best practices for OAuth2/client-credentials usage in machine-to-machine workflows
- how draft-vs-final clinical artifacts should be handled
- how nurse-approved write-back should work safely
- how DocumentReference, MedicationAdministration, Observation, Encounter, and Task patterns are commonly used in workflow-support systems
- what should stay outside Medplum versus what should be written back into Medplum
- how sidecar apps should relate to the Medplum UI

Please focus on:
- official Medplum documentation
- Medplum architecture and extension patterns
- FHIR R4 write patterns
- audit/provenance/write-approval patterns
- real examples of bots/apps/external service separation

Please answer specifically for a project that wants:
- Medplum as canonical clinical workspace
- `services/clinical-mcp/` as the external agent-facing boundary
- nurse-reviewed draft outputs before any persistence
- no silent chart writes
- sidecar UI only where Medplum-native surfaces are insufficient

End with:
- “Best boundary between Medplum, sidecar app, and `services/clinical-mcp/`”
- “Best write-back posture for draft clinical artifacts”
- “What not to build yet”
```

### 3. `clinical-mcp` Boundary Packet

Suggested output file:
- `clinical-mcp-boundary-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate what an agent-facing clinical workspace boundary should look like for bedside workflow systems.

The project wants a service that sits between the harness and the clinical workspace and is responsible for:
- context assembly
- timeline shaping
- gap reporting
- provenance
- context budgeting
- tool-safe access to clinical data

I want to know:
- what data should be exposed directly to agents versus hidden behind tools
- how context bundles should be structured for workflow use
- how missing data and uncertainty should be represented
- how provenance should be preserved in context bundles
- how to think about timeline assembly and event ordering
- how context-budgeting should be handled in clinical settings
- what MCP-style or tool-based patterns exist for exposing clinical context safely

Please focus on:
- primary technical sources
- architecture patterns for agent context services
- FHIR-to-agent boundary design
- retrieval/context-window management
- tool design and inspectability
- safety implications of over-exposing or under-exposing context

Please answer specifically for a project that wants:
- `services/clinical-mcp/` to be the only agent-facing clinical boundary
- agents to consume assembled context instead of querying the EHR directly
- explicit gaps instead of inferred missing facts
- deterministic support for exact lookups/checks
- a first bedside workflow anchored on structured handoff

End with:
- “Recommended context bundle shape”
- “Recommended gap/provenance model”
- “Recommended tool surface”
- “Top mistakes to avoid”
```

### 4. Memory Architecture Packet

Suggested output file:
- `memory-architecture-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate memory architecture patterns for an agent-native clinical workflow system.

The project is considering four tiers:
- encounter-local mutable canvas
- session memory
- longitudinal patient memory
- task-local agent memory

I want to know:
- what should persist at each tier
- what should remain mutable versus append-only
- what should never persist silently
- how to distinguish workflow state from conversation history
- how to preserve clinical safety and provenance when memory exists
- what minimal memory shape is sufficient for the first workflow
- what anti-patterns are common in healthcare/agent systems with memory

Please focus on:
- primary technical architecture sources
- agent-memory system design patterns
- workflow-state vs conversation-state distinctions
- safety/governance implications of persistence
- clinical documentation and review boundary issues

Please answer specifically for a project that wants:
- minimal first implementation
- explicit persistence rules
- no hidden behavioral state
- no silent promotion of drafts into durable memory
- a strong distinction between working state and canonical clinical record

End with:
- “Recommended four-tier boundary”
- “What the first workflow likely needs”
- “What should be deferred”
```

## Tier 2

### 5. Agent-Centric Clinical Resources / Lexicomp-Like Packet

Suggested output file:
- `clinical-resources-lexicomp-like-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate how to design a safe, agent-facing clinical drug reference layer with a Lexicomp-like capability profile.

The project is interested in a “Lexicomp-like” direction, but not vague product imitation. The real question is:
- what capabilities matter
- what data classes are required
- what provenance/freshness constraints exist
- what architecture is realistic for an internal agent-facing reference layer

I want to know:
- what the highest-value Lexicomp-like capability surfaces actually are for bedside nursing workflows
- which drug-reference artifact classes are essential, for example:
  - dosing
  - renal/hepatic adjustment
  - contraindications
  - adverse effects
  - interactions
  - IV compatibility
  - administration guidance
  - monitoring parameters
  - black box / high-risk warnings
  - pregnancy/lactation considerations
- what update cadence and freshness expectations exist for these artifact classes
- which parts are realistically mirrorable from public or licensable sources and which parts are not
- what other products or datasets matter as comparison points, for example:
  - Lexicomp
  - Micromedex
  - DailyMed
  - openFDA
  - RxNorm / RxClass
  - NLM / NIH drug resources
  - IV compatibility references
- what a safe provenance model looks like when agents consume drug reference data
- what retrieval/indexing patterns are appropriate for an agent-facing runtime drug reference layer
- what the likely legal/licensing boundaries are if a team says “mirror” but really wants an internal structured reference layer

Please focus on:
- official product documentation where available
- official public datasets and standards
- technical architecture implications, not product marketing
- operational differences between authoritative clinical reference content and public drug-label data

Please answer specifically for a project that wants:
- `clinical-resources/` as the runtime surface
- deterministic access where exactness matters
- provenance on every answerable claim
- explicit freshness metadata
- a path that may start with public/reference-safe data before any licensed expansion

End with:
- “Minimum viable Lexicomp-like capability set”
- “Public-data-first architecture”
- “Where licensed content becomes unavoidable”
- “Recommended Noah RN clinical-resources posture”
```

### 6. Simulation Wrapper Decision Packet

Suggested output file:
- `simulation-wrapper-decision-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate what Noah RN should wrap first in its clinical simulation harness and what it should intentionally ignore.

The project posture is:
- `services/sim-harness/` is a docs-first scaffold right now
- it should wrap existing open-source physiology/simulation engines rather than build physiology in-house
- agents should never talk to the sim-harness directly; access should flow through `services/clinical-mcp/`
- the first goal is a believable, inspectable ICU encounter loop, not a full simulation platform

I want to know:
- which existing open-source engines are strongest fits for:
  - emergent vitals
  - interventions and scenario progression
  - waveform generation or waveform-adjacent surfaces
  - programmatic control
  - realistic ICU workflows
- what the thinnest adapter architecture looks like
- what should be wrapped versus what should be treated only as a design reference
- what runtime shape best supports:
  - live demos
  - golden tests
  - accelerated eval runs
- what mistakes teams make when they overbuild the simulation lane too early

Please focus on:
- official engine docs
- public repos and technical docs for Pulse, BioGears, and adjacent simulation systems
- architecture writeups for programmatic simulation control
- licensing and operational fit

Please answer specifically for a project that wants:
- `services/sim-harness/` to stay a thin adapter layer
- Medplum/FHIR write-back into the same clinical workspace backbone
- waveform-capable encounters
- no direct agent-to-sim runtime boundary

End with:
- “Primary engine to wrap first”
- “Fallback or comparison engine”
- “What should remain reference-only”
- “Minimal sim-harness architecture”
```

### 7. Waveform Vision Packet

Suggested output file:
- `waveform-vision-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate how live waveform data should be exposed to agents so rhythm and hemodynamic claims are grounded in the raw surface rather than in metadata labels alone.

The project already believes:
- rhythm labels alone are unsafe as a single source of truth
- the agent should be able to inspect both numeric waveform samples and rendered waveform images
- the first use case is live simulated encounters, not retrospective MIMIC waveform analytics

I want to know:
- what waveform representations are most useful for agent consumption
- when numeric sample arrays are better than rendered images and vice versa
- what minimum lead coverage is clinically meaningful for ICU workflows
- what metadata must accompany waveform payloads so measurements are reliable
- what caching/buffer/window rules make sense
- what existing patterns exist for exposing waveforms through tools or APIs to AI systems
- what failure modes appear when teams expose only labels or only images

Please focus on:
- technical sources on waveform formats and clinical monitor conventions
- open-source simulation or monitor implementations
- agent/multimodal design patterns where a model consumes structured signals plus images
- safety implications of waveform exposure choices

Please answer specifically for a project that wants:
- `services/clinical-mcp/` to expose the waveform tool surface
- `apps/clinician-dashboard/` to be a downstream viewer, not the source of truth
- a workflow that can defend rhythm claims by pointing at the raw strip
- observability on whether a workflow actually inspected the waveform before making a claim

End with:
- “Recommended waveform tool contract”
- “Recommended minimum waveform payload”
- “Recommended visual-vs-numeric split”
- “Common silent-failure patterns to prevent”
```

### 8. Simulated Clinical Documentation Emergence Packet

Suggested output file:
- `simulated-clinical-documentation-emergence-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate how a high-fidelity clinical simulation can preserve the distinction between underlying patient reality, live monitor signals, time-released source facts, and the selectively charted/documented record.

The project posture is:
- Noah RN is trying to test agent-native bedside workflow in something closer to a real ICU/stepdown environment
- preloading the chart as if the encounter is already fully documented defeats much of the point
- monitor data may stream continuously while charting remains sparse, selective, order-driven, event-driven, and judgment-driven
- labs, notes, orders, and MAR events should appear on a simulated clock rather than as fully preloaded retrospective truth
- Medplum is the chart/EHR backbone, but the live sim should not collapse into “whatever is already in FHIR”
- `services/sim-harness/` should drive live encounter state, while `services/clinical-mcp/` remains the only agent-facing boundary

I want to know:
- what prior art exists for simulations that separate:
  - latent patient state
  - live device/monitor telemetry
  - time-released clinical events/results/notes/orders
  - selective chart/document capture
- what open-source systems, academic simulators, training platforms, digital-twin architectures, nursing informatics systems, or critical-care workflow simulators are most relevant
- which systems are worth emulating for:
  - monitor realism
  - timeline/event orchestration
  - documentation workflow realism
  - intervention modeling
  - chart-vs-monitor mismatch handling
  - artifact/noise modeling
- whether there are strong open-source examples of “documentation emergence” rather than fully pre-authored chart playback
- how real-world ICU/EHR/flowsheet systems handle the distinction between continuous telemetry, validated measurements, nurse-charted values, and order-driven documentation cadence
- what architectural patterns best support a simulated encounter where the agent must help decide what should be charted, when, and why
- what minimum viable first slice would preserve this ontology without overbuilding

Please focus on:
- official docs, public repos, maintainer writeups, academic papers, technical talks, standards docs, and training-system references
- clinical simulation platforms, physiology engines, monitor/device simulators, nursing informatics literature, EHR flowsheet/documentation workflow references, and telemetry-to-chart integration patterns
- open-source and inspectable systems first, but include especially important proprietary/reference systems if they are the clearest prior art
- architecture and workflow realism over glossy product marketing

Please answer specifically for a project that wants:
- Medplum as the chart backbone
- a Philips IntelliVue-like bedside monitor experience
- live monitor streaming plus selective documentation
- no silent chart writes
- agent support for bedside discernment and documentation relevance
- a future evaluation harness that can score what was charted, what was missed, what was over-charted, and whether timing/context were appropriate

End with:
- “Best prior-art systems or concepts to emulate”
- “Best open-source building blocks”
- “Recommended ontology for patient truth vs source facts vs charted record”
- “Minimum viable simulation slice”
- “Top architecture mistakes to avoid”
```

### 9. Eval and Observability Packet

Suggested output file:
- `eval-observability-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate what Noah RN should log, trace, and evaluate from day one for an agent-native clinical workflow system.

The project posture is:
- observability is not optional or late-stage
- `evals/` is the downstream evaluation lane
- workflow traces should help prove what context was seen, what tools were called, and what claims were grounded
- the first workflow filter is Shift Report

I want to know:
- what every workflow invocation should log
- which trace categories are most useful for debugging clinical agent behavior
- how context budget, retrieval selection, and tool reads should be represented
- how to tie eval failures back to architectural defects rather than just prompt defects
- what a good first measurement plan looks like for a workflow that assembles patient context and produces a draft artifact
- which open-source or standards-aligned observability patterns are worth copying

Please focus on:
- primary docs and architecture references for AI tracing/eval systems
- agent observability patterns
- healthcare-specific concerns around provenance, auditability, and PHI handling
- trace schemas that make workflow inspection concrete

Please answer specifically for a project that wants:
- `evals/` as the evaluation lane
- traceability for context inputs, tool calls, and source-backed claims
- lightweight first instrumentation, not a giant platform build
- future support for waveform-read verification and chart-write approval evidence

End with:
- “Minimum viable trace schema”
- “What to instrument immediately”
- “What to defer”
- “How eval findings should feed architecture decisions”
```

## Tier 3

### 9. Regulatory Architecture Packet

Suggested output file:
- `regulatory-architecture-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate which architectural choices preserve Noah RN’s intended human-in-the-loop clinical decision-support posture and which choices would push it toward a more regulated device category.

The project posture is:
- clinical excellence comes first; regulatory alignment should follow from good boundaries
- the near-term goal is nurse-reviewed draft support, not autonomous diagnosis or treatment
- no silent chart writes
- outputs should preserve independent clinical review

I want to know:
- which architectural patterns most strongly support a CDS-exempt or low-regret posture
- which patterns create regulatory risk, for example:
  - opaque autonomous recommendations
  - hidden state or memory
  - silent persistence
  - image-analysis claims
  - over-automation of interventions
- how current FDA CDS framing, provenance expectations, and human-review expectations affect system design
- what design records and guardrails are worth carrying from day one even if they are not yet legally required

Please focus on:
- official FDA guidance and other primary regulatory sources where relevant
- high-quality legal/regulatory commentary only where it clarifies implementation consequences
- architecture implications, not generic compliance summaries

Please answer specifically for a project that wants:
- nurse-reviewed draft artifacts
- explicit provenance and independent review
- a strong distinction between support tooling and final clinical judgment
- room for future expansion without accidentally crossing a line now

End with:
- “Architecture choices that preserve the current posture”
- “Design choices that create regulatory risk”
- “Minimum documentation/trace habits to adopt now”
- “Questions for future specialist review”
```

### 10. Source-of-Truth Ingestion Policy Packet

Suggested output file:
- `source-of-truth-ingestion-policy-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate what kinds of external documents should become first-class project references, what should remain external-only, and what should be manually distilled before use.

The project has multiple knowledge surfaces:
- `research/` as source corpus
- `docs/foundations/` for load-bearing architecture
- `clinical-resources/` for curated runtime knowledge
- `wiki/` for local synthesis

I want to know:
- what ingestion policy patterns work well for projects that mix research, runtime clinical resources, and architecture docs
- how to decide when a source belongs in:
  - source corpus only
  - distilled architecture packet
  - runtime clinical resource layer
  - metadata registry only
- what provenance and freshness metadata should be tracked at ingestion time
- how teams avoid turning raw corpora into accidental runtime truth
- what anti-patterns create stale or ambiguous source-of-truth surfaces

Please focus on:
- primary technical or documentation architecture sources
- knowledge management patterns for AI systems
- content-governance patterns where source classes have different trust and runtime implications

Please answer specifically for a project that wants:
- `research/` to remain non-runtime source corpus
- `docs/foundations/` to hold distilled architecture truth
- `clinical-resources/` to hold runtime-safe curated knowledge
- metadata-first discovery over prose-only sprawl

End with:
- “Recommended source classification policy”
- “Recommended promotion path between surfaces”
- “Metadata that should be mandatory”
- “Top source-of-truth failure modes to prevent”
```

### 11. Clinical Scenario Corpus Packet

Suggested output file:
- `clinical-scenario-corpus-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate how Noah RN should structure its next generation of realistic clinical scenarios for workflow development, simulation, and eval.

The project needs scenarios that can support:
- bedside workflow development
- live sim-harness encounters
- regression tests and golden-path evals
- future multi-step clinical workflow evaluation

I want to know:
- what a good scenario schema looks like for ICU nursing workflows
- how scenarios should separate:
  - patient baseline
  - timeline/events
  - interventions
  - expected observations
  - evaluation assertions
- how to keep scenarios clinically realistic without turning them into giant prose blobs
- how to support both static patient-context tests and live simulated encounter progression
- how scenario corpora are usually versioned, reviewed, and expanded

Please focus on:
- technical examples of simulation scenario design
- evaluation corpus design for agent systems
- healthcare simulation or clinical training references where helpful
- patterns that keep scenarios inspectable and testable

Please answer specifically for a project that wants:
- one artifact that can feed workflow tests and sim-backed demos
- scenario data that stays structured enough for deterministic evaluation
- a first workflow centered on Shift Report
- room for future waveform-aware and intervention-aware cases

End with:
- “Recommended scenario artifact shape”
- “What fields the first corpus must include”
- “How to separate scenario data from eval assertions”
- “How the corpus should grow over time”
```

## Special Interest: Open Medical Data

### 12. Open Medical Datasets Landscape Packet

Suggested output file:
- `open-medical-datasets-landscape-packet.md`

```text
[Paste shared preamble above]

Research task:
Map the current landscape of open, open-access, gated-access, synthetic, and otherwise reusable medical datasets that could matter to Noah RN over time.

This is not limited to psychiatric data. The goal is a broad but decision-useful map of what exists across Hugging Face and beyond.

I want to know:
- how many meaningful dataset families appear to exist as of the research date
- how those families break down by modality, for example:
  - structured EHR / FHIR / OMOP / claims
  - clinical notes and discharge summaries
  - labs, vitals, flowsheets, and time series
  - ECG / waveform / monitor data
  - medical imaging and imaging reports
  - drug / formulary / medication safety data
  - guidelines, public health corpora, and biomedical QA corpora
  - synthetic clinical data
- which dataset families are most relevant for Noah RN’s likely future needs:
  - clinical resources
  - eval scenarios
  - simulation seeding
  - structured retrieval corpora
  - future training or adaptation
- which datasets are truly open-redistributable versus only accessible under credentialed or gated research terms
- which sources are original canonical hosts versus downstream mirrors

Please focus on:
- primary dataset hosts and official docs
- Hugging Face dataset ecosystem where relevant
- PhysioNet, NIH/NLM/NCBI, FDA/openFDA, TCIA, CMS, Synthea, OHDSI/OMOP ecosystem, and other major public hubs
- current dataset status, access model, and licensing posture as of the research date

Please answer specifically for a project that wants:
- to understand what is out there before building a data ingestion lane
- to distinguish “downloadable now” from “interesting but gated”
- to preserve future optionality for retrieval, eval, simulation, and possible model adaptation

Required extra output:
- a table of the top dataset families with approximate counts and representative examples
- a table of the top 25 highest-value individual datasets or dataset families

End with:
- “Most relevant dataset families for Noah RN”
- “What is truly open vs gated vs synthetic”
- “Best near-term targets”
- “What is interesting but not worth touching yet”
```

### 13. Hugging Face And Beyond Medical Data Census Packet

Suggested output file:
- `huggingface-and-beyond-medical-data-census-packet.md`

```text
[Paste shared preamble above]

Research task:
Perform a practical medical-data census with Hugging Face as one surface, but not the only surface.

The goal is not just “find datasets.” The goal is to answer:
- what is actually on Hugging Face
- how much of it is original versus mirrored versus derivative
- what important medical datasets live elsewhere and should be treated as the canonical source instead

I want to know:
- how many medical/clinical dataset repos or major dataset families appear on Hugging Face as of the research date
- which Hugging Face datasets are:
  - original uploads
  - mirrors of canonical datasets
  - cleaned or transformed derivatives
  - benchmark-only artifacts
- which important medical datasets are largely absent from Hugging Face but matter anyway
- what the major non-Hugging-Face hubs are and how they compare
- which sources should be tracked at the original host instead of through HF mirrors
- what metadata is needed to deduplicate dataset families across hosts

Please focus on:
- Hugging Face Datasets
- canonical non-HF hosts
- dataset cards, licenses, access instructions, and update patterns
- practical acquisition implications rather than generic platform comparisons

Please answer specifically for a project that wants:
- a realistic census, not inflated counts caused by mirrors and duplicates
- canonical-source tracking
- future local archival or metadata-registry work

Required extra output:
- a “HF vs canonical host” matrix
- a deduplication rubric for counting dataset families instead of counting mirrors

End with:
- “What Hugging Face is actually good for here”
- “What should be sourced from canonical hosts instead”
- “Mirror-heavy zones to treat carefully”
- “Best census method Noah RN should reuse later”
```

### 14. Medical Dataset Acquisition And Local Archive Packet

Suggested output file:
- `medical-dataset-acquisition-and-local-archive-packet.md`

```text
[Paste shared preamble above]

Research task:
Design a practical acquisition and local-archive posture for public or reusable medical datasets Noah RN may want to keep locally for future use.

This is not just a storage question. It is also a licensing, provenance, reproducibility, and future-usability question.

I want to know:
- which classes of medical datasets should be downloaded now versus tracked as metadata only
- what local archive architecture makes sense for:
  - small structured datasets
  - very large time-series or imaging corpora
  - Hugging Face snapshots
  - canonical-host downloads
- how to store:
  - source URL
  - acquisition date
  - dataset version
  - license snapshot
  - access restrictions
  - checksums
  - modality tags
  - de-identification notes
  - intended-use notes
- how to handle gated or credentialed datasets without creating accidental redistribution or compliance problems
- how to think about deduplication, manifests, content-addressing, and storage tiers
- which tools or patterns are commonly used for reproducible local dataset archives

Please focus on:
- official dataset terms and access docs
- practical data-engineering patterns for dataset snapshotting
- storage/provenance strategies rather than generic MLOps fluff

Please answer specifically for a project that wants:
- a local corpus that can be reused later for eval, retrieval, scenario generation, or future adaptation work
- strong provenance and license traceability
- no accidental mixing of “safe to mirror” with “only safe to reference”

Required extra output:
- a mirrorability matrix:
  - safe to fully mirror
  - safe to store only metadata/manifests
  - gated or license-sensitive
  - likely not worth archiving
- a concrete local-folder/registry recommendation

End with:
- “What to download now”
- “What to track but not mirror”
- “What needs legal or policy review first”
- “Recommended Noah RN local archive posture”
```

### 15. Medical Data Leverage Packet

Suggested output file:
- `medical-data-leverage-packet.md`

```text
[Paste shared preamble above]

Research task:
Investigate how Noah RN could realistically leverage open or reusable medical datasets over time.

This should distinguish near-term use from future use. The project is not asking for a reckless “train on everything” plan.

I want to know:
- which dataset classes are best suited for:
  - eval sets
  - scenario generation
  - simulation seeding
  - clinical resource extraction
  - retrieval corpora
  - weak supervision
  - instruction tuning or continued pretraining
- what is realistic in the near term versus only sensible later
- which data uses create the most value without creating unnecessary risk
- which dataset classes are poor fits for model training but strong fits for eval or retrieval
- how to separate benchmark use from training use
- what pitfalls matter most for medical-data leverage:
  - leakage
  - benchmark overfitting
  - license mismatch
  - stale medical knowledge
  - de-identification overconfidence
  - modality mismatch with bedside workflow needs

Please focus on:
- primary sources and serious technical literature on clinical model training, evaluation, and dataset reuse
- practical examples of public medical datasets being used for training, eval, retrieval, or simulation
- architecture implications, not benchmark chest-beating

Please answer specifically for a project that wants:
- strong near-term focus on clinical resources, eval, and workflow support
- optional long-term paths for model adaptation
- explicit separation between “good for training,” “good for eval,” and “good for retrieval/reference”

Required extra output:
- a use-case matrix mapping dataset classes to:
  - eval
  - retrieval
  - scenario generation
  - simulation seeding
  - fine-tuning / continued pretraining
- a phased roadmap:
  - now
  - later
  - maybe never

End with:
- “Best near-term leverage for Noah RN”
- “Best backlog data bets”
- “What to avoid training on”
- “What becomes valuable only after the first workflow is solid”
```

## Current Recommendation

If only three external deep-research artifacts are commissioned next, start with:

1. `pi.dev` integration packet
2. Medplum extension and write-back packet
3. `clinical-mcp` boundary packet

If one near-term Tier 2 packet is pulled forward, choose:

4. agent-centric clinical resources / Lexicomp-like packet

If you want the best open-medical-data research cluster next, commission these in order:

5. open medical datasets landscape packet
6. medical dataset acquisition and local archive packet
7. medical data leverage packet
