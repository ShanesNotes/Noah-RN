# Context Engineering & MEGA-RAG Architectures for Agentic AI in Healthcare

**Phase 2 of the Agentic AI Clinical Architecture Series — March 2026**

Context engineering has emerged as the defining systems discipline for production agentic AI, supplanting prompt engineering as the core competency for building reliable clinical systems. This report provides the architecture-level blueprint for constructing multi-evidence retrieval pipelines (MEGA-RAG) that integrate dense, sparse, and graph-based retrieval with cross-encoder reranking, contradiction-aware filtering, and grounded generation — all operating within a rigorous context management framework. Where Phase 1 established the orchestration topology (LangGraph/Temporal), federated memory hierarchy, and security posture, Phase 2 defines how information flows into and out of the LLM's active reasoning window at every step of a clinical agentic workflow. Together, these two phases form the foundation for a production-grade clinical AI harness.

---

## 1. Context engineering replaces prompt engineering for clinical AI

### The paradigm shift from static prompts to dynamic systems

In June 2025, Shopify CEO Tobi Lütke posted: *"I really like the term 'context engineering' over prompt engineering. It describes the core skill better: the art of providing all the context for the task to be plausibly solvable by the LLM."* Days later, Andrej Karpathy amplified the concept with a critical framing: *"The LLM is like a CPU and its context window is like RAM. Context engineering plays the role of an operating system — curating what fits into the CPU's RAM."* Karpathy emphasized that in every industrial-strength LLM application, context engineering is *"the delicate art and science of filling the context window with just the right information for the next step,"* encompassing task descriptions, few-shot examples, RAG results, multimodal data, tools, state, history, and compaction.

By July 2025, Mei et al. published a formal academic survey analyzing over **1,400 research papers** (arXiv:2507.13334), defining context engineering as *"a formal discipline that transcends simple prompt design to encompass the systematic optimization of information payloads for LLMs."* Their taxonomy identifies three foundational components — Context Retrieval and Generation, Context Processing, and Context Management — implemented across RAG systems, memory systems with tool-integrated reasoning, and multi-agent architectures.

Anthropic's September 2025 engineering blog formalized two critical concepts: the **attention budget** (*"LLMs have an attention budget that they draw on when parsing large volumes of context — every new token introduced depletes this budget"*) and **context rot** (*"as context window tokens increase, the model's ability to accurately recall information decreases, across all models"*). These are not theoretical concerns — they are measurable degradation curves that directly impact clinical safety.

### Why prompt engineering fails in clinical agentic systems

Drew Breunig, now authoring O'Reilly's *Context Engineering Handbook*, identified four failure modes that map directly to clinical risks:

**Context Poisoning** occurs when a hallucination or error enters the context and propagates through subsequent reasoning steps. Google DeepMind's Pokémon-playing Gemini agent demonstrated this pathology — the model hallucinated game states and developed *"impossible or irrelevant goals."* In a clinical system, a misattributed lab value entering working context could cascade through differential diagnosis, treatment selection, and discharge planning agents (the multi-agent topologies described in Phase 1).

**Context Distraction** emerges when accumulated context grows so large that the model over-focuses on it rather than applying training knowledge. A Databricks study found correctness fell sharply around **32K tokens** for Llama 3.1 405B. For clinical workflows processing multi-year patient histories, this threshold arrives quickly.

**Context Confusion** occurs when superfluous context — such as excessive tool definitions — degrades response quality. Research shows that anything beyond **~20 tools** can confuse models, directly relevant to the MCP-based tool integration patterns described in Phase 1.

**Context Clash** arises when contradictory information coexists within context. A Microsoft/Salesforce study found that when prompts were sharded across multiple turns, model performance dropped by an average of **39%**. Even OpenAI's o3 dropped from 98.1% to 64.1% accuracy with conflicting context. In clinical settings, contradictory specialist notes, updated-versus-outdated guidelines, and conflicting lab results create exactly this condition.

### The four primitives of context engineering

LangChain's authoritative taxonomy (July 2025) defines four operations that map cleanly to the Phase 1 memory hierarchy:

| Primitive | Definition | Clinical implementation | Phase 1 mapping |
|-----------|-----------|----------------------|-----------------|
| **Write** | Persist information outside the context window | Save patient summaries, clinical plans, cross-visit context | Episodic memory tier (session state, scratchpads) |
| **Select** | Pull relevant information into the context window | Retrieve relevant history, guidelines, lab results via RAG | Institutional knowledge tier → working context |
| **Compress** | Reduce context size while preserving essential information | Summarize long patient records; Claude Code auto-compacts at 95% window capacity | Working context management |
| **Isolate** | Keep contexts separate between agents/tasks | Separate contexts for triage, diagnosis, and discharge planning agents | Multi-agent orchestration (LangGraph StateGraph) |

### Context engineering maps to the three-tier memory hierarchy

Phase 1 established a three-tier memory hierarchy: working context (L1), episodic memory (L2), and institutional knowledge (L3). Context engineering is the **bridge layer** — the assembly system that dynamically composes the LLM's active window from these stores:

| Memory tier | Analog | Context engineering role |
|------------|--------|----------------------|
| **Working context** | CPU cache/RAM | Current context window: system prompt + recent messages + active tool outputs |
| **Episodic memory** | RAM/swap | Session state, conversation summaries, agent scratchpads — selected and compressed on demand |
| **Institutional knowledge** | Disk/network | Vector stores, knowledge graphs, clinical guidelines — retrieved via RAG pipelines described in Sections 2–4 |

Google's Agent Development Kit (ADK) formalizes this as three design principles: separate storage from presentation, maintain sessions/memory/artifacts as durable state, and use flows and processors as the "compiler pipeline" producing working context. Manus, serving millions of users, reports an average **input-to-output token ratio of 100:1** in agentic systems — underscoring that context assembly dominates the computational budget.

### Clinical context engineering: the Nature Medicine framework

A February 2026 *Nature Medicine* paper (Nenadic, Fudim, Loring et al.) argues that *"a central professional task of the physician of the future will be context engineering"* and defines four types of clinical context:

- **Data context**: Choosing which elements of the medical record, biometric data, imaging, and social information are presented — and which are purposely excluded
- **Task context**: Specifying what the system is asked, expected output format, and how uncertainty is handled
- **Tool context**: Defining what external tools the model may call (risk calculators, guideline APIs, institutional protocols — the MCP tool registry from Phase 1)
- **Normative context**: Embedding goals of care, patient values, resource constraints, institutional policies, and ethical/privacy guardrails

The paper warns: *"If physicians remain mere end-users of vendor-defined tools, we risk deploying powerful but misaligned systems that amplify existing inequities."* This framework should guide the system prompt architecture for all clinical agents.

---

## 2. RAG architecture patterns evolved through three generations

### From naive retrieval to agentic decision-making

The field has crystallized into three distinct architectural generations, each addressing specific failure modes of its predecessor:

**Naive RAG (2020–2023)** implemented a simple index → retrieve → generate pipeline using single-pass semantic similarity or BM25. Limitations included low precision from misaligned chunks, hallucinations from outdated information, and no multi-step reasoning capability. For clinical applications, this architecture is dangerous — it cannot handle the complexity of medical reasoning or the precision required for patient safety.

**Advanced RAG (2023–2025)** added pre-retrieval and post-retrieval optimizations. Pre-retrieval improvements include query rewriting, HyDE (hypothetical document embeddings), and query decomposition. Retrieval improved through hybrid dense+sparse search and cross-encoder reranking. Post-retrieval processing added context compression, filtering, and citation mapping. The RE-RAG two-stage pattern — bi-encoder initial retrieval (top-k=10–50) followed by cross-encoder reranking (top-n=3–5) — became the production standard. RAG-Fusion introduced reciprocal rank fusion across multiple reformulated queries.

**Agentic RAG (2024–2026)** transforms RAG from a fixed pipeline into an autonomous, decision-making workflow. Three defining principles emerge from the A-RAG paper (arXiv 2602.03442): autonomous strategy selection (the LLM dynamically chooses when and how to retrieve), iterative execution with feedback loops, and interleaved tool use across retrieval modalities. Key implementations include **MA-RAG** (a training-free multi-agent framework with Planner, Step Definer, Extractor, and QA agents that outperforms fine-tuned systems on HotpotQA), **Self-RAG** (learns to retrieve, generate, and critique through self-reflection), and **FLARE** (triggers retrieval when generation confidence drops below threshold).

This evolution maps directly to Phase 1's orchestration patterns: naive RAG corresponds to a single-agent pipeline, advanced RAG to a DAG-based workflow (LangGraph), and agentic RAG to the full hierarchical multi-agent topology with dynamic routing.

### The MEGA-RAG architecture for clinical evidence synthesis

The MEGA-RAG system (Xu et al., *Frontiers in Public Health*, 2025) represents the most complete multi-evidence retrieval architecture for healthcare, implementing a four-stage pipeline:

**Stage 1 — Multi-Source Evidence Retrieval (MSER)** retrieves concurrently from three source types: PubMed via FAISS-based dense retrieval, WHO IRIS via structured API queries, and a biomedical knowledge graph (CPubMed-KG) via BM25 keyword search combined with graph traversal. This multi-modal retrieval directly addresses the limitation of single-retriever systems that miss evidence available through different modalities.

**Stage 2 — Diverse Prompted Answer Generation (DPAG)** generates multiple candidate answers via prompt-based LLM sampling, then reranks using cross-encoder relevance scoring. The diversity of candidates helps prevent anchoring bias — a known failure mode in clinical LLM reasoning.

**Stage 3 — Semantic-Evidential Alignment Evaluation (SEAE)** evaluates consistency between generated answers and retrieved evidence via cosine similarity and BERTScore alignment. This stage implements a form of the faithfulness scoring described in Section 4.

**Stage 4 — Discrepancy-Identified Self-Clarification (DISC)** is the critical safety layer: if alignment scores fall below threshold, the system analyzes discrepancies, performs secondary knowledge retrieval, and iteratively refines through K-means clustering and answer fusion.

MEGA-RAG achieved a **>40% reduction in hallucination rates** versus baselines (PubMedBERT, PubMedGPT, standalone LLM, standard RAG), with best accuracy of **0.7913**, precision **0.7541**, recall **0.8304**, and F1 **0.7904** on the HealthQuestDB benchmark.

### Retrieval strategies compared for clinical data

No single retrieval modality suffices for clinical data. The following comparison should guide hybrid pipeline design:

| Strategy | Strengths for clinical use | Limitations | Best for |
|----------|--------------------------|------------|----------|
| **Dense retrieval** (embedding-based) | Captures semantic synonymy ("myocardial infarction" ↔ "heart attack"); handles paraphrases in narrative notes | Struggles with exact codes (ICD-10, dosages); computationally expensive | Clinical narratives, progress notes, patient questions |
| **Sparse retrieval** (BM25/TF-IDF) | Essential for exact entity matching — ICD-10 codes, drug names, dosages, LOINC codes; fast, interpretable | Insensitive to synonymy/polysemy; poor with abbreviations | Coded data, medication lists, lab results, structured fields |
| **Hybrid** (dense + sparse fusion) | Reciprocal Rank Fusion elevates recall@100 from 51.54→61.92 and MRR from 59.48→67.04 vs. best individual retriever (CliniQ benchmark) | Requires tuning fusion weights | **Default production choice** for clinical RAG |
| **Knowledge graph traversal** | Multi-hop reasoning (drug → interaction → contraindication → condition); explainable paths; ontology-grounded | Requires KG construction and maintenance; incomplete coverage | Drug interactions, differential diagnosis, guideline navigation |
| **Multi-hop retrieval** | Complex clinical reasoning chains; differential diagnosis with shared manifestations | Latency increases per hop; error compounds across steps | Complex diagnostic workflows, treatment planning |

The production funnel architecture should implement: **BM25 + bi-encoder → top-100 candidates → cross-encoder reranking → top-5 → generation**. The GUIDE-RAG meta-analysis in JAMIA (2025), reviewing 20 studies, found that RAG showed a **1.35 odds ratio increase in performance** versus baseline LLMs (95% CI: 1.19–1.53, P=.001).

### Embedding models: domain-specific training now decisive

The embedding model choice has matured significantly in 2025. The critical finding across multiple studies: **sentence-transformer training matters more than domain-specific pretraining alone.** S-PubMedBERT was 29% more precise than raw PubMedBERT, and general-purpose Jina-v2-base-en outperformed S-PubMedBERT by 6% on ICD-10 code retrieval. The optimal approach combines domain-specific pretraining with contrastive/sentence-transformer fine-tuning.

| Model | Params | Context | Dims | Key strength | Recommended use |
|-------|--------|---------|------|-------------|----------------|
| **BioClinical ModernBERT** (June 2025) | 150M–396M | **8,192 tokens** | 768 | SOTA on 4/5 clinical tasks; 53.5B token training corpus (largest biomedical encoder); 90.8% F1 on ChemProt | Primary encoder for clinical NER, classification, and embeddings |
| **MEDTE** (July 2025) | Variable | 8,192 | Variable | GTE backbone; 51-task medical embedding benchmark; outperforms BioBERT, BiomedBERT | Embedding-specific workloads with comprehensive evaluation |
| **MedEmbed** (2024) | Small/Base/Large | 512 | 768 | >10% improvement on nDCG@10 over base models; Apache 2.0; BGE foundation | On-premises deployment with open licensing |
| **Voyage AI voyage-3-large** (Jan 2025) | — | 32K | 2,048 | Outperforms OpenAI v3-large by 9.74%; Matryoshka dimensionality reduction | API-based production with best general retrieval |
| **MedEIR** (May 2025) | — | 8,192 | — | Domain-adapted tokenizer (52,543 biomedical tokens); ALiBi positional encoding | Self-hosted retrieval with domain-optimized tokenization |

### Chunking strategies must respect clinical document structure

A controlled evaluation (2025) comparing four chunking strategies on clinical queries found that **adaptive chunking** achieved **87% accuracy** versus 50% for fixed-size baseline (p=0.001). The CLI-RAG framework (arXiv 2507.06715) introduced hierarchical chunking that respects clinical document structure with dual-stage retrieval — global task-specific queries across EHR note types, then local drill-down with tailored sub-queries.

The CLEAR methodology (Lopez et al., arXiv 2510.25816) demonstrated a **58.3% win rate** over traditional RAG approaches while requiring **78% fewer tokens** through clinical entity-augmented retrieval, directly addressing the "lost-in-the-middle" problem that plagues long clinical documents.

Recommended chunking by document type:

| Document type | Chunk size | Strategy | Critical preservation |
|--------------|-----------|----------|---------------------|
| Discharge summaries | 512–1,024 tokens | Section-based (SOAP headers as boundaries) | Assessment/Plan linkage |
| Progress notes | 256–512 tokens | Semantic with 50–100 token overlap | Abbreviation context, temporal flow |
| Radiology reports | 512 tokens per section | Structure-aware (Findings/Impression separate but linked) | Impression-Findings concordance |
| Lab results | Per-panel or per-test | Tabular/structured | Reference ranges, units, temporal ordering |
| Clinical guidelines | 512–1,024 tokens | Recursive with hierarchy preservation | Procedural step integrity, evidence grading |

All chunks should carry metadata: patient ID, document type, section header, date, encounter ID, authoring clinician role, and detected entities (diagnoses, medications, procedures) for hybrid retrieval filtering.

---

## 3. Knowledge graphs anchor clinical reasoning in biomedical ontologies

### GraphRAG architectures provide global and local search

**Microsoft GraphRAG** implements a five-phase pipeline: document chunking → LLM-based entity and relationship extraction → Leiden hierarchical community detection → LLM-generated community summaries at each hierarchy level → document-to-textunit linkage for traceability. It supports three query modes: Global Search (map-reduce over community summaries for corpus-wide questions), Local Search (entity-focused fan-out from vector search to neighbors, chunks, and communities), and DRIFT Search (combining community and local search with iterative refinement).

**LightRAG** (HKUDS, EMNLP 2025) offers a lightweight alternative with significantly lower indexing cost (one LLM call per chunk versus multiple passes) and **~30% reduction in query latency**. Its dual-level retrieval — low-level for specific entities and high-level for thematic synthesis — and critically, its support for **incremental updates via graph union** (no full re-indexing), makes it particularly suitable for clinical environments where knowledge evolves continuously.

**MedGraphRAG** (arXiv:2408.04187, ACL 2025) introduces a three-tier hierarchical graph purpose-built for clinical use: Level 1 holds user-provided documents (EHR data), Level 2 contains foundational medical knowledge (MedC-K corpus: 4.8M papers, 30K textbooks), and Level 3 embeds controlled vocabularies (UMLS) with authoritative terms and semantic relationships. Each level has different update frequencies — Level 1 (frequent, per-encounter), Level 2 (annual), Level 3 (every 5+ years) — directly mapping to the institutional knowledge maintenance patterns from Phase 1.

### Building clinical knowledge graphs from standard terminologies

The foundation of clinical knowledge graphs rests on four primary ontologies:

**UMLS Metathesaurus** links over 200 biomedical vocabularies under a common ontological framework using CUI (Concept Unique Identifiers) for cross-terminology mapping. Its eight semantic groups — Anatomy, Chemicals & Drugs, Concepts & Ideas, Devices, Disorders, Phenomena, Physiology, Procedures — provide the categorical backbone. **SNOMED CT** contributes **350,000+ medical concepts** with 1.4 million relationships in a polyhierarchical structure that naturally maps to graph triples. **RxNorm** provides clinical drug terminology normalization, and **ICD-10-CM** supplies diagnosis coding with mapping reference sets from SNOMED CT covering **126,000+ concepts**.

A 2025 Neo4j-based framework integrating MIMIC-IV clinical data (1,504 patients) with SNOMED CT through ICD-10-CM mappings created a unified graph of **625,708 nodes and 2,189,093 relationships**, demonstrating **5.4x to 48.4x faster query execution** versus PostgreSQL across clinical query types. The official SNOMED database loader (IHTSDO/snomed-database-loader) enables direct ingestion into Neo4j from RF2 release files.

### Graph + vector hybrid retrieval outperforms either alone

Systematic benchmarking (arXiv:2507.03608, 2025) confirms that **hybrid GraphRAG achieves the highest factual correctness (0.58)** across all difficulty levels, compared to 0.50 for GraphRAG alone and varying performance for vector RAG alone (best on easy questions at 0.61 but degrading on complex reasoning). The practical implementation pattern uses Reciprocal Rank Fusion across one-hop graph traversal (high-recall candidate identification) and dense vector-based reranking (cosine similarity), storing graphs in iGraph for fast traversal and embeddings in Milvus for vector similarity.

For clinical multi-hop reasoning, several systems demonstrate the pattern's power. **KRAGEN** (Bioinformatics, 2024) uses Graph-of-Thoughts decomposition with KG-backed RAG, improving 1-hop reasoning from **68.6% to 80.3% accuracy**. **KG-RAG** (Soman et al., 2024) achieved a **71% improvement in LLaMA-2 performance** when augmented with the SPOKE biomedical knowledge engine. Drug-drug interaction prediction via multi-hop graph traversal has been validated at scale: drug knowledge graphs deployed on Nebula Graph identified **119,730 repurposing paths** through two-hop queries, with literature-validated discoveries like Sildenafil → CYP3A4 → lung cancer treatment potential.

### Maintaining clinical knowledge graphs as guidelines evolve

Knowledge graph maintenance is the Achilles' heel of GraphRAG systems. A survey of 16 major biomedical KGs found that only **Monarch KG, Clinical KG, and RTX-KG2** scored positively on all update frequency and versioning principles. The recommended tiered approach follows MedGraphRAG's pattern: patient-level data updated per encounter (integrating with the episodic memory layer from Phase 1), medical literature knowledge updated annually or upon major guideline publication, and controlled vocabularies updated per SNOMED CT/UMLS release cycles.

Entity extraction for KG population has two pathways. **LLM-based extraction** using GPT-4/Gemini with few-shot prompting achieves competitive performance (GPT-4.0 reached **F1=76.76** on sepsis-specific NER), while **production NLP pipelines** using MedCAT v2 (processes 100M+ documents, F1>0.94 transferability between hospitals) or Spark NLP for Healthcare (SOTA on 7/8 biomedical NER benchmarks, outperforming AWS Comprehend Medical by **8.9%**) provide deterministic, scalable extraction. For entity linking, MedCAT v2 links directly to SNOMED CT and UMLS, while SapBERT and SNOBERT provide transformer-based alternatives.

---

## 4. Reranking and grounded generation ensure clinical accuracy

### Cross-encoder reranking adds precision where it matters most

Cross-encoder reranking is the single highest-impact post-retrieval improvement for clinical RAG. Unlike bi-encoders that compress document meaning into single vectors independently of the query, cross-encoders jointly encode query-document pairs through full cross-attention, capturing rich token-level interactions. Studies show **+33–40% accuracy improvement** for only ~120ms additional latency — a tradeoff clinical systems should always accept.

| Model | Architecture | BEIR nDCG@10 | Latency (100 docs) | License | Clinical notes |
|-------|------------|-------------|-------------------|---------|---------------|
| **Jina Reranker v3** (Sept 2025) | Qwen3-0.6B + MLP projector; 131K context; processes up to 64 docs simultaneously | **61.94** (SOTA) | 100ms–7s | CC BY-NC 4.0 | Includes biomedical training configuration |
| **Cohere Rerank 4 Pro** | Proprietary; 32K context | Top ELO (1627) | Fast (API) | Commercial API | Best commercial option; 100+ languages |
| **BGE-Reranker-v2-gemma** | Gemma-2B based | Strong | Moderate | Open-source | Good open-source alternative |
| **NVIDIA Nemotron** | 1.2B params | 83.00% Hit@1 | 243ms | — | Top accuracy in benchmark |
| **mxbai-rerank-large** | 1.5B params; RL-augmented | 57.49 | Moderate | Apache 2.0 | Best fully open-source option |

For clinical RAG, the BioASQ 2025 challenge validated the two-stage pattern: retrieve 1K candidates → fine-tuned cross-encoder (top-30) → GPT-based reranker (top-10), achieving competitive MAP@10 on 39M PubMed records. The MEGA-RAG system's integration of cross-encoder reranking with multi-source evidence retrieval achieved the **>40% hallucination reduction** cited in Section 2.

### Discrepancy-aware filtering handles contradictory clinical evidence

Contradictions in clinical RAG are not edge cases — they are endemic. Research on the TGA–PubMed dataset (arXiv:2511.06668) across 1,476 medicines found that **>5,400 document pairs exhibited high contradiction scores** even among semantically similar abstracts. Temporal analysis revealed that pre-2000 documents mostly fell in low-contradiction bins, while by 2010–2025, **high-contradiction bins account for ~50% of documents**, reflecting the rapid evolution of clinical evidence.

When contradictory documents are present, ROUGE-1 scores decline by **18.2%**. Even more concerning, evaluation of LLMs as contradiction detectors found they perform only *"slightly better than chance"* — meaning automated detection cannot be fully trusted.

The recommended clinical contradiction handling stack implements five layers:

1. **NLI-based conflict detection** between retrieved document pairs using natural language inference classifiers, flagging entailment/contradiction relationships
2. **Temporal weighting** via metadata-tagged publication dates and guideline versions, preferencing more recent evidence
3. **Evidence strength grading** by study design hierarchy (RCT > cohort > case report > expert opinion), integrated into retrieval scoring
4. **Multi-agent debate** (Madam-RAG pattern, which outperforms alternatives by **11.4%** on ambiguous documents) where LLM agents debate answer merits before aggregation
5. **Explicit uncertainty expression** when contradictions are detected, though notably 6/7 models tested actually hedge *less* with ambiguous sources — the opposite of desired clinical behavior — requiring explicit prompting

### Grounded generation with auditable evidence links

Clinical RAG outputs must be traceable to source evidence. The **ReClaim** method (NAACL 2025 Findings) achieves **90% citation accuracy** with 100% consistency by alternating generation of references and answer text step-by-step, producing sentence-level fine-grained citations with constrained decoding. This reduces citation length by ~22% compared to paragraph-level methods.

A critical warning from 2024 research (arXiv:2412.18004): **up to 57% of LLM-generated citations are post-rationalized** — the model generates an answer first, then retrospectively selects a citation that appears to support it. This distinguishes "citation correctness" (does the cited source contain the claimed information?) from "citation faithfulness" (did the citation actually influence the generation?). For clinical systems, P-Cite (post-hoc citation verification via NLI classifiers) should supplement G-Cite (generation-time citation) to ensure true grounding.

Implementation requires: forced citation format in system prompts requiring `[source_id]` annotations per claim, NLI-based verification of each citation against the referenced chunk, and auditable evidence pointers linking each generated claim to specific chunk IDs, page numbers, and guideline sections.

### Hallucination detection requires a multi-method approach

No single hallucination detection method is reliable across all clinical scenarios. **Cleanlab's Trustworthy Language Model (TLM)** was benchmarked as the most effective detection method across four RAG benchmarks, combining self-reflection, consistency across multiple sampled responses, and probabilistic uncertainty measures. **RAGAS Faithfulness** decomposes answers into individual claims and checks each against retrieved context, but failed to produce scores for 83.5% of examples in one benchmark on complex reasoning tasks. **MetaRAG** provides a promising unsupervised approach using metamorphic testing — generating controlled synonym/antonym mutations and verifying entailment/contradiction against retrieved context.

For clinical RAG specifically, a radiology RAG study published in *npj Digital Medicine* demonstrated that RAG-enhanced local models **eliminated dangerous hallucinations entirely** (8% → 0%) while maintaining 2.6s response time on standard hospital computers. The key was curated, authoritative source material — the quality of the knowledge base matters more than the sophistication of the detection method.

| Evaluation framework | Type | Key metrics | Best for |
|---------------------|------|------------|----------|
| **RAGAS** | Reference-free, LLM-powered | Faithfulness, context precision/recall, answer relevancy | Standard RAG evaluation; 25K+ GitHub stars |
| **DeepEval** | CI/CD integration (pytest-style) | Contextual precision/recall/relevancy, faithfulness, GEval | Pipeline regression testing; generates reasoning alongside scores |
| **Cleanlab TLM** | Uncertainty estimation | Trustworthiness score via multi-sample consistency | Hallucination detection in production |
| **Galileo** | End-to-end platform | Eval → guardrails lifecycle | Regulated industries with compliance requirements |

The recommended clinical RAG evaluation scorecard sets these production targets:

| Dimension | Metrics | Target |
|-----------|---------|--------|
| Retrieval quality | Precision@5, Recall@20, MRR, nDCG@10 | P@5 ≥ 0.68 |
| Generation faithfulness | RAGAS Faithfulness, Factual Consistency | ≥ 0.85 |
| Hallucination rate | Expert review + automated detection | < 5% |
| Citation accuracy | NLI-verified attribution precision | ≥ 90% |
| Clinical accuracy | Expert clinician Likert scoring (5+ clinicians) | ≥ 3.5/4.0 |
| End-to-end latency | Total response time | < 2s |

---

## 5. Context window management for multi-agent clinical systems

### Dynamic context budgeting allocates the scarcest resource

The context window is the bottleneck of every agentic system. Five categories compete for the same fixed budget: system prompts (100–1,000 tokens), retrieved documents (variable, often largest), conversation history (grows per turn), agent instructions and tool definitions (significant with MCP tool registries from Phase 1), and reserved output space. The practical budget formula: `max_input_tokens = context_window - max_output_tokens`. For a 128K-token model reserving 4K for output, the available input budget is 124K tokens — large but not unlimited when processing multi-year patient histories.

**Intent-based allocation** routes different query types to different budgets: simple factual queries (medication dosage lookups) allocate more tokens to retrieved documents with minimal conversation history, while complex diagnostic reasoning allocates more to conversation history and chain-of-thought context. **Priority-weighted budgeting** distributes tokens across sources using configurable weights with minimum/maximum constraints, running before the LLM sees any context. This integrates with Phase 1's orchestration layer — the LangGraph StateGraph can carry budget allocation metadata as part of the agent state.

### Compression techniques now achieve 18× reduction

Context compression has advanced significantly. **Z-Tokens** (arXiv 2603.25340, March 2026) achieves **18× token reduction** with variable-length compression that adapts to semantic density — allocating more tokens for complex clinical passages and fewer for redundant ones. **Context Cascade Compression (C3)** uses a small LLM to compress long context into latent tokens, achieving **98% decoding accuracy at 20× compression** and 93% at 40×. For practical deployment, the **Token Reducer** library achieves 50–75% reduction through semantic text compression with entity abstraction, proposition extraction, and hierarchical summarization.

The recommended four-layer compression pipeline for clinical RAG:

1. **Relevance filtering** via cross-encoder reranking (highest impact, lowest risk)
2. **Semantic deduplication** grouping chunks with cosine similarity >0.85, keeping one representative per cluster
3. **Extractive compression** selecting key sentences by information density scoring (40–60% token reduction while preserving original phrasing)
4. **Sentence pruning** for fine-grained removal of low-value content within retained chunks

For multi-agent systems, LLM summarization of trajectory history (as used by Claude Code's auto-compact at 95% window capacity) enables theoretically infinite context, but a hybrid approach combining summarization with observation masking is recommended for clinical workflows where older-but-critical information (e.g., known allergies) must never be lost.

### Long-context models vs. RAG: a decision matrix for clinical data

Research consistently shows that long-context LLMs outperform RAG when ample resources are available, but RAG is *"undoubtedly far more cost-efficient"* (Li et al., 2024). The Databricks study found performance degradation beyond model-specific thresholds: **Llama-3.1-405B after 32K tokens, GPT-4-0125-preview after 64K tokens**. The "lost in the middle" problem — models paying more attention to information at the beginning and end of long contexts — directly threatens clinical safety when critical findings are buried in lengthy records.

| Factor | Long-context (100K+) | RAG | Recommendation for clinical |
|--------|---------------------|-----|---------------------------|
| **Accuracy on broad questions** | Higher | Lower | Use long-context for holistic patient summary |
| **Accuracy on specific queries** | Degrades with irrelevant context | Higher with good retrieval | **Use RAG for targeted clinical queries** |
| **Cost per query** | High (all tokens processed) | Low (selected tokens only) | RAG: 2,852.6× TTFT speedup (RAGO, MIT CSAIL) |
| **Citation/traceability** | No inherent support | Built-in via chunk IDs | **RAG required for regulatory compliance** |
| **Knowledge updates** | Requires re-prompting | Update external store | **RAG for dynamic clinical knowledge** |
| **Multi-source reasoning** | Single window | Multi-modal retrieval | **RAG for evidence synthesis** |

The hybrid **Self-ROUTE** approach (Li et al., 2024) enables the model to self-select RAG or long-context per query, reducing costs while maintaining quality. For clinical systems, RAG should be the default with long-context reserved for holistic patient understanding tasks (e.g., "summarize this patient's 5-year treatment history").

### Prompt caching delivers 10× cost reduction

Prompt caching mechanisms are now available from all major providers and are critical for clinical RAG cost management. Manus reports that the **KV-cache hit rate is the single most important metric** for production agents — with Claude Sonnet, cached input tokens cost $0.30/MTok versus $3/MTok uncached, a **10× difference**.

The clinical caching strategy follows a layered approach: stable system prompts (clinical safety instructions, reasoning guidelines, output format specifications) are placed first to maximize prefix cache hits across all sessions. Standard clinical guidelines are cached and shared within the same clinical context. Per-session patient documents benefit from within-session caching. The structure is: static content first → semi-static cached references → dynamic conversation history → user query last. **Cache isolation is critical** — caches must never be shared across patient contexts or organizational boundaries, aligned with Phase 1's zero-trust security model. vLLM's per-request `cache_salt` prevents timing-based attacks where an adversary could infer cached content by observing latency differences.

---

## 6. Production architecture for an end-to-end clinical RAG pipeline

### Reference architecture: the clinical multi-evidence pipeline

The complete pipeline integrates the components described in Sections 2–5 into a production system:

```
[Ingestion] → [Extraction/NER] → [Chunking] → [Embedding] → [Indexing]
                                                                  ↓
[Query] → [Query Processing] → [Hybrid Retrieval] → [Cross-Encoder Reranking]
                                    ↓                         ↓
                              [KG Traversal]        [Discrepancy Filtering]
                                    ↓                         ↓
                              [Context Assembly] ← [Budget Allocation]
                                    ↓
                              [Generation with Citations]
                                    ↓
                              [Faithfulness Verification]
                                    ↓
                              [Auditable Response]
```

**Ingestion layer** handles clinical document types (PDFs, HL7 FHIR resources, DICOM metadata, scanned documents via OCR) through connectors to EHR systems — integrating with Phase 1's EHR integration patterns. **NER/Entity extraction** using MedCAT v2 or Spark NLP identifies medical entities and links them to UMLS/SNOMED CT CUIs, storing as structured metadata alongside chunks. **Hybrid retrieval** runs BM25 and dense embedding search in parallel with Reciprocal Rank Fusion. **KG traversal** provides multi-hop reasoning for drug interactions and guideline navigation. **Context assembly** applies the dynamic budgeting and compression from Section 5, compiling the final context window from retrieved evidence, conversation history, and system instructions.

### Infrastructure decisions: vector databases and embedding serving

| Component | Recommended choice | Rationale |
|-----------|-------------------|-----------|
| **Vector database** | Milvus/Zilliz (self-hosted) or Qdrant | Milvus: billion-scale, P95 <30ms, C++ foundation. Qdrant: complex metadata filtering critical for clinical data (filter by patient, date, document type). pgvector for existing PostgreSQL infrastructure. |
| **Graph database** | Neo4j | Official SNOMED CT loader, APOC plugins, vector search support, Bloom visualization, proven at scale (625K+ clinical nodes) |
| **Embedding model** | BioClinical ModernBERT (on-premises) or Voyage AI voyage-3-large (API) | 8,192-token context enables larger clinical chunks; domain-specific training critical for clinical text |
| **Reranker** | Jina Reranker v3 (self-hosted) or Cohere Rerank 4 Pro (API) | SOTA BEIR performance with biomedical training; sub-200ms latency |
| **Orchestration** | LangGraph (Phase 1) + LangSmith observability | Full control over agent state; traces all context assembly decisions |
| **Evaluation** | RAGAS + DeepEval in CI/CD | Automated faithfulness gates; regression testing against clinical golden datasets |

### Latency optimization targets sub-2-second response

Clinical workflow integration demands sub-2-second end-to-end response time. The optimization stack:

- **Multi-tier caching**: Retriever-level (vector search results cached by query hash), prompt-level (SHA256 of query + context), response-level (semantic similarity for near-duplicate queries). Redis achieves 90% precision at 200ms median across 1 billion vectors.
- **Async retrieval**: Parallelizing BM25, dense retrieval, and KG traversal. Async patterns demonstrated **92% improvement** in throughput.
- **Two-stage retrieval**: Binary embeddings for coarse retrieval → full-precision reranking, achieving **96.45% of full precision at 10× speed**.
- **Quantization**: int8 embeddings achieve 4× memory reduction retaining 96% performance; binary quantization achieves 32× compression retaining 92–96% performance.

### Real-world clinical RAG case studies

**Clinical RAG for Preoperative Medicine** (*npj Digital Medicine*, 2025): GPT-4 with RAG using international surgical guidelines achieved **96.4% accuracy versus 86.6% for human responses** (p=0.016) on surgical fitness assessment, with zero hallucinations, using LlamaIndex Auto-Merging Retrieval.

**Stanford ChatEHR** (2025): Enables clinicians to "chat" with patient medical records, automatically summarizing charts that often span hundreds of pages for transfer patients, condensing into relevant summaries with follow-up question capability.

**Self-Correcting Agentic Graph RAG for Hepatology** (*Frontiers in Medicine*, 2025): State-driven system with retrieve-evaluate-refine loops over a clinically-verified hepatology knowledge graph. Agents dynamically generate, semantically validate, and iteratively optimize graph search strategies, with deterministic strategy optimization for stable, controllable refinement and explicit disclaimers when evidence is insufficient.

**MedRAG/MIRAGE Benchmark** (ACL 2024 Findings): Testing 41 retrieval combinations across 7,663 medical questions, the combined MedCorp (PubMed + StatPearls + Textbooks + Wikipedia) with RRF-4 fusion achieved best results. The key finding: **GPT-3.5 + MedRAG ≈ GPT-4 standalone performance**, demonstrating that retrieval quality can substitute for model scale — a critical insight for cost-constrained clinical deployments.

---

## 7. Risks, failure modes, and open questions

### Retrieval failures can be silent and dangerous

The most dangerous failure mode in clinical RAG is **silent retrieval failure** — when the system fails to retrieve critical information but generates a confident response anyway. Missing a drug interaction, an outdated guideline, or a relevant allergy is worse than returning "I don't know." The MEGA-RAG architecture's DISC stage (discrepancy-identified self-clarification) and the self-correcting hepatology system's explicit disclaimers represent architectural mitigations, but no system achieves perfect recall.

**Embedding drift** occurs when the distribution of queries or documents shifts over time, degrading retrieval quality without obvious symptoms. Monitoring requires continuous comparison of embedding distributions and retrieval quality metrics against golden test sets. Re-indexing strategies should be scheduled quarterly for clinical knowledge bases, with event-triggered re-indexing when major guideline updates occur.

### Privacy-preserving retrieval remains an active research frontier

Retrieving from federated clinical sources without centralizing PHI is a fundamental requirement that lacks mature solutions. The **Dual Federated RAG (DF-RAG)** framework separates federated learning into retrieval and generation components using LoRA fine-tuning, with each institution maintaining local de-personalized knowledge graphs, achieving **133% improvement** over baselines. **HyFedRAG** provides a more complete solution with three-tier caching (reducing latency by up to 80%) and integration of three anonymization tools (Presidio, Eraser4RAG, TenSEAL encryption). These approaches integrate with Phase 1's federated memory architecture but remain pre-production in most deployments.

### Cost management for high-volume clinical RAG

Production RAG cost structures typically allocate: embedding generation (40–60%), vector storage (20–35%), LLM inference (15–25%), and infrastructure/operations (10–20%). Key optimization levers:

- **Smart model routing**: Simple clinical queries (medication lookup) route to smaller models (GPT-4o-mini, Claude Haiku); complex diagnostic reasoning routes to full models — **60–80% cost reduction**
- **Self-hosted embedding models**: Breakeven at ~50–100M tokens/month versus API pricing
- **Semantic caching**: Redis LangCache achieves up to **73% cost reduction** for semantically similar queries
- **Quantized embeddings**: int8 achieves 4× memory reduction; Azure AI Search demonstrated **92.5% cost reduction** ($1,000/month → $75/month) with advanced compression

Regulatory overhead adds **10–20%** to pipeline costs through audit logging, access controls, PHI detection, and compliance monitoring — a non-negotiable cost for clinical systems.

---

## 8. Cross-references to Phase 1 and recommended next phases

### Mapping to Phase 1: orchestration and memory

Context engineering (this Phase) and orchestration topology (Phase 1) are complementary layers of the same system. The **LangGraph StateGraph** from Phase 1 carries the agent state through which context budgets, compression decisions, and retrieval strategies are propagated. The **three-tier memory hierarchy** (working context, episodic memory, institutional knowledge) is the *storage* layer; the RAG pipeline described here is the *assembly* layer that selects, compresses, and composes information from these stores into the LLM's active window.

Phase 1's **MCP/A2A protocols** define how agents discover and invoke tools — including RAG retrieval tools. The tool context from MCP servers must be accounted for in context budgets (Section 5), and tool definitions should be dynamically loaded based on query intent rather than statically included.

Phase 1's **zero-trust security model** extends to the RAG pipeline through cache isolation (per-request cache salts), federated retrieval (DF-RAG, HyFedRAG), and role-based document access filtering during retrieval. The **Temporal workflow engine** from Phase 1 provides the durability guarantees needed for long-running clinical RAG pipelines where retrieval, reranking, and generation may span multiple services.

### Recommended next phases

**Phase 3 — Clinical Agent Specialization & Safety Guardrails**: Design patterns for specialized clinical agents (triage, diagnosis, treatment planning, discharge, medication reconciliation), clinical guardrail architectures (input/output validation, scope limitation, escalation protocols), and human-in-the-loop integration patterns for high-stakes clinical decisions.

**Phase 4 — Evaluation, Testing & Regulatory Compliance**: Comprehensive testing frameworks for clinical AI systems, FDA/CE regulatory pathways for AI-enabled clinical decision support, red-teaming methodologies for clinical agents, and continuous monitoring architectures for production clinical AI.

**Phase 5 — Deployment Patterns & Operational Excellence**: Infrastructure-as-code for clinical AI, blue-green deployment strategies for model updates, A/B testing frameworks for clinical RAG pipelines, and incident response protocols for AI-generated clinical errors.

---

## Conclusion

Context engineering is not an incremental improvement over prompt engineering — it is a **category shift** from crafting instructions to designing information systems. The clinical context carries stakes that general-purpose AI never faces: a poisoned context can propagate an incorrect diagnosis, a distracted model can miss a lethal drug interaction, and a stale context can recommend a treatment that guidelines now contraindicate.

The MEGA-RAG architecture demonstrates that combining dense, sparse, and graph-based retrieval with cross-encoder reranking and discrepancy-aware self-clarification achieves measurable safety improvements (>40% hallucination reduction). But the architecture only works when integrated with rigorous context management — dynamic budgeting that allocates the attention budget where it matters, compression that preserves clinical signals while discarding noise, and isolation that prevents cross-contamination between agents.

Three findings from this research should reshape architecture decisions. First, **retrieval quality can substitute for model scale**: GPT-3.5 with MedRAG matches GPT-4 standalone, meaning investment in the retrieval pipeline yields higher returns than simply upgrading the LLM. Second, **adaptive chunking that respects clinical document structure** outperforms naive approaches by 37 percentage points — document-aware ingestion is not optional. Third, **contradiction detection remains unsolved at the model level** (even SOTA LLMs perform barely above chance), requiring architectural mitigation through temporal weighting, evidence grading, and multi-agent debate rather than relying on the LLM to detect conflicts itself.

The path forward requires treating context engineering as infrastructure — as fundamental to clinical AI as the database layer is to EHR systems — and staffing accordingly. Cognizant's deployment of 1,000 context engineers signals that the industry recognizes this. For clinical AI teams, the immediate priorities are: implement hybrid retrieval with clinical-specific embedding models, build the knowledge graph backbone from SNOMED CT/UMLS, deploy cross-encoder reranking with faithfulness verification, and establish the evaluation pipeline with clinical golden datasets before scaling to production.