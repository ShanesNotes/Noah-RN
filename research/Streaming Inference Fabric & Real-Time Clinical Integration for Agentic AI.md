# Streaming Inference Fabric & Real-Time Clinical Integration for Agentic AI

**Phase 3 of the Agentic AI in Healthcare Foundation Series**

The performance layer is where clinical AI becomes real. Phases 1 and 2 established orchestration topologies, federated memory, and MEGA-RAG retrieval—but none of that matters if a CDS Hook times out at 500ms, a voice agent stutters past 800ms, or a radiology finding reaches the care team minutes too late. **This phase covers the streaming inference fabric, voice pipelines, event-driven integration, GPU infrastructure, and multimodal architectures that make agentic clinical AI usable in production.** The central challenge: healthcare demands both frontier-model reasoning quality and hard real-time latency guarantees—two goals that are fundamentally in tension. Every architecture decision in this document navigates that tradeoff.

This report is designed as an architecture-level reference for technical teams building production clinical AI systems. It cross-references Phase 1 (Orchestration Topologies & Federated Memory) and Phase 2 (Context Engineering & MEGA-RAG Architectures) throughout, and concludes with recommended next phases.

---

## 1. Streaming LLM inference for latency-sensitive clinical workflows

### Why milliseconds matter in clinical AI

Three latency regimes define production clinical AI. **Voice agents** demand sub-**800ms** mouth-to-ear response times—research shows latencies above this threshold cause callers to perceive conversation stalls, with >1 second delays producing **40% higher hang-up rates** in contact centers. The human average response time sits at 210–320ms, making this the benchmark for natural conversation. **CDS Hooks** carry a ~**500ms** response expectation from the HL7 specification (a SHOULD, not SHALL), driven by the synchronous nature of the EHR workflow—clinicians will ignore or abandon slow decision support. Epic's production implementation, referenced in Phase 1's EHR integration patterns, enforces sub-second read SLAs. **Ambient documentation** has more relaxed per-turn latency but requires sustained real-time processing of 15–60 minute encounters, with note generation ideally under 40 seconds.

Each regime maps to different optimization strategies. Voice agents need minimal time-to-first-token (TTFT) and fast inter-token latency (ITL). CDS Hooks need pre-computed results with cache-lookup speed. Ambient documentation needs high sustained throughput with moderate latency tolerance.

### Token-streaming architectures for clinical interfaces

**Server-Sent Events (SSE)** is the de facto standard for LLM token streaming. OpenAI, Anthropic, and most LLM APIs use SSE natively—it is unidirectional (server-to-client), works through standard HTTP proxies, supports automatic reconnection via the browser's built-in `EventSource` API, and scales horizontally without sticky sessions. For clinical text interfaces—report generation, clinical Q&A, note summarization, dashboard alerts—SSE is the correct choice.

**WebSockets** provide full-duplex communication and are required for voice-based clinical assistants where audio streams flow bidirectionally. vLLM introduced a Realtime WebSocket API in January 2026 that supports streaming input alongside streaming output—critical for processing audio streams in real-time with architecturally-causal models. WebSockets require manual reconnection logic, sticky sessions or socket brokers, and special proxy configuration, adding operational complexity.

The production architecture pattern is: frontend → API gateway (with `proxy_buffering off` in nginx) → inference server (vLLM/SGLang with OpenAI-compatible API) → SSE token stream back through the chain. For clinical dashboards showing real-time agent status, predictions, and alerts, a Redis Pub/Sub or Kafka backend bus feeds an SSE/WebSocket gateway, with per-user channels (`user:{id}:notifications`) preventing irrelevant alert broadcasting. Phase 1's event sourcing architecture on Kafka feeds naturally into this push-notification layer.

### Inference optimization techniques for production

**PagedAttention and vLLM.** PagedAttention (Kwon et al., SOSP 2023) adapts OS virtual memory paging to KV-cache management, dividing the cache into fixed-size blocks (~16 tokens) with per-request block tables. Previous systems waste **60–80%** of KV-cache memory; vLLM achieves **<4% waste**, enabling up to **24× higher throughput** versus HuggingFace Transformers. vLLM V1 (January 2025) delivered a further **1.7× throughput improvement** over V0 by unifying the scheduling loop—chunked prefill is always enabled, the prefill/decode phase distinction is removed, and CPU-intensive tasks (tokenization, detokenization, multimodal processing) are isolated via multiprocessing with ZeroMQ IPC. Zero-overhead prefix caching is enabled by default. For clinical systems, this means more concurrent clinician queries per GPU—directly reducing infrastructure cost.

**Continuous batching** (Orca-style, OSDI 2022) schedules at iteration granularity rather than request level: after each forward pass, finished sequences exit and new ones enter immediately. This yields **2–36× throughput improvement** over static batching, with typical production gains of 3–8× for conversational workloads. Combined with vLLM's memory optimizations, Anyscale demonstrated **23× throughput improvement**. Continuous batching is essential for clinical dashboards where multiple clinicians submit queries at unpredictable intervals—it ensures low p50 latency under variable load.

**Speculative decoding** uses a small, fast draft model to propose K candidate tokens, which the larger target model verifies in a single parallel forward pass. Critically, this is **mathematically lossless**—accepted tokens follow the exact target distribution via rejection sampling. This property is essential for regulated healthcare: evaluation results and audit outcomes are identical with or without speculative decoding enabled.

| Method | Mechanism | Speedup | Clinical note |
|--------|-----------|---------|---------------|
| Draft-Target | Separate smaller model | 1.5–3× | Requires same vocabulary; two models in memory |
| EAGLE-3 | Multi-layer feature fusion predictor | **2–6×** | <5% parameter overhead; best general-purpose choice |
| Medusa | Extra decoding heads on base model | ~2× | Train heads only (~5hrs on A100) |
| Prompt Lookup (n-gram) | Matches n-grams from prompt | Up to 2.8× | Best for summarization with prompt-output overlap |

EAGLE-3 is the current recommendation: it achieves 3.0–6.5× speedups at batch size 1, with 2.3× at batch size 4 for Llama-3.1-8B. Benefits diminish above batch size 32, so dynamic speculative decoding (adjusting speculation depth based on system load) is on the vLLM roadmap.

**Prompt caching** (cross-reference Phase 2's context engineering) eliminates redundant prefill computation by caching KV-cache blocks for shared prompt prefixes. vLLM's Automatic Prefix Caching (APC) uses block hashing with LRU eviction; SGLang's RadixAttention uses a radix tree that automatically discovers caching opportunities across dynamic conversation flows, delivering **10–20% performance improvement** over vLLM in multi-turn conversations. For clinical systems with long system prompts containing medical guidelines, formulary data, and protocol definitions: structure prompts with the stable, shared medical context as prefix and patient-specific PHI at the end. This can reduce TTFT from seconds to milliseconds for a 4K-token system prompt. Anthropic's prompt caching achieves up to **90% cost savings** and **85% latency reduction** for long shared prefixes. A critical security note: vLLM supports per-request `cache_salt` to prevent timing-based cache attacks in multi-tenant clinical deployments—essential for shared infrastructure serving multiple health systems.

**Quantization for clinical workloads.** FP8 on H100 GPUs is the default recommendation: **2× memory reduction**, **1.5–1.6× throughput improvement**, and essentially lossless quality (0.6 points MMLU-Pro for Qwen3-32B). For memory-constrained environments, AWQ (4-bit) consistently outperforms GPTQ across benchmarks and preserves generalization better—GPTQ quality depends heavily on calibration dataset selection. Aggressive INT4 quantization drops **8 points on HumanEval** code generation; similar degradation likely applies to clinical reasoning tasks. For safety-critical diagnostic decision support, use FP8 or full BF16—never INT4/GPTQ. If any quantization method is used, calibrate with medical domain data to minimize domain-specific accuracy loss.

| Method | Bits | Throughput gain | Quality impact | Best for |
|--------|------|-----------------|----------------|----------|
| FP8 (E4M3) | 8 | 1.5× | Essentially lossless | H100/H200 production (default) |
| AWQ | 4 | ~2.5× | ~95% quality retained | GPU memory-constrained inference |
| GPTQ | 4 | ~2.7× | ~90% quality; calibration-dependent | Not recommended for clinical reasoning |
| GGUF | 2–8 | Variable | ~92% at Q4_K_M | Edge/CPU inference, Apple Silicon |
| NVFP4 | 4 | ~3× | <1% degradation | Blackwell GPUs (B100/B200) |

### Multi-model cascading with clinical routing logic

Not every clinical query needs a frontier model. A cascade router with confidence-based escalation dramatically reduces cost and latency. Cascade routing (ICML 2025, ETH Zurich) unifies routing and cascading into a single framework, outperforming either approach alone by **up to 14%**. FrugalGPT demonstrated **98% cost savings** with comparable accuracy.

A healthcare-specific cascade architecture:

- **Tier 1 (Fast/<50ms):** Small quantized model (Phi-3 3.8B, Qwen 3B) handles medication schedules, appointment info, basic triage, autocomplete
- **Tier 2 (Medium/<200ms):** Domain-tuned 7–13B model handles clinical coding, note summarization, guideline retrieval
- **Tier 3 (Large/<800ms):** Frontier model (GPT-4, Claude) for complex diagnostic reasoning, differential diagnosis, treatment planning

A lightweight classifier evaluates query complexity based on medical terminology density, question type (factual vs. reasoning), and confidence of lower-tier output. Confidence thresholds trigger escalation. This maps directly to Phase 1's orchestration topologies—the LangGraph supervisor can implement routing logic as a conditional edge in the agent graph, with Temporal managing the cascade workflow for durability.

### Edge inference versus cloud for clinical environments

| Factor | Edge/On-Premises | Cloud |
|--------|-----------------|-------|
| Latency | Low, predictable (no network hop) | Variable, network-dependent |
| PHI residency | Data stays within hospital firewall | Requires BAA; data leaves premises |
| Model capability | ≤13B quantized typically | Access to 70B+ frontier models |
| Upfront cost | High (GPUs, staff, facilities) | Low (pay-per-token) |
| Scalability | Hardware-limited | Virtually unlimited |

A critical security concern: PHI can leak at inference through prompts, embeddings, KV caches, returned text, logs, and monitoring traces. The emerging best practice is a **governed ensemble**: on-premises domain-specific models (LLaMA/Mistral-based, fine-tuned) for PHI-containing compliance-sensitive tasks; cloud frontier models for complex reasoning using de-identified data only; edge tiny models (1–3B) for real-time triage and autocomplete where zero network latency is required. This aligns with Phase 1's zero-trust security framework—the PHI boundary enforcement layer determines which tier processes each request. IBM Granite 4.0 (October 2025), with its hybrid Mamba-2/Transformer architecture achieving >70% GPU memory reduction and Apache 2.0 licensing, represents the emerging class of models designed specifically for governed on-premises deployment.

---

## 2. Voice-to-text-to-agent pipelines for ambient clinical documentation

### The ambient documentation landscape in 2025–2026

Ambient clinical documentation AI has reached production maturity. **Abridge** earned Best in KLAS 2025 for the Ambient AI segment, deployed across **200+ health systems** including Mayo Clinic, Johns Hopkins, and Northwell Health (28 hospitals, 3M patients/year). Its unique "Linked Evidence" feature maps every AI-generated statement back to source audio, enabling clinicians to click any sentence to verify its origin—a critical auditability mechanism. Median note generation latency is **38 seconds**, improved from 76 seconds in mid-2023. A Mayo Clinic study (2025, published in PMC) showed adoption growing from 15% to 50% of physicians in 8 weeks, with **18.6% reduction in documentation time**.

**Nuance DAX Copilot** (Microsoft/Nuance), generally available in Epic since January 2024, leverages decades of Dragon Medical speech recognition heritage and Microsoft Azure OpenAI infrastructure. Deployed at **150+ health systems**, it reports **50% documentation time reduction** and **7 minutes saved per encounter**. Specialty AI models (April 2025) provide specialty-specific HPI, physical exam, and results mapping. Epic's own native AI Scribe (announced August 2025, wider release 2026) builds on the Microsoft Dragon AI + Cosmos database stack.

**Suki AI** differentiates with voice-first DNA, **70%+ clinician adoption** (industry-leading), and the first ambient order staging capability in the industry—ambiently generating prescription orders. Deep bidirectional EHR integration spans Epic, Oracle Cerner, athenahealth, and MEDITECH Expanse. Performance metrics: **72% faster note completion**, **60% burnout reduction**, **9× ROI in year 1**.

**Hippocratic AI** represents a different paradigm: patient-facing voice agents using a **Polaris Constellation Architecture** of 22+ specialized LLMs (each 70B+, totaling 4.1T+ parameters) running in constellation for safety validation. Conversation latency is under **300 milliseconds** on NVIDIA H200 GPUs using NVIDIA Riva for speech recognition and synthesis. With **7M+ clinical calls completed** at an **8.95/10 patient satisfaction rating** and $9/agent-hour pricing, Hippocratic demonstrates the viability of always-on clinical voice agents. Research shows every 500ms improvement in inference speed increases patient emotional connection by 5–10%+.

### Speech-to-text models for clinical use

Medical STT accuracy is not just about Word Error Rate (WER)—**deletion errors** (missing words like "not" in "do not resuscitate") are the most dangerous in healthcare. The STT landscape spans general-purpose, cloud, and medical-specialized options.

| Model/Service | WER (general) | Medical capability | Latency | Cost per hour | HIPAA |
|--------------|---------------|-------------------|---------|---------------|-------|
| Whisper Large-v3 | ~8.4% | Requires fine-tuning | 189× real-time (Groq) | ~$0.36 (API) | Self-hosted only |
| Whisper Large-v3-Turbo | ~10–11% | Requires fine-tuning | 216× real-time (Groq) | ~$0.67 (Groq) | Self-hosted only |
| Deepgram Nova-3 Medical | **63.7% better** than competitors | Native pharma, clinical acronyms, Latin | <300ms TTFT | $0.46 (streaming) | ✅ BAA available |
| Amazon Transcribe Medical | Production-grade | Cardiology, neuro, OB/GYN, oncology, radiology | Real-time streaming | $4.50 | ✅ Stateless |
| Azure Speech (Dragon heritage) | Industry benchmark | Decades of medical ASR | Real-time streaming | Enterprise | ✅ BAA available |
| GPT-4o-transcribe | Best-in-class | Strong multilingual | Batch (not streaming) | API pricing | BAA required |

For production clinical voice agents, **Deepgram Nova-3 Medical** offers the best combination of medical accuracy, low latency, and cost efficiency. For self-hosted deployments requiring PHI containment (connecting to Phase 1's zero-trust architecture), **Whisper Large-v3 fine-tuned on medical data** provides the most control—but requires significant engineering investment for real-time streaming.

### Speech-native multimodal models versus cascaded pipelines

GPT-4o processes audio natively through a single end-to-end neural network trained across text, vision, and audio—eliminating the traditional STT → LLM → TTS cascade. Average response time is **320ms** (as low as 232ms), compared to **2.8–5.4 seconds** for cascaded pipelines with GPT-3.5/GPT-4. This represents a 9–17× latency improvement. Gemini 2.5 Flash Native Audio provides similar capabilities with 30 HD voices in 24+ languages, affective dialog (responding to tone of voice), and proactive audio that ignores background speech.

The tradeoff is fundamental to clinical AI architecture. Cascaded pipelines provide intermediate text checkpoints where guardrails can be inserted, clinical terminology validated, audit trails generated, and debugging performed stage-by-stage. Speech-native models are black boxes from audio in to audio out—harder to insert safety checks, harder to debug, harder to audit. For regulated clinical workflows, **cascaded pipelines remain the recommended architecture** for complex clinical use cases. Speech-native models are appropriate for low-risk patient engagement (scheduling, medication adherence reminders, simple triage) where speed matters most and full audit trails are less critical. A hybrid approach is emerging: speech-native for simple interactions with automatic escalation to cascaded pipelines for complex clinical reasoning.

### Text-to-speech for patient-facing voice agents

Streaming TTS—beginning speech before the full response is generated—is critical for voice agent latency. The LLM streams tokens; TTS begins synthesizing from the first text chunk; audio output overlaps with ongoing generation.

**Cartesia Sonic 3** leads on latency with sub-**90ms** time-to-first-audio (TTFA), as low as 40ms, at approximately **73% lower cost** than ElevenLabs. It uses a state-space model architecture purpose-built for streaming, with WebSocket/SSE/WebRTC APIs and barge-in handling. **ElevenLabs Flash v2.5** delivers the highest subjective naturalness and expressiveness with sub-100ms TTFB in 70+ languages. **GPT-4o-mini-TTS** offers steerable voice delivery via prompting with 35% lower WER than previous OpenAI TTS models. For clinical voice agents where latency is paramount, Cartesia Sonic 3 is the recommended TTS; for patient-facing applications where voice quality and warmth matter most (e.g., chronic care management calls), ElevenLabs provides superior naturalness.

### End-to-end latency budget for a clinical voice agent

The full pipeline breakdown with target latencies for achieving sub-800ms mouth-to-ear:

| Stage | Component | Target | Notes |
|-------|-----------|--------|-------|
| 1 | Audio transport to edge | 40ms | Co-located infrastructure |
| 2 | Buffering + decoding | 30–55ms | 100ms audio chunks |
| 3 | Voice Activity Detection | 50–125ms | Flush trick saves ~375ms |
| 4 | **Speech-to-text** | **150ms** | Deepgram TTFT target |
| 5 | Service hop (STT→LLM) | 10ms | Same-cluster networking |
| 6 | **LLM (TTFT)** | **200ms** | Groq: 100–200ms; cached prompt |
| 7 | Service hop (LLM→TTS) | 10ms | Same-cluster networking |
| 8 | **Text-to-speech (TTFA)** | **75ms** | Cartesia Sonic 3 streaming |
| 9 | Re-encoding + buffering | 30–50ms | Audio delivery preparation |
| 10 | Network return to user | 40–60ms | Edge to user device |
| | **Total** | **~635–775ms** | **Sub-800ms achieved** |

Key optimization techniques: (1) model co-location within the same GPU cluster eliminates inter-service network hops; (2) streaming/pipelining so TTS starts on the first LLM token; (3) VAD flush trick that immediately processes on silence detection rather than waiting for a full silence timeout (saves ~375ms); (4) semantic caching from Phase 2's retrieval pipeline for converting repeated queries to vector-search lookups; (5) KV-cache-aware model selection routing simple queries to cached fast models; (6) WebRTC over TCP/WebSocket for telephony (60–150ms mouth-to-ear vs. 220–400ms). Pre-warmed instances prevent 2–3 second cold-start delays. Track P45, P90, and P99 latencies—not averages—since a "300ms average can mask 10% of users experiencing 1500ms delays."

---

## 3. Real-time CDS Hooks and event-driven integration patterns

### Meeting the 500ms CDS Hooks constraint with agentic AI

The CDS Hooks specification states services "SHOULD respond quickly (on the order of 500 ms.)"—a strong recommendation driven by the synchronous nature of EHR workflow integration. A single LLM call takes 1–10+ seconds, making naive real-time AI-powered CDS Hooks infeasible. The architectural solution is **pre-computation + fast lookup**, connecting Phase 1's EHR integration patterns with Phase 2's cached retrieval.

**Pattern 1: Pre-computed inference cache.** Run AI/ML models asynchronously when clinical data changes—triggered by FHIR Subscriptions, ADT feeds, or Kafka events (all from Phase 1's event-driven architecture). Store pre-computed predictions (risk scores, recommendations, medication interaction checks) in a low-latency cache (Redis, DynamoDB). The CDS Hook handler performs a **5–50ms cache lookup** rather than real-time inference. Cache invalidation fires on new clinical data events. This pattern meets the 500ms constraint with room to spare.

**Pattern 2: Tiered response strategy.** Tier 1 (<100ms): return cached/pre-computed results. Tier 2 (<500ms): run lightweight ML models (logistic regression, gradient boosting, small transformers) synchronously. Tier 3 (>500ms): return an "app link" card directing clinicians to a SMART on FHIR app for complex agentic AI interactions. This preserves the fast CDS Hooks response while enabling rich AI workflows through the SMART launch framework.

**Pattern 3: Agentic plan caching** (NeurIPS 2025). Extract structured plan templates from completed LLM agent executions; when similar clinical scenarios arise, retrieve and adapt cached plans using lightweight models. This achieves **50.31% cost reduction and 27.28% latency reduction** while maintaining 96.61% of full-agent performance. This directly extends Phase 2's prompt caching to the agent-plan level.

CDS Hooks best practices for AI services: optimize prefetch templates to avoid FHIR API round-trips during the hook call; parallelize any required data retrieval; deploy CDS services in containers close to EHR infrastructure; start with "silent mode" to validate performance with production data before displaying to clinicians. Epic has the most mature CDS Hooks implementation (production since 2018). Oracle Health's implementation maturity varies by deployment—their Clinical AI Agent (late 2024) uses proprietary CCL/MPages integration paths.

### FHIR Subscriptions for real-time AI event triggering

FHIR R5 Subscriptions introduce a topic-based model that transforms real-time clinical AI integration. `SubscriptionTopic` resources define reusable events; multiple Subscriptions can subscribe to the same topic with different filters. R5 supports state transition detection—triggering on specific status changes (e.g., `Encounter.status` from `in-progress` to `finished`)—and enables CREATE, UPDATE, and DELETE triggers with comparison between previous and current resource versions.

Since R4 remains the predominant deployed version, the **R5 Subscription Backport Implementation Guide** enables R4 systems to adopt topic-based subscriptions without full version upgrade. Subscription topics relevant for clinical AI include: `encounter-start`/`encounter-end` for triggering admission risk assessments, `new-lab-result` for real-time deterioration scoring and sepsis prediction, `medication-order` for drug interaction checking, and `vital-signs-update` for continuous patient monitoring. These events feed into the pre-computation pipeline that populates the CDS response cache.

### Apache Kafka as the clinical AI nervous system

Kafka's role in clinical AI extends Phase 1's event-driven architecture into real-time inference. The reference architecture: legacy systems → Kafka connectors (CDC, MLLP, REST) → Kafka topics → stream processing (ksqlDB/Flink) → AI/ML models, analytics, FHIR services, alerts. FHIR resources flow as Kafka messages with one topic per resource type.

**Real-time feature engineering** uses Kafka Streams or ksqlDB to compute sliding-window aggregates—4-hour vital sign trends, 24-hour lab value changes, medication timing patterns—that feed ML models for sepsis prediction, clinical deterioration, and medication interaction checking. **Event sourcing** on Kafka's immutable, append-only log naturally satisfies HIPAA audit trail requirements: every prediction, recommendation, and clinician action is stored as ordered events enabling complete replay of AI decision history for regulatory compliance.

The City of Hope deployment demonstrates the pattern: Kafka on Confluent Cloud preprocesses real-time data streams from medical records, runs through sepsis prediction models for bone marrow transplant patients, and feeds predictions back into Epic to trigger clinical workflows—replacing a one-day-lag data warehouse with real-time inference. Single-partition-per-patient-key ensures ordered processing; Kafka's transactional API prevents duplicate processing—critical for clinical alerts. Dead letter queues route failed messages to error topics for manual review rather than loss.

### Bridging HL7v2 and FHIR for AI integration

An estimated **95% of US healthcare institutions support HL7v2**, making ADT (Admit-Discharge-Transfer) feeds the most widely deployed real-time clinical messaging. Interface engines like Mirth Connect (powering one-third of all US public Health Information Exchanges) serve as the HL7v2-to-Kafka bridge: TCP/MLLP listener receives ADT messages → filters for relevant types (A01 admit, A03 discharge, A08 update) → transforms PID segments to FHIR Patient, PV1 to FHIR Encounter → publishes to Kafka topics as FHIR JSON. This pipeline connects Phase 1's HL7v2 integration patterns to the real-time AI inference layer.

---

## 4. GPU infrastructure planning for clinical AI

### GPU selection: a capability-cost matrix for 2026

The GPU landscape has shifted dramatically with Blackwell availability and aggressive cloud price cuts.

| GPU | Memory | Inference throughput (70B) | Cloud cost/hr | Best clinical use case |
|-----|--------|--------------------------|---------------|----------------------|
| **NVIDIA B200** | 192 GB HBM3e | ~10,755 tok/s (Llama-2 70B) | $2.25–7.07 | Next-gen standard; replaces 5× H100 nodes |
| **NVIDIA H200** | 141 GB HBM3e | ~2× H100 | ~$2.50 | 70B models with large KV caches on single GPU |
| **NVIDIA H100** | 80 GB HBM3 | 250–300 tok/s | $1.49–3.90 | Best current price-performance; production workhorse |
| **NVIDIA L40S** | 48 GB GDDR6X | Lower raw throughput | $0.87–1.57 | Cost-optimized inference for 7B–30B models |
| **AMD MI300X** | 192 GB HBM3 | Up to 213% > H100 (memory-bound) | ~$2.50+ | Large models (405B+); ROCm maturity gap |
| **NVIDIA A100** | 80 GB HBM2e | ~130 tok/s | ~$1.35 | Legacy; viable for 7B–13B |

For most clinical AI deployments in 2026, **H100 remains the production workhorse** at the best price-performance point. H200 is the upgrade path when 70B models need single-GPU serving with room for large KV caches. B200 delivers 3.7–4× the H100's performance but requires liquid cooling and 800Gbps networking—suitable for large health systems with data center infrastructure. L40S serves as the cost-optimized option for smaller models and bursty workloads. AMD MI300X offers compelling performance for memory-bound workloads (its 192GB memory fits Llama 405B in FP16, which cannot fit on a single H100 node) but the ROCm software ecosystem requires higher engineering investment.

### Serving frameworks: vLLM, TensorRT-LLM, and SGLang compared

**TGI (Hugging Face) entered maintenance mode in December 2025**—do not select for new deployments; plan migration if currently using.

| Metric | vLLM v0.18 | TensorRT-LLM v1.2 | SGLang v0.5.9 |
|--------|-----------|-------------------|--------------|
| Throughput @ 50 concurrent | 1,850 tok/s | **2,100 tok/s** | 1,920 tok/s |
| TTFT p50 @ 10 concurrent | 120ms | **105ms** | 112ms |
| Cold start | ~62s | ~28 min (compile) | ~58s |
| Setup complexity | 1–2 days | 1–2 weeks (expert) | 1–2 days |
| Model support | Broadest (hundreds) | NVIDIA-only, limited | Growing |
| Multi-turn conversation | Good | Good | **Best** (RadixAttention) |
| GPU support | NVIDIA + AMD + Intel | NVIDIA only | NVIDIA + AMD |

**vLLM** is the recommended default for clinical deployments: broadest model support, fastest cold starts, easiest deployment, works on both NVIDIA and AMD GPUs. It maintains 50–80ms TTFT even at 100 concurrent users. **SGLang** is the strong alternative for multi-turn clinical chatbots and RAG pipelines—its RadixAttention automatically caches conversation prefixes, delivering 10–20% better performance for Phase 2's retrieval-augmented generation patterns. **TensorRT-LLM** delivers the highest throughput (13% over vLLM at high concurrency) but at the cost of 28-minute compile times and NVIDIA lock-in—best for single-model, long-term production deployments like a dedicated clinical documentation service. **Triton Inference Server** adds value for multi-model serving (NLP + vision + classification on the same infrastructure)—relevant for Section 5's multimodal architectures.

### Cost modeling: self-hosted versus API

LLM inference costs are declining **10× annually**—faster than PC compute or dotcom bandwidth. GPT-4-equivalent capability that cost $20/million tokens in 2022 now costs ~$0.40/million tokens. This deflation makes breakeven analysis a moving target.

Self-hosted breakeven occurs at approximately **>8,000 conversations/day** for a mid-size model. A self-hosted Falcon-7B on H100 spot instances ($1.65/hr) costs ~$10.3K/year at 70% utilization—$0.013/1K tokens at 400 req/s sustained throughput. HIPAA-tier cloud APIs add 5–15% to every call. One telemedicine provider cut monthly spend from **$48K to $32K** by self-hosting chat triage. For small practices, a private LLM server ($8,000–$15,000 hardware) can replace $50K+/year in per-seat AI licensing.

Total on-premises TCO for an 8×H100 system: $200K–$400K purchase, ~$300/yr per GPU for power, $15K–$100K for cooling/facilities, plus staff—chips and staff represent 70–80% of total cost. Fully amortized operational cost runs $8–$15/hour. Combined optimization multipliers (quantization: 4–8×, continuous batching: 2×, speculative decoding: 2–3×) can yield up to **10× cost reduction** from baseline.

### Scaling patterns for clinical workloads

Clinical AI workloads follow predictable patterns: high volume 8am–6pm, lower on-call volume evenings/nights. **Do not autoscale on CPU utilization**—LLM inference is GPU-bound; CPU may show 5% utilization while the inference queue backs up with 50 requests. Correct autoscaling metrics: queue depth, KV-cache utilization, batch size, pending requests. Use KEDA (Kubernetes Event-Driven Autoscaling) on Prometheus metrics.

**KV-cache-aware routing** routes requests to instances with warm prefix caches rather than round-robin—critical for multi-turn clinical conversations where each turn shares the conversation prefix. **Disaggregated serving** separates prefill (compute-bound) and decode (memory-bound) into independent Kubernetes services, each scaling independently to meet TTFT and ITL SLAs. **llm-d** (co-created by Red Hat, Google, IBM, NVIDIA, CoreWeave) bundles vLLM with a KV-cache-aware Envoy router and workload-variant autoscaler. Cold start reality: 3–7 minutes total (node provision + health checks + model image pull)—warm pools are essential for clinical SLAs.

Real hospital GPU deployments validate these patterns. **Mayo Clinic** runs an NVIDIA DGX SuperPOD with DGX B200 systems (1.4TB GPU memory per system), supporting 20M whole-slide pathology images and enterprise Abridge deployment to 2,000+ clinicians. **Cleveland Clinic** deploys Ambience Healthcare ambient documentation for 4,000+ clinicians and Bayesian Health sepsis detection at 13 hospitals (**46% more sepsis cases detected, 10× fewer false alerts**).

---

## 5. Multimodal clinical AI architectures

### General-purpose multimodal models fall short on medical imaging

A critical finding for architecture decisions: **GPT-4V achieves only 35.2% pathology detection accuracy** on emergency diagnostic images and has a **diagnostic hallucination rate exceeding 40%**—hallucinating intracranial hemorrhage on normal CT heads or splenic lacerations where cholelithiasis was present. Diagnostic accuracy drops from 77% to 20% when clinical context is removed, suggesting the model relies more on text reasoning than actual image analysis. In neuroradiology challenges, GPT-4V achieved **16% accuracy versus 38% for board-certified radiologists**. Neither GPT-4V nor GPT-4o is FDA-cleared for medical imaging.

**Med-Gemini** represents the research frontier: **91.1% on MedQA (USMLE)**, surpassing Med-PaLM 2 by 4.6 points, with Med-Gemini-3D being the first demonstration of LMMs interpreting complex 3D CT scans. But it remains a research publication, not a commercially deployed clinical product.

The architectural implication is clear: **keep FDA-cleared specialized imaging AI and general-purpose LLM agents architecturally separate.** Specialized models handle image interpretation; LLM agents consume structured findings alongside EHR data for comprehensive assessment.

### FDA-cleared imaging AI is where production value lives

| Company | Specialty | FDA clearances | Key metrics | Deployment scale |
|---------|-----------|---------------|-------------|-----------------|
| Viz.ai | Stroke/Neuro | 13+ | 96.3% sensitivity, 93.8% specificity; **5 min 45 sec** CTA-to-notification | 1,700+ hospitals |
| Aidoc | Radiology (acute) | 20–30+ | 14 acute abdominal conditions; Breakthrough Device for CARE foundation model | 1,600+ centers |
| Paige AI | Pathology | First pathology AI (De Novo 2021) | 70% fewer false negatives | Research partnerships |
| RapidAI | Stroke perfusion | FDA-cleared | Widely deployed CT perfusion | Standard of care |

The FDA has authorized approximately **1,451 AI/ML medical devices** through 2025, with **295 clearances in 2025 alone** (record-breaking). Radiology accounts for **71.5–77%** of all clearances. **97%** use the 510(k) pathway. Predetermined Change Control Plans (PCCPs), finalized December 2024, enable iterative model updates without full resubmission—10% of 2025 clearances included PCCPs. However, a JAMA Network Open 2025 analysis found that only **5% of radiology AI devices underwent prospective testing** and only **8% included human-in-the-loop testing**, raising concerns about real-world validation.

### Architecture for combining imaging AI with agentic text workflows

The reference architecture uses **late fusion at the agent level**: FDA-cleared imaging models produce structured DICOM-SR findings; the agentic LLM orchestrator (Phase 1's LangGraph/Temporal stack) consumes these alongside EHR data via FHIR APIs.

The pipeline for an acute finding: modality → C-STORE → DICOM router → imaging AI service → DICOM-SR + segmentation → PACS display (IHE AIR profile) → **agentic LLM orchestrator** → queries patient vitals (FHIR), lab results, medication history, imaging AI findings (DICOM-SR bridged to FHIR Observations) → generates comprehensive assessment → critical alert to care team + structured report pre-population + order suggestions.

**DICOM integration patterns** use DICOMweb's three RESTful services: QIDO-RS (query), WADO-RS (retrieve), STOW-RS (store). For large pathology whole-slide images (>1GB), C-STORE remains preferred due to HTTP timeout constraints with STOW-RS. The IHE AI Results (AIR) profile (Trial Implementation, Rev 1.3, August 2025) standardizes how AI results are encoded, stored, displayed, and assessed—including the critical AIRA profile for radiologist acceptance/modification/rejection of AI findings.

The DICOM-to-FHIR bridge is essential: AI findings encoded as DICOM-SR need translation to FHIR Observations for non-imaging systems (EHR, alerting, agentic workflows) to consume them. An HL7 Implementation Guide for this bridge is in development. This connects directly to Phase 2's knowledge graph architecture—imaging findings become nodes in the clinical knowledge graph alongside lab results, medications, and problem list entries.

**Latency requirements vary by modality and clinical urgency**: CT stroke detection demands <6 minutes end-to-end (Viz.ai achieves median 5:45); chest X-ray pneumothorax flagging targets <5 minutes; routine pathology tolerates minutes to hours; endoscopy AI requires 2–3ms per frame; on-scanner CT/MRI reconstruction demands sub-second per slice.

---

## 6. End-to-end latency optimization reference architectures

### Reference architecture: sub-800ms clinical voice agent

```
[Microphone] → [Media Edge Server, co-located] (40ms)
  → [VAD with flush trick] (125ms)
  → [Deepgram Nova-3 Medical STT, streaming] (150ms)
  → [Multi-model cascade router] (10ms)
    → [Tier 1: Cached response / small model] (<50ms) OR
    → [Tier 2: vLLM/SGLang with prefix caching, TTFT] (200ms)
  → [Cartesia Sonic 3 streaming TTS, TTFA] (75ms)
  → [Audio re-encoding + return] (70ms)
= ~670ms total (Tier 2), ~520ms (Tier 1)
```

Phase 1 cross-reference: the LangGraph agent graph handles tool calling and multi-step reasoning; Temporal ensures workflow durability. Phase 2 cross-reference: RadixAttention prefix caching from SGLang reuses KV-cache from the medical knowledge system prompt; MEGA-RAG retrieval feeds context into the cached prompt suffix.

### Reference architecture: sub-500ms CDS Hooks response

```
[Clinician opens chart / selects order] → [Epic fires CDS Hook POST]
  → [API Gateway] (5ms)
  → [CDS Service Handler] (5ms)
    → [Redis cache lookup: pre-computed risk score / recommendation] (5-20ms)
    → IF cache hit: return cards (total: ~35ms) ✅
    → IF cache miss:
      → [Lightweight ML model (gradient boosting, small transformer)] (<200ms)
      → return cards (total: ~230ms) ✅
    → IF complex reasoning needed:
      → return app-link card to SMART on FHIR app (total: ~50ms) ✅
      → [SMART app launches full agentic workflow asynchronously]
```

The pre-computation pipeline runs continuously in the background:

```
[FHIR Subscription / ADT feed / Kafka event] → [Feature computation (Kafka Streams)]
  → [ML/LLM inference (async)] → [Store in Redis cache with patient key + TTL]
  → [Cache invalidated on new clinical data events]
```

This connects Phase 1's Kafka event sourcing to Phase 2's grounded generation—the agentic plan cache (NeurIPS 2025) extracts reusable templates from completed LLM executions, achieving 27.28% latency reduction while maintaining 96.61% of full-agent performance.

### Latency monitoring targets

| Pipeline | P50 target | P95 target | P99 target | Failure action |
|----------|-----------|-----------|-----------|----------------|
| Voice agent (mouth-to-ear) | <600ms | <800ms | <1200ms | Graceful "one moment" filler; escalate to human |
| CDS Hooks response | <100ms (cached) | <300ms | <500ms | Return empty cards; log miss |
| Ambient documentation (note gen) | <30s | <45s | <60s | Queue and notify clinician when ready |
| Imaging AI (acute finding) | <3 min | <6 min | <10 min | Fall through to standard radiologist queue |

Graceful degradation is essential. When voice agent latency exceeds P99, insert conversational fillers ("Let me look that up for you") while the system catches up—this preserves the interaction rather than producing dead air. When CDS Hooks exceed 500ms, return empty cards rather than blocking the clinician workflow; log the miss for monitoring. When ambient documentation exceeds 60 seconds, queue the result and send a notification when the note is ready rather than blocking the clinician's next encounter.

---

## 7. Risks, open questions, and tradeoffs

### Speech-native models versus modular debuggability

Can speech-native multimodal models achieve clinical-grade accuracy while retaining the guardrail insertion points that cascaded pipelines provide? Current evidence says no—not yet. GPT-4o Realtime achieves remarkable latency (232ms) but offers no intermediate text stage for content filtering, clinical terminology validation, or regulatory audit. The recommended approach: use speech-native models for low-risk patient engagement where speed matters most, and cascaded pipelines for any interaction involving clinical reasoning, documentation, or decision support. Monitor this space closely—if speech-native models add structured intermediate representations or guardrail APIs, the calculus changes.

### When faster is not safe enough

The latency-accuracy frontier is not monotonic. A 3B quantized model responds in 50ms but may miss critical drug interactions that a 70B model catches in 800ms. The multi-model cascade architecture (Section 1) addresses this with confidence-based escalation, but the confidence estimator itself requires validation against clinical outcomes. **The cost of a missed finding always exceeds the cost of a 500ms delay.** Clinical routing logic should be conservative: when in doubt, escalate to the larger model. Speculative decoding provides a partial resolution—maintaining full model accuracy at 2–6× the speed—but only within a single model class.

### Cost management for always-on streaming inference

A dedicated voice agent serving 1,000 concurrent clinical calls on H100 infrastructure costs approximately $30–50/hour in compute. At $9/agent-hour (Hippocratic AI's pricing), a 24/7 chronic care management program for 10,000 patients costs ~$2.2M/year in agent compute alone. The 10× annual cost decline in LLM inference works in favor of these deployments, but current economics require careful workload management: scale down aggressively during off-peak hours, route to smaller models when possible, and leverage prompt caching to reduce per-call compute.

### Network reliability and regulatory considerations

Real-time clinical AI introduces hard dependencies on network infrastructure. A network interruption during a voice agent call or a CDS Hook timeout produces clinical workflow disruption. Hospitals should implement redundant network paths, local fallback models for critical functions, and circuit-breaker patterns (from Phase 1's orchestration layer) that degrade gracefully to cached results or human handoff. Regulatory frameworks for real-time AI-generated clinical guidance are evolving—the FDA's Total Product Lifecycle framework does not yet consistently address continuously-updating agentic systems, and no specific regulatory framework exists for multimodal AI combining imaging + text/LLM reasoning.

---

## 8. Cross-references to Phases 1–2 and recommended next phases

### Phase 1 connections (Orchestration & Federated Memory)

Phase 1's **LangGraph supervisor** implements the multi-model cascade routing logic as conditional edges in the agent graph. **Temporal** provides durable workflow execution for CDS Hook pre-computation pipelines that must survive infrastructure failures. The **three-tier memory hierarchy** (working/episodic/semantic) maps to this phase's caching layers: working memory holds the current clinical conversation state for voice agents; episodic memory stores patient interaction history for multi-turn dialogue; semantic memory stores the medical knowledge that populates prompt prefixes for KV-cache reuse. Phase 1's **zero-trust security framework** governs the PHI boundary enforcement that determines whether inference runs on-premises, in the cloud, or at the edge. The **MCP/A2A protocols** define the tool-calling interface through which agentic orchestrators invoke the streaming inference services described here. Phase 1's **Kafka event sourcing** architecture is the backbone for CDS Hook pre-computation, FHIR Subscription processing, and clinical alerting pipelines.

### Phase 2 connections (Context Engineering & MEGA-RAG)

Phase 2's **prompt caching integration** directly enables the TTFT reductions described in Section 1—structured prompts with stable medical context as prefix and dynamic PHI as suffix maximize cache hit rates. The **MEGA-RAG retrieval pipeline** feeds context into voice agent and CDS Hook responses; the cross-encoder reranking and grounded generation ensure that retrieved medical knowledge is accurate before it enters the latency-critical inference path. Phase 2's **context window management** strategies determine how much patient history, medical knowledge, and conversation context can be included within the token budget while meeting latency constraints. The **knowledge graph** from Phase 2 provides the structured clinical context that imaging AI findings (Section 5) are integrated into—radiology results, lab values, medications, and problem list entries become connected nodes enabling the agentic orchestrator to produce comprehensive clinical assessments.

### Recommended next phases

- **Phase 4: Clinical Safety, Evaluation & Guardrail Architectures.** Systematic evaluation frameworks for clinical AI (including hallucination detection specific to medical reasoning), guardrail insertion patterns for cascaded and speech-native pipelines, automated testing infrastructure for clinical scenarios, red-teaming methodologies, and continuous monitoring of model performance drift in production clinical environments.

- **Phase 5: Fine-Tuning, Alignment & Domain Adaptation for Clinical LLMs.** Strategies for medical domain adaptation (continued pretraining, instruction tuning, RLHF/DPO with clinical preference data), training data pipelines from de-identified EHR data, evaluation on medical benchmarks (MedQA, PubMedQA, clinical note generation), LoRA/QLoRA for efficient adaptation, and curriculum learning approaches for medical specialization.

- **Phase 6: Deployment Operations, Observability & Governance.** Production MLOps for clinical AI, model versioning and rollback, A/B testing frameworks for clinical interventions, regulatory compliance automation, observability stacks (Prometheus/Grafana/OpenTelemetry) for the full inference pipeline, incident response procedures, and organizational governance structures for clinical AI deployment.

---

## Conclusion

The streaming inference fabric described in this phase transforms the orchestration (Phase 1) and retrieval (Phase 2) foundations from architectural blueprints into production-viable clinical systems. Three architectural principles emerge as dominant.

First, **pre-computation defeats latency constraints**. The 500ms CDS Hooks budget and 800ms voice agent budget are achievable not by making inference faster (though that helps) but by moving inference out of the critical path entirely—computing results asynchronously when data changes and serving from cache at query time. The entire event-driven architecture (Kafka, FHIR Subscriptions, ADT feeds) exists to enable this temporal decoupling.

Second, **the modular pipeline remains essential for clinical safety**. Despite the latency advantages of speech-native multimodal models (232ms versus 1+ seconds for cascaded pipelines), the inability to insert guardrails, validate clinical terminology, and generate audit trails at intermediate stages makes them unsuitable for high-stakes clinical reasoning in 2026. The cascaded architecture—with its inspectable text checkpoints between STT, LLM, and TTS—is the correct production choice for clinical AI systems subject to regulatory oversight.

Third, **the GPU infrastructure decision is becoming simpler, not harder.** vLLM on H100s with FP8 quantization, deployed on Kubernetes with queue-depth autoscaling, represents a clear default for most clinical AI deployments. SGLang's RadixAttention is the compelling alternative for multi-turn clinical conversations. TensorRT-LLM earns its complexity cost only for dedicated, single-model high-throughput services. The self-hosted breakeven at ~8,000 conversations/day, combined with HIPAA data residency requirements, pushes most health systems toward hybrid architectures: on-premises inference for PHI workloads, cloud for training and de-identified reasoning.

The novel insight from synthesizing across all three phases: **the streaming inference fabric is not a separate layer but rather the performance-critical hot path through the orchestration graph and retrieval pipeline that were already designed in Phases 1 and 2.** Every CDS Hook response traverses Kafka → cache → API gateway. Every voice agent turn traverses STT → LangGraph agent → MEGA-RAG retrieval → prefix-cached LLM → streaming TTS. The architecture is one unified system with different latency regimes—and the engineering discipline required is matching each component's performance characteristics to the clinical workflow's tolerance for delay.