# Noah RN — Phased Roadmap (v0.2.1)

> Last updated: 2026-04-08 (Category 1 rewritten; other categories unchanged from v0.2.0)
> Purpose: Broad categories of deep work synthesized from 8 Opus PRD docs + existing 25-path exploration map
> Companion:
> - `docs/PENDING-WORK.md` — detailed interview seeds per exploration path
> - `docs/TASKS.md` — active dashboard (single session → next session continuity)
> - `docs/local/STRATEGIC-CONTEXT.md` — LOCAL ONLY strategic overlay (not committed)

## Changelog

- **v0.2.1 (2026-04-08):** Category 1 rewritten from "Foundation Migration" to "Dual-Target Runtime Portability" following strategic briefing. Sandbox runtime (OpenClaw-based) is now testing-only; a separate production runtime is the future distribution target. Strategic specifics live in `docs/local/` (LOCAL ONLY). All other categories unchanged.
- **v0.2.0 (2026-04-07):** Initial 8-category roadmap synthesized from 6 Opus PRD docs.

---

## The Shift in Framing

The 6 new docs in `notes/` represent a **maturation** of the project's self-understanding. The most important change for the roadmap:

**OLD framing (PENDING-WORK.md, April 5):** noah-rn is a Claude Code plugin with clinical skills.

**NEW framing (Opus docs, April 7):** noah-rn is a **clinical intelligence layer** composed on top of open-source infrastructure — OpenClaw (agent runtime) + Medplum (FHIR platform) + Letta (memory) + NeMo Guardrails (safety middleware). The Claude Code plugin is **one delivery surface**, not the product boundary.

This reframes several things:
- "Model-agnostic harness design" moves from Tier 5 nice-to-have to **foundation of everything**
- A whole new work stream appears: **migration from Claude Code → OpenClaw stack** (5-6 weeks in the agentorchestration doc)
- Two entirely new work areas appear that weren't in the old map: **PHI de-identification pipeline** and **provider census memory** (blackboard architecture)
- The knowledge layer gets a massive expansion: ontologies, KG construction, hybrid retrieval (ontology-grounded RAG)
- Observability is elevated to a day-one concern (Langfuse + token tracking)

---

## Source Documents

The 6 `notes/` docs map to this roadmap as follows:

| Doc | Purpose | Primary categories it feeds |
|-----|---------|-----------------------------|
| **Noah RN North Star v0.2.0** | Canonical vision | All categories (identity, principles) |
| **Noah RN Architecture v0.2.0** | Build plan, file structure | Cat. 1, Cat. 3 |
| **noah-rn-prd-v0.2.0** | PRD with 4 dev vectors (A/B/C/D) | Cat. 1, Cat. 2, Cat. 4, Cat. 5 |
| **agentorchestration.md** | OpenClaw + NeMo + Letta composition | Cat. 1 (primary), Cat. 5, Cat. 6 |
| **clinical intelligence pipeline.md** | PHI, census memory, observability | Cat. 5, Cat. 6, Cat. 7 |
| **noah-rn-knowledge-architecture.md** | Ontology/KG/RAG catalog | Cat. 4 (entirely) |

---

## The 8 Broad Categories of Deep Work

Each category is "sit down and work on this for days-to-weeks at a time." They are **not strictly sequential** — several can run in parallel once the foundation is in place. But there IS a critical path, noted in §Dependency Graph below.

---

### Category 1: Dual-Target Runtime Portability

**What it is.** noah-rn produces a single source of portable artifacts (SKILL.md, deterministic bash hooks, MCP tools, React components, calculators) that target **two runtimes** from the same codebase:

1. **Sandbox/testing runtime** — an open-source agent harness (OpenClaw wrapped by NemoClaw) used for golden test suite evaluation, Meta-Harness-style harness optimization, and red-teaming. Runs with **non-Claude models only** (OpenClaw ToS forbids Claude in the sandbox). Free-tier access via OpenRouter (Qwen3-Coder, Gemma-3, Llama-4-Scout, Nemotron).
2. **Production runtime** — a future persistent agent platform with an extension packaging format. This is the distribution/marketplace target. A `scripts/build-*.sh` packaging script produces the extension artifact from the same source artifacts used in sandbox testing. Strategic details for this target live in `docs/local/STRATEGIC-CONTEXT.md` (LOCAL ONLY).

Claude Code remains the current dev harness. NemoClaw is **additive** (sandbox). The production runtime is **additive** (future distribution). There is no migration away from Claude Code; there is a broadening of the runtimes that the same source artifacts must satisfy.

**Why it matters.** Every other category assumes runtime portability. If you build a PHI pipeline, provider census, and knowledge graph on Claude Code primitives alone, you've coupled the clinical intelligence layer to one orchestration runtime. The architectural guardrail: *"Does this work in both the sandbox runtime and the production runtime?"* If the answer is no, redesign until it does.

**Source docs:**
- `notes/noah-rn-strategic-agent-briefing.md` (LOCAL ONLY — dual-target strategy, bring-up playbook, packaging script template)
- `notes/nemoclaw-for-clinical-intelligence.md` (LOCAL ONLY — NemoClaw barriers, privacy router gaps, model selection)
- `notes/agentorchastration.md` (LOCAL ONLY — composition architecture reference; Category 1 of the original framing)
- `docs/local/STRATEGIC-CONTEXT.md` (LOCAL ONLY — the bridge doc that reconciles this category with the strategic briefing)

**Sub-work items:**

*Sandbox bring-up:*
- Install NemoClaw, pin to specific commit SHA, document in `infrastructure/nemoclaw/PINNED-VERSION`
- Verify Landlock kernel ≥5.13 and set `compatibility: hard_requirement` (never silent fallback)
- Set network policies to `enforcement: enforce` (NOT the `audit` default)
- Create clinical blueprint (`nemoclaw-blueprint/noah-rn-clinical.yaml`) with free-tier OpenRouter models, deny-by-default networking, allowlisted domains
- Copy 9 existing SKILL.md files to `~/.openclaw/skills/noah-rn/` — schemas align but may need `tags` field derivation from existing `scope` field
- Configure MCP server bridge via `~/.openclaw/openclaw.json` (MCP lives upstream in OpenClaw, not in NemoClaw)
- Wire existing bash safety hooks as OpenClaw plugin: map `UserPromptSubmit → before_message`, `PostToolUse → before_tool_call` (wrap via `execSync` with 5s timeout, honor exit codes 0/1/2)
- Integrate NeMo Guardrails as separate app-layer proxy on port 8000 (NemoClaw's "NeMo" branding refers to infrastructure guardrails only — the Colang content guardrails are a separate library)
- Run one golden test encounter end-to-end and capture trace

*Portable artifact conventions:*
- Design SKILL.md YAML frontmatter schema that works in both runtimes (ensure `tags` field is present for routing portability)
- Design `tool.json` schema for deterministic tools (input/output types + bash implementation + exit code contract)
- Design context handler JSON registration format for safety hooks (lifecycle, failure mode, bypass allowed)
- Design webhook registration format for future event-driven activation (FHIR Subscription triggers)
- Build `scripts/generate-manifest.js`, `scripts/generate-tool-schema.js`, `scripts/generate-handler-json.js`, `scripts/generate-tab-json.js` — schema generators from single source conventions
- Build `scripts/build-*.sh` packaging script (target format details are LOCAL ONLY)

*Model routing decisions:*
- Sandbox free-tier: Qwen3-Coder / Gemma-3-27b / Llama-4-Scout via OpenRouter
- PHI local: Nemotron 3 Super 120B A12B on DGX Spark (mandatory GPU) OR Nemotron 3 Nano 30B A3B (24GB VRAM) — NOT Ollama (broken in OpenShell 0.0.10, GH #385/#314). Use vLLM or NVIDIA NIM instead.
- Hard constraint: **no Claude models in the sandbox** (OpenClaw ToS)

*Known barriers with workarounds:*
- Ollama local routing broken — use vLLM/NIM
- No MCP in NemoClaw — configure in upstream OpenClaw
- No NeMo Guardrails integration despite branding — deploy separately as app-layer proxy
- No hook system in NemoClaw — wrap existing bash via OpenClaw plugin
- Alpha instability — pin commit SHAs, budget sandbox maintenance time
- Sandbox escape via 130-step chains — acceptable sandbox-only risk, NOT acceptable for production PHI

**Phased sub-plan:**
1. **Prove portability** (4 hrs) — prototype experiment: one SKILL.md + one MCP tool + one bash hook running under the sandbox runtime with a free-tier model. Go/no-go gate.
2. **Sandbox bring-up** (1 week) — full NemoClaw install, clinical blueprint, all 9 skills running, MCP wired, hooks wired
3. **Portable conventions** (1-2 weeks) — design dual-format schemas (SKILL.md, tool.json, handler.json), build schema generators
4. **NeMo Guardrails proxy** (1 week) — separate app-layer Colang rails wrapping existing bash hooks
5. **Golden test in sandbox** (1 week) — run golden test suite against MIMIC-IV encounters using free-tier models, capture traces
6. **Packaging script** (1 week) — `scripts/build-*.sh` producing the production-runtime extension format from same source

**Dependencies:** None — this is the root. The prototype experiment is the highest-leverage 4 hours in the project. If NemoClaw sandbox fails, evaluate Hermes Agent as alternative (4 more hours).

**Estimated session size:** 5-6 weeks of focused work. Go/no-go decision in 4 hours. Full sandbox + conventions + first golden test run in 2-3 weeks.

**Hard constraints (do not violate):**
- No Claude models in the sandbox (OpenClaw ToS)
- Every artifact must work in both runtimes — if a design choice couples to one runtime, redesign
- Do not build production-runtime-only features that don't also work in the sandbox
- Do not commit strategic/platform-specific details to GitHub — those live in `notes/` and `docs/local/`
- Deterministic bash hooks are the irreducible safety floor; they survive every runtime change

**Risks to watch:**
- NemoClaw alpha instability — pin commit SHAs
- SKILL.md YAML schema drift between runtimes — prototype validates this specifically
- Privacy router PHI coverage gaps — default patterns miss MRN, ICD-10, FHIR IDs, 42 CFR Part 2
- Local PHI inference requires NVIDIA GPU hardware — DGX Spark or equivalent mandatory
- Production runtime may ship differently than forecasted — keep packaging layer thin and disposable
- OpenClaw community governance — MIT license means fork is always possible

---

### Category 2: Data & Eval Foundation

**What it is.** Load MIMIC-IV on FHIR into Medplum, build the MCP context assembly layer against it, and construct the eval harness that scores skills against real ICU trajectories. This is the critical path blocker for Vector B in the PRD.

**Why it matters.** Synthea cannot produce physiologically coherent ICU trajectories. The old exploration map had #1 (Dynamic Eval Harness) as Tier 1, and the PRD explicitly names this as the #1 blocker: *"Data quality. Synthea cannot produce physiologically coherent ICU trajectories. Until realistic encounter data flows through context assembly, eval results are unreliable and downstream work is speculative."*

**Source docs:**
- `notes/noah-rn-prd-v0.2.0.md` §Vector B
- `notes/Noah RN Architecture v0.2.0.md` (FHIR platform section)
- `notes/clinical intelligence pipeline.md` §Topic 3 (evaluation metrics)
- Existing `research/Medplum-data-enrichment.txt`

**Sub-work items:**
- MIMIC-IV on FHIR v2.1 NDJSON → Medplum bulk load (already in progress on tower)
- MIMIC-IV-Note narratives → DocumentReference resources (mapping from `Medplum-data-enrichment.txt` §1)
- MCP server retarget from HAPI :8080 → Medplum :8103 with auth (status: dev, per PRD)
- Dashboard SDK swap from direct FHIR client to `@medplum/core`
- Real-time vitals simulation layer (ResusMonitor → Medplum Observations)
- Dynamic eval harness that runs skills against MIMIC-IV encounters and scores output against golden rubrics
- Golden test suite expansion from 53 structural cases to 100-150 trajectory-grounded cases
- MedAgentSim scenario orchestration for multi-hour deterioration scenarios
- Maps to old exploration paths **#1, #2, #3, #4, #14**

**Phased sub-plan:**
1. **Load & Wire** — complete MIMIC-IV load, retarget MCP and dashboard to Medplum
2. **Context Assembly** — build encounter-scoped context retrieval (Category 3 overlaps)
3. **Dynamic Eval** — skills run against real encounters, output scored against golden rubrics
4. **Scenario Orchestration** — multi-hour temporal scenarios for meta-patient evaluation

**Dependencies:**
- Can start immediately in Claude Code (doesn't require Cat. 1 migration first)
- But interface contracts should be designed portable from day one
- Cat. 3 (context architecture) overlaps heavily — often worked together

**Estimated session size:** 3-4 weeks of focused work to reach first dynamic eval signal; ongoing golden test expansion thereafter.

---

### Category 3: Context Architecture

**What it is.** The encounter-scoped context assembly layer — how patient FHIR data, clinical knowledge, and provider state compose into the model's working context per skill invocation. This is the Vervaeke "optimal grip" problem from your journal made concrete.

**Why it matters.** The new docs elevate this to the **primary design surface**. North Star v0.2.0: *"Context architecture is the primary design surface."* PRD principle 1: *"noah-rn is a clinical workspace where patient data, nursing knowledge, and agent orchestration converge. Context architecture is the primary design surface."*

**Source docs:**
- `notes/Noah RN North Star v0.2.0.md` (context assembly as core mechanism)
- `notes/noah-rn-prd-v0.2.0.md` §Vector A (skill metadata) + §Vector B (context assembly)
- `notes/clinical intelligence pipeline.md` §Topic 3 (category-tagged token counting, 100:1 ratio)
- Existing `research/Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare.md`

**Sub-work items:**
- Design the context assembly contract: `patient_id → structured context bundle` (timeline-ordered, trend-computed, gap-annotated)
- Decide what gets retrieved, what gets compressed, what gets presented raw per skill type
- Token budgeting with category tags: `fhir_resource`, `rag_chunk`, `system_prompt`, `conversation_history`, `tool_result`, `tool_definitions`
- Critical ratio to track: FHIR tokens ÷ total context tokens (if patient data >40% of context, knowledge budget is squeezed)
- Prompt caching strategy (stable prefix, append-only context, offload large tool results to files)
- KV-cache hit rate as the single most important operational metric (10× cost difference cached vs uncached)
- Maps to old exploration paths **#2, #5 (Clinical Router v2), #16 (Token-Efficient Skill Architecture)**

**Phased sub-plan:**
1. **Define contract** — MCP tool `get_patient_context` interface stable, implementation evolves underneath
2. **Per-skill context profiles** — what does each skill need from the encounter bundle?
3. **Token budget instrumentation** — Langfuse category tags at assembly time (overlaps Cat. 7)
4. **Router v2** — context-aware multi-skill orchestration informed by assembled context

**Dependencies:**
- Blocked by Cat. 2 (need real data flowing through)
- Feeds Cat. 4 (knowledge retrieval adds to context budget) and Cat. 5 (memory layers determine what persists across contexts)

**Estimated session size:** 2-3 weeks for contract + instrumentation; ongoing refinement as skills mature.

---

### Category 4: Knowledge Infrastructure

**What it is.** The structured clinical knowledge layer — ontologies as graph backbone, curated content as RAG corpus, deterministic tools as computational ground truth, knowledge graph construction for multi-hop reasoning. This is PRD Vector C, and the new `noah-rn-knowledge-architecture.md` doc is an exhaustive 536-line catalog of every source.

**Why it matters.** The old exploration map had this as #8 (MEGA-RAG) and #23 (Clinical Knowledge Graph) as isolated paths. The new doc shows they're the **same category** — both require the same ontology backbone (SNOMED CT + RxNorm + LOINC) and the same hybrid retrieval architecture. The Meta-Harness finding that harness engineering produces 6× performance gaps means knowledge architecture matters more than model selection.

**Source docs:**
- `notes/noah-rn-knowledge-architecture.md` (entire, 536 lines)
- `notes/noah-rn-prd-v0.2.0.md` §Vector C
- Existing `research/Living Guideline Diff Engine Design.md`
- Existing `research/Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare.md`

**Sub-work items:**
- **Ontology layer:** Load SNOMED CT (US Edition), RxNorm, LOINC, ICD-10 into Neo4j as graph backbone
- **Drug pipeline:** OpenFDA + DailyMed SPL + RxNav for interactions + DrugBank CC0 subset for structures (watch license boundaries — DrugBank Full is CC-BY-NC, blocks commercial)
- **Guidelines layer:** NICE (only machine-readable society guideline, OGL license) + manually encoded AHA/SCCM/ATS as deterministic artifacts with provenance
- **RAG corpus:** PMC OA (primary, JATS `<sec>` chunking) + IBCC (ICU depth, CC-BY-SA) + DailyMed SPL (drug labels) + NICE (structured)
- **Hybrid retrieval:** Dense (BGE or MedCPT) + sparse (BM25) + graph traversal (Cypher) with agent-mode routing
- **Knowledge graph construction:** SNOMED CT + MIMIC-IV integration pattern (proven: 625k nodes, 2.1M relationships, 5.4-48.4× faster than Postgres)
- **Living guideline engine:** Automated update detection with human-on-flag review (research complete, implementation not started)
- **Knowledge freshness provenance:** Extend current `FRESHNESS.md` pattern to all new sources
- **License red flags to avoid:** StatPearls (ND blocks chunking), DrugBank Full (NC blocks commercial), NANDA/NIC/NOC (paid), APACHE IV (proprietary Cerner), Trissel's (proprietary, no open alternative)
- Maps to old exploration paths **#8 (MEGA-RAG), #18 (Living Guideline Diff Engine), #23 (Clinical Knowledge Graph)**

**Phased sub-plan:**
1. **Ontology Backbone** — SNOMED CT + RxNorm + LOINC into Neo4j
2. **Drug Pipeline Completion** — OpenFDA/DailyMed/RxNav/DrugBank CC0 integrated behind `drug-lookup` tool contract
3. **RAG Corpus** — PMC OA + IBCC ingested with JATS-aware chunking
4. **Hybrid Retrieval** — dense + sparse + graph traversal with routing
5. **Living Guideline Monitor** — NICE API polling, manual AHA/SCCM flagging, human-on-flag review
6. **Knowledge Graph Integration** — MIMIC-IV patients linked to ontology backbone for trajectory reasoning

**Dependencies:**
- Cat. 3 (context architecture) — knowledge retrieval is a context source, must fit within token budgets
- Cat. 2 (MIMIC-IV data) — patient data links to ontology nodes
- Independent of Cat. 1 (portable across runtimes via the knowledge retrieval interface contract)

**Estimated session size:** 6-8 weeks, probably the biggest category. Can be split: ontology + graph (3-4 weeks) → RAG corpus (2-3 weeks) → living guidelines (1-2 weeks). Each sub-phase is valuable independently.

---

### Category 5: Memory Architecture

**What it is.** Multi-layered clinical memory — ephemeral encounter state, patient longitudinal history, provider census state (the NOVEL work), and clinical knowledge ground truth. Letta is the recommended memory backend (maps cleanly to the 4-layer model). Provider census is a first-principles architectural contribution drawing from CRM, ATC, military C2, and blackboard patterns.

**Why it matters.** Old exploration map had #22 (Federated Memory for Multi-Shift Context) as a single Tier 6 path. The new `clinical intelligence pipeline.md` doc §Topic 2 expands this into **the most research-heavy and novel architectural work in the entire project** — 50+ pages of analysis on provider cognitive load, blackboard architectures, and the specific mapping to Letta's Conversations API. This is where noah-rn becomes *more than a single-patient tool.*

**Source docs:**
- `notes/clinical intelligence pipeline.md` §Topic 2 (primary, ~15 pages on census memory)
- `notes/agentorchastration.md` §Letta memory mapping to 4-layer clinical model
- `notes/noah-rn-prd-v0.2.0.md` §Vector D

**Sub-work items:**
- **Layer A (Ephemeral Encounter):** Letta core memory blocks labeled `current_encounter` — chief complaint, vitals, assessment, plan
- **Layer B (Patient Longitudinal):** Letta archival memory per patient + Graphiti for temporal graph (old facts invalidated but retained; K+ trajectory reasoning)
- **Layer C (Provider Census):** THE NOVEL WORK. Blackboard architecture with per-patient task queues + priority-sorted provider overlay + event-driven interrupt layer + cognitive load governor
- **Layer D (Clinical Knowledge):** Letta filesystem for guidelines + archival memory for indexed rules (overlaps Cat. 4)
- **Letta Conversations API integration:** one agent per nurse, one conversation per patient, shared census memory block
- **Mem0 for graph memory:** patient-provider-medication-diagnosis relationships, multi-hop reasoning
- **Event sourcing underpinning:** every state change as immutable event in append-only log, FHIR R4 event types as the schema
- **Hybrid queue architecture:** multilevel feedback queue (Q0 STAT preemption → Q4 admin idle-time)
- **Priority inversion handling:** priority inheritance, critical sections ("no-interrupt zones"), aging
- **Cognitive load formula:** `CognitiveLoad = Σ(per_patient)[w₁·acuity + w₂·pending + w₃·time_pressure + w₄·interruption_freq + w₅·complexity]` calibrated against NASA-TLX
- Maps to old exploration paths **#6 (Workflow State Persistence), #22 (Federated Memory for Multi-Shift Context)**

**Phased sub-plan:**
1. **Single-patient Letta conversation** — core memory blocks for patient context and task queue (simplest viable)
2. **Multi-patient census** — shared memory block + priority merge overlay
3. **Event-driven interrupts** — FHIR Subscriptions → census state changes
4. **Cognitive load estimation** — adaptive interrupt thresholds
5. **Handoff summarization** — from event-sourced census state

**Dependencies:**
- Cat. 2 (FHIR events need a source to subscribe to)
- Cat. 3 (context architecture — memory layers feed and are fed by working context)
- Ideally Cat. 1 done first (Letta integrates more cleanly with OpenClaw than Claude Code)

**Estimated session size:** 4-6 weeks for Layers A+B; Layer C (provider census) is its own 3-4 week research+build sprint; Layer D merges with Cat. 4.

**Risks:**
- Letta's Conversations API is not thread-safe for concurrent writes — census updates must be serialized
- Shared memory blocks are last-write-wins — structure as JSON with agent-specific sections and timestamps
- Cognitive load estimation is inherently approximate — present as guide, not ground truth, validate against nurse self-assessment

---

### Category 6: Safety & Privacy (PHI, Guardrails, Red-Teaming)

**What it is.** The safety wrapper around everything else: PHI de-identification pipeline for data flowing into LLM context, NeMo Guardrails middleware layer above the bash hook floor, adversarial red-teaming, hallucination detection. PHI handling is called out in the PRD as *"required — not yet implemented."*

**Why it matters.** The old map had red-teaming (#12) and hallucination detection (#13) as Tier 4. The new docs elevate **PHI de-identification** to a foundational requirement (the PRD lists it as research-stage but necessary) and demonstrate that **safe harbor is fundamentally broken in the LLM era** (Jiang et al. 2026 — clinical notes are "inherently entangled with identity"). Defense-in-depth is the only viable strategy.

**Source docs:**
- `notes/clinical intelligence pipeline.md` §Topic 1 (PHI de-identification, entire)
- `notes/agentorchastration.md` §NeMo Guardrails composition
- `notes/noah-rn-prd-v0.2.0.md` §PHI handling (marked required, not implemented)
- Existing `research/Adversarial security and AI red-teaming for clinical systems.md`
- Existing `research/Clinical Safety, Evaluation & Guardrail Architectures for Agentic AI in Healthcare.md`

**Sub-work items:**
- **PHI de-identification pipeline** (net new from old map):
  - Primary NER engine: Microsoft Presidio with custom `MedicalNERRecognizer` + SNOMED CT clinical allowlist (suppress disease-surname collisions like Cushing, Addison, Graves, Marfan)
  - Second-pass validator: Philter for high-sensitivity contexts (99.9% recall)
  - Structured FHIR fields: Safe Harbor transformations at ingestion time in Medplum
  - Reversible tokenization: Presidio encrypt/decrypt operators with PostgreSQL token vault (FF1/FF3-1 format-preserving encryption via `ff3` Python library)
  - Query-time placement (primary) + ingestion-time Safe Harbor + output-time scanning (defense-in-depth)
  - Output scanning safety net: Presidio regex pass on LLM outputs
  - Failure modes to handle: indirect identifiers ("daughter Sarah"), disease-surname collisions, medical abbreviations, MVA/trauma re-identification risk
  - **Critical:** tokenized datasets with reversibility key are still PHI — vault carries same breach notification requirements
- **NeMo Guardrails middleware** (from agentorchestration.md L1 in composition stack):
  - 5 rail types: Input/Dialog/Retrieval/Execution/Output (maps to existing bash hooks + new LLM-level checks)
  - PII detection (GLiNER or Presidio) + jailbreak prevention (multi-layer) + clinical dialog rails (Colang flows for medication discussions)
  - Execution rails to validate tool inputs/outputs
  - IORails for parallel execution (latency budget: max 500ms total guardrail overhead)
  - Colang flows in `guardrails/rails/` — input.co, output.co, clinical.co, actions/clinical_validators.py (wraps existing bash hooks)
- **Bash hook preservation (L0 safety floor):** the 5 existing deterministic hooks survive all migrations — they are IRREDUCIBLE
- **Red-teaming framework:** systematic probing of skill outputs for prompt injection, hallucination, omission of safety-critical info, confidence miscalibration — every discovered failure becomes a golden test case
- **Hallucination detection pipeline:** RAGAS faithfulness (threshold >0.9 for clinical) + NLI verification + MetaRAG metamorphic testing (critical for omission detection)
- **SELF-RAG pattern:** lowest measured hallucination rate (5.8%) via self-reflective citation checking
- Maps to old exploration paths **#12 (Red-Teaming), #13 (Hallucination Detection Pipeline)** + new PHI pipeline work

**Phased sub-plan:**
1. **PHI Presidio baseline** — query-time de-identification with reversible tokenization for one skill (patient summary)
2. **Ingestion-time Safe Harbor** — structured FHIR fields scrubbed at Medplum entry
3. **NeMo Guardrails proxy** — deployed as OpenAI-compatible proxy, LLM calls routed through it
4. **Clinical Colang flows** — input rails, output rails, clinical dialog rails wrapping bash hooks
5. **Output scanning safety net** — residual PHI detection on all outputs
6. **Red-team campaign** — systematic adversarial probing, auto-generate golden test cases from failures
7. **Hallucination gates** — RAGAS faithfulness + omission detection gates on skill outputs before delivery

**Dependencies:**
- Cat. 1 (NeMo Guardrails integration is easier with OpenClaw than Claude Code)
- Cat. 2 (need data flowing to test PHI pipeline)
- Cat. 3 (PHI scrubbing happens at context assembly time)

**Estimated session size:** 3-4 weeks for PHI pipeline, 1-2 weeks for NeMo Guardrails integration, ongoing red-team campaigns. PHI is the critical blocker — can't go live with real patient data without it.

---

### Category 7: Observability & Optimization

**What it is.** Langfuse for tracing/cost/evaluation, category-tagged token counting, RAGAS for RAG quality metrics, Promptfoo/DeepEval for MCP tool evaluation, and the Meta-Harness self-optimization loop as the Phase 4+ horizon.

**Why it matters.** Old map had #15 (Meta-Harness Self-Optimization Loop) as an aspiration. The new `clinical intelligence pipeline.md` doc §Topic 3 establishes observability as a **day-one concern, not a Phase 4 nice-to-have**: *"you can't improve what you can't measure."* The 100:1 input-to-output token ratio and the 10× cost difference between cached/uncached tokens make context assembly the primary cost driver — which means you need instrumentation from the first skill invocation.

**Source docs:**
- `notes/clinical intelligence pipeline.md` §Topic 3 (observability, entire)
- Existing `research/meta-harness-optimization-strategy.md`
- Existing `research/meta-harness-research-report.md`

**Sub-work items:**
- **Langfuse self-hosted** (Docker Compose: PostgreSQL + ClickHouse + Redis + S3 in <5 min)
  - MIT license, explicit HIPAA compliance (SOC 2 Type II, ISO 27001, HIPAA cloud region with auto-applied BAA)
  - Auto-infers costs for OpenAI/Anthropic/Google, custom cost ingestion for others
  - Native MCP integration (Langfuse MCP server + `mcp-use` tracing)
  - LLM-as-a-Judge + custom evaluators + annotation queues + dataset management for golden sets
- **Token counting with category tags at context assembly:**
  - `fhir_resource` / `rag_chunk` / `system_prompt` / `conversation_history` / `tool_result` / `tool_definitions`
  - Dashboards show context budget allocation per skill invocation
  - Critical ratio: FHIR tokens ÷ total (if >40%, knowledge budget is squeezed)
  - Measure MCP tool definition overhead immediately (one benchmark: 72% of 200K context consumed by tool schemas alone)
- **Key day-one metrics:**
  - Input-to-output token ratio per skill
  - KV-cache hit rate per invocation
  - Context budget allocation per category
  - MCP tool definition token overhead (total + per tool)
  - Faithfulness per RAG-dependent skill (threshold >0.9)
  - Cost per skill invocation
  - Latency p50/p90/p99 per skill
- **RAG evaluation:** RAGAS (faithfulness, context recall, context precision, answer relevancy) + clinical-specific metrics (source traceability, abstention rate, MedRGB four dimensions)
- **MCP evaluation:** Promptfoo for tool call testing + DeepEval `MCPUseMetric`/`MCPTaskCompletionMetric` for MCP-specific scoring
- **Inspect AI for sandboxed agent safety evaluation** (used by Anthropic, DeepMind, METR, Apollo for safety evals)
- **Meta-Harness self-optimization** (Phase 4+):
  - Structured trace filesystem designed from day one (enables future self-optimization agent)
  - Proposer reads traces, diagnoses failures, proposes modifications, eval scores them
  - Can run within Claude Code using subagents (no OpenRouter dependency needed for MVP)
- Maps to old exploration paths **#15 (Meta-Harness Self-Optimization Loop), #16 (Token-Efficient Skill Architecture)**

**Phased sub-plan:**
1. **Langfuse deployed** — all LLM calls wrapped with `@observe()` decorators (Week 1-2)
2. **Token instrumentation** — category-tagged counts at context assembly (Week 1-2)
3. **RAGAS integration** — faithfulness/context metrics on RAG-dependent skills (Week 3-4)
4. **Promptfoo + DeepEval** — MCP tool evaluation in CI (Week 3-4)
5. **Grafana dashboards** — cost and context utilization alerts (Week 5-6)
6. **Meta-Harness trace format** — designed now even if optimization agent is built later (Week 5-6)
7. **Meta-Harness loop** (Phase 4+) — full propose→eval→validate cycle

**Dependencies:**
- Should happen EARLY — ideally in parallel with or slightly before Cat. 2 (Data & Eval Foundation), because you want instrumentation in place when real data starts flowing
- Cat. 3 (context architecture) feeds directly — token budget instrumentation is a deliverable of Cat. 3 and consumed by Cat. 7

**Estimated session size:** 2 weeks for day-one instrumentation; ongoing dashboard/alert refinement; Meta-Harness loop is a separate 3-4 week sprint when ready.

---

### Category 8: Product Surfaces

**What it is.** What the nurse actually touches. React Native mobile app on the Medplum Expo stack, ambient voice documentation pipeline, four-layer output rendering (dashboard + mobile), CDS Hooks service for EHR integration, and nursing education mode.

**Why it matters.** This is where noah-rn transitions from "developer tool" to "clinical product." The old map had #9 (React Native App), #10 (Ambient Voice Pipeline), #11 (Four-Layer Output Rendering), #21 (CDS Hooks Service), #25 (Nursing Education Mode) spread across Tiers 3 and 6. These cluster naturally into one category because they're all **delivery surfaces over the same underlying harness**.

**Source docs:**
- `notes/Noah RN Architecture v0.2.0.md` (modular UI on Medplum React components)
- Existing `research/Calibrated Trust CDS Component Design.md`
- Existing `research/Streaming Inference Fabric & Real-Time Clinical Integration for Agentic AI.md`
- Existing `research/Clinical workflow integration and change management for agentic AI in healthcare.md`
- Existing `research/medplum-deep-dive.md` (Expo stack packages)

**Sub-work items:**
- **React Native mobile app** (Medplum Expo stack: `@medplum/core`, `@medplum/react-hooks`, `@medplum/expo-polyfills`)
  - Patient selection, encounter-scoped context display, skill invocation (voice + text), copy-paste-ready output
  - PHI-compliant credential storage via `ExpoClientStorage` wrapping Expo SecureStore
- **Four-layer output rendering** (Summary/Evidence/Confidence/Provenance) for both dashboard and mobile
  - Progressive disclosure, linked evidence highlighting, confidence tier visual indicators (green/yellow/red traffic light per Calibrated Trust research)
  - NASA-TLX cognitive load constraints
- **Ambient voice pipeline:** STT (Deepgram Nova-3 Medical or self-hosted Whisper-large-v3 fine-tuned) → LLM routing → TTS (Cartesia Sonic 3 for <90ms TTFA)
  - Cascaded pipeline (not speech-native) for guardrail insertion points at text intermediary
  - Draft-review safety pattern (nurse never auto-commits to record)
- **CDS Hooks service** (patient-view, order-sign) for future EHR integration
  - 500ms response constraint → pre-computed inference cache pattern
  - SMART on FHIR app link cards for rich interaction
- **Nursing education mode:** MIMIC-IV-based scenarios, scripted deterioration, structured feedback from charge-nurse voice
- **Medplum Bot integration for server-side clinical logic:** migrate deterministic tools to TypeScript Bots on FHIR Subscription events (always-on safety floor independent of LLM layer)
- **A2A Agent Card at `/.well-known/agent.json`** for cross-system interoperability
- Maps to old exploration paths **#9, #10, #11, #19 (Medplum Bots), #20 (A2A Agent Card), #21, #25**

**Phased sub-plan:**
1. **Dashboard output rendering** — four-layer UI on existing React 19 dashboard (fastest feedback loop)
2. **React Native scaffold** — Expo stack with patient selection and context display
3. **Mobile skill invocation** — text first, voice later
4. **Ambient voice pipeline** — cascaded STT→LLM→TTS with draft-review safety
5. **Medplum Bots migration** — deterministic tools as server-side TypeScript
6. **CDS Hooks service** — EHR integration surface
7. **Nursing education mode** — scripted MIMIC-IV scenarios with feedback
8. **A2A Agent Card** — interoperability publication

**Dependencies:**
- Cat. 1 (portable runtime) — so skills can run server-side in Medplum bots and client-side in mobile
- Cat. 2 (data) — need real patient data for realistic product surfaces
- Cat. 6 (PHI + guardrails) — blocks mobile distribution without PHI pipeline working
- Cat. 3 (context architecture) — mobile displays whatever context assembly produces

**Estimated session size:** 4-6 weeks for mobile MVP, 2-3 weeks for voice pipeline, 2-3 weeks for CDS Hooks, 2 weeks for education mode. Substantial but can be prioritized by highest-value surface first (likely dashboard rendering → mobile).

---

## Dependency Graph

```
                    ┌───────────────────────────────────┐
                    │ Cat. 1: Foundation Migration       │
                    │ (OpenClaw + NeMo + Letta)          │
                    │ [4 hr go/no-go prototype first]    │
                    └────────┬──────────────────────────┘
                             │
                             │ (not strict dependency —
                             │  other work can start in
                             │  parallel if portable contracts)
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Cat. 2:         │ │ Cat. 7:          │ │ Cat. 4:         │
│ Data & Eval     │ │ Observability    │ │ Knowledge       │
│ Foundation      │ │ (from day one)   │ │ Infrastructure  │
│ [critical path] │ │                  │ │                 │
└───┬─────────────┘ └────────┬─────────┘ └──────────┬──────┘
    │                        │                      │
    │  ┌─────────────────────┘                      │
    ▼  ▼                                            │
┌─────────────────┐                                 │
│ Cat. 3:         │◄────────────────────────────────┘
│ Context         │
│ Architecture    │◄──────────────────────┐
└───┬─────────────┘                       │
    │                                     │
    ├─────────────────────┐               │
    ▼                     ▼               │
┌─────────────────┐ ┌──────────────┐      │
│ Cat. 5:         │ │ Cat. 6:      │      │
│ Memory          │ │ Safety &     │──────┘
│ Architecture    │ │ Privacy      │
│ (incl. novel    │ │ (PHI, NeMo,  │
│  provider       │ │  red-team)   │
│  census)        │ │              │
└────┬────────────┘ └───┬──────────┘
     │                  │
     └──────────┬───────┘
                ▼
     ┌─────────────────────┐
     │ Cat. 8:             │
     │ Product Surfaces    │
     │ (mobile, voice,     │
     │  CDS hooks,         │
     │  education)         │
     └─────────────────────┘
```

**Critical path (for clinical use with real data):**
1. Cat. 1 (prototype) → Cat. 2 (MIMIC-IV + eval) → Cat. 3 (context architecture) → Cat. 6 (PHI pipeline) → Cat. 8 (product surface)
2. Cat. 7 (observability) runs in parallel throughout — instrument from day one
3. Cat. 4 (knowledge infra) and Cat. 5 (memory) are additive quality upgrades — not blocking for basic clinical use but necessary for the product thesis

---

## Entry Points (When You Sit Down)

### "I have 4 hours"
**Run the OpenClaw portability prototype** from `notes/agentorchestration.md` — the 6-step experiment that validates SKILL.md + MCP + hooks portability. This single experiment determines whether Cat. 1 is a 5-week project or whether you stay on Claude Code and evaluate alternatives. It's the highest-leverage 4 hours in the whole project.

### "I have 1 day"
**Deploy Langfuse** (Cat. 7, Step 1) + wrap existing skills with `@observe()` decorators + implement category-tagged token counting. This gives you instrumentation for every subsequent experiment. Docker Compose deployment is <5 min; the integration work is the rest of the day. Everything you do afterward benefits from having these metrics.

### "I have 1 week"
**Context Architecture contract + MCP retarget to Medplum + first dynamic eval** (Cat. 2 + Cat. 3 overlap). Make the `get_patient_context(patient_id) → structured bundle` contract explicit. Retarget MCP server from HAPI :8080 to Medplum :8103. Run ONE skill against ONE MIMIC-IV encounter and score it. This is the smallest possible end-to-end loop that produces a real eval signal.

### "I have 1 month"
**PHI de-identification pipeline** (Cat. 6, Phases 1-3). Presidio baseline with reversible tokenization → Safe Harbor on structured FHIR fields → output scanning safety net. This is the single biggest missing capability before noah-rn can touch real patient data, and it unblocks product distribution (Cat. 8).

### "I have 3 months (a quarter)"
**The novel work: Provider Census Memory** (Cat. 5, Layer C). Blackboard architecture + event-sourced census state + cognitive load governor + multi-patient priority queue. This is the most research-heavy, most novel, and most publishable contribution in the entire roadmap. It's also what transforms noah-rn from a single-patient tool into something that matches how ICU nurses actually think.

---

## What's NOT in this Roadmap (Explicitly Deferred)

- **Regulatory certification pathway** — tracked in PRD but deferred. Compliance-ready, not compliance-driven.
- **Commercial EHR integration** — Mission 3 in PRD, explicitly labeled future
- **Fine-tuning a nursing-specific instruction model** — research gap identified in knowledge-architecture.md §8 but flagged as "potential open-source contribution opportunity," not current work
- **GEPA/Hermes self-evolution** — agentorchestration.md §L5 labeled "future — experimental"
- **NANDA/NIC/NOC nursing ontology** — proprietary, use ICNP open alternative instead

---

## Open Architectural Questions for Future Sessions

These surfaced across the 6 Opus docs but don't have resolved answers yet. Flag them when relevant:

1. **Which LLM serves the PHI-routed local path?** NemoClaw suggests Nemotron; Opus doc flags clinical reasoning quality concern. May need to benchmark Nemotron vs Claude on clinical test suite, or de-identify before sending to frontier model instead.
2. **Single Letta agent per nurse vs per patient?** Conversations API mapping says "one agent per nurse, one conversation per patient" but thread-safety warnings require careful census write serialization.
3. **How deep does the knowledge graph go before it's useful?** SNOMED CT alone is 350K concepts; full ontology load may be overkill for initial skills. Tier 1 (ICU-relevant subset) vs full load decision.
4. **Query-time vs ingestion-time vs output-time PHI?** Opus doc recommends all three (defense-in-depth) but order of implementation matters — query-time is the primary placement for agentic systems.
5. **At what point does noah-rn become portable enough to document as a reference implementation for other clinical domains?** Category 1 + stable interface contracts in Cat. 3 + portable knowledge layer in Cat. 4 are the preconditions.

---

## How to Use This Document

- **Day 1 of work time:** Read this doc. Pick a category. Open `docs/PENDING-WORK.md` for the detailed interview seeds on specific paths within that category.
- **Day N of work time:** Come back here to see where that work fits in the bigger picture. Check dependencies before starting something new.
- **When a category completes:** Update the phased sub-plan checkboxes (add them as you go) and note learnings in the relevant Opus notes file or a new research report.
- **When something unexpected happens:** Add to the "Open Architectural Questions" section above so the next session has context.

---

## Cross-Reference

- `docs/PENDING-WORK.md` — 25 detailed exploration paths with `/deep-interview` seed prompts (from April 5 session)
- `docs/ARCHITECTURE.md` — current file structure and phase checklists
- `notes/Noah RN North Star v0.2.0.md` — canonical vision
- `notes/noah-rn-prd-v0.2.0.md` — full PRD with 4 development vectors
- `notes/agentorchastration.md` — OpenClaw composition stack and migration plan
- `notes/clinical intelligence pipeline.md` — PHI, census memory, observability deep research
- `notes/noah-rn-knowledge-architecture.md` — exhaustive catalog of ontologies, drugs, guidelines
- `notes/Current state of agent.txt` — Shane's journal entry on agent development philosophy
