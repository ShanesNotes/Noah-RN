# Noah RN — Pending Work & Exploration Map

> Last updated: 2026-04-05
> Status: Active exploration phase. Shane taking days off — this document is the reference for future sessions.
>
> **⚠️ Read `docs/PHASED-ROADMAP.md` first.** (Updated 2026-04-07 after 6 new Opus PRD docs in `notes/`.) The roadmap groups the 25 exploration paths below into 8 broad categories of deep work with dependency ordering, source doc references, and entry points for different time budgets. This document is the detailed interview-seed library; the roadmap is the organizing structure.

---

## Completed Recently (April 5, 2026)

- [x] Medplum wiring: MCP server + dashboard retargeted from HAPI to Medplum with OAuth2
- [x] MIMIC-IV demo data load initiated into Medplum (running on tower, ~81K resources loaded as of 2:04pm)
- [x] load-mimic.sh fixed to use POST instead of PUT for Medplum compatibility
- [x] README restructured as dual-pillar platform (harness + simulated production environment)
- [x] Housekeeping: stale docs archived, broken references fixed, optimize-skill command added
- [x] Sprint planning: dependency chain analysis committed

---

## Exploration Paths for /deep-interview

These 25 paths are comprehensive candidates for `/deep-interview` sessions. Each includes a seed prompt. Ordered by proximity to current infrastructure (Tier 1) through to furthest-horizon product vision (Tier 6).

### Critical Path

**1 → 2 → 5 → 15**: Eval harness → Context architecture → Router v2 → Meta-harness loop. Everything else can run in parallel with this chain.

---

### Tier 1: Foundation — Unlocking What's Already Designed

#### 1. Dynamic Eval Harness & Golden Test Suite
The single biggest blocker. The meta-harness optimization loop, confidence calibration, skill quality measurement — all gated on this. 53 structural-only test cases exist. Research report lays out schema, veto logic, scoring rubric. Question: what's the minimum viable dynamic eval that produces a real signal without external model APIs?

**Interview seed**: "Design a dynamic eval harness for noah-rn clinical skills that can run locally without external API dependencies, score skill output against golden clinical scenarios, and produce traces the meta-harness optimizer can consume."

**References**: `research/meta-harness-research-report.md` §2, `research/meta-harness-optimization-strategy.md` §3, `tests/clinical/cases/`

---

#### 2. Encounter-Scoped Context Architecture
The Vervaeke "optimal grip" problem made concrete. MIMIC-IV is in Medplum. MCP server can query it. But no architecture for how a skill invocation assembles its context window from the FHIR store. When a nurse says "my septic patient in bed 4" — what gets pulled? How much history? Which observations? What gets compressed vs. presented raw?

**Interview seed**: "Design the context assembly layer between Medplum FHIR and noah-rn skill invocation — how encounter-scoped patient data flows into the model's working context, what gets retrieved, what gets compressed, and how context relevance is determined per skill type."

**References**: `research/Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare.md` §1-2, `research/medplum-deep-dive.md` §2

---

#### 3. Real-Time Vitals Simulation Layer (ResusMonitor + Medplum)
Bridge a physiological simulator to Medplum FHIR Observations in real-time. Transforms noah-rn from static reference tool to something that detects deterioration patterns.

**Interview seed**: "Design the real-time vitals streaming layer that connects ResusMonitor (or equivalent physiological simulator) to Medplum FHIR Observations, enabling noah-rn skills to react to live patient monitor data with configurable alert thresholds and trend detection."

**References**: `research/Medplum-data-enrichment.txt` §3, `research/Streaming Inference Fabric & Real-Time Clinical Integration for Agentic AI.md` §3

---

#### 4. MIMIC-IV-Note Integration (Clinical Narratives as DocumentReference)
Structured MIMIC-IV data is loading. Narratives (H&P, progress notes, discharge summaries) from MIMIC-IV-Note give encounters their clinical texture. Map to DocumentReference resources linked to FHIR Encounters.

**Interview seed**: "Design the pipeline to load MIMIC-IV-Note narratives into Medplum as encounter-linked DocumentReference resources, enabling clinical skills to operate against real de-identified physician documentation alongside structured FHIR data."

**References**: `research/Medplum-data-enrichment.txt` §1

---

### Tier 2: Intelligence Layer — The Agent Gets Smarter

#### 5. Clinical Router v2: Context-Aware Multi-Skill Orchestration
Evolve from static intent mapping to context-aware orchestrator. Mount Sinai study proves orchestrated multi-agent sustains 90.6% accuracy where single agents collapse to 16.6%. Nate B Jones video gives metadata-first registry pattern.

**Interview seed**: "Evolve the clinical-router from static intent mapping to a context-aware orchestrator that decomposes complex clinical queries into multi-skill workflows, manages shared encounter state, and synthesizes outputs — informed by the Mount Sinai multi-agent topology findings and Claude Code's metadata-first registry pattern."

**References**: `research/Clinical AI Nursing Workflow Replication.md`, `research/youtube/2026-04-03-anthropic-2-5-billion-leak.md`, `plugin/agents/clinical-router.md`

---

#### 6. Workflow State Persistence for Multi-Step Clinical Protocols
Clinical protocols (sepsis bundles, ACLS, RSI) are multi-step, time-sensitive, interruptible. If the model loses state on which bundle steps are complete, the skill becomes useless on resume.

**Interview seed**: "Design a workflow state persistence layer for multi-step clinical protocols (sepsis bundle, ACLS, RSI) that survives session interruptions, tracks which protocol steps have been completed, and resumes with full encounter context."

**References**: `research/youtube/2026-04-03-anthropic-2-5-billion-leak.md` (workflow state), `research/Orchestration topologies and federated memory for agentic AI in healthcare.md` §2

---

#### 7. Confidence Calibration System
Three-tier model defined in ARCHITECTURE.md but not measured or enforced. Need ECE, Brier scores, reliability diagrams. UI patterns from Calibrated Trust report.

**Interview seed**: "Design a confidence calibration system that tags every skill output section with a measured confidence tier (1/2/3), validates calibration against golden test cases, and provides the meta-harness optimizer with calibration error metrics as a feedback signal."

**References**: `research/meta-harness-research-report.md` §3, `research/Calibrated Trust CDS Component Design.md`

---

#### 8. MEGA-RAG for Clinical Evidence Retrieval
How do curated protocols, live FHIR patient data, drug reference APIs, and clinical guidelines compose into a unified retrieval pipeline?

**Interview seed**: "Design noah-rn's clinical evidence retrieval architecture — how curated protocol knowledge, live FHIR patient data, drug reference APIs, and clinical guidelines compose into a unified MEGA-RAG pipeline that skills can query with encounter-scoped clinical questions."

**References**: `research/Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare.md` §2-4

---

### Tier 3: Product Surface — What the Nurse Actually Touches

#### 9. React Native Mobile App (Medplum Expo Stack)
The project is literally named "noah-rn" (React Native). Medplum provides `@medplum/core`, `@medplum/react-hooks`, `@medplum/expo-polyfills`. A mobile-first bedside tool.

**Interview seed**: "Design the React Native mobile application for noah-rn using Medplum's Expo stack — patient selection, encounter-scoped context display, skill invocation (voice and text), and copy-paste-ready clinical output rendered for bedside use on a phone or tablet."

**References**: `research/medplum-deep-dive.md` §2 (expo-polyfills, react-hooks)

---

#### 10. Ambient Voice Pipeline for Clinical Documentation
The only AI pattern with universal clinical adoption (100% of health systems have adoption activity). Nurse talks through assessment, noah-rn structures it. Removes work instead of adding it.

**Interview seed**: "Design an ambient voice documentation pipeline for noah-rn where the nurse narrates a bedside assessment and noah-rn structures it into shift-report format using the existing skill architecture — covering STT model selection, latency budget, clinical terminology handling, and the draft-review safety pattern."

**References**: `research/Streaming Inference Fabric & Real-Time Clinical Integration for Agentic AI.md` §2, `research/Clinical workflow integration and change management for agentic AI in healthcare.md` §1

---

#### 11. Four-Layer Output Rendering (Dashboard + Mobile)
Summary/Evidence/Confidence/Provenance is spec'd but no UI renders it. Progressive disclosure, linked evidence, NASA-TLX cognitive load constraints.

**Interview seed**: "Design the UI rendering of noah-rn's four-layer output format (Summary/Evidence/Confidence/Provenance) for both the React dashboard and React Native mobile — progressive disclosure, linked evidence highlighting, confidence tier visual indicators, and clinical readability optimization."

**References**: `research/Calibrated Trust CDS Component Design.md`, `knowledge/templates/four-layer-output.md`

---

### Tier 4: Safety & Evaluation — Proving It Works

#### 12. Clinical Red-Teaming Framework
94.4% prompt injection success in clinical LLMs. Doctronic OxyContin tripling. No adversarial testing framework exists for noah-rn.

**Interview seed**: "Design a clinical red-teaming framework for noah-rn that systematically probes skill outputs for prompt injection susceptibility, hallucination under adversarial clinical scenarios, omission of critical safety information, and confidence miscalibration — with every discovered failure automatically added to the golden test suite."

**References**: `research/Adversarial security and AI red-teaming for clinical systems.md` §2-3

---

#### 13. Hallucination Detection Pipeline for Clinical Output
Omission hallucinations (3.45%) are the most dangerous category. Can every skill output pass through a hallucination detection gate?

**Interview seed**: "Design a post-generation hallucination detection pipeline for noah-rn clinical skill output — selecting from RAGAS faithfulness, NLI verification, and MetaRAG patterns, with specific attention to omission detection for critical clinical information like contraindications and drug interactions."

**References**: `research/Clinical Safety, Evaluation & Guardrail Architectures for Agentic AI in Healthcare.md` §2

---

#### 14. MedAgentSim Scenario Orchestration for Evaluation
Scripted multi-hour clinical scenarios driving the eval harness. Patient deteriorating from sepsis over 6 hours with trending vitals, returning labs, pending cultures.

**Interview seed**: "Design the MedAgentSim scenario orchestration layer that drives multi-hour clinical evaluation scenarios through noah-rn — scripted patient deterioration patterns, time-series vitals injection, lab result staging, and multi-skill evaluation across the temporal arc of a clinical encounter."

**References**: `research/Medplum-data-enrichment.txt` §3 (ResusMonitor), `reference_medagentsim.md`

---

### Tier 5: Infrastructure & Optimization — Making It Sustainable

#### 15. Meta-Harness Self-Optimization Loop (Full Implementation)
The most developed research thread. Can the full propose→eval→validate→review loop run within Claude Code using subagents?

**Interview seed**: "Design the complete meta-harness self-optimization loop for noah-rn that operates within Claude Code's existing infrastructure — using subagents as proposers, the dynamic eval harness as scorer, and the skill file system as the optimization surface — without requiring external model APIs."

**References**: `research/meta-harness-optimization-strategy.md`, `research/meta-harness-research-report.md`

---

#### 16. Token-Efficient Skill Architecture
Skills are .md files loaded into context. A comprehensive sepsis skill + encounter context + FHIR data could blow past 32K tokens. How to architect for minimal consumption while preserving clinical completeness?

**Interview seed**: "Design a token-efficient skill architecture for noah-rn where skills load progressively based on clinical complexity — minimal tokens for simple queries, expanded context for complex multi-system assessments — with measurable token budgets per skill tier and graceful degradation for smaller models."

**References**: `research/youtube/2026-04-01-claude-mythos-changes-everything.md` (bitter lesson / simplification), `research/youtube/2026-04-01-100k-stars-in-a-day.md` (pointer-based skills)

---

#### 17. Model-Agnostic Harness Design (Local Inference Readiness)
What changes in skill architecture, tool calling, and context assembly to run on a 7B quantized model on tower's GPU?

**Interview seed**: "Design the model-agnostic abstraction layer for noah-rn that enables skills to run identically against Claude API, local Llama/Mistral via ollama, or Medplum bots — defining the minimum model capabilities required per skill tier, fallback routing when capabilities are insufficient, and graceful degradation patterns."

**References**: `research/Multimodal AI Architectures in Clinical Workflows.md`, `research/Fine-tuning, alignment & domain adaptation for clinical LLMs.md` §1

---

#### 18. Living Guideline Diff Engine (Knowledge Currency)
Clinical guidelines change. Knowledge/ directory is static Markdown. Can you build automated pipeline that detects updates, extracts deltas, and flags what needs to change?

**Interview seed**: "Design a living guideline monitoring system for noah-rn that watches AHA, SSC, AHA/ASA, and FDA sources for updates, extracts clinically relevant deltas, compares against knowledge/ protocol files, and generates pull requests for Shane to review when clinical content needs updating."

**References**: `research/Living Guideline Diff Engine Design.md`

---

### Tier 6: Platform & Ecosystem — The Bigger Picture

#### 19. Medplum Bot Integration for Server-Side Clinical Logic
Move deterministic logic (calculators, dosage validation, drug interactions) from bash scripts to Medplum Bots — TypeScript on FHIR events. Model-independent, always-on safety floor.

**Interview seed**: "Design the migration of noah-rn's deterministic clinical tools (calculators, dosage validation, drug interaction checks) from bash scripts to Medplum Bots — TypeScript functions that execute on FHIR Subscription events, providing always-on safety validation independent of the LLM layer."

**References**: `research/medplum-deep-dive.md` §2 (bot-layer package)

---

#### 20. A2A Agent Card & Cross-System Interoperability
Publish Agent Card at `/.well-known/agent.json` describing clinical capabilities. Noah-rn becomes a composable clinical intelligence service.

**Interview seed**: "Design noah-rn's A2A Agent Card and interoperability surface — how clinical skills are described as discoverable capabilities, what data contracts govern skill invocation from external agents, and how encounter context flows across system boundaries while maintaining the safety floor."

**References**: `research/Orchestration topologies and federated memory for agentic AI in healthcare.md` §3

---

#### 21. CDS Hooks Service (Epic/EHR Integration Path)
Expose a CDS Hooks service endpoint. EHR fires hook → noah-rn returns clinical decision support card within 500ms.

**Interview seed**: "Design noah-rn as a CDS Hooks service that responds to patient-view and order-sign hooks from FHIR-compliant EHRs — pre-computing clinical assessments from encounter data, returning structured cards within 500ms, and rendering four-layer output through SMART on FHIR app links."

**References**: `research/Clinical workflow integration and change management for agentic AI in healthcare.md` §2, `research/Calibrated Trust CDS Component Design.md`

---

#### 22. Federated Memory Architecture for Multi-Shift Context
Nursing is 12-hour shifts with handoff. How does noah-rn maintain patient context across shift changes?

**Interview seed**: "Design the shift-to-shift memory architecture for noah-rn — how clinical context from one nurse's shift persists as episodic memory, how handoff summaries are generated from accumulated encounter data, and how the incoming nurse's context window is pre-loaded with the clinically relevant subset."

**References**: `research/Orchestration topologies and federated memory for agentic AI in healthcare.md` §2

---

#### 23. Clinical Knowledge Graph (Neo4j + FHIR)
MediGRAF achieved 100% recall with zero safety violations on MIMIC-IV using Neo4j + vector embeddings. Should noah-rn build a KG alongside its FHIR store?

**Interview seed**: "Design a clinical knowledge graph for noah-rn using Neo4j alongside Medplum FHIR — mapping patient conditions, medications, contraindications, and clinical protocols as traversable relationships that support multi-hop clinical reasoning, drug interaction detection, and evidence-based pathway navigation."

**References**: `research/Orchestration topologies and federated memory for agentic AI in healthcare.md` §2, `research/Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare.md` §3

---

#### 24. Open-Source Community & Replication Framework
Can noah-rn be packaged so another ICU nurse can install the plugin, point at Medplum, load demo data, and have a working harness?

**Interview seed**: "Design the noah-rn distribution and replication framework — how another clinical professional installs the plugin, provisions a Medplum instance, loads demo data, and has a working clinical workspace harness with sensible defaults, configurable facility-specific rules, and a clear path to adding their own clinical knowledge."

**References**: `docs/ARCHITECTURE.md` (design principles #5), `infrastructure/docker-compose.yml`

---

#### 25. Nursing Education Mode
MIMIC-IV gives 100 real ICU patients. Skills encode expert pattern recognition. Scenarios can be scripted. Can noah-rn serve as a clinical education platform?

**Interview seed**: "Design a nursing education mode for noah-rn where students work through scripted MIMIC-IV-based ICU scenarios, practice shift assessments and protocol execution, receive structured feedback from the charge-nurse voice, and have their clinical reasoning evaluated against expert patterns."

**References**: No existing research — new product surface using existing infrastructure.

---

## New Work from 2026-04-08 (Post-Strategic-Briefing)

The following seeds were added after the April 8 strategic briefing introduced the dual-target runtime framing. These extend the 25 paths above; they don't replace them. Several of them overlap with existing paths but have more specific scope now that the target architecture is concrete.

### P0. Sandbox Portability Prototype (4 hours)
Not an interview seed — execution work. See `docs/TASKS.md` → Active A1. The 6-step experiment from `notes/noah-rn-strategic-agent-briefing.md` §2.2. Validates the dual-target hypothesis before any further investment in Cat. 1.

### P1. PHI De-Identification Pipeline — Healthcare-Specific Implementation
Supersedes and extends old path #12 (Red-Teaming) and adds the missing PHI infrastructure from Cat. 6. The old path was red-team focused; this one is engineering focused.

**Interview seed:** "Design the PHI de-identification pipeline for noah-rn using Microsoft Presidio as the primary NER engine + Philter as a second-pass validator. Include a custom `MedicalNERRecognizer` with SNOMED CT clinical allowlist (to suppress disease-surname collisions like Cushing/Addison/Graves/Marfan), reversible tokenization via Presidio encrypt/decrypt operators with a PostgreSQL token vault, Safe Harbor transformations on structured FHIR fields at ingestion, and output scanning as a safety net. Address the Jiang 2026 finding that clinical notes are inherently entangled with identity — the pipeline is necessary but insufficient, so design for defense-in-depth. Specify: MRN pattern detection, ICD-10/LOINC/RxNorm identifier handling, 42 CFR Part 2 substance abuse protection, MVA/trauma re-identification heuristics, indirect identifier detection in narratives, FF1/FF3-1 format-preserving encryption for structured fields, and the token vault PostgreSQL schema with encryption at rest, access logging, and key rotation. Include failure-mode handling for disease-surname collisions, medical abbreviation ambiguity, and PHI leakage through inference logs."

**References:** `notes/clinical intelligence pipeline.md` §Topic 1 (PHI de-identification deep research), `notes/noah-rn-strategic-agent-briefing.md` §2.1 barrier table, `docs/local/STRATEGIC-CONTEXT.md` "Custom PHI Patterns Required" section

---

### P2. Healthcare PHI Patterns for Sandbox Privacy Router
Specific to the sandbox runtime's privacy router configuration. Adjacent to P1 but focused on the infrastructure layer, not the application layer.

**Interview seed:** "Extend the sandbox runtime's privacy router `operator.yaml` configuration with healthcare-specific PHI detection patterns that the default NER model does not cover. Include: MRN regex patterns (facility-specific 6-10 digit formats with optional alpha prefix), ICD-10 diagnosis codes (`[A-Z]\\d{2}(\\.\\d{1,4})?`), FHIR resource identifiers (`Patient/[uuid]`, `Encounter/[uuid]`), LOINC observation codes (`\\d{1,5}-\\d`), RxNorm drug identifiers (RXCUI integers), and 42 CFR Part 2 substance abuse indicators. Design the validation harness that proves the privacy router correctly classifies and routes these patterns before any real PHI touches the sandbox. Also address the caveat from the nemoclaw-for-clinical-intelligence research that automatic per-query classification may be aspirational in the current alpha — so include an explicit validation step that verifies routing behavior against a known-PHI corpus before trusting it. Include a decision framework: when to route a query to local Nemotron vs when to de-identify and route to cloud inference."

**References:** `notes/nemoclaw-for-clinical-intelligence.md` §"Privacy routing and the PHI challenge", `notes/noah-rn-strategic-agent-briefing.md` §2

---

### P3. Dual-Format Artifact Conventions (SKILL.md + tool.json + handler.json)
Net new. Nothing in old map covered this because the dual-target framing is new.

**Interview seed:** "Design the dual-format artifact conventions for noah-rn that allow a single source artifact to satisfy both the sandbox runtime (OpenClaw-based) and the future production runtime (extension-packaged). The conventions must cover: SKILL.md YAML frontmatter schema (union of fields across runtimes, with `tags` derived from existing `scope` field), `tool.json` schema for deterministic tool registration (input/output types + bash implementation + exit code contract), context handler `handler.json` registration for safety hook lifecycle binding (pre_message / post_tool_use priorities and failure modes), UI tab registration (`tab.json` with React component reference), and MCP connector definition. Include the schema generators (`scripts/generate-manifest.js`, `scripts/generate-tool-schema.js`, `scripts/generate-handler-json.js`, `scripts/generate-tab-json.js`) that derive runtime-specific formats from the same source conventions. The goal is that any new skill, tool, or hook added to noah-rn automatically works in both runtimes without manual translation. Validate by running one existing skill through both runtimes with zero source-level changes."

**References:** `notes/noah-rn-strategic-agent-briefing.md` §4 "BUILD INSTRUCTIONS — PORTABLE ARTIFACT CONVENTIONS" and §5 build script template

---

### P4. NemoClaw Sandbox Clinical Blueprint + Hook Adapter
Specific to sandbox bring-up. Execution-heavy but benefits from a structured spec first.

**Interview seed:** "Design the noah-rn clinical blueprint YAML for the NemoClaw sandbox runtime. Must include: Landlock `compatibility: hard_requirement` (never silent fallback on pre-5.13 kernels), network policy `enforcement: enforce` (not the `audit` default), allowlisted domains (openrouter.ai, api.fda.gov, clinicaltables.nlm.nih.gov, localhost:8103 for Medplum, localhost:8000 for NeMo Guardrails proxy), filesystem writable paths (/sandbox/noah-rn, /sandbox/traces, /sandbox/results, /tmp), and inference provider configuration with OpenRouter free-tier models (qwen3-coder, gemma-3-27b, llama-4-scout — NEVER Claude per ToS). Also design the OpenClaw plugin that adapts existing noah-rn bash hooks: map `UserPromptSubmit → before_message`, `PostToolUse(Bash) → before_tool_call`, wrap via `execSync` with 5-second timeout, honor exit codes 0 (pass) / 1 (input error, block) / 2 (system error, fail loudly). Include a version pinning strategy with `PINNED-VERSION` file documenting commit SHA, pin date, and pin reason. Include healthcheck + smoke test protocol before running any real golden test against the sandbox."

**References:** `notes/noah-rn-strategic-agent-briefing.md` §2.2 step-by-step setup, `notes/nemoclaw-for-clinical-intelligence.md` barrier table, `docs/local/STRATEGIC-CONTEXT.md` §"NemoClaw Sandbox: Known Barriers"

---

### P5. Three-Layer Memory Architecture (Index / Topic / Transcript)
Extends old path #22 (Federated Memory) with the specific three-layer pattern from the Claude Code leak. This is the implementation pattern, not just the abstract memory hierarchy.

**Interview seed:** "Design noah-rn's three-layer memory architecture mirroring the pattern observed in the March 31 Claude Code leak: (L1) Index layer — cheap, always loaded (skill metadata registry + active patient census summary + recent clinical signals); (L2) Topic files — fetched on demand by routing agent (specific protocol knowledge when skill invoked + encounter-specific FHIR context when patient referenced + drug details when medication involved); (L3) Transcripts — never loaded directly, summarized by forked sub-agent when historical context needed (longitudinal patient history + prior shift notes + session traces). Specify the routing rules that determine which layer is consulted for what query, the summarization protocol for L3 (what forked sub-agent does, what format it returns), and the cache invalidation strategy when patient state changes. Map this to Letta's core memory / archival memory / recall memory primitives. Include a benchmark: token cost for each layer per typical clinical query."

**References:** `notes/noah-rn-strategic-agent-briefing.md` §1 "Three-Layer Memory Architecture (from leak)", `notes/agentorchastration.md` §"Letta memory mapping to 4-layer clinical model"

---

### P6. KAIROS / Persistent Agent Pattern for Clinical Monitoring
This extends old path #6 (Workflow State Persistence) with the specific persistent-daemon architectural pattern. This is about noah-rn running always-on against a patient census, not just resuming interrupted workflows.

**Interview seed:** "Design noah-rn as a persistent clinical monitoring agent inspired by the KAIROS pattern from the Claude Code leak. Core capabilities: periodic tick prompts at configurable intervals (e.g., every 15 minutes for stable patients, every 1 minute for critical), append-only daily log files per patient encounter for continuity, 15-second blocking budget preventing proactive actions from interrupting nurse workflow, background memory consolidation via forked sub-agent equivalent to AutoDream, and swarm orchestration for spawning capability-restricted child agents per patient when the census grows. The Jethro principle maps here: delegate routine monitoring to child agents, escalate to the parent only when next-level authority is required. Include the activation rules (which FHIR Subscription events trigger immediate attention vs which accumulate in the log for later review), the notification protocol (when and how the nurse is alerted), and the cognitive load governor that throttles notifications based on estimated provider state. Design to work in both the sandbox runtime (for testing against simulated FHIR events) and the future production runtime (for real-time deployment)."

**References:** `notes/noah-rn-strategic-agent-briefing.md` §1 "KAIROS — The Internal Precedent", old PENDING-WORK.md path #6

---

## YouTube Research Reports

Reports live in `research/youtube/`. Index at `research/youtube/index.json`. Pipeline spec at `.omc/plans/youtube-research-pipeline.md`.

Full transcripts in `~/university/<channel>/<slug>/transcript.md`.

---

## Background Processes

- **MIMIC-IV data load**: Running on tower (10.0.0.184). Check progress: `ssh tower 'ps aux | grep load-mimic'`
- **Medplum server**: Running at 10.0.0.184:8103

---

## Key References

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Design principles, phase plan, file structure |
| `research/meta-harness-optimization-strategy.md` | Self-improvement loop architecture |
| `research/meta-harness-research-report.md` | Eval harness design, golden test suite |
| `research/medplum-deep-dive.md` | Medplum SDK packages, integration patterns |
| `research/Medplum-data-enrichment.txt` | MIMIC-IV FHIR + ResusMonitor + MedAgentSim |
| `notes/Current state of agent.txt` | Shane's journal on agent development philosophy |
