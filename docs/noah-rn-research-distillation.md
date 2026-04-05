# Noah-RN Research Distillation

**Purpose:** Rolling extraction from 15 research reports → actionable inputs for PRD and technical architecture. Each report distilled through the lens of noah-rn's three missions and current repo state (Phase 0+1 complete as Claude Code plugin).

**Repo:** github.com/ShanesNotes/Noah-RN
**Current state:** Shell-based Claude Code plugin with clinical skills (ACLS, code blue, RSI, sepsis, stroke, shift-report, med lookup via OpenFDA), tools/, knowledge/, hooks/. Phase 2 queued: clinical calculators, agent routing, cross-skill awareness. Uses both Claude Code and Codex.

**Key architectural decisions already made:**
- Plugin-first inside Claude Code (skills = specialist workers, hooks = guardrails, agents = routing)
- Hierarchical topology treated as fractal (skills orchestrate sub-agents)
- A2A is core to ALL missions, not deferred
- Model-agnostic at first principles
- Compliance-ready but not compliance-driven

---

## Cross-Report Patterns (grows as reports are reviewed)

1. **The harness > the model.** Orchestration architecture determines clinical AI viability more than model capability. noah-rn's plugin-first approach is validated by production evidence (Mount Sinai, Hippocratic AI).
2. **A2A readiness = machine-readable capability descriptions from day one.** Every skill should be describable by an Agent Card, even before any agent talks to it. This shapes interface design now.
3. **Adapter layer pattern for external data.** OpenFDA lookup in `tools/` is already this pattern. FHIR reads slot in the same way when the time comes.
4. **Retrieval quality > model scale.** MedRAG benchmark proves GPT-3.5 + good retrieval ≈ GPT-4 standalone. This is the economic engine behind Mission 2's "SOTA at token cost." The `knowledge/` directory is not auxiliary — it's the primary lever for output quality.
5. **Design interfaces for the next tier, implement for the current one.** Recurring pattern: memory interface (Report 1) should abstract 3 tiers but implement only working context. Knowledge retrieval interface (Report 2) should abstract RAG but implement context stuffing. This prevents rearchitecting without premature overbuilding.
6. **Contradiction handling is noah-rn's domain moat (antrhodiscernment).** LLMs detect contradictions barely better than chance. A critical care nurse detects them constantly. The system must encode Shane's clinical judgment into evidence grading hierarchies and temporal weighting — this is where domain expertise becomes architectural advantage.
7. **Bias toward thoroughness over speed.** "The cost of a missed finding always exceeds the cost of a 500ms delay." noah-rn offloads documentation, not monitors. The routing agent should escalate to more thorough checks by default. Nurses can wait 3 seconds; they can't recover from a missed interaction.
8. **Cascaded > black-box for clinical reasoning.** Whenever audio, multimodal, or end-to-end models are considered, the cascaded pipeline with inspectable text checkpoints wins for clinical work. The intermediate text stage is where guardrails and antrhodiscernment fire. Non-negotiable for Mission 3 compliance.
9. **Know what infrastructure you DON'T need.** Three reports in, a clear pattern: most production infrastructure guidance (GPUs, serving frameworks, Kafka, CDS Hooks pre-computation) is Mission 2-3. Recognizing this boundary is itself an architectural decision that prevents scope creep.
10. **Clinical judgment encoded as architecture IS the product.** Orchestration, retrieval, inference are plumbing. Trustworthiness follows from getting the clinical reasoning right — confidence calibration, completeness verification, and the "I don't know" response are what make noah-rn trustworthy. Trustworthiness is the only currency at the bedside.
11. **Omission > commission as the dangerous failure mode.** Failing to mention a contraindication is worse than getting a dose wrong, because confident output suppresses the nurse's verification impulse. Skills need mandatory completeness checklists, not just accuracy.
12. **Confidence signals in every output.** High-confidence outputs overridden at 1.7% vs low-confidence at 81.3%. noah-rn should never produce interruptive alerts — it produces drafts with calibrated confidence indicators. "I'm confident" vs "please double-check this section."
13. **Build golden test cases from lived clinical experience.** Every time Shane catches an error or gap in a skill's output, that's a regression test case. The clinical expert IS the eval pipeline. Minimum 100-150 annotated cases for statistical relevance.
14. **HITL Category II aligns with good design, not the other way around.** noah-rn generates drafts for review and keeps the nurse in the driver's seat because that's the right clinical architecture. This positioning also keeps noah-rn below the SaMD threshold and out of FDA device classification — a regulatory checkpoint confirming alignment, not the design driver.
15. **"Fine-tune for format, RAG for knowledge."** Confirmed across Reports 2, 4, and 5: retrieval quality substitutes for model scale, and domain fine-tuning can actually HURT on unseen clinical data. noah-rn's model-agnostic harness with good knowledge retrieval is the right architecture. Don't fine-tune models; fine-tune the harness.
16. **The human-AI interaction gap > the model capability gap.** LLMs alone score 94.9% on condition ID; humans using the same LLMs score <34.5%. Output design, confidence signals, and completeness checklists aren't polish — they're the primary determinant of clinical utility.
17. **Break the copy-forward cycle.** 54% of clinical note text is copied from prior documentation. noah-rn should generate fresh assessments requiring current clinical context, not regurgitate templates. This is both a design constraint and a market differentiator.
18. **Knowledge currency is a clinical quality issue, not a data quality issue.** A right model on wrong knowledge is the most dangerous failure mode. The `knowledge/` directory isn't supplementary — it's the 33% of clinical facts the model might get wrong from stale training data. Curation quality = patient safety.
19. **Provenance metadata on EVERYTHING — system-wide, not just knowledge.** Every file, every skill, every tool output, every agent card should carry source, date, version, and verification metadata. This is an agent-native first principle: agents consume everything, so everything must be machine-describable. Cheap now, invaluable for Mission 3 compliance and medicolegal defensibility.
20. **Surface conflicts, don't resolve them.** When guidelines contradict (and they will), present both positions with sources to the clinician. Algorithmic resolution of clinical conflicts is dangerous; transparent presentation is antrhodiscernment encoded as architecture.
21. **Automate the watching, humanize the deciding.** Freshness checks, staleness detection, drift monitoring — all automatable via cron/scheduled tasks/agentic harnesses. Human review triggers on flags, not on schedule. The system watches; Shane decides.
22. **One throat to choke for model calls.** The AI Gateway pattern at infrastructure scale, but the principle applies at plugin scale: every call to the model goes through a single code path where guardrails fire, provenance logs, and PHI handling enforces. No direct model calls from skills — centralize through `agents/` or a shared function.
23. **Build for clinical excellence; the CDS exemption four-part test confirms alignment.** noah-rn's architecture naturally satisfies: (1) not analyzing images, (2) displaying/analyzing medical info, (3) supporting without replacing judgment, (4) enabling independent review. This is a regulatory checkpoint, not the gating criterion — good clinical design produces compliant architecture as a byproduct.
24. **Document known limitations per skill.** GMLP principle 9: clear essential information including failure modes. When the ACLS skill can't handle pediatrics, say so in skill metadata. When the sepsis skill assumes adult physiology, declare it. This is both good engineering and regulatory readiness.
25. **Guidelines are clinical knowledge, not architectural pillars.** Shane's regulatory specialist experience: JC standards control medicine, and the guidelines are well-researched and often point to optimal care. But noah-rn leverages them as knowledge inputs to the harness — not as the structural foundation. Build for clinical excellence; regulatory satisfaction follows as byproduct. "Compliance-ready, not compliance-driven" means the architecture never defers to regulation over clinical judgment.
26. **Deterministic checks are the irreducible accuracy floor.** Hard-coded plausibility validation (dosage ranges, drug existence, unit verification) that no prompt injection can bypass. These go in `hooks/` as non-LLM guardrails beneath all model outputs. The Doctronic OxyContin case is the canonical example of what happens without them.
27. **Validate input at every boundary.** 94.4% prompt injection success rate in clinical LLMs demonstrates why input validation is non-negotiable engineering practice. Every external input (clinical notes, patient text, MCP tool responses, FHIR data) should be validated before reaching skills. Good systems trust their internals and verify their boundaries.
28. **HITL is the current boundary, not the permanent architecture.** Human-in-the-loop will become the weakest link as agents mature. The long-term answer is foundational AI alignment + data purity + harness engineering with built-in checkpoints at every delegation layer (Jethro principle). Delegate judgment downward through layers of increasing capability; escalate only what genuinely requires the next level's authority. Don't design for humans checking every box forever — design for trustworthy delegation that concentrates human oversight where only humans can judge.
29. **Four-layer explanation in every output: Summary → Evidence → Confidence → Provenance.** The Calibrated Trust report (Report 13) formalizes what patterns #12 and #19 already implied. Every skill output should progress from actionable synthesis through supporting evidence, calibrated confidence, to full source attribution. This is the output format spec for noah-rn.
30. **Weakest-link governs system maturity.** HAIRA v2's minimum-domain rule: a system's effective maturity equals its lowest-performing domain. If skills are Level 3 but monitoring is Level 1, the system is Level 1. Useful self-assessment even for a solo developer.
31. **10-20-70 investment allocation.** 10% algorithms (model sophistication), 20% technology/data infrastructure (harness engineering), 70% clinical workflows and change management (output design, nurse adoption, workflow fit). This is where the money should go.

---

## Report 1: Orchestration Topologies and Federated Memory

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Orchestration patterns, memory architecture, framework selection, EHR integration, security

### Actionable Now (Mission 1 / Phase 2)

**Topology is already decided — validate it.** Claude Code IS the orchestrator. `skills/` = worker registry. `hooks/` = guardrail layer. `agents/` = routing logic. This maps to hierarchical topology with the fractal quality Shane identified: skills can delegate to sub-agents, creating nested hierarchies. The report's guidance on principle-of-least-privilege per agent and logged delegation steps applies directly to scoping what each skill can access.

**Agent routing is the critical Phase 2 deliverable.** The cross-skill awareness item in TASKS.md ("assessment findings trigger relevant protocol suggestions") is the hierarchical orchestration pattern: routing agent receives intent → decomposes → delegates to skill → validates → synthesizes. This lives in `agents/`.

**A2A readiness means Agent Cards now.** Every skill should have a machine-readable capability description (not just a human-readable prompt). This is low effort, high leverage — it establishes the interop surface for Mission 2 without adding runtime complexity.

**Memory: implement only working context, but define the interface for all three tiers.**
- Working context (current patient encounter) = what you need now
- Episodic memory (shift history, encounter sessions) = Phase 3+
- Institutional knowledge (protocols, formularies) = already partially exists in `knowledge/`
- Key decision: define memory interface boundaries now so tiers can be added without rearchitecting

**MCP for tool integration.** FHIR MCP servers already exist (WSO2, Josh Mandel's health-record-mcp, langcare-mcp-fhir). noah-rn plugin doesn't need to solve EHR integration from scratch — it needs to consume MCP. When FHIR reads are added, they slot into `tools/` via MCP.

### Relevant but Deferred (Missions 2-3)

- **Temporal.io for durable execution** — matters when workflows span hours/days (discharge planning, care transitions). Not MVP.
- **CRDTs for concurrent state** — only when multiple agents write to shared patient state simultaneously. Mission 2.
- **Event sourcing with perspective-specific projections** — beautiful compliance pattern (same events projected for clinicians vs billers vs QA). Mission 3.
- **Commure's four-layer zero-trust security architecture** — Mission 3 compliance hardening.
- **Confidential computing / TEEs** — relevant for federated learning and multi-institutional deployments. Mission 2-3.
- **HIPAA 2026 mandatory safeguards** (AES-256, MFA, micro-segmentation, 1-hour access revocation) — design awareness now, implementation when touching real PHI.
- **LangGraph + Temporal hybrid** — if noah-rn outgrows Claude Code plugin model and needs standalone orchestration. Not now.
- **Saga pattern for multi-step clinical workflows** — discharge planning, care transitions. Mission 2.

### Noise / Conflicts with Clinical Reality

- **Mount Sinai "90.6% accuracy at scale" headline** is misleading for MVP. That study validated multi-agent at 80 simultaneous tasks. MVP is one nurse, one patient, one documentation task. Single-agent collapse happens under massive concurrent load, not at point of care.
- **Framework comparison table overweights enterprise features.** CrewAI's state persistence rating doesn't matter if MVP persists state to local checkpoints. Don't let framework selection paralyze — the framework choice is already made (Claude Code plugin model).
- **Report assumes brownfield EHR integration from day one.** MVP can start with OUTPUT (generating structured documentation a nurse copies/pastes) before touching any FHIR API. Sequencing should be: standalone output → read-only FHIR → write-back.
- **The report conflates "production deployment" maturity with what a solo developer building a plugin needs.** Microsoft's Healthcare Agent Orchestrator at Stanford/Johns Hopkins is a different planet from a Claude Code plugin. The patterns transfer; the infrastructure assumptions don't.

### Key Artifacts / References Worth Keeping

- Mount Sinai study (Klang et al., npj Health Systems, 2026) — evidence for task partitioning
- "Caging the Agents" (arXiv 2603.17419) — Commure's zero-trust architecture (deferred but worth re-reading for Mission 3)
- Gradient Institute report — "A collection of safe agents does not guarantee a safe collection of agents" — design principle
- HIPAA proposed rule (Federal Register 2024-30983) — timeline awareness for Mission 3
- MCP FHIR servers: WSO2, health-record-mcp, langcare-mcp-fhir — integration accelerators
- Hippocratic AI Polaris — production validation of multi-agent clinical safety patterns

---

## Report 2: Context Engineering and MEGA-RAG Architectures

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Context engineering paradigm, RAG generations, knowledge graphs, reranking, context budgeting, clinical retrieval pipelines

### Actionable Now (Mission 1 / Phase 2)

**`knowledge/` is a proto-RAG store — design the interface for retrieval, implement as context stuffing.** For MVP with bounded knowledge (ACLS protocols, drug references, sepsis bundles), loading relevant reference files into context via smart selection by the routing agent is sufficient. But the interface between skills and knowledge should abstract retrieval so the implementation can swap to embedding-based RAG when the knowledge base outgrows context windows. This is cross-report pattern #5 in action.

**Context budgeting is a NOW concern, not a scale concern.** Claude Code auto-compacts at 95% window capacity — that's a blunt safety net. When a nurse invokes sepsis skill mid-shift with 80K tokens of history, what gets evicted should be intentional. Implement the ordering: static clinical safety instructions first → reference material → dynamic conversation → user query last. This maximizes prompt cache hits and protects critical context from eviction.

**Contradiction handling architecture seeds from clinical expertise.** The five-layer stack belongs in the design (NLI detection → temporal weighting → evidence grading → multi-agent debate → explicit uncertainty). Shane's clinical judgment defines the evidence grading hierarchy (RCT > cohort > case report > expert opinion; newer guideline > older; facility-specific > general). This is where domain expertise becomes system architecture. Encode it in `knowledge/` metadata, not just in prompts.

**Citation/attribution should be baked into skill output format NOW.** 57% of LLM citations are post-rationalized. Skills should require source attribution in their output templates — even simple `[source: ACLS 2025 Guidelines]` annotations. This establishes the pattern for Mission 3 compliance and builds trust with clinician users immediately. The ReClaim method (alternating reference + answer generation) is the gold standard to aim toward.

**The "~20 tools confuse models" finding constrains MCP tool loading.** Don't statically load all MCP tools for every interaction. Skills should declare their tool dependencies, and only relevant tools get loaded per invocation. This maps to the routing agent's responsibility in `agents/`.

### Relevant but Deferred (Missions 2-3)

- **Full MEGA-RAG pipeline** (4-stage: multi-source retrieval → diverse answer generation → semantic alignment → discrepancy self-clarification) — Mission 2 retrieval backbone
- **Knowledge graph construction from SNOMED/UMLS/RxNorm** — Neo4j-based clinical KG is Mission 2 infrastructure. Tiered update strategy (patient per-encounter, literature annually, vocabularies per-release) is the right maintenance model
- **GraphRAG systems** (Microsoft GraphRAG, LightRAG, MedGraphRAG) — hybrid graph+vector outperforms either alone. LightRAG's incremental updates via graph union is notable: no full re-indexing when knowledge evolves
- **BioClinical ModernBERT** — SOTA clinical embedding model (8,192 tokens, 53.5B training corpus). Future embedding choice when RAG pipeline is built
- **Federated RAG** (DF-RAG, HyFedRAG) — multi-institutional retrieval without centralizing PHI. Mission 2-3
- **Prompt caching optimization** — 10× cost reduction at scale. Per-request `cache_salt` for patient context isolation is a security requirement
- **Production eval pipeline** (RAGAS, DeepEval, Cleanlab TLM) — clinical RAG scorecard targets (Faithfulness ≥0.85, Hallucination <5%, Citation ≥90%) belong in CI/CD when retrieval pipeline exists
- **Adaptive chunking by document type** — discharge summaries at 512-1024 tokens (SOAP boundaries), progress notes 256-512 (abbreviation context preserved), labs per-panel. Decision to chunk by document type rather than fixed-size should be locked in now, even though implementation is Phase 3+
- **Cross-encoder reranking** — +33-40% accuracy for ~120ms latency. First post-retrieval optimization to add when knowledge outgrows context stuffing. Jina Reranker v3 (open-source, biomedical config) for self-hosted

### Noise / Conflicts with Clinical Reality

- **Report overbuilds for MVP.** A concurrent multi-source retrieval pipeline with KG traversal, reranking, and DISC self-clarification is a health system production pipeline, not a plugin's knowledge layer. Patterns are right; scale is wrong.
- **"Context engineering replaces prompt engineering" is true but premature.** noah-rn's skills ARE prompt engineering right now — carefully crafted clinical prompts in shell scripts. That's not wrong. Context engineering becomes relevant when skills dynamically assemble context from multiple sources. Not there yet.
- **Nature Medicine "physician as context engineer" framing** is philosophically aligned but operationally premature. noah-rn curates context FOR nurses, not asking nurses to curate context. The four context types (data, task, tool, normative) are useful taxonomy for system prompt architecture though.
- **Cost optimization numbers assume production scale.** Self-hosted embeddings break even at 50-100M tokens/month. At MVP scale, API calls are fine.

### Key Artifacts / References Worth Keeping

- MedRAG/MIRAGE benchmark — retrieval quality substitutes for model scale (GPT-3.5 + MedRAG ≈ GPT-4)
- Anthropic's attention budget / context rot concepts — design constraints for context assembly
- Chunking-by-document-type table — implementation guidance for clinical document ingestion
- Five-layer contradiction handling stack — architecture for conflicting clinical evidence
- ReClaim method (NAACL 2025) — 90% citation accuracy with sentence-level attribution
- BioClinical ModernBERT — future embedding model choice
- LightRAG — incremental graph updates without full re-indexing
- Clinical RAG scorecard targets — eval pipeline benchmarks
- "57% of LLM citations are post-rationalized" — design constraint requiring verification
- "~20 tools confuse models" — constraint on MCP tool loading strategy
- Manus 100:1 input-to-output token ratio — context assembly dominates compute budget

---

## Report 3: Streaming Inference Fabric and Real-Time Clinical Integration

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Streaming inference, voice pipelines, CDS Hooks, event-driven integration, GPU infrastructure, multimodal AI, latency optimization

### Actionable Now (Mission 1 / Phase 2)

**Tag skills with complexity tiers for model routing.** The multi-model cascade pattern (simple queries → small models, complex reasoning → frontier models) validates noah-rn's model-agnostic design. The routing agent in `agents/` should classify query complexity. A GCS calculation doesn't need the same firepower as "reconcile 14 medications against renal function." Add a `complexity` field to skill metadata — this feeds both routing decisions and future A2A Agent Cards.

**Encode the "missed finding > delay" principle into routing bias.** When the routing agent decides whether to escalate, invoke additional checks, or cross-reference more knowledge, the default should always be thoroughness. Noah-rn offloads documentation — a nurse can wait 3 seconds for a better shift report but cannot recover from a missed drug interaction documented as "no concerns."

**Lock in cascaded pipeline for any future voice integration.** If voice is ever added: STT → text → LLM → text → TTS with inspectable text checkpoints. The intermediate text stage is where `hooks/` guardrails fire. Speech-native models (GPT-4o Realtime at 232ms) are black boxes with no place to insert safety checks. This architectural decision costs nothing now but protects Mission 3 compliance.

**Use ambient documentation benchmarks as competitive frame, not product target.** Abridge: 38 second note generation, 18.6% documentation time reduction. Nuance DAX: 7 minutes saved per encounter. These are comparables, not competitors. The market accepts 30-40 second generation times — this gives noah-rn permission to prioritize accuracy over speed.

### Relevant but Deferred (Missions 2-3)

- **Voice-to-text-to-agent pipeline** — full STT → LLM → TTS stack with sub-800ms latency budget. Deepgram Nova-3 Medical (63.7% better than competitors, BAA available) is the STT choice. Mission 2
- **CDS Hooks pre-computation** — pre-compute on data change, serve from Redis cache at hook time. How noah-rn eventually plugs into Epic/Cerner as real-time CDS. Mission 3
- **FHIR R5 Subscriptions** — event-driven triggers (`encounter-start`, `new-lab-result`, `medication-order`) feeding AI pipeline. "Always-on" noah-rn that watches the chart proactively. Mission 2
- **Kafka as clinical event backbone** — connects EHR events to AI inference. City of Hope sepsis prediction pattern is directly relevant. Mission 2
- **GPU infrastructure** — vLLM (recommended default), SGLang (best for multi-turn via RadixAttention), TensorRT-LLM (highest throughput, hardest setup). Self-hosted breakeven at ~8,000 conversations/day. Mission 2+
- **Multimodal imaging integration** — late fusion: FDA-cleared imaging AI produces structured DICOM-SR findings, LLM agents consume via FHIR. Key principle: keep imaging AI and LLM agents architecturally separate. Mission 2-3
- **Speculative decoding** — 2-6× speedup, mathematically lossless (identical output distribution). Critical for regulated healthcare when self-hosting. EAGLE-3 is current recommendation
- **Prompt caching architecture** — structure prompts with stable medical context as prefix, patient-specific PHI as suffix. Up to 90% cost savings, 85% latency reduction. Relevant at scale

### Noise / Conflicts with Clinical Reality

- **Entire GPU infrastructure section assumes self-hosted inference.** noah-rn calls provider APIs. GPU selection, quantization, serving frameworks — irrelevant until Mission 2 at earliest.
- **Voice agent latency optimization is deeply overbuilt for MVP.** VAD flush tricks, WebRTC tradeoffs, TTS comparison — engineering for an Abridge competitor. noah-rn is text-based. If voice is touched in Phase 2, it's "pipe audio to transcription API, hand text to skill."
- **Report treats ambient documentation as primary use case.** That's the market's center of gravity, but noah-rn's MVP is structured documentation assistance, not ambient listening. "Record encounter → generate note" is a different product from "help me chart this assessment." Don't let this pull toward ambient prematurely.
- **Multimodal imaging accuracy problems** (GPT-4V at 35.2% pathology detection, 40%+ hallucination rate) are scary but irrelevant. noah-rn isn't interpreting images. The takeaway (separate imaging AI from LLM agents) is correct but file-and-move-on.

### Key Artifacts / References Worth Keeping

- Multi-model cascade with confidence-based escalation — pattern for skill complexity routing
- "Cost of missed finding > cost of 500ms delay" — core design principle
- Cascaded pipeline > speech-native for clinical reasoning — architectural decision
- Ambient documentation benchmarks (Abridge 38s, Nuance 7 min/encounter) — competitive frame
- Deepgram Nova-3 Medical — future STT choice
- CDS Hooks pre-computation pattern — Mission 3 EHR integration
- FHIR Subscriptions event model — Mission 2 real-time triggers
- Self-hosted breakeven ~8,000 conversations/day — Mission 2 infrastructure threshold
- Late fusion for multimodal — imaging findings as structured data consumed by LLM agents
- Cleveland Clinic: Bayesian Health sepsis detection at 13 hospitals (46% more cases, 10× fewer false alerts) — validation benchmark

---

## Report 4: Clinical Safety, Evaluation and Guardrail Architectures

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Benchmark limitations, hallucination detection, guardrail frameworks, HITL patterns, alert fatigue, red-teaming, monitoring/observability, regulatory landscape, multi-agent safety risks

### Actionable Now (Mission 1 / Phase 2)

**Implement tiered guardrails in `hooks/` — even simple ones save lives.**
- Tier 1 (regex/keyword, ~0ms): Dosage magnitude checks (400mg vs 40mg Lasix), missing negation ("do not resuscitate" → "resuscitate"), dangerous drug name misspellings. Shell-script-level, implementable today.
- Tier 2 (scope validation, 10-50ms): Is this query within the skill's clinical domain? Route to correct skill rather than hallucinate an answer from the wrong one.
- Tier 3 (LLM-as-judge): Complex clinical validation — "does this recommendation conflict with stated allergies?" Deferred implementation, but design the hook interface to accept it now.

**Design output format around confidence calibration.** Never produce interruptive alerts. Produce documentation drafts with confidence indicators. Structure: primary content + confidence signal + "double-check" flags on uncertain sections + source attribution. The nurse reviews; noah-rn never decides.

**Add mandatory completeness checklists to skills.** Omission hallucination (3.45%) is more dangerous than commission (1.47%). The shift-report skill should verify all 12 assessment systems addressed. Med lookup should ALWAYS surface contraindications even when the query was about dosing. The sepsis skill should verify lactate, cultures, antibiotics, fluids are all addressed. This is antrhodiscernment encoded as architecture.

**Validate skill inputs before proceeding.** 94.4% prompt injection success rate against medical LLMs. In plugin context: garbage-in produces garbage-out. `hooks/` should verify minimum required clinical context exists. Sepsis skill without vitals/labs should respond "I need more data" not hallucinate an assessment.

**Build `tests/clinical/` from lived experience.** Every error caught during skill development = golden test case. Target: 100-150 annotated scenarios for statistical relevance. Format: given [clinical context], skill should [expected output], should NOT [dangerous output]. Shane is the expert annotator. This is the regression safety net.

**Lock in HITL Category II classification.** noah-rn is documentation assistance with optional human-in-the-loop. Not diagnostic. Not prescriptive. Not treatment-recommending. This keeps it below SaMD threshold, outside FDA device classification, and inside the CDS exemption. Design every skill to produce reviewable drafts, never autonomous decisions.

### Relevant but Deferred (Missions 2-3)

- **Hippocratic Polaris constellation** — 22 safety-checker models, accuracy 80% → 99.38%. Principle: dedicated agents that validate primary agent output. Mission 2 multi-agent safety template
- **NeMo Guardrails + Colang 2.x** — programmable guardrail middleware with dialog flow control. When noah-rn outgrows shell hooks. Mission 2
- **MATRIX framework** — PatBot (patient simulation) + BehvJudge (hazard detection, F1=0.96). Mission 2 testing infrastructure
- **Red-teaming tools** (Agent-Chaos, garak, DeepTeam, Promptfoo) — formal adversarial testing before production. Mission 2-3
- **Circuit breaker pattern** with tiered degradation (smaller model → rules → clinician → safe default). Mission 2 when running as service
- **Drift detection** — data, concept, calibration, embedding drift. GPT-4 gave different answer 25.5% of time on repeated questions. Mission 2 production monitoring
- **OpenTelemetry GenAI Semantic Conventions** — agent telemetry with PHI-aware logging. Never log full prompts. Mission 2
- **PCCP mechanism** — FDA pathway for iterative model updates without resubmission. Mission 3 regulatory strategy
- **CDS exemption four-part test** — 21st Century Cures Act. noah-rn likely qualifies IF no imaging, no replacement of judgment, enables independent review. Mission 3
- **EU AI Act** — healthcare AI = high-risk. Full applicability August 2026. Mission 3 international
- **Multi-agent bias amplification** — multi-agent systems can produce higher bias than any constituent model. Architectural defense needed for Mission 2
- **Immutable audit trails** — HIPAA §164.312(b), 6-year retention, cryptographic chaining. Mission 3 compliance
- **Cleanlab TLM** — 34% better precision/recall than RAGAS on medical diagnosis data. Future eval tool
- **MetaRAG metamorphic testing** — zero-resource, black-box hallucination detection via controlled mutations. Future eval pipeline

### Noise / Conflicts with Clinical Reality

- **73% HIPAA compliance failure rate is marketing, not science.** Report itself flags this. Real data: 23% of health systems have BAAs for AI tools, 71% of workers use personal AI accounts. Gap is real; specific number is unreliable. Don't cite it.
- **Benchmark saturation discussion is academic.** MedQA at 96.9%, HealthBench at 60% — interesting positioning but noah-rn competes on "does this shift report save 10 minutes without missing anything," not benchmark scores. Build your own eval.
- **LangGraph HITL code patterns assume LangGraph.** Principles transfer (interrupt on low confidence, present evidence, allow edit/accept/reject) but implementation differs in Claude Code plugin. Don't cargo-cult the code.
- **FDA pathway analysis creates premature regulatory anxiety.** Mission 1 stays below SaMD threshold. Valuable intelligence for Mission 3 but don't let it paralyze plugin development.
- **Liability discussion is unsettled.** No AI malpractice precedent exists. Trending toward shared responsibility scaled by autonomy level. At Category II (assistive), clinician liability dominates. Awareness item, not design driver for MVP.

### Key Artifacts / References Worth Keeping

- "The safety layer is the product" — design philosophy
- Three-tier guardrail model (regex → classifier → LLM-judge) — `hooks/` architecture pattern
- Alert fatigue: 90% override rate; passive CDS > interruptive — output design principle
- Confidence calibration: 1.7% override at high confidence vs 81.3% at low — output format pattern
- Omission hallucination 3.45% vs commission 1.47% — most dangerous failure mode
- HITL Category II — regulatory positioning for Mission 1
- 94.4% prompt injection success rate — input validation imperative
- Golden dataset: 100-150 expert-annotated pairs minimum — testing infrastructure
- Hippocratic Polaris: 80% → 99.38% via safety constellation — Mission 2 architecture template
- "Safe agents ≠ safe collection" (Gradient Institute) — multi-agent design principle
- PCCP + CDS exemption — Mission 3 regulatory toolkit
- Hallucination rate targets: documentation <2%, CDS <5%, diagnostic near-zero — quality benchmarks
- MetaRAG + Cleanlab TLM — future eval tools
- DAS red-teaming: >90% jailbreak success across 15 medical LLMs — threat model reality check

---

## Report 5: Fine-Tuning, Alignment and Domain Adaptation for Clinical LLMs

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Adaptation spectrum (prompting → RAG → fine-tuning → continued pretraining → from-scratch), PEFT methods, clinical training data, alignment (DPO/KTO/SimPO), clinical LLM landscape, evaluation, model lifecycle operations

### Actionable Now (Mission 1 / Phase 2)

**Adaptation strategy confirmed: prompting + knowledge (proto-RAG).** The decision matrix validates this for noah-rn's phase. Zero data required, minimal cost, hours to deploy, real-time knowledge updates via `knowledge/`. Fine-tuning becomes relevant only when specific output formats can't be reliably prompted — and for nursing documentation templates, well-crafted skill prompts get there.

**Break the copy-forward cycle as a design principle.** 54% of clinical note text is copied from prior documentation — propagated errors, outdated information, massive redundancy. noah-rn skills should require CURRENT clinical context for each section rather than auto-filling from templates. Generate fresh assessments. This is both safety architecture and market differentiator.

**Output format and interaction design > model capability.** Nature Medicine RCT: LLMs alone at 94.9%, humans using LLMs at <34.5%. The confidence signals, completeness checklists, and structured output from Report 4 aren't polish — they're the primary determinant of whether noah-rn actually helps nurses. Double down on output design.

**The "domain fine-tuning can hurt" finding validates model-agnostic design.** OpenBioLLM-8B scored 44.93% vs base Llama-3-8B at 74.08% on unseen clinical tasks. Small medical fine-tunes overfit to benchmark formats while degrading on real-world tasks. noah-rn's harness approach — strong general model + good retrieval + good prompting — dodges this trap entirely.

### Relevant but Deferred (Missions 2-3)

- **QLoRA fine-tuning recipe** — r=16, DoRA enabled, all-linear targets, 2e-4 LR, cosine schedule. Single 48GB GPU for 8B models. Mission 2 default for specialized workers
- **ICD-10 coding skill** — fine-tuning raised accuracy from <1% to 97%. Mission 2 skill opportunity using fine-tuned worker behind the harness
- **MIMIC-IV ecosystem** — 331K discharge summaries, 2.3M radiology reports, MIMIC-Instr 400K instruction examples, EHRNoteQA for eval. Ground zero for Mission 2 training data
- **GaLore** — full-parameter learning at 65.5% memory reduction. LLaMA 7B trainable on single RTX 4090. Mission 2 continued pretraining option
- **Federated LoRA (SDFLoRA)** — shared/private decomposition with differential privacy. Maps to Phase 1 federation. Mission 2-3
- **DPO/KTO/SimPO alignment** — KTO most promising for clinical (unary feedback, 42% safety improvement). ClinAlign: 7,034 physician-verified preference examples. Mission 2-3
- **Alignment tax** — safety alignment degrades reasoning. DGR recovers +30.2%. Apple's Disentangled Safety Adapters enable runtime tuning. Mission 2 design awareness
- **MedGemma 27B** — first multimodal open medical model, 87.7% MedQA, medical image encoder. Mission 2 multimodal worker
- **PCCP for model updates** — FDA pre-authorized update mechanism. Mission 3 regulatory pathway
- **De-identification pipeline** — JSL Healthcare NLP 96% F1, Philter open-source. GPT-4o only 79% — don't use general LLMs for PHI removal. Mission 2
- **Privacy in model weights** — 7% membership inference leakage, DP-LoRA mitigation. Mission 2-3
- **Bias auditing** — 93.7% gender disparities, 90.9% racial bias in studies. Counterfactual patient variations required. Mission 2-3
- **MedPerf** — federated evaluation across institutions without sharing data. Mission 2 eval
- **4:1 medical-to-general data ratio** — optimal for continued pretraining (MEDITRON's 99:1 caused degradation). Mission 2
- **Catastrophic forgetting follows proximity** — adding oncology knowledge preferentially destroys related immunology, not unrelated domains. LoRA inherently mitigates by freezing base weights. Mission 2 awareness

### Noise / Conflicts with Clinical Reality

- **Compute requirements assume model training.** noah-rn consumes models via API. GPU selection for training is irrelevant until Mission 2 fine-tunes specialized workers.
- **Commercial model benchmark table is benchmark theater.** noah-rn doesn't compete on MedQA. It competes on "did the shift report cover all 12 systems with the right meds and allergies." Build your own eval.
- **Training from scratch (GatorTronGPT, 277B words, $1-10M+) is aspirational extreme.** Acknowledge; don't plan for.
- **Federated learning at 5.2% real-world deployment rate.** Patterns are sound, operational maturity is low. Watch, don't bet. Mission 2-3.

### Key Artifacts / References Worth Keeping

- "Fine-tune for format, RAG for knowledge" — architectural principle
- Adaptation decision matrix — investment ladder from prompting to from-scratch
- OpenBioLLM-8B vs base Llama-3: domain fine-tuning can hurt — validates model-agnostic
- ICD-10: <1% → 97% with fine-tuning — Mission 2 skill pattern
- MIMIC-IV ecosystem — training data source (331K summaries, 2.3M reports, 400K instruction examples)
- 54% copy-forward in clinical notes — design constraint and differentiator
- Nature Medicine: humans using LLMs at <34.5% — interaction design imperative
- QLoRA recipe (r=16, DoRA, all-linear, 2e-4) — Mission 2 default
- ClinAlign 7,034 examples — Mission 2-3 alignment data
- KTO: unary feedback + 42% safety improvement — practical clinical alignment
- MedGemma 27B — Mission 2 multimodal candidate
- 4:1 medical-to-general data ratio — continued pretraining guideline

---

## Report 6: Clinical Knowledge Management and Continuous Learning Architecture

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Clinical knowledge lifecycle, knowledge graph construction, continuous learning, guideline management, drug knowledge architecture, knowledge synchronization, freshness monitoring

### Actionable Now (Mission 1 / Phase 2)

**Add provenance metadata headers to every file in `knowledge/`.** Each file needs: source (guideline body/publication), date (version published), version (revision number), evidence grade, and "last verified" timestamp. This is a header block per file — trivial to implement. Enables source citation in skill output AND staleness detection. Format:
```
Source: AHA/ACLS 2025 Guidelines
Version: 2025.1
Date: 2025-10-15
Evidence Grade: Class I / Level A
Last Verified: 2026-03-28
Next Review: 2026-06-28
```

**Create `knowledge/FRESHNESS.md` manifest.** List every knowledge file, its source, version date, and next review date. Review quarterly. This is the simplest possible implementation of knowledge freshness scoring — no automation needed at MVP scale, just discipline.

**Skill outputs must reference knowledge versions.** When the ACLS skill uses the 2025 AHA guidelines, the output says so. When the file updates to 2027 guidelines, previous outputs remain correctly attributed. Implement as a standard footer in skill output templates. Cheap now; critical for Mission 3 audit trails.

**Surface guideline conflicts transparently in `hooks/`.** When a skill detects conflicting guidance (and it will — USPSTF vs ACR on screening, ESC vs ACCP on anticoagulation), present BOTH positions with their sources. Never silently resolve clinical conflicts. This is antrhodiscernment: conflicting protocols require human judgment, not algorithmic resolution.

**Drug interaction checking needs multiple sources.** Up to 44% of "major" interactions rated in one source are NOT in others. When building drug interaction skills beyond OpenFDA, cross-reference at least two independent sources. Design the `tools/` interface to support multi-source drug queries from the start.

**Only ingest authoritative sources into `knowledge/`.** Never derivative clinical notes (54% copy-forward corruption). Knowledge directory = guidelines, protocols, drug references from publisher sources. Patient documentation is a separate concern.

### Relevant but Deferred (Missions 2-3)

- **Automated guideline monitoring (NGE system)** — NLP surveillance of publications. LLM extraction at $0.76/385 classifications. Mission 2 when knowledge outgrows manual curation
- **Clinical knowledge graph construction** — SNOMED CT + UMLS + RxNorm in Neo4j. PrimeKG (4.05M relationships), SPOKE (41 databases), iKraph (all PubMed). Mission 2
- **KGCL + ConVer-G** — knowledge graph versioning with Git-like semantics. Mission 2
- **LLM-powered KG population** — multi-LLM validation with composite trust scores. AutoBioKG contradiction detection. Mission 2
- **CPG-on-FHIR v2.0.0** — computable clinical practice guidelines. CQL for guideline logic. Mission 3 EHR CDS integration
- **WHO SMART Guidelines** — 5-level pathway from narrative to executable. DAKs for HIV, TB, immunization. Mission 2-3
- **Medi-Span Expert AI** — commercial medication intelligence designed for AI agents. Mission 2-3
- **Blue/green indexing** — dual index versions with validation before swap. 14-hour rebuild time at enterprise scale. Mission 2 RAG updates
- **Knowledge synchronization patterns** — centralized for safety-critical, pub/sub with version vectors for guidelines, atomic windows for vocabulary updates. Mission 2 multi-agent consistency
- **Knowledge freshness scoring (0-100)** — half-life decay functions. 85% alert, 70% degraded mode. Mission 2 monitoring
- **Drug safety SLAs** — Class I recall ≤4 hours, new approvals ≤48 hours, major guidelines ≤7 days. Mission 2-3 operational targets
- **NCPDP Formulary v60 / RTPB v13** — mandatory January 2027. Real-time prescription benefit. Mission 3
- **Embedding drift monitoring** — pin versions, weekly checks, re-embed on pipeline change. 10-30 hrs/month troubleshooting at scale. Mission 2
- **Active learning** — Bayesian estimation achieved target performance with ~30% of data vs random sampling. Mission 2 annotation efficiency
- **Adapter-based continuous learning** — ProgLoRA, PESO, Doc-to-LoRA for targeted updates without full retraining. Catastrophic forgetting still occurs with LoRA. Mission 2
- **Provenance tracking architecture** — PROV-STAR ontology, RDF-star, immutable snapshots. Only 28% of orgs track AI decisions centrally. Mission 3 compliance advantage

### Noise / Conflicts with Clinical Reality

- **Scale assumptions dwarf MVP.** SNOMED CT 370K concepts, UMLS 3.49M concepts, million-relationship KGs — noah-rn has ~10-20 curated protocol files. Patterns right, scale premature by two missions.
- **Automated guideline crawlers are overbuilt for curated knowledge base.** At 10-20 files, read the updated guideline yourself and update the file. Automation matters at hundreds of sources.
- **"True real-time continuous learning not yet regulatory-supported."** Kills the aspirational continuous learning discussion. Practical path: RAG updates to knowledge corpus (safe, deployable), not model retraining from encounters.
- **14-hour enterprise re-indexing is not your problem.** Knowledge base fits in context window. When it doesn't, incremental indexing first, not blue/green swaps.
- **Four-layer drug data architecture implies commercial data subscriptions.** Layer 3 (FDB MedKnowledge, Medi-Span, Gold Standard) is commercial. Layer 4 (NCPDP formulary) is regulated. MVP uses free sources: OpenFDA (layers 1-2), DrugBank (pharmacology). Commercial layers are Mission 2-3.

### Key Artifacts / References Worth Keeping

- "Right model on wrong knowledge" — foundational design principle
- RAG covers only 33% of must-have clinical statements — knowledge curation is safety-critical
- 44% of "major" drug interactions missing from any single source — multi-source requirement
- Guideline cadences: NCCN 10+/year, AHA/ACC 3-5 years, USPSTF ~3.5 years — freshness varies wildly
- 9-year delay from research to guideline adoption — knowledge currency context
- Freshness scoring: 85% alert, 70% degraded mode — monitoring targets
- Drug safety SLAs: Class I ≤4 hours, major guidelines ≤7 days — operational targets
- KGCL — Mission 2 knowledge graph versioning
- CPG-on-FHIR v2.0.0 — Mission 3 computable guidelines
- Four-layer drug data architecture — knowledge organization model
- Blue/green indexing with validation — Mission 2 RAG update pattern
- Only 28% of orgs track AI decisions centrally — provenance as competitive advantage
- AMG-RAG: automated KG construction + continuous updating, F1=74.1% on MedQA — Mission 2 pipeline
- Breast cancer screening conflict (USPSTF vs ACR) — canonical example of guideline conflict presentation

---

## Report 7: Deployment, Scaling, and Operational Architecture

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Production infrastructure, cloud/on-prem/hybrid, multi-tenancy, autoscaling, MLOps/LLMOps, DR/HA, security, FinOps, edge deployment

### Actionable Now (Mission 1 / Phase 2)

**Centralize model calls — one throat to choke.** AI Gateway pattern at enterprise scale, but the principle applies now: every model call goes through a single code path in `agents/` or a shared utility where guardrails fire, provenance logs, and PHI handling enforces. No direct model calls scattered across skills.

**Tag skill prompts with version metadata.** Prompt versioning = code versioning. Skills are already in Git — add semantic version tags. When ACLS skill prompt updates, version bumps. Outputs reference which prompt version generated them. Free audit trail closure.

**Classify noah-rn as Tier 2 availability (99.9%).** Documentation AI, not life-critical. 8.76 hours annual downtime acceptable. The nurse has a manual fallback: charting by hand, same as yesterday. This classification reduces infrastructure anxiety and is the Mission 3 answer to "what if the AI goes down?"

**Create `docs/DEGRADATION.md`.** 71% of enterprises have no AI degradation plan. Even at MVP, document: when model unavailable → nurse charts manually. Trivial document, non-trivial regulatory value.

### Relevant but Deferred (Missions 2-3)

*This is the largest deferred section in the series — nearly the entire report is Mission 2-3 infrastructure blueprint.*

- **Hybrid control-plane** — PHI on-prem, cloud for elasticity (Azure Arc/AWS Outposts/Anthos). Mission 2
- **Multi-tenant isolation** — schema-per-tenant + envelope encryption. Mission 2-3
- **SMART on FHIR multi-EHR** — validated at 18 sites, 3 EHR platforms. Mission 3
- **Tenant-specific LoRA serving** — shared base + per-institution adapters. Mission 2
- **GPU infrastructure** — H100 MIG, cloud prices dropped 44-75%. Mission 2
- **KEDA autoscaling** — custom vLLM metrics, llm-d disaggregated serving. Mission 2
- **Vector DB scaling** — pgvectorscale 471 QPS (11.4× Qdrant). Mission 2
- **LLMOps** — Langfuse (MIT, BAA, self-hosted) strongest for healthcare. Braintrust auto-converts failures to regression tests. Mission 2
- **CI/CD with clinical safety gates** — shadow → canary → progressive rollout. Mission 2
- **Tiered DR** — active-active for life-critical, warm standby for documentation. Mission 2-3
- **Circuit breaker fallback chains** — primary LLM → secondary → local → rules engine. Mission 2
- **OpenTelemetry + PHI redaction boundary** — dual log streams. Mission 2
- **Zero-trust + Istio** — strict mTLS, ambient mode. Mission 2-3
- **HITRUST AI Security Assessment** — 44 AI controls, 99.41% breach-free. Mission 3
- **FinOps** — cost per clinical query, tiered routing saves 60-80%. Mission 2
- **Edge/IGX Orin** — 248 TOPS, 10-year lifecycle, INT4 models at 3.5GB. Mission 2-3
- **Disconnected operation** — 3-7B SLM + local vector store, sync-when-connected. ARPA-H VIGIL. Mission 2-3
- **Self-hosted economics** — breakeven 2M tokens/day, staff+chips = 70-80% TCO. Mission 2
- **Inference cost decline 10×/year** — design for reoptimization, not static targets. Mission 2

### Noise / Conflicts with Clinical Reality

- **Written for health system CTOs, not solo plugin developers.** Scale assumptions are 2-3 orders of magnitude beyond current needs. Every pattern valid; almost none actionable now.
- **Cloud provider comparison premature.** No cloud deployment yet. Selection matters when deploying a service.
- **$10.3M breach cost is a scare number.** noah-rn isn't touching PHI in production. Relevant when handling real patient data.
- **HealthStack Terraform modules are premature.** IaC matters when there's infrastructure. File for Mission 2.

### Key Artifacts / References Worth Keeping

- AI Gateway pattern — centralize all model calls. Principle now; infrastructure Mission 2
- Tier 2 availability: 99.9% / 8.76 hours — noah-rn's SLA classification
- 71% no AI degradation plan — create DEGRADATION.md
- Langfuse — Mission 2 LLMOps platform
- pgvectorscale 471 QPS — Mission 2 vector DB
- Tiered model routing: 60-80% savings — Mission 2 cost optimization
- Self-hosted breakeven: 2M tokens/day — Mission 2 economics threshold
- IGX Orin: 248 TOPS, 10-year lifecycle — Mission 2-3 edge platform
- Inference costs declining 10×/year — design for reoptimization
- Circuit breaker fallback chain — Mission 2 resilience pattern
- HITRUST AI Security: 44 controls — Mission 3 certification

---

## Report 8: Regulatory Intelligence and Compliance Automation

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** FDA SaMD/PCCP, HIPAA Security Rule, EU AI Act, state legislation, CDS exemption, compliance-as-code, AI-BOM, model cards, HITRUST AI, NIST AI RMF

### Actionable Now (Mission 1 / Phase 2)

**CDS exemption four-part test is the regulatory north star.** noah-rn qualifies IF: (1) no image analysis, (2) displays/analyzes medical info, (3) supports without replacing judgment, (4) enables independent review. Skills generate documentation drafts for nurse review — textbook Category II. Test every design decision against these four criteria. Document this in `docs/REGULATORY.md`.

**"Autonomous agents without human review fail criteria 2 and 3."** FDA's red line for agentic AI. noah-rn's HITL design (drafts, never autonomous action) keeps it safe. This is an architectural constraint, not a limitation.

**Document known limitations per skill.** GMLP principle 9. When ACLS skill can't handle pediatrics, declare it in skill metadata. When sepsis skill assumes adult physiology, say so. Pattern: skill metadata includes `limitations: [...]` alongside `complexity_tier` and capability description.

**Add AI disclosure to output footers.** California AB 3030 already in effect. Build the habit: "Generated by noah-rn v0.2 / [skill] v[X] / [source guideline]". Costs nothing, satisfies regulatory direction across all frameworks, and reinforces provenance (cross-report pattern #19).

**Track federal + Michigan + three template states.** Set RSS/alerts for FDA digital health guidance, HIPAA updates, Michigan AI legislation, California, Colorado, Utah. Don't try to track 1,561 bills across 50 states.

### Relevant but Deferred (Missions 2-3)

- **PCCP framework** — regulatory contract for MLOps. Design pipelines with PCCP boundaries as config params. Mission 3
- **EU AI Act** — high-risk classification, Articles 8-15, dual MDR conformity. Aug 2026/2027. Mission 3 if international
- **AI-BOM** — SPDX 3.0.1 or CycloneDX v1.7 as pipeline artifacts. Mission 2-3
- **Compliance-as-code** — OPA/Rego, Gatekeeper/Kyverno, automated CI/CD gates. Mission 2
- **HIPAA Security Rule overhaul** — mandatory encryption/MFA, 72-hour notification, annual audits. 240 days from May 2026 finalization. Mission 2-3
- **PHI tokenization** — scan/sanitize at every boundary before AI processing. Mission 2
- **HITRUST AI** — 44 controls, 85% inheritable from certified cloud. Mission 3
- **Colorado SB 205** (June 2026) — duty of care, impact assessments, NIST alignment. ~20 states modeling after. Mission 3
- **Joint Commission/CHAI** — 7 core elements, 80%+ of US healthcare coverage. Mission 3
- **NIST AI RMF + ISO 42001** — de facto governance. Mission 2-3
- **QMSR** (Feb 2026) — ISO 13485 by reference, design traceability mandatory. Mission 3
- **CMS ACCESS model** (July 2026) — first Medicare AI reimbursement. 26 CPT codes. Mission 3
- **ONC HTI-1/HTI-5 model cards** — 31 attributes, potential rollback but direction irreversible. Mission 2-3
- **Automated regulatory intelligence pipeline** — detection through documentation. Mission 2-3

### Noise / Conflicts with Clinical Reality

- **Report assumes eventual FDA clearance.** Mission 1 stays below SaMD. CDS exemption analysis valuable; PCCP/QMSR details are cold storage.
- **EU AI Act premature.** US plugin for US nurses. "EU as compliance superset" useful for future-proofing; not actionable now.
- **1,561 state bills = analysis paralysis.** Track federal + Michigan + 3 template states. Rest is noise until commercial deployment.
- **Compliance-as-code tooling (OPA, Gatekeeper) assumes enterprise infrastructure.** Principle applies; tooling doesn't yet.
- **Shared responsibility model assumes cloud deployment with BAAs.** noah-rn runs locally. Relevant when touching PHI in Mission 2.

### Key Artifacts / References Worth Keeping

- "Compliance is infrastructure, not paperwork" — design philosophy
- CDS exemption four-part test — regulatory north star
- "Autonomous agents without review fail criteria 2 and 3" — FDA red line
- GMLP 10 principles — development checklist
- California AB 3030 — AI disclosure, already in effect
- Colorado SB 205 — template for ~20 states
- PCCP three sections — Mission 3 regulatory contract
- AI-BOM (SPDX/CycloneDX) — Mission 2-3 documentation
- HITRUST AI: 85% inheritable — Mission 3 efficiency
- HIPAA NPRM: 240 days from May 2026 — Mission 2-3 timeline
- Utah AI Prescribing Pilot — sandbox precedent
- CMS ACCESS (July 2026) — reimbursement pathway
- No generative AI/LLM device fully cleared as of March 2026 — frontier context

---

## Report 9: Adversarial Security and AI Red-Teaming for Clinical Systems

**Source:** Multi-provider research (Gemini/Grok/Claude synthesis)
**Scope:** Prompt injection, data poisoning, privacy attacks, adversarial examples, multi-agent exploitation, MCP security, supply chain, defense-in-depth, regulatory mandates, red-teaming tools

### Actionable Now (Mission 1 / Phase 2)

**Implement deterministic clinical plausibility checks in `hooks/`.** Hard-coded, non-LLM rules that no prompt injection can bypass: dosage range validation, drug name verification, unit checking (mg vs mcg), critical value flagging. The Doctronic case (OxyContin tripled to 30mg q12h via prompt injection in live clinical trial) is what happens without them. These are your irreducible safety floor.

**Sanitize inputs before they reach skills.** 94.4% prompt injection success. Strip instruction-like patterns from clinical input, validate data types (vitals = numbers not instructions), reject manipulation patterns. Basic input validation addresses 95% of MVP threat surface.

**Validate all MCP tool responses.** 66% of MCP servers show poor security practices, 43% have command injection vulnerabilities, 5% already seeded with poisoning. Never trust MCP output as authoritative — cross-reference, range-check, sanity-check through the centralized model call path.

**Pin model versions and document validation state.** 21.5% of appropriate responses became inappropriate after model updates. Record which model version each skill was validated against. Re-validate when provider updates. Add to `docs/DEGRADATION.md`.

**"Trust laundering" awareness in output design.** noah-rn's formatted output enters the nurse's workflow with appearance of authority. Confidence signals, completeness checklists, and source attribution (Reports 4, 6) are adversarial defenses, not UX features — they prevent confident-but-wrong output from suppressing clinical verification.

**SafeTensors only for any model artifacts.** 44.9% of HuggingFace models use pickle, the #1 ML supply chain vector. If Mission 2 ever downloads local models, never use pickle format.

### Relevant but Deferred (Missions 2-3)

- **Constitutional Classifiers** — 86% → 4.4% jailbreak. Mission 2 service-level defense
- **CaMeL** — provable security at tool-call boundaries. Mission 2 MCP integration
- **Multi-agent infection defense** — full saturation in <11 steps across 50 agents. ControlValve. Mission 2
- **Triple Gate Pattern for MCP** — AI + MCP + API layer security. Mission 2
- **Data poisoning** — 250 docs backdoor any model. Spectral signatures, defection probes (>99% AUROC). Mission 2-3
- **Sleeper agent detection** — "Double Triangle" attention pattern. Mission 2-3
- **PHI memorization** — 87% persists through fine-tuning. DP-LoRA. Mission 2-3
- **Model extraction** — GPT-3.5 projection matrix for <$2K. Mission 2-3 IP defense
- **Circuit Breaking (Representation Rerouting)** — harmful activations mapped to orthogonal space. Mission 2-3
- **CARES benchmark** — 18K prompts, clinical adversarial eval. Mission 2
- **Promptfoo + Garak + PyRIT** — adversarial testing tools. Mission 2 red-teaming
- **TEE inference** — H100/Blackwell, 5-20% overhead. Mission 2-3
- **CDR framework** — agentic attack lifecycle defense. Mission 2
- **MITRE ATLAS** — adversarial ML threat modeling. Mission 2-3

### Noise / Conflicts with Clinical Reality

- **Medical imaging adversarial attacks irrelevant.** noah-rn doesn't process images. ViT > CNN finding filed for Mission 2 if ever needed.
- **Nation-state APT taxonomy disproportionate.** Local plugin, not deployed service with PHI. APT modeling for Mission 2-3.
- **>90% defense bypass creates learned helplessness.** At MVP scale, defending against garbage input and hallucinations, not adaptive adversaries. Basic validation addresses 95% of threat surface.
- **Federated learning Byzantine fault tolerance** — only for federated training. Mission 2-3.

### Key Artifacts / References Worth Keeping

- Doctronic: OxyContin tripled via prompt injection in live trial — canonical example
- 94.4% clinical prompt injection success — threat baseline
- "Trust laundering" — adversarial content entering medical records as documentation
- 250 poisoned docs backdoor any model — data poisoning threshold
- 66% MCP servers insecure, 5% already poisoned — validate all responses
- Deterministic plausibility checks as irreducible floor — `hooks/` foundation
- Constitutional Classifiers: 86% → 4.4% — Mission 2 defense
- Model version pinning: 21.5% safety regression — operational discipline
- SafeTensors > pickle — supply chain defense
- Human-in-the-loop as ultimate security boundary — validates Category II
- "Attacker Moves Second": >90% bypass of 12 defenses — defense-in-depth only viable strategy

---

## Report 10: Multimodal AI Architectures in Clinical Workflows

**Source:** Grok-generated, noah-rn-specific analysis
**Scope:** Post-Med-Gemini foundation models, multimodal capabilities, hardware inference, orchestrator-worker pairing for noah-rn

### Distillation (compact — mostly Mission 2)

**Pre-assumes decisions noah-rn hasn't made.** Recommends Gemini 3 Flash (orchestrator) + MedGemma 1.5 4B (edge worker) — specific vendor pairing that conflicts with model-agnostic first principle. The topology (cloud orchestrator + edge specialized worker) is sound; the vendor picks are premature.

**Validates the draft-review safety pattern.** "AI stages documentation, RN retains absolute sign-off authority, autonomous publishing prohibited." Exactly noah-rn's Category II operating model.

**MedHELM > MedQA for evaluation.** MedQA saturated at 94-96%. MedHELM evaluates 121 practical clinical tasks across 5 domains with harm-weighted scoring. When noah-rn builds formal evaluation, MedHELM is the benchmark framework.

**Almost entirely Mission 2-3:** MedGemma as edge imaging worker, ambient voice orchestration, GPU hardware (H200/B200), 1M-token context windows, multimodal fusion. All deferred.

**Key artifacts:** MedHELM evaluation framework, MedGemma 1.5 4B for future edge worker, "architecture is the product" confirmation, draft-review safety pattern validation.

---

## Report 11: Living Guideline Diff Engine Design

**Source:** Gemini-generated design document
**Scope:** Automated guideline ingestion, LLM-based extraction, SMT-solver conflict detection, CPG-on-FHIR generation, versioned knowledge graph updates

### Distillation (compact — Mission 2 implementation blueprint)

**This is the implementation spec for Report 6's knowledge lifecycle vision.** Detailed architecture for monitoring NCCN/AHA/USPSTF/NICE, extracting structured knowledge via llm_extractinator + MedKGent, detecting conflicts via Z3 SMT solver, generating CPG-on-FHIR artifacts, and pushing delta updates to Neo4j + pgvector with Temporal workflow orchestration.

**What matters now:** The 4-hour SLA for critical drug safety alerts and the tiered SLA table (Report 6) are operationalized here. The multi-agent debate protocol for guideline conflict resolution is the architectural implementation of cross-report pattern #20 (surface conflicts, don't resolve them) — the system flags conflicts for human decision rather than silently choosing.

**Almost entirely Mission 2:** Temporal workflow orchestration for ingestion, LLM extraction pipelines, SMT solver integration, CPG-on-FHIR generation, Neo4j delta updates, pub/sub distribution. All infrastructure noah-rn doesn't need at MVP scale with 10-20 curated knowledge files.

**Key artifacts:** Temporal workflow skeleton for SLA enforcement, ingestion modality table (NCCN via API/webhooks, AHA via RSS, USPSTF via REST API, NICE via CAS alerts), Z3 SMT conflict detection pattern, CPG-on-FHIR generation pipeline.

---

## Report 12: LLMOps Healthcare Reference Implementation

**Source:** Gemini-generated implementation document
**Scope:** Production Kubernetes deployment, disaggregated inference (llm-d), KEDA autoscaling, multi-region HA, blue/green vector indexing, FinOps tagging

### Distillation (compact — Mission 2-3 infrastructure)

**This is the implementation spec for Reports 3 and 7 combined.** Detailed Terraform/Helm/Kustomize repository structure, LangGraph + Temporal integration for durable clinical workflows, disaggregated prefill/decode serving, prefix-cache-aware routing, active-active multi-region with 15-minute RTO, and department-level cost accounting.

**What matters now:** The LangGraph + Temporal integration pattern (LangGraph for agent logic as Temporal Activities, Temporal for durability and state persistence) is the concrete implementation of the architecture recommended in Report 1. File this for when noah-rn outgrows the plugin model. The principle of idempotent Activities is universally applicable — any operation that might be retried should be safe to retry.

**Entirely Mission 2-3:** Multi-region Kubernetes, GPU cluster management, disaggregated inference, vector index blue/green updates, KEDA autoscaling configs. None of this applies to a Claude Code plugin.

**Key artifacts:** LangGraph + Temporal integration skeleton, Terraform repository structure, llm-d disaggregated serving configuration, KEDA ScaledObject for vLLM metrics.

---

## Report 13: Calibrated Trust CDS Component Design

**Source:** Gemini-generated design document
**Scope:** Epic Hyperdrive UI components, calibrated trust psychology, NASA-TLX cognitive load, four-layer explanation architecture, SMART on FHIR integration

### Distillation (compact — Mission 3 EHR integration, but universal principles)

**The four-layer explanation architecture is universally applicable.** Even in a CLI plugin, noah-rn's outputs should follow this progression:
1. **Summary** — the actionable clinical synthesis (what the nurse needs to know)
2. **Evidence** — supporting data with linked references (why the system thinks this)
3. **Confidence** — calibrated uncertainty indicators (how sure the system is)
4. **Provenance** — source attribution with version metadata (where this came from)

This maps directly to cross-report patterns #12 (confidence signals), #19 (provenance on everything), and #11 (omission > commission). The output format spec for noah-rn skills should encode these four layers as standard sections.

**Calibrated trust is the design goal.** The mathematical framing (trust proportional to demonstrated capability) operationalizes the intuition: don't make the system look more confident than it is. Over-trust (automation bias) is as dangerous as under-trust (algorithm aversion). The NASA-TLX dimensions (mental demand, physical demand, temporal demand, performance, effort, frustration) are a useful checklist for evaluating whether noah-rn outputs actually reduce cognitive load vs adding to it.

**Epic-specific implementation is Mission 3:** Hyperdrive iframe constraints, CDS Hooks autolaunch, SMART on FHIR OAuth flow, sub-1.5 second rendering targets. All deferred.

**Key artifacts:** Four-layer explanation architecture (summary → evidence → confidence → provenance), NASA-TLX as cognitive load evaluation framework, calibrated trust mathematical model, progressive disclosure pattern.

---

## Report 14: Designing Secure Medical AI Architecture (noah-rn-specific)

**Source:** Gemini-generated, noah-rn-specific architecture document
**Scope:** Sovereign on-premise deployment with open-weight models, hierarchical agent orchestration, MedGemma/Llama 4/MedASR worker ecosystem, Blackwell B200/H200 infrastructure, confidential computing

### Distillation (compact — Mission 2 sovereign deployment blueprint)

**Pre-assumes Mission 2 decisions.** Specifies on-premise deployment with open-weight models (MedGemma 1.5, Llama 4 Scout/Maverick, MedASR) on NVIDIA Blackwell/H200 with confidential computing. Like Report 10, this conflicts with Mission 1's model-agnostic, API-based approach. The topology (supervisor + specialized workers) validates the fractal hierarchical pattern.

**The "Voice EHR" concept is interesting for future state.** Acoustic biomarkers from speech (respiratory function, neurological decline, emotional state) as clinical data inputs. MedASR at 82% transcription error reduction for medical terminology. Novel but Mission 2+.

**Sovereign AI framing validates the open-source Mission 2 vision.** "Organizations can download, modify, and fine-tune frontier-class models on proprietary hardware" — this is exactly the Mission 2 open-source framework goal. The frozen model weights providing behavioral stability (no silent upstream updates) is a strong argument for self-hosted deployment.

**Entirely Mission 2:** Model selection, GPU infrastructure, confidential computing, on-premise deployment. All deferred.

**Key artifacts:** Sovereign AI rationale for Mission 2 positioning, MedASR (82% error reduction) for future voice integration, Llama 4 Scout (10M token context) for EHR ingestion, frozen weights = behavioral stability argument.

---

## Report 15: AI Governance Readiness Assessment Instrument (HAIRA v2)

**Source:** Gemini-generated governance framework
**Scope:** 7-domain governance maturity model, 5-level assessment rubric, Infrastructure-as-Code policy enforcement, executive dashboard

### Distillation (compact — Mission 2-3 governance framework)

**The weakest-link scoring principle applies now.** HAIRA v2's "minimum-domain evaluation protocol" says organizational maturity can't exceed the score of the lowest-performing domain. For noah-rn as a project: your algorithm development (skills) might be at Level 3, but if your monitoring (drift detection, freshness checking) is Level 1, the system's effective maturity is Level 1. This is the governance version of "a chain is only as strong as its weakest link" — and it's a useful self-assessment tool even for a solo developer.

**The 10-20-70 rule reframes investment priorities.** 10% algorithms, 20% technology/data infrastructure, 70% clinical workflows and change management. For noah-rn: don't over-invest in model sophistication (10%); invest moderately in harness engineering (20%); invest heavily in clinical workflow fit, output design, and nurse adoption (70%). This aligns perfectly with the cross-report finding that human-AI interaction design > model capability.

**The 7 HAIRA domains as a project health checklist:**
1. Organizational structure — ✓ (Shane as clinical + technical lead)
2. Problem formulation — ✓ (nursing documentation offload, clearly defined)
3. Algorithm development — in progress (skills, routing)
4. Data management — early (knowledge/ with provenance headers)
5. Deployment & integration — not started (Mission 2)
6. Monitoring & maintenance — early (freshness checks, golden test cases)
7. Regulatory & ethical oversight — early (CDS exemption positioning, REGULATORY.md)

**Mostly Mission 2-3:** IaC policy enforcement (OPA/Rego), executive dashboards, formal governance committees, HITRUST certification scoring, automated compliance gates. All enterprise governance infrastructure.

**Key artifacts:** HAIRA v2 7-domain assessment as project health checklist, weakest-link scoring principle, 10-20-70 investment rule, 5-level maturity model for self-assessment.

---

*All 15 reports distilled.*
