# Fine-tuning, alignment & domain adaptation for clinical LLMs

**Phase 5 of the Agentic AI in Healthcare foundational document series**

The quality ceiling for every component built in Phases 1–4 — orchestration, RAG, streaming inference, guardrails — is ultimately set by the underlying model. **This phase addresses the model-level work: how to adapt foundation models for clinical use through continued pretraining, parameter-efficient fine-tuning, alignment, and rigorous evaluation.** The central architectural finding is that no single adaptation strategy dominates; the emerging best practice is a layered approach — *fine-tune for format, RAG for knowledge* — where continued pretraining encodes deep medical reasoning, PEFT adapts output behavior, alignment shapes safety boundaries, and retrieval supplies current evidence. Teams building clinical agentic systems face a fundamental investment question: when does model-level adaptation yield returns that better prompting, retrieval, or guardrails cannot? This report provides the decision frameworks, benchmark evidence, and practical guidance to answer that question across the full spectrum of clinical use cases.

---

## 1. The adaptation spectrum: five strategies and when each applies

Foundation model adaptation for clinical use spans a well-characterized spectrum of increasing investment and specialization. Each strategy occupies a distinct niche defined by data availability, regulatory constraints, latency requirements, and the nature of the target clinical task.

**Prompting** (zero-shot, few-shot, chain-of-thought) remains the lowest-barrier entry point. OpenMedLM (2024) demonstrated that prompt engineering alone can outperform fine-tuning in some medical QA settings with open-source models. AutoMedPrompt applies textual gradients to automatically optimize medical prompts, closing much of the gap to fine-tuned models without any weight modification. For teams using API-only commercial models or prototyping clinical workflows, prompting is often the rational starting point.

**Retrieval-augmented generation** anchors the mid-spectrum. Per Menlo Ventures' 2024 State of GenAI report, **51% of enterprise AI deployments use RAG in production**, compared to only 9% primarily using fine-tuning. The MedRAG framework (Xiong et al., ACL Findings 2024) established the landmark result from Phase 2: **GPT-3.5 + MedRAG achieves performance equivalent to GPT-4**, with accuracy improvements of up to 18% over chain-of-thought prompting alone across 7,663 medical questions. The iterative extension i-MedRAG pushed this further, achieving **69.68% on MedQA with GPT-3.5** — surpassing all fine-tuning methods for that model. A June 2025 comparative study in MDPI Bioengineering confirmed that RAG and FT+RAG consistently outperform fine-tuning alone across five model families on the MedQuAD dataset. The implication for Phase 2's MEGA-RAG architecture is significant: retrieval quality can substitute for substantial model-level investment.

**Fine-tuning** (task-specific or instruction tuning) becomes essential when specific output formats, documentation styles, or reasoning patterns must be internalized. The most striking evidence comes from ICD-10 coding: a 2025 Nature study showed fine-tuning GPT-4o mini on 74,260 code-description pairs raised exact match accuracy from **<1% to 97%**. RAFT (Retrieval Augmented Fine-Tuning, Zhang et al., COLM 2024) combines supervised fine-tuning with RAG training, teaching models to filter retrieval noise, and outperforms both RAG-only and fine-tuning-only approaches.

**Continued pretraining** on clinical corpora builds the deepest domain knowledge. MEDITRON-70B (EPFL) was pretrained on 48.1 billion tokens of medical literature, guidelines, and abstracts; Me-LLaMA extended this to **129 billion tokens** combining biomedical literature and clinical notes — the largest such effort to date — and outperformed ChatGPT on 7/8 clinical datasets. The critical architectural insight from Me-LLaMA is that a **4:1 medical-to-general data ratio** is optimal; MEDITRON's 99:1 ratio caused general capability degradation, while PMC-LLaMA's 19:1 showed losses in both domains.

**Training from scratch** represents the maximum investment. GatorTronGPT (UF Health) trained a 20-billion-parameter model on 277 billion words (82B clinical, 195B general) and achieved state-of-the-art on 5/7 clinical NLP tasks. This approach is justified only when massive institutional clinical data is available (>80B words), complete control over data provenance is legally required, or existing models carry unacceptable biases.

### Decision matrix for clinical adaptation strategy

| Factor | Prompting | RAG | Fine-tuning | Continued pretraining | From scratch |
|--------|-----------|-----|-------------|----------------------|-------------|
| **Data required** | None | Knowledge base | 10K–1M examples | 1B–100B+ tokens | 100B+ tokens |
| **Typical cost** | $0–100 | $1K–10K setup | $1K–100K | $10K–1M | $1M–10M+ |
| **Time to deploy** | Hours | Days–weeks | Days–weeks | Weeks–months | Months |
| **Knowledge currency** | Training cutoff | Real-time updates | Static | Static | Static |
| **Regulatory traceability** | Limited | Citations available | Opaque | Opaque | Opaque |
| **Catastrophic forgetting risk** | None | None | Moderate | High (mitigable) | N/A |
| **Output format control** | Moderate | Moderate | Excellent | Good | Excellent |
| **Best clinical use cases** | Prototyping, triage | Guideline lookup, evidence synthesis | Report generation, coding | Foundation for multi-task | Institutional sovereignty |

The emerging consensus for production clinical AI follows a layered pattern: start with a strong foundation model, optionally continue pretraining on domain corpora if resources permit, fine-tune for task-specific behavior and output format, deploy with RAG for real-time knowledge access with citations, and consider RAFT if the system must be robust to retrieval noise.

---

## 2. Parameter-efficient fine-tuning reshapes the clinical economics

PEFT methods have fundamentally changed the cost calculus for clinical model adaptation. Where full fine-tuning of a 70B model requires ~1.1 TB of VRAM and multi-node GPU clusters, **QLoRA enables the same model to be adapted on a single 48GB GPU** — a transformation that brings clinical fine-tuning within reach of individual hospital systems.

### LoRA and QLoRA remain the workhorses

LoRA freezes pretrained weights and learns low-rank adapter matrices, typically training 0.5–5% of parameters. QLoRA adds 4-bit NormalFloat quantization, double quantization of quantization constants, and paged optimizers. The 2025–2026 consensus on configuration has converged:

**Rank selection** follows task complexity. Rank **r=16** is the reliable default for instruction-following, style adaptation, and format-constrained clinical tasks. Ranks of **32–64** are recommended for significant domain shift or reasoning transfer. Rank 8 suffices for simple classification, while ranks above 128 risk overfitting without very large datasets. The scaling factor α = r serves as a reliable baseline.

**Target module selection** has shifted decisively. Research from "LoRA Without Regret" (Thinking Machines, 2025) and Biderman et al. (2024) established that applying LoRA to **all linear layers** (attention Q/K/V/O projections plus MLP layers) is strictly superior to attention-only configurations. Counterintuitively, MLP layers matter more than attention — attention-only LoRA provides no additional benefit on top of MLP-only.

The clinical evidence is concrete. On the ELMTEX clinical data extraction corpus (2025), LoRA fine-tuning of Llama-3.1-8B achieved B-F1 of 0.82 and Entity-F1 of 0.78 — a 10–20 point improvement over the base model. QLoRA 4-bit preserved 80–96% of these gains at **68% of peak RAM** and required only 2 GPUs versus LoRA's 4. A study on physician letter generation in radiation oncology fine-tuned LLaMA-3-8B with QLoRA on a single 48GB RTX A6000 in 58 hours — versus the 1.3 million GPU hours required for de novo training. The MentalQLM project demonstrated a dual-LoRA strategy on a 0.5B model that outperformed MentaLLaMA-Chat-13B by 3.2% and few-shot GPT-4 by 17.7% on mental health classification.

### Newer PEFT methods extend the frontier

**DoRA** (Weight-Decomposed Low-Rank Adaptation, ICML 2024 Oral, NVIDIA) decomposes pretrained weights into magnitude and directional components, applying LoRA only to the directional part. It delivers +1–4.4% over standard LoRA on reasoning benchmarks with zero additional inference overhead and is available as a single flag (`use_dora=True`) in HuggingFace PEFT. QDoRA with FSDP enables this on consumer GPUs.

**GaLore** (Gradient Low-Rank Projection, ICML 2024, Meta AI) takes a fundamentally different approach: instead of adding adapter matrices, it projects gradients into a low-rank subspace during training, enabling full-parameter learning with up to **65.5% memory reduction**. GaLore enabled pre-training LLaMA 7B on a single RTX 4090 (24GB) for the first time without model parallelism. GaLore 2 (2025) addresses SVD computational overhead and scales to 500B tokens with FSDP integration. This makes GaLore particularly relevant for continued pretraining on clinical corpora, where full-parameter learning is desired but memory is constrained.

**ReFT** (Representation Fine-Tuning, NeurIPS 2024 Spotlight, Stanford) operates on frozen model representations rather than weights, achieving **15–65× greater parameter efficiency** than LoRA. LoReFT applies low-rank transformations to hidden states at specific token positions, achieving competitive performance with just 262K parameters and under 18 minutes of training. The ecosystem is less mature than LoRA, but the extreme efficiency makes it worth evaluating for resource-constrained clinical deployments.

**An important caveat**: a 2025 study found that with proper learning rate tuning across 3 orders of magnitude, vanilla LoRA and its variants (DoRA, PiSSA, LoRA+) converge to within **0.43%** of each other. Many claimed improvements may be confounded by suboptimal hyperparameter choices. Rigorous LR sweeps are essential before concluding one method outperforms another.

### Compute requirements for clinical teams

| Model size | Full FT (FP16) | LoRA (FP16) | QLoRA (4-bit) | Recommended GPU |
|-----------|----------------|-------------|---------------|-----------------|
| 7–8B | ~58–64 GB | ~20–22 GB | ~8–10 GB | 1× RTX 4090 (QLoRA) |
| 13B | ~104 GB | ~30 GB | ~12–15 GB | 1× A100 80GB (LoRA) |
| 70B | ~672 GB | ~142 GB | ~46–48 GB | 2–8× H100 (full); 1× A100 (QLoRA) |

The practical starting configuration for clinical teams in 2026: QLoRA 4-bit with r=16, DoRA enabled, `target_modules="all-linear"`, learning rate 2e-4 with cosine schedule. Increase rank to 32–64 for reasoning tasks. For continued pretraining on clinical corpora, prefer GaLore for full-parameter learning under memory constraints. Use LLaMA-Factory for rapid experimentation and HuggingFace PEFT + TRL for production pipelines.

---

## 3. Building training data pipelines from clinical sources

The bottleneck for clinical LLM adaptation is rarely compute — it is data. Clinical text is noisy, heavily templated, legally constrained, and expensive to annotate. Building a production-grade training data pipeline requires solving multiple interrelated challenges.

### De-identified datasets anchor development

**MIMIC-IV-Note** remains the most important public clinical text resource, containing **331,794 de-identified discharge summaries** and **2.3 million radiology reports** from Beth Israel Deaconess Medical Center. The 2024–2026 period has seen an explosion of derivative datasets: MIMIC-Instr provides 400,000 instruction-following examples generated from MIMIC-IV, EHRNoteQA (NeurIPS 2024) offers clinician-validated QA pairs for evaluating real-world clinical capabilities, and MIMIC-IV-Ext-22MCTS provides 22 million clinical time-series events. Beyond MIMIC, the eICU Collaborative Research Database spans 200+ hospitals, EPFL's clinical guidelines corpus covers 48,096 articles from 17 guideline sources, and MedQuAD provides 47,457 QA pairs from NIH sources.

### Synthetic data generation fills critical gaps

LLM-generated synthetic clinical data has emerged as a viable augmentation strategy, with important caveats. The **label-to-data method** (Tang et al., EMNLP 2023) uses LLMs to generate clinical sentences conditioned on label definitions, improving downstream F1 by 5–7.4% — with the counterintuitive finding that LLM "hallucinations" serve as privacy-preserving data augmentation. A Frontiers AI (2025) study used GPT-4o to generate 6,166 perioperative case files via zero-shot prompting, with statistical fidelity validated through t-tests and confidence interval overlap. An Estonian NER pipeline (JMIR, March 2025) demonstrated a privacy-preserving workflow where GPT-2 generates synthetic notes locally and GPT-4 annotates them, avoiding sending real patient data to third-party APIs.

Quality validation requires multiple approaches: statistical fidelity metrics (Kolmogorov-Smirnov, Wasserstein distance, Jensen-Shannon divergence), downstream task performance measurement, and critically, expert clinical review for hallucination detection. A key dimensional limit applies: LLMs preserve realistic distributions for **≤10 features** but show catastrophic misalignment for higher dimensions — traditional methods (GANs, VAEs) remain necessary for high-dimensional tabular data.

### The copy-forward problem corrupts clinical corpora

A finding with major implications for training data quality: **54.2% of clinical note text is copied forward** from prior documentation, up from ~33% in 2015. A physician seeing 10 patients per day may sift through 85 pages of documentation due to duplication. For LLM training, this introduces propagated errors, outdated information, and massive redundancy. A critical finding from a 2026 medRxiv study: **naive RAG over raw clinical text increased hallucination 8.7× (from 5.0% to 43.6%)**, while structured patient data representations reduced unsupported claims to 8.4%. Preprocessing pipelines must include deduplication using similarity metrics (Levenshtein, cosine similarity), section segmentation, abbreviation normalization, and template boilerplate removal.

### De-identification requires defense in depth

HIPAA provides two pathways. **Safe Harbor** removes 18 specific identifiers via a simple checklist but reduces data granularity (no sub-year dates, no sub-state geography). **Expert Determination** allows retaining more detail if a qualified expert certifies re-identification risk is "very small," preserving month-level dates and sub-state geography but requiring expensive specialized expertise. Most organizations default to Safe Harbor, with a hybrid approach applying Safe Harbor removals and Expert Determination to justify retaining specific additional details.

Automated PHI detection has reached production quality. John Snow Labs Healthcare NLP achieves **96% F1** on PHI detection with 99%+ recall at 2-billion-note scale and makes 50–575% fewer errors than AWS, Azure, and GCP respectively. Philter (UCSF) achieves 99%+ recall as an open-source alternative. General-purpose LLMs like GPT-4o perform poorly at de-identification (79% F1) and introduce privacy risks by sending data to external APIs — they should not be used for production PHI removal.

### Federated learning connects to Phase 1's federated memory

Federated learning for clinical LLM training has advanced significantly since Phase 1, though deployment remains limited — only **5.2% of 612 FL healthcare studies** involved real-world deployment (Teo et al., 2024). Well-designed federated models routinely achieve **95–98% of centralized model performance**.

The most promising approach for clinical teams is **federated LoRA fine-tuning**. Layer-skipping FL applied to LLaMA 3.2-1B for clinical NER and classification achieved **~70% reduction in communication costs** while maintaining performance within 2% of centralized training. SDFLoRA (Selective Decoupled Federated LoRA, 2025) decouples each client update into shared and private components, injecting differential privacy noise exclusively into the shared module. The low dimensionality of LoRA updates makes them inherently more resilient to DP noise than full model parameters.

For teams already implementing Phase 1's federated memory architecture, Flower (flower.ai) provides the most mature open-source FL framework. Its Photon extension achieved the first federated end-to-end LLM pre-training, training 1.3B and 7B models from scratch over commodity internet links. FATE-LLM supports federated LoRA with IP protection, and OpenFedLLM provides 7 FL algorithms with 30+ evaluation metrics.

---

## 4. Alignment techniques shape clinical safety boundaries

Alignment is the model-level complement to Phase 4's inference-time guardrails. Where guardrails catch problematic outputs at runtime, alignment shapes the model's baseline behavior — its tendency to express appropriate uncertainty, adhere to evidence-based reasoning, and avoid harmful recommendations. The two form a defense-in-depth architecture that neither can provide alone.

### DPO has displaced RLHF for open clinical models

Direct Preference Optimization has emerged as the dominant alignment technique for open-weight medical models, eliminating the need for a separate reward model. A JMIR 2025 study evaluated DPO on Llama3 8B and Mistral 7B across clinical NLP tasks. On MedQA clinical reasoning, DPO raised accuracy from **7% (base Llama3) to 36%** and from **22% (base Mistral) to 40%** — statistically significant gains over SFT alone (p<0.005). Patient triage F1 improved to 0.74 (p<0.001). Med42-v2 uses multi-stage DPO on Llama-3 to achieve **79.10% on MedQA** (state-of-the-art among open medical LLMs at release), specifically addressing the "refusal to answer medical questions" problem that general alignment creates.

However, DPO's benefits are **not universal across clinical tasks**. Urgency triage for Mistral actually degraded after DPO (F1 dropped to 0.85). A January 2026 benchmarking study found DPO improvements for medical vision-language models were often **indistinguishable from matched SFT baselines**, suggesting some gains stem from additional supervised training rather than preference optimization itself. DPO-aligned models still exhibited fundamental errors in anatomical identification.

**RRG-DPO** (MICCAI 2025) introduces specialty-specific DPO for radiology report generation, using clinical-relevant dispreference retrieval — instead of random rejected samples, it retrieves reports closest to the preferred response but with significant abnormality conflicts. This outperformed both native DPO and DPO-positive variants on MIMIC-CXR.

### DPO variants expand the clinical toolkit

**KTO** (Kahneman-Tversky Optimization) works with unary feedback (thumbs up/down per response, no pairs needed), making it particularly promising for clinical settings where collecting paired preferences from busy clinicians is expensive. Applied in the CARES-18K medical safety study, KTO achieved **up to 42% improvement in safety metrics** for harmful query detection across Llama-3B/8B, Meditron-8B, and Mistral-7B.

**SimPO** (Simple Preference Optimization, NeurIPS 2024) uses reference-free optimization with length normalization, achieving the best performance on general benchmarks (53.7 vs. DPO's 48.0 on AlpacaEval2). Its noise tolerance makes it suitable for messy clinical feedback data. **ORPO** combines SFT and alignment in a single training step, useful for clinical teams with limited compute. The emerging multi-pass production stack sequences: SimPO for broad alignment → ORPO for robustness → KTO for risk-sensitive domains → DPO for final refinement.

### Clinical preference data requires domain expertise

The **ClinAlign/HealthRubrics framework** (February 2026) represents the most actionable approach: **7,034 physician-verified preference examples** where clinicians refine LLM-drafted rubrics, producing **119 reusable clinical principles** organized by clinical dimension. Physician-to-physician agreement was higher than agreement with original user labels, demonstrating systematic divergence between clinical and lay preferences. GPT-4 preferences significantly diverge from professional physician preferences (Dou et al., 2025), making direct use of general AI judges unreliable for medical preference labeling.

For scalable data collection, RLAIF (Reinforcement Learning from AI Feedback) is emerging as a complement. Dou et al. (2025) proposed a two-stage approach for medical dialogues: diverse branch sampling via LLM dialogue continuation, followed by preference modeling through both outcome and process feedback. RLTHF (Targeted Human Feedback, 2025) combines LLM-based initial alignment with selective human corrections, reducing annotation costs while maintaining quality.

### The alignment tax is real but manageable

A March 2025 paper established a formal "Safety Tax": safety alignment restores safety capability in large reasoning models but leads to **measurable degradation of reasoning capability** on GPQA benchmarks. Distribution-Grounded Refinement (DGR) mitigates this, achieving **+30.2% improvement in average reasoning accuracy** over vanilla SFT. The key insight is that distribution shift — not the safety objective itself — drives reasoning degradation. As few as **10 samples** suffice for effective refusal behavior; the challenge is distributional consistency.

Practical approaches to preserve clinical reasoning during alignment include: RPSA (freezing parameters critical for reasoning, identified via Fisher information diagonal), RECAP (pre-filling reasoning traces with counter-aligned sentences), and Apple's Disentangled Safety Adapters (ICLR 2026), which achieve 0.88 vs. 0.61 AUC on hallucination detection while enabling dynamic, inference-time adjustment of alignment strength.

### Multi-layer defense integrates alignment with Phase 4 guardrails

The recommended architecture layers five defenses:

1. **Base model alignment** (RLHF/DPO with clinical preference data) — shapes intrinsic behavior
2. **Constitutional/principle-based constraints** (clinical ethics constitution drawing from AMA principles, evidence-based medicine requirements, scope limitations) — establishes behavioral boundaries
3. **Input guardrails** (prompt classification, injection detection, scope enforcement) — from Phase 4
4. **Output guardrails** (factuality checking against medical databases, safety classifiers, hallucination detection) — from Phase 4
5. **Human-in-the-loop** (physician review for high-risk outputs) — from Phase 4's escalation framework

Research shows high similarity between alignment datasets and fine-tuning data weakens safety guardrails; low similarity yields more robust models (reducing harmfulness by up to **10.33%**). This suggests alignment training data should be deliberately distinct from task fine-tuning data.

---

## 5. Leading clinical LLMs reveal a stratified landscape

The clinical LLM ecosystem in 2025–2026 shows clear stratification: commercial reasoning models dominate benchmarks, open-weight medical models enable private deployment, and a critical finding challenges the assumption that domain-specific fine-tuning always helps.

### Commercial models set the accuracy ceiling

| Model | MedQA | Key differentiator |
|-------|-------|--------------------|
| OpenAI o1 | **96.5%** | Chain-of-thought reasoning at inference |
| GPT-5 | 96.3% | Broad clinical reasoning; 95.22% avg across USMLE steps |
| GPT-5 Mini | 96.2% | Budget-optimized ($0.25/$2.00 per M tokens) |
| Claude Opus 4.1 (Thinking) | 93.6% | Constitutional AI alignment; HIPAA-ready |
| Gemini 2.5 Pro | 93.1% | Strong multimodal capabilities |
| Med-Gemini | 91.1% | Uncertainty-guided web search; 14 benchmarks |

The gap between commercial (~96%) and open-source (~80–88%) models on MedQA remains **8–16 percentage points**. Reasoning models (o1, o3) represent the single largest performance driver — their chain-of-thought inference approach delivers greater gains than any domain-specific training technique.

### Open-weight medical models enable sovereign deployment

| Model | Base | Parameters | MedQA | Training approach | Release |
|-------|------|-----------|-------|-------------------|---------|
| **MedGemma** | Gemma 3 | 4B / 27B | 87.7% (27B) | Medical image encoder + medical text fine-tuning | May 2025 |
| **Llama-3-Meditron** | LLaMA-3.1 | 8B / 70B | Outperforms Med-PaLM 2, GPT-4 | Continued pretraining + MediTree inference | Mar 2025 |
| **OpenBioLLM** | LLaMA-3 | 8B / 70B | 80.85% (70B) | 2-stage fine-tuning + DPO | Apr 2024 |
| **Med42-v2** | LLaMA-3.1 | 8B / 70B | 79.10% (70B) | Clinical fine-tuning + multi-stage DPO | Aug 2024 |
| **Me-LLaMA** | LLaMA-2 | 13B / 70B | Competitive | 129B token continued pretraining | 2024 |
| **MEDITRON** | LLaMA-2 | 7B / 70B | ~57% (70B) | 48.1B token continued pretraining | Nov 2023 |

**MedGemma** (Google DeepMind, 2025) stands out as the first truly multimodal open medical model, with a medical image encoder (MedSigLIP) pre-trained on 33M+ medical image-text pairs and support for radiology, histopathology, ophthalmology, and dermatology. At 27B parameters, it achieves 87.7% on MedQA — competitive with DeepSeek-R1 at one-tenth the cost. **OpenMed** (2025) released 380+ models across 0.5B–120B+ parameters under Apache 2.0, democratizing access. **JSL Medical LLMs** (John Snow Labs) claim 79.83% average on MedHELM versus GPT-5's 75.12%, though these are vendor-reported figures.

### The uncomfortable finding: domain fine-tuning can hurt

A 2024 study (arXiv:2408.13833) found that **"biomedical LLMs are not superior to generalist models on unseen medical data."** OpenBioLLM-8B scored 44.93% versus base Llama-3-8B-Instruct's 74.08% on clinical tasks outside its fine-tuning distribution. BioMistral consistently underperformed base Mistral on clinical tasks. The pattern suggests that small medical fine-tunes often overfit to benchmark formats (particularly multiple-choice QA) while degrading on real clinical tasks like summarization, coding, and long-form reasoning.

This has direct implications for the agentic harness architecture from Phase 1: **a well-orchestrated system using a strong general model with high-quality RAG may outperform a specialized medical model operating alone**, particularly for novel or out-of-distribution clinical scenarios. The recommended approach is hybrid: use the best available general-purpose reasoning model as the orchestrator for complex clinical reasoning, deploy open-weight medical models when privacy, on-premises deployment, or cost constraints apply, and reserve domain-specific fine-tuning for well-defined tasks (ICD coding, report generation) where format and terminology must be precisely learned.

---

## 6. The benchmark-to-clinical gap demands new evaluation approaches

MedQA has been **archived by Vals.ai** because nearly all recent commercial models score above 95%. The benchmark is saturated. But this achievement masks a deeper problem: **high performance on medical exams does not translate to clinical competence**.

A JMIR 2025 systematic review of 39 benchmarks found that knowledge-based benchmark accuracy averages **84–90%**, while practice-based benchmark performance drops to **45–69%**. Safety assessments score only 40–50%. Script Concordance Testing (NEJM AI 2025) showed LLMs perform markedly lower on clinical reasoning under uncertainty than on MCQ benchmarks, consistently below expert physician levels. An ACL 2025 systematic analysis of 702 clinical evaluations found benchmark-to-clinical correlation of only **Spearman's ρ = 0.59** — moderate at best. MedQA failed to capture patient communication, longitudinal care, and clinical information extraction capabilities.

Perhaps most strikingly, a Nature Medicine 2026 RCT (n=1,298) found that while LLMs alone scored **94.9%** on condition identification, humans using the same LLMs scored **<34.5%** — no better than controls. The human-AI interaction gap is as important as the model gap.

### Practice-based benchmarks close the gap

**MedAgentBench** (Stanford, NEJM AI) provides a virtual EHR environment with 100 patient profiles and 785,000 records across 300 clinical tasks. The best model (Claude 3.5 Sonnet v2) achieved only **70% success rate**, revealing struggles with nuanced reasoning and EHR interoperability. **HealthBench** (OpenAI) uses physician-graded multi-turn conversations. **DiagnosisArena** tests open-ended diagnostic reasoning, where models achieve only 45.82%. **CSEDB** provides 2,069 vignettes evaluated on safety and effectiveness criteria.

For teams building clinical evaluation pipelines (connecting to Phase 4's CI/CD evaluation), the recommended architecture includes: gold standard test cases curated by clinical experts and excluded from training data, LLM-as-Judge evaluation against defined rubrics, automated gating preventing degraded models from reaching production, and continuous monitoring with Braintrust, Promptfoo, or Langfuse for observability. Critically, evaluation must run on both benchmark MCQs and practice-based scenarios, include safety adversarial testing, and perform bias audits across demographic subgroups at every model update.

### Federated evaluation bridges the institutional gap

**MedPerf** (MLCommons) enables evaluating AI models on diverse real-world data across institutions without sharing patient data — directly extending Phase 1's federated architecture to the evaluation domain. Combined with temporal validation (testing on data collected after training) and geographic validation (testing on data from different institutions), this provides the most robust assessment of real-world clinical performance.

---

## 7. Operational machinery for fine-tuned model lifecycles

Deploying fine-tuned clinical models in production requires operational infrastructure that addresses regulatory compliance, safe rollout, continuous monitoring, and versioned reproducibility. These concerns connect directly to Phase 4's safety architecture while adding model-training-specific requirements.

### FDA PCCP enables pre-authorized model updates

The FDA's **December 3, 2024 final guidance** on Predetermined Change Control Plans represents a pivotal regulatory development for clinical AI teams. A PCCP, included in 510(k), De Novo, or PMA submissions, allows manufacturers to implement pre-described modifications **without new marketing submissions** if executed exactly as planned. The PCCP requires three mandatory sections: description of planned modifications, a step-by-step modification protocol with pre-defined acceptance criteria, and an impact assessment analyzing effects on safety and performance.

In August 2025, the FDA, Health Canada, and UK MHRA jointly issued **5 guiding principles** for PCCPs: Focused, Risk-based, Evidence-based, Transparent, and Accountable. For clinical LLM teams, this means pre-specifying retraining triggers (data drift detection thresholds, performance degradation, new data acquisition milestones), validation methodology and datasets, acceptance criteria, and documented impact on subpopulations. All implementation must occur within a Quality Management System aligned with ISO 13485, effective February 2, 2026.

### Model versioning treats model, data, and code as a single unit

Production model management requires semantic versioning linking specific code commits, data snapshots, and hyperparameters. The recommended toolchain: Git + DVC/LakeFS (data versioning) + MLflow/Weights & Biases (experiment tracking + model registry) + Docker/Kubernetes (deployment) + CI/CD pipeline (automated testing/gating). Models progress through lifecycle stages (Staging → Production → Archived) with automated promotion gates. Clinical-specific requirements include deployment timestamps, clinician interaction logging, complete audit trails per FDA Quality System Regulation, and external validation (temporal or geographic) before each production deployment.

### Drift monitoring must go beyond performance tracking

Phase 4 identified drift detection as essential; the fine-tuning context adds specific concerns. A Nature Communications 2024 finding is critical: **monitoring performance alone is not a good proxy for detecting data drift**. The CheXstray/MMC+ framework provides a model: compare DICOM metadata, image feature embeddings, and model outputs against reference datasets using combined concordance metrics. Stanford WILDS/Wild-Time benchmarks report **20% performance drops** over time in MIMIC-IV clinical prediction tasks.

The recommended monitoring stack combines real-time monitoring for critical scenarios (alerts within minutes), batch monitoring for trend tracking (weekly/monthly), statistical process control charts with defined control limits, and automated alerting with tiered severity (warning → investigation → model pause). Clinical-specific tools include Fiddler AI (healthcare-focused observability), CyclOps (clinical AI framework), and custom Prometheus/Grafana dashboards.

### A/B testing in clinical workflows follows staged rollout

The safest protocol follows four phases: (1) **shadow deployment** running the new model alongside the existing one without serving results to clinicians; (2) **silent validation** recording inputs/outputs to verify alignment with retrospective evaluation; (3) **pilot study** deploying to a small subset with clinician education and workflow integration assessment; (4) **controlled rollout** starting at 5–10% of traffic with randomized persistent user allocation, single-variable isolation, and pre-defined stopping criteria for adverse outcomes. Only 86 randomized trials of ML interventions had been conducted worldwide by 2024 — clinical A/B testing infrastructure remains nascent.

---

## 8. Risks that could undermine clinical fine-tuning investments

### Catastrophic forgetting follows proximity patterns

Fine-tuning on clinical data does not uniformly degrade general capabilities — it preferentially destroys knowledge that is **semantically close** to the injected content (OpenReview 2025, "InternAL"). This means adding oncology knowledge may degrade related immunology knowledge more than unrelated geography knowledge. Existing mitigation techniques fail to address this specific pattern; InternAL's approach of probing the model's internal knowledge to augment the training dataset shows promise.

Practical defenses include using LoRA/QLoRA as the default (freezing base weights inherently preserves pretrained knowledge), incorporating experience replay with general medical data during fine-tuning (MEDITRON's RedPajama replay strategy), applying hierarchical regularization for element-wise parameter importance (20× faster than prior methods), and monitoring both domain-specific and general capability benchmarks throughout training.

### Privacy risks in model weights are non-trivial

Standard fine-tuning leaks up to **7% on sample-level membership inference attacks** for GPT-2 class models and 3–4% for BERT variants. Clinical LLMs trained on MIMIC-IV EHR data demonstrated "non-trivial yet bounded membership leakage" (arXiv 2510.18674). More concerning, the PreCurious attack (2025) showed that adversarially-modified pretrained models can serve as "privacy traps," escalating data extraction risks even against DP-SGD with ε≤0.05.

**DP-LoRA** represents the current best practice: LoRA fine-tuned models under differential privacy outperform both full DP fine-tuning and direct DP training. Moderate privacy budgets (ε ≈ 10) maintain clinically acceptable performance, particularly for imaging tasks. However, strict privacy (ε ≈ 1) leads to substantial accuracy loss, and critically, DP can **widen subgroup performance gaps** — creating tension between privacy and equity. De-identification before fine-tuning remains essential as a first line of defense, with Llama-3 70B achieving 99.24% success rate on PHI character removal (NEJM AI).

### Bias perpetuation demands systematic auditing

Bias in clinical AI is pervasive. A systematic review found **93.7% of studies reported gender disparities** and **90.9% reported racial/ethnic biases**. GPT-4 over-represented disease-demographic stereotypes, showing significant differences in diagnostic and treatment recommendations when only race or gender was modified. GPT-3.5-turbo favored White patients with superior treatments in 11/200 cases. LLMs inherit and amplify cognitive biases implicated in **40–80% of the 40,000–80,000 preventable deaths** annually in the US attributed to diagnostic errors.

Mitigation requires counterfactual patient variations (creating dataset variants swapping demographics), chain-of-thought prompting that forces explicit reasoning (reducing reliance on biased shortcuts), ethnicity-representative fine-tuning data, and continuous post-deployment fairness audits across demographic subgroups.

### The specialization-versus-harness tension resolves as convergence

The question posed in Phase 1 — whether specialized clinical models are necessary when the agentic harness handles specialization — resolves not as a binary choice but as convergence. A 2026 Frontiers review articulates the consensus: *"Generalist models will leverage their robust reasoning to handle complex, unstructured clinical contexts, while specialized medical models will serve as the expert kernel providing precise knowledge and safety boundaries."*

The evidence supports a **high-performance orchestrator + specialized workers** architecture: a large reasoning model (GPT-4-class) as orchestrator for intent interpretation, task routing, and tool selection; smaller, specialized models as domain-specific workers for clinical NLP, imaging interpretation, and structured tasks; RAG integration for real-time knowledge access; and human-in-the-loop for mission-critical decisions. GPT-4 achieved **87.5% accuracy in tool-calling decisions** versus 39.1% for Llama-3-70B, reinforcing the case for a strong general orchestrator. Multi-agent systems show dramatic improvements: accuracy increased from 0% to 76% on bias-containing complex cases, surpassing human physicians by 21%.

---

## 9. Cross-references to Phases 1–4 and the path forward

This phase's findings interact with every prior phase of the agentic harness architecture:

**Phase 1 (Orchestration & Federated Memory)**: The federated memory architecture directly enables federated LoRA fine-tuning across institutions. SDFLoRA's shared/private component decomposition maps onto Phase 1's federation patterns. The specialization-versus-harness question resolves in favor of Phase 1's orchestration approach — a strong general orchestrator with specialized workers outperforms monolithic specialized models.

**Phase 2 (Context Engineering & MEGA-RAG)**: The MedRAG finding (GPT-3.5 + RAG ≈ GPT-4) establishes that retrieval quality can substitute for model-level investment. RAFT bridges the gap by training models to handle retrieval noise. The "fine-tune for format, RAG for knowledge" pattern means Phase 2's MEGA-RAG architecture carries even more weight than initially estimated — it may be the single highest-ROI investment for clinical knowledge tasks.

**Phase 3 (Streaming Inference & Real-Time Integration)**: PEFT adapters enable multi-model serving (S-LoRA, Punica) where task-specific adapters are loaded per request on a shared base model, directly optimizing Phase 3's inference fabric. GaLore and QLoRA reduce the compute footprint for training, while quantized inference models reduce serving costs. On-device clinical LLMs (MedAide on NVIDIA Jetson) extend Phase 3's real-time integration to edge deployment.

**Phase 4 (Clinical Safety & Guardrails)**: Model-level alignment (DPO, Constitutional AI) and inference-time guardrails form complementary layers of a defense-in-depth architecture. Apple's Disentangled Safety Adapters enable dynamic, inference-time adjustment of alignment strength — bridging the training-time/inference-time boundary. Phase 4's PCCP framework applies directly to fine-tuned model updates. Drift monitoring (Phase 4) must be augmented with domain-specific and general capability tracking after each fine-tuning cycle.

### Recommended next phases

- **Phase 6: Multi-Modal Clinical AI** — MedGemma, Med-Gemini-3D, and BrainGPT demonstrate that combining text, imaging, and structured data in unified models is the next capability frontier. Covers medical image encoders, cross-modal attention, and multimodal agentic workflows.
- **Phase 7: Edge Deployment & On-Device Clinical AI** — Quantized clinical models on NVIDIA Jetson/IGX, hybrid cloud-edge architectures, and latency-constrained clinical applications (surgical decision support, real-time monitoring).
- **Phase 8: Mixture-of-Experts Architectures for Clinical AI** — GPT-5, DeepSeek-V3.1, and Med-MoE demonstrate that MoE enables massive capacity with practical inference costs. Covers routing strategies, domain-specific expert training, and clinical MDT-inspired architectures.

---

## Conclusion

The model-level decisions covered in this phase determine the ceiling for every system built in Phases 1–4, but the key insight is that **the ceiling is set by the weakest link in a multi-layer chain**, not by any single technique. The evidence strongly favors a layered adaptation strategy: continued pretraining for deep domain knowledge (when resources permit), parameter-efficient fine-tuning for task-specific behavior (QLoRA with DoRA as the 2026 default), DPO alignment with clinician-collected preference data (not AI proxies), and high-quality RAG for current evidence — all wrapped in Phase 4's guardrail architecture.

Three findings should reshape how clinical AI teams allocate their investments. First, retrieval quality substitutes for model scale more effectively than expected — the MedRAG result means that perfecting Phase 2's MEGA-RAG architecture may deliver more clinical value per dollar than extensive fine-tuning. Second, domain-specific fine-tuning can actively harm performance on unseen clinical data, making it essential to validate beyond benchmark distributions. Third, the alignment tax is real but addressable — distribution-grounded refinement recovers reasoning capability while maintaining safety, and Apple's disentangled safety adapters enable runtime tuning of the safety-capability tradeoff.

The field is converging on a hybrid architecture that mirrors how hospitals actually work: a capable generalist (the orchestrating model) coordinates with domain specialists (fine-tuned workers) while consulting the latest evidence (RAG) and following institutional protocols (alignment + guardrails). The agentic harness from Phase 1 is not just complementary to model-level adaptation — it is the framework within which adaptation decisions become tractable, auditable, and incrementally improvable.