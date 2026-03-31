# Orchestration topologies and federated memory for agentic AI in healthcare

**Architecture matters more than model capability for clinical AI agents.** A March 2026 Mount Sinai study demonstrated that orchestrated multi-agent systems maintained **90.6% accuracy at scale** while single agents collapsed to 16.6% under identical clinical workloads — using up to 65× fewer tokens. This finding reframes the entire design conversation: task partitioning and memory architecture, not model selection, determine whether clinical AI systems survive contact with production. This Phase 1 reference document maps the topology, memory, integration, and security landscape a technical team needs to architect a robust agentic harness for clinical workflows. It synthesizes the latest research (2024–2026), production deployment data from Microsoft, Hippocratic AI, and major health systems, and emerging interoperability standards (MCP, A2A) into actionable architectural guidance for both greenfield and brownfield clinical environments.

---

## 1. Four orchestration topologies and when each fits clinical workflows

Clinical agentic systems organize around four primary orchestration topologies. Each carries distinct tradeoffs across latency, auditability, fault tolerance, and regulatory fitness. The right choice depends on workflow structure — not on framework preference.

### Sequential (pipeline/chain)

Agents execute in a deterministic linear chain where each stage's output feeds the next. A common state object propagates through the pipeline, and invocation order is externally defined — agents never choose their successors. This maps directly to the **pipes-and-filters** cloud design pattern documented in Microsoft's Azure Architecture Center.

**Clinical fit:** Clinical coding refinement pipelines, prior authorization workflows, and medication reconciliation. A TATEEDA implementation demonstrates the pattern: documentation agent drafts SOAP sections → FHIR agent pulls medications/allergies → observer agent validates required fields and catches contradictions before chart entry. Each step builds deterministically on the previous, producing an auditable chain. Sequential topology offers **excellent debuggability** and deterministic reproducibility ideal for regulatory validation, but suffers from additive latency (total time = sum of all stages) and single-chain fragility — if an early stage fails or hallucinates, all downstream stages receive corrupted input with no recovery path.

### Concurrent (fan-out/fan-in)

Multiple agents execute simultaneously on the same input; an initiator dispatches work and a collector aggregates results. Parallel agents operate independently — no inter-agent communication during execution. Aggregation strategies include voting/majority-rule, weighted confidence scoring, or LLM-synthesized summaries.

**Clinical fit:** Differential diagnosis (cardiology, pulmonology, neurology agents producing independent hypotheses simultaneously), multi-perspective chart review, and parallel lab/imaging interpretation. Microsoft's Healthcare Agent Orchestrator uses this pattern to coordinate radiology (CXRReportGen), pathology (Paige.ai Alba), and genomics agents in parallel for tumor board preparation — deployed at **Stanford Medicine, Johns Hopkins, Mass General Brigham, and University of Wisconsin**. Tasks that previously took clinicians hours complete in minutes. The key advantage is **latency reduction** (total time = max of individual agent times) and graceful degradation if one agent fails. The disadvantage is resource intensity and the need for explicit conflict resolution when agents produce contradictory outputs.

### Hierarchical (intent decomposition + synthesis)

A supervisor agent receives a complex intent, decomposes it into subtasks, delegates to specialist workers, monitors progress, validates outputs, and synthesizes a final unified response. The orchestrator enforces principle-of-least-privilege — each agent receives only data necessary for its specific task. This is the **most compliance-friendly topology** because every delegation step is logged, policy-enforceable, and auditable.

**Clinical fit:** Complex discharge planning (pharmacy, scheduling, education, admin, logistics agents coordinated by a supervisor), treatment plan generation, and tumor board orchestration. The Mount Sinai study (Klang et al., *npj Health Systems*, 2026) formally validated this topology: at 80 simultaneous clinical tasks, the orchestrated multi-agent system sustained **65.3% accuracy versus 16.6% for a single agent** (p < 0.01). The critical insight was that task partitioning — giving each worker only tokens relevant to a single decision — prevents context interference. Every intermediate call was logged and replayable, producing a complete audit trail. The tradeoff is token overhead (orchestrator reasoning adds ~200%+ overhead) and the orchestrator becoming a single point of failure.

### Decentralized (cross-boundary, peer-to-peer)

Agents operate autonomously across organizational boundaries, coordinating through shared protocols without a central orchestrator. Each organization maintains sovereignty over its own agents and data. Coordination occurs via standardized protocols (A2A, FHIR), shared event streams, or federated learning mechanisms.

**Clinical fit:** Cross-organizational health information exchange (Hospital A's EHR agent communicating with Payer C's authorization agent), federated clinical trials across institutions, multi-facility care transitions, and pandemic surveillance networks. Moritz, Topol, and Rajpurkar's MASH framework (*Nature Biomedical Engineering*, 2025) envisions decentralized yet coordinated AI ecosystems where domain-specialized agents collaborate across institutions — a "distributed form of artificial general intelligence in healthcare." Federated learning variants enable collaborative model training without sharing raw PHI, achieving **96.1% accuracy with privacy budget ε = 1.9**. The topology offers maximum resilience (no single point of failure) and data sovereignty compliance, but **auditing cross-organizational decisions is extremely difficult**, and eventual consistency challenges make it unsuitable for time-critical clinical decisions without additional safeguards.

### Decision matrix for topology selection

| Criterion | Sequential | Concurrent | Hierarchical | Decentralized |
|---|---|---|---|---|
| **Latency tolerance** | High (additive) | Low (parallel) | Medium (coordinator overhead) | Variable (network-dependent) |
| **Fault tolerance** | Low (chain breaks) | Medium (graceful degradation) | Medium (orchestrator is SPOF) | High (no SPOF) |
| **Data sensitivity** | Moderate | Moderate (fan-out exposure) | High (least-privilege enforced) | Highest (data stays local) |
| **Regulatory auditability** | Good (deterministic trail) | Good (independent outputs) | Best (full governance) | Complex (cross-org challenges) |
| **Workflow complexity** | Low (linear) | Low-Medium (independent tasks) | High (nested, dynamic routing) | Highest (cross-boundary) |
| **Debuggability** | Excellent | Good | Very good | Poor |

**Practical guidance:** Start with hierarchical topology for most clinical workflows — it provides the strongest governance profile while supporting both sequential and parallel delegation within the hierarchy. Graduate to concurrent for latency-sensitive tasks (diagnosis, imaging interpretation) and decentralized only for cross-organizational workflows where data sovereignty is non-negotiable. Sequential suits narrow, deterministic pipelines where simplicity and auditability outweigh latency concerns.

---

## 2. Federated memory architecture across three stratified layers

Memory architecture for clinical multi-agent systems follows a cognitive hierarchy inspired by the MemGPT/Letta paradigm (Packer et al., UC Berkeley), which maps operating system memory management (RAM ↔ disk paging) to LLM context management. For clinical workflows, this hierarchy stratifies into three layers that govern how patient data, encounter state, and institutional knowledge flow between agents.

### Working context, episodic memory, and institutional knowledge

**Working context** (analogous to RAM) holds the active conversation and task state: current patient encounter data, vital signs, active complaints, and the agent's immediate task context. Managed via core memory blocks — structured, labeled, editable storage units within the LLM's context window. When context fills, eviction proceeds through recursive summarization. Letta's "sleep-time compute" (2025) offloads memory management to specialized background agents during idle periods, enabling non-blocking memory operations critical for clinical response latency.

**Episodic memory** (analogous to page file/swap) captures complete encounter sessions as resumable checkpoints. Patient visit histories within the current episode of care, clinical decision chains, and intermediate agent outputs persist here. Implementation uses recall memory with LangGraph-style checkpoints, enabling "time travel" debugging and audit trails. This layer supports the regulatory requirement to reconstruct any clinical decision path after the fact.

**Institutional knowledge** (analogous to disk storage) holds long-term organizational knowledge: clinical protocols, drug formularies, clinical decision support rules, patient longitudinal records spanning years, and population-level analytics. Stored in archival memory using vector stores, graph databases, and relational systems, queried via RAG/tool calls when clinically relevant.

**Data movement between layers** follows promotion and eviction rules: important findings from working context auto-checkpoint to episodic memory, curated insights promote to institutional knowledge, and institutional knowledge is retrieved into working context via RAG when triggered by clinical relevance signals. Letta's Conversations API (January 2026) enables shared agent memory across concurrent experiences — directly enabling multi-agent clinical workflows where scribe, triage, and coder agents access the same patient context simultaneously.

### External store technologies compared for clinical data

The choice of external store significantly impacts retrieval quality, compliance posture, and operational complexity. **Hybrid approaches combining vector and graph stores outperform either alone** for clinical data — the MediGRAF system (Thio et al., *Frontiers in Digital Health*, 2026) achieved **100% recall for factual queries** and zero safety violations on MIMIC-IV data by combining Neo4j graph traversal with vector embeddings.

**Vector stores** serve narrative clinical text — notes, discharge summaries, radiology reports. **Pinecone** offers the strongest compliance posture for production clinical systems (SOC 2 Type II, HIPAA-ready, VPC peering) with minimal operational overhead. **Weaviate** excels at hybrid search combining semantic similarity with keyword/metadata filters — ideal for clinical note search where both structured codes and narrative text matter. **Qdrant** handles complex metadata filtering (diagnosis codes, date ranges, departments combined with semantic search). **FAISS** (Meta) provides maximum raw performance for research pipelines and offline clinical NLP but requires self-managed compliance infrastructure.

**Graph databases** handle structured, relationship-heavy clinical data. **Neo4j** dominates clinical knowledge graph applications. A 2025 medRxiv study integrating MIMIC-IV with SNOMED-CT built a unified graph of **625,708 nodes and 2,189,093 relationships** showing **5.4× to 48.4× faster execution** than PostgreSQL across clinical query types. Patient journey modeling maps naturally to labeled property graphs — patients, conditions, drugs, procedures as nodes connected by HAS_CONDITION, PRESCRIBED_DRUG relationships. The recommended architecture combines a vector store for unstructured retrieval with Neo4j for structured relationship traversal, with an orchestration layer routing queries to the appropriate engine based on query type.

### State persistence patterns for auditability and compliance

Three persistence patterns apply to clinical multi-agent systems, each with distinct compliance properties:

**LangGraph checkpointed state machines** save full snapshots at every super-step boundary. Each checkpoint captures all variables, tool outputs, LLM responses, and decision history. Production backends include PostgreSQL (AsyncPostgresSaver) and CosmosDB. Checkpointing enables human-in-the-loop (pause execution, allow clinician approval, resume), time-travel debugging (replay any prior execution, inspect intermediate state), and fault tolerance (resume from last successful step after crashes). The typed state schema makes workflows auditable, but requires careful versioning across deployments.

**Event-sourced state** records all state changes as immutable, append-only events — current state is reconstructed by replaying events chronologically. This pattern naturally produces the complete audit trail healthcare regulators require. A 2026 study (Mukherjee, IJETCSIT) proposes event sourcing with **perspective-specific projections** — the same clinical events projected differently for clinicians (clinical view), billers (coding view), researchers (analytics view), and quality teams (compliance view) — solving the perspective conflict problem endemic to clinical information systems.

**CQRS (Command Query Responsibility Segregation)** separates write and read paths into fundamentally different models synchronized via asynchronous event projection. Clinical dashboards (read-heavy) don't compete with documentation workflows (write-heavy). The tradeoff is eventual consistency — read data may lag writes, which is problematic for real-time clinical decisions requiring up-to-the-second accuracy. Apache Kafka provides natural CQRS segregation: write events to topics, consume from materialized views.

### Cross-agent state sharing without conflicts

When scribe, triage, scheduler, and coder agents simultaneously read and write shared patient state, concurrency control becomes safety-critical. **CRDTs (Conflict-free Replicated Data Types)** automatically resolve conflicts without coordination — each replica updates independently and all replicas are guaranteed to eventually converge. OR-Sets work for active problem and medication lists (add/remove with conflict resolution), LWW-Registers for patient status fields (most recent update wins), and G-Sets for immutable audit log entries. Redis Enterprise uses CRDTs for active-active geo-distribution at scale.

For safety-critical fields where CRDTs' lack of invariant enforcement is insufficient (medication counts cannot go negative), combine CRDTs with application-level validation and pessimistic locking on critical sections. The recommended hybrid for clinical multi-agent systems uses **shared state** (Redis with CRDTs) for critical patient context, **message-passing** (Kafka) for workflow coordination between agents, and **event sourcing** for the immutable audit trail.

### Resumability through saga orchestration and durable execution

Clinical workflows span minutes to days. The **saga pattern** decomposes distributed transactions into sequences of local transactions with compensating actions. For a medication order saga: scribe documents intent → CDS validates drug interactions → coder assigns billing codes → scheduler books follow-up → EHR commits order. If drug interaction validation fails, compensating transactions reverse documentation. Orchestrated sagas (recommended for clinical) use a central coordinator managing the entire workflow with visibility into every step, producing audit trails that satisfy compliance requirements.

**Temporal.io** provides the strongest durable execution guarantees: workflows automatically hold state over long periods (even years), survive process and machine failures, and support human-in-the-loop via Signals and Queries. Combined with LangGraph for agent logic, this creates a **LangGraph + Temporal hybrid** where LangGraph handles LLM orchestration and HITL workflows while Temporal serves as the durable execution backbone for mission-critical clinical workflows.

---

## 3. Framework landscape and the MCP/A2A standards convergence

### Orchestration frameworks ranked for clinical suitability

| Capability | LangGraph | Semantic Kernel | Temporal (custom) | CrewAI | AutoGen |
|---|---|---|---|---|---|
| **Orchestration model** | Directed graph / state machine | Plugin middleware | Workflow-as-code | Role-based crews | Conversational |
| **State persistence** | ★★★★★ | ★★★★ | ★★★★★ | ★★★ | ★★ |
| **Human-in-the-loop** | ★★★★★ | ★★★ | ★★★★★ | ★★★ | ★★★ |
| **Fault tolerance** | ★★★★ | ★★★★ | ★★★★★ | ★★★ | ★★ |
| **Observability** | ★★★★★ (LangSmith) | ★★★★ (OpenTelemetry) | ★★★★ (Temporal UI) | ★★ | ★★★ |
| **Production maturity** | ★★★★★ (v1.0) | ★★★★ (RC → MS Agent Framework) | ★★★★★ | ★★★ | ★★★ (maintenance mode) |
| **Clinical suitability** | ★★★★★ | ★★★★ | ★★★★★ | ★★★ | ★★ |

**LangGraph** (25K+ GitHub stars, v1.0 stable) emerges as the strongest general-purpose framework for clinical AI. Its graph-based state machines map directly to clinical workflow requirements: branching at decision points, approval gates for clinician oversight, and error recovery paths. Best-in-class human-in-the-loop support includes `interrupt_before`/`interrupt_after` parameters, `Interrupt()` primitives that pause execution and present information to humans, and `Command(goto=...)` for dynamic routing based on clinician decisions. Graph state persists through the checkpoint layer — workflows can pause safely and resume hours or days later.

**Semantic Kernel** (27K+ stars) offers the strongest enterprise security model and is evolving into the Microsoft Agent Framework (merging with AutoGen). Microsoft's Healthcare Agent Orchestrator — deployed at Oxford University Hospitals for tumor board MDTs, Stanford Medicine, and Johns Hopkins — is built on this foundation. The C#/Java strong typing is valuable for safety-critical medical applications, and Azure ecosystem integration suits Microsoft-heavy healthcare IT environments. However, it offers less flexibility than LangGraph for complex agentic workflows.

**Temporal.io** provides the highest reliability guarantees for mission-critical clinical workflows. Durable execution survives process and machine failures; workflows automatically hold state over arbitrarily long periods. Combined with LangGraph (agent logic as Temporal Activities), it creates the most robust production architecture. The tradeoff is significantly higher implementation complexity requiring distributed systems expertise.

**CrewAI** (20K+ stars) maps intuitively to clinical team structures (radiologist, pharmacist, scheduler agents) and offers the fastest prototyping time. However, weaker state persistence, limited human-in-the-loop capabilities, and logging challenges make it less suitable for production clinical systems where audit trails are mandatory.

**AutoGen** (50K+ stars) has been shifted to **maintenance mode** by Microsoft in favor of the broader Microsoft Agent Framework. Its conversational model produces non-deterministic execution flows that are harder to audit — a significant regulatory concern. Novo Nordisk uses AutoGen for pharmaceutical data science, but new clinical system investments should avoid frameworks in maintenance mode.

### MCP and A2A form complementary protocol layers

Two emerging protocols are converging to define the interoperability standard for agentic AI systems, and both have significant healthcare implications.

**Model Context Protocol (MCP)**, created by Anthropic and donated to the Linux Foundation's Agentic AI Foundation in December 2025, standardizes how AI agents connect to external tools and data sources — functioning as "HTTP for AI models." It uses JSON-RPC 2.0 over multiple transports and has been adopted by Anthropic, OpenAI, Google DeepMind, and Hugging Face. The November 2025 spec update added OAuth 2.0 security, async operations, and a community registry. For healthcare, **30+ MCP servers** already exist, including multiple FHIR implementations: WSO2's FHIR MCP Server supports Epic/Cerner OAuth2 integration, Josh Mandel's health-record-mcp implements SMART on FHIR OAuth flows for comprehensive EHR data retrieval, and langcare-mcp-fhir provides an enterprise EHR proxy with TLS 1.3 and PHI scrubbing. Additional servers cover PubMed research, clinical trials matching, FDA drug data, DICOM imaging, and ICD-10/LOINC terminology. A FHIR Implementation Guide for MCP is being defined as a formal standard.

**Agent-to-Agent Protocol (A2A)**, launched by Google in April 2025 and donated to the Linux Foundation in June 2025, enables agent-to-agent communication — complementing MCP's agent-to-tool focus. Built on HTTP, JSON-RPC, and SSE, A2A introduces Agent Cards (JSON at `/.well-known/agent.json`) for capability discovery, stateful Tasks with defined lifecycles, and modality negotiation. Version 0.3 (July 2025) added gRPC support and signed security cards. **150+ organizations** now support the protocol. A DeepLearning.AI course with Google Cloud and IBM Research builds a healthcare multi-agent system as its primary example: a Healthcare Concierge Agent orchestrating Policy, Research, and Provider agents across different frameworks (BeeAI, Google ADK, LangGraph) communicating via A2A with MCP for EHR data access.

**The strategic implication:** MCP + A2A together create a complete interoperability stack where agents use MCP to connect to tools/data and A2A to communicate with each other. This enables multi-vendor healthcare agent ecosystems — a hospital's EHR agent (Epic) can communicate with an insurance company's claims agent (different vendor) without exposing internal implementation details. Both protocols are governed by the Linux Foundation, reducing vendor lock-in risk. Security concerns remain active: a April 2025 analysis identified MCP vulnerabilities including prompt injection, tool permission escalation, and lookalike tool attacks. The June 2025 spec added PKCE and confused deputy mitigations, but core supply chain vulnerabilities are still being addressed.

---

## 4. Greenfield versus brownfield integration patterns

### Brownfield reality: navigating Epic, Oracle Health, and athenahealth

Brownfield integration with existing EHR infrastructure dominates real-world deployment. Three systems control the vast majority of the US market.

**Epic** (36%+ US hospital market, 250M+ patient records) exposes FHIR R4 APIs through Epic Interconnect with OAuth 2.0/JWT authentication. Read access is achievable; write access requires additional security validation and site-specific approval. Rate limits vary by customer configuration — Epic explicitly warns against API polling as "inherently wasteful" and recommends event-driven alternatives (FHIR Subscriptions, CDS Hooks, ADT event feeds). CDS Hooks support `patient-view`, `order-select`, and `order-sign` hooks with a **500ms response expectation**. HL7v2 interfaces (ADT, ORM, ORU) via Epic Bridges remain essential for real-time event-driven data. The critical architectural pattern: implement caching orchestrators for rate-limited FHIR reads with TTL aligned to clinical data change frequency, and use ADT feeds for real-time state changes.

**Oracle Health (Cerner)** (25% US acute care market, 235M+ records) transitioned fully to FHIR R4 after deprecating DSTU2 in December 2025. Ignite APIs provide standard FHIR endpoints with SMART on FHIR scopes. Integration timelines run **15–20% faster than Epic** due to centralized hosting and accessible sandboxes, though Cerner code value resolution adds complexity. Avoid proprietary Millennium APIs for new development due to migration risk as Oracle evolves the platform.

**Athenahealth** offers 800+ proprietary REST API endpoints (predating FHIR) alongside FHIR R4 APIs. Rate limits return `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers with HTTP 429 on excess — implement exponential backoff with jitter. Webhooks/subscriptions cover most real-time notification needs.

**The essential abstraction:** Design an adapter layer between application logic and EHR-specific API calls. Use FHIR R4 as the common data access layer. Build EHR-specific adapters only for proprietary features unavailable through FHIR. This pattern — combined with MCP FHIR servers — allows agents to interact with any FHIR-compliant EHR through a single interface.

### Middleware and event-driven integration architecture

**Mirth Connect** (NextGen Connect) powers one-third of all US public Health Information Exchanges. Its channel-based architecture handles HL7v2 parsing, validation, and transformation with FHIR support for hybrid architectures. For systems exceeding **50K messages/day**, combine Mirth with Apache Kafka:

The production pattern (validated at Nirmitee): EHR → Epic Bridges (HL7v2) → Mirth Connect (transform/route) → Kafka Topics → multiple consumers (real-time alerting, data warehouse ETL, audit service, AI/ML pipelines). This decouples AI agents temporally and spatially from EHR systems, eliminates rate-limit pressure on FHIR APIs for read-heavy workloads, and provides a natural audit trail through Kafka's immutable log.

### Greenfield bootstrapping sequence

For new clinical agentic systems, the recommended bootstrapping sequence follows a four-phase approach aligned with the foundational four-component framework (planning, action, reflection, memory):

- **Phase 1:** Build FHIR data access layer (read-only), authentication/authorization via SMART on FHIR, basic agent skeleton with mandatory human-in-the-loop for all outputs
- **Phase 2:** Add event-driven integration (ADT feeds, CDS Hooks), memory persistence (checkpointed state machines), and immutable audit logging
- **Phase 3:** Multi-agent orchestration with hierarchical topology, write-back capabilities to EHR, and advanced clinical decision support
- **Phase 4:** Cross-vendor interoperability via MCP/A2A, federated deployment across facilities, and automated governance with policy enforcement

A Unified Agent Lifecycle Management (UALM) framework (arXiv 2601.15630) specifies five control-plane layers for greenfield architectures: identity/persona registry with non-human identity management, orchestration and cross-domain mediation, PHI-bounded context and memory, runtime policy enforcement with kill-switch triggers, and lifecycle management linked to credential revocation and audit logging.

### Migration strategies: shadow mode before canary before production

Clinical AI deployment follows a validated three-stage pattern:

**Shadow mode** runs the new system alongside production with predictions not used clinically. 100% of production traffic duplicates to the shadow environment; all requests and predictions log with correlation IDs. Only the ML team sees results. This validates performance under realistic conditions with zero patient risk. Duration: 2–4 weeks.

**Canary release** gradually routes live traffic: 1% → 5% → 20% → 50% → 100%, with daily analysis of predictions and user satisfaction at each ramp. Define automatic rollback thresholds beforehand (latency +10%, AUC drop >5%, error rate exceeding baseline). Duration: days to 2 weeks.

**Full production** routes 100% traffic to the new system while keeping the old version ready for rollback for at least several days. Feature flags enable granular control per department, per clinician, per patient population. A deterministic kill switch must exist for immediate fallback to human-only workflows.

Key statistics frame the challenge: **only 53% of AI projects reach production** (Gartner), healthcare rates are even lower, EHR integration takes 6–18 months (often longer than model development), and hospital downtime costs **$7,900–$11,000 per minute**.

---

## 5. Cryptographic memory vault and zero-trust agent security

The most directly relevant production security architecture comes from "Caging the Agents" (arXiv 2603.17419, March 2026), authored by the VP of Trust at Commure — a healthcare technology company serving major hospital networks. This paper describes a **zero-trust security architecture for 9 autonomous AI agents** hardened over a 90-day longitudinal process.

### Four-layer defense-in-depth for clinical agents

The architecture addresses a six-domain threat model mapped to HIPAA Security Rule provisions: credential exposure, execution capability abuse, network egress exfiltration, prompt integrity failures, database access risks, and fleet management vulnerabilities. The defense deploys in four layers:

**Kernel isolation** containerizes agents on Kubernetes with strict namespace/pod security policies. **Credential proxy** eliminates direct credential access — agents obtain credentials through a proxy issuing least-privilege, time-bounded tokens. **Network egress policy** enforces strict controls preventing data exfiltration to attacker-controlled destinations. **Prompt integrity framework** protects against indirect prompt injection, instruction spoofing, and cross-agent contamination. An automated fleet security audit agent continuously scans for credential exposure, permission drift, and configuration divergence — discovering and remediating **4 HIGH severity findings** during the hardening process.

### Confidential computing closes the data-in-use gap

Traditional encryption protects data at rest and in transit, but data must be decrypted in RAM for AI processing — creating a vulnerability window. **Confidential computing** using hardware Trusted Execution Environments (TEEs) closes this gap. Google Cloud's Confidential Zero-Trust Framework (arXiv 2511.11836) combines Identity-Aware Proxy, Cloud IAM, and VPC Service Controls with TEEs for micro-segmented clinical AI processing. AMD SEV-SNP (VM-level memory encryption with minimal overhead) on Azure and GCP, and AWS Nitro Enclaves (isolated compute with cryptographic attestation, no persistent storage or network access within the enclave) provide the hardware foundation. Hospitals can collaboratively train models on patient data without exposing PHI — model inference runs within the TEE, preventing unauthorized access to both model weights and input data.

### HIPAA 2026 mandates eliminate the "addressable" loophole

The January 2025 HHS proposed rule (Federal Register 2024-30983) eliminates the distinction between "required" and "addressable" safeguards — **all safeguards become mandatory for ePHI**. Key provisions affecting agent architectures:

- **AES-256 encryption at rest** and **TLS 1.2+ in transit**: mandatory, no exceptions
- **Multi-factor authentication**: required for all system access
- **Network segmentation**: required, micro-segmentation with zero-trust principles recommended
- **Access revocation**: within 1 hour of termination
- **Annual compliance audits**: formal testing and verification every 12 months
- **All AI systems touching PHI** must be included in risk analysis and risk management plans

The expected final rule date is May 2026 with a 240-day compliance window. Per-agent identity management with SMART on FHIR scopes applied per agent (e.g., `patient/Observation.read` for a scribe agent, `patient/MedicationRequest.write` for an ordering agent) satisfies the minimum-necessary standard. **HashiCorp Vault** as centralized secrets manager with AWS KMS or Azure Key Vault as backend for envelope encryption provides the recommended key management architecture — Vault handles agent credential management and dynamic secrets while KMS provides the hardware-backed root of trust.

---

## 6. Risks that can kill clinical agent systems and how to mitigate them

The Gradient Institute's July 2025 report — a rigorous 74-page analysis — identifies six failure modes unique to multi-agent systems, summarized in one principle: **"A collection of safe agents does not guarantee a safe collection of agents."**

### Hallucination cascading and conformity bias

When one agent hallucinates, fabricated output enters another agent's context as if factual, potentially amplifying through the chain. A comprehensive taxonomy (arXiv 2509.18970) identifies 18 triggering causes across reasoning, execution, perception, and memorization stages. Conformity bias compounds the problem: agents reinforce each other's errors rather than providing independent evaluation, creating dangerous false consensus. In clinical decision-making where independent verification is essential, this represents a life-safety risk.

Mitigation requires **multi-model diversity** (different foundation models across agents to avoid monoculture collapse), knowledge grounding via RAG and clinical knowledge graphs (reducing hallucination by **60–80%**), multi-agent debate protocols (Multiagent-Debate, FORD roundtable), and mandatory post-hoc verification agents that cross-reference outputs against authoritative clinical sources before any output reaches clinicians or EHR systems.

### Observability across the agent chain

OpenTelemetry has emerged as the standard for AI agent telemetry in 2026. **LangSmith** provides framework-agnostic observability with step-by-step execution visibility, real-time monitoring, and automatic trace clustering — and offers self-hosted/BYOC options critical for healthcare data residency. Every agent decision, tool call, data access, guardrail trigger, and escalation event must be logged in immutable audit trails per HIPAA §164.312(b). Reproducing agent decision chains requires complete capture of prompts, context windows, tool call inputs/outputs, and inter-agent messages at each step, versioned alongside agent configurations and model versions.

**NVIDIA NeMo Guardrails** provides programmable guardrails using Colang 2.x for topic control, PII detection, RAG grounding, and jailbreak prevention. Healthcare-specific rails include HIPAA-aligned input/output filtering and blocking unauthorized diagnosis requests. Structured metadata on every block shows compliance officers exactly why a prompt was blocked and which regulatory category triggered. CrowdStrike's Falcon AIDR integration achieves **sub-100ms response times** for guardrail evaluation.

### Data exfiltration and the 73% compliance failure rate

An industry assessment found **73% of healthcare AI implementations fail HIPAA compliance** because standard AI architectures violate Technical Safeguards for PHI access controls. Key exfiltration vectors include agent memory (PHI persisted in conversation history), tool calls (PHI passed to external services without BAAs), and prompt injection extracting PHI. A HIPAA-Compliant Agentic AI Framework (arXiv 2504.17669) introduces Attribute-Based Access Control achieving **99.1% accuracy with 12.3ms decision time**, hybrid PHI sanitization (regex + BERT-based model), and immutable audit trails.

### Production-validated safety patterns

Hippocratic AI's Polaris constellation — a 4.1T+ parameter architecture with ~30 specialized LLMs where **22 models perform safety validation** — has processed **115+ million clinical patient interactions** with an 8.95/10 patient satisfaction rating. Their multi-step certification process required 7,000+ US-licensed clinicians making 500,000 test calls before production deployment, with agents restricted to non-diagnostic, patient-facing tasks and real-time escalation to human nurses via validated guidelines. Results include a **30% reduction in readmission rates** and 360% increase in care management team capacity.

The MATRIX framework provides systematic safety testing through patient simulation (PatBot) and hazard detection (BehvJudge) across 2,100 simulations spanning 10 clinical domains and 14 hazard types. Agent-chaos (open-source) enables chaos engineering specifically for AI agents, injecting LLM rate limits, tool errors, and semantic failures with quality assertions.

---

## 7. Recommended next phases for this foundational document

This Phase 1 report establishes the architectural landscape. Subsequent phases should progressively deepen from architecture to implementation:

**Phase 2 — MEGA-RAG refinement loops and retrieval architecture.** Deep-dive into hybrid retrieval pipelines (vector + graph + reranking), clinical knowledge graph construction and maintenance, retrieval-augmented generation optimization for clinical accuracy, and domain-specific embedding strategies for medical text. Include benchmarking methodology for clinical retrieval quality.

**Phase 3 — Streaming inference fabric and real-time clinical integration.** Architecture for streaming LLM inference in latency-sensitive clinical workflows, voice-to-text-to-agent pipelines for ambient documentation, real-time CDS Hooks integration patterns, WebSocket/SSE architectures for clinical dashboards, and GPU infrastructure planning (on-premises vs. cloud for PHI workloads).

**Phase 4 — Implementation schemas, code patterns, and reference architecture.** Concrete LangGraph state schemas for clinical workflows (TypedDict definitions), Temporal workflow/activity implementations for saga patterns, MCP server implementation for FHIR integration, RBAC policy definitions for multi-agent clinical systems, Terraform/Kubernetes manifests for zero-trust agent deployment, and CI/CD pipeline patterns for clinical AI with shadow/canary stages.

**Phase 5 — Clinical validation framework and go-to-market harness.** Prospective validation study design for multi-agent clinical systems, FDA regulatory pathway analysis for agentic clinical AI (pre-submission strategy), HITRUST certification roadmap, clinical safety monitoring dashboards, and health economic analysis framework for ROI quantification.

**Phase 6 — Operational governance and fleet management.** Agent lifecycle management (versioning, deprecation, credential rotation), drift detection and model performance monitoring at scale, incident response playbooks for agent failures in clinical settings, and cross-institutional federation governance (data sharing agreements, audit coordination).

---

## Conclusion

The architecture of clinical agentic AI systems in 2026 is crystallizing around several clear patterns. **Hierarchical orchestration with embedded concurrent fan-out** provides the strongest foundation — it delivers the governance, auditability, and human-in-the-loop capabilities that clinical safety demands while supporting parallel specialist agents for latency-sensitive tasks like diagnosis and imaging. The Mount Sinai findings make the case quantitatively: architecture-driven task partitioning sustains accuracy at scale where monolithic agents catastrophically fail.

The memory stack is converging on a **three-tier hierarchy** backed by hybrid vector+graph retrieval, event-sourced state for immutable audit trails, and CRDTs for safe concurrent multi-agent access to shared patient state. The framework landscape has a clear front-runner in **LangGraph for agent logic paired with Temporal for durable execution** — though Microsoft's Healthcare Agent Orchestrator built on Semantic Kernel has production deployments at major academic medical centers that cannot be ignored.

The most consequential architectural development is the **MCP + A2A protocol convergence** under Linux Foundation governance. With 30+ healthcare MCP servers already available (including production-grade FHIR integrations) and A2A enabling multi-vendor agent ecosystems, the interoperability layer for clinical AI is forming faster than expected. Teams building today should design for these protocols even where full adoption is premature.

Three risks demand architectural mitigation from day one: hallucination cascading across agent chains (require multi-model diversity and verification agents), PHI exfiltration through agent memory and tool calls (implement the four-layer zero-trust architecture from the Commure production deployment), and the coming HIPAA mandate eliminating "addressable" safeguards (design for mandatory AES-256, MFA, and micro-segmentation now rather than retrofitting). The 73% HIPAA compliance failure rate for healthcare AI implementations is not a statistic to join — it is the competitive moat for teams that get the architecture right from the start.