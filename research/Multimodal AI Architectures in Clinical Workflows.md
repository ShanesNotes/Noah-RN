# Multimodal AI Architectures in Clinical Workflows: A Comprehensive Analysis of Post-Med-Gemini Foundation Models

The release of the Med-Gemini family in May 2024 catalyzed a structural paradigm shift in clinical artificial intelligence, moving the healthcare industry away from unimodal, text-bound large language models toward natively multimodal architectures capable of synthesizing high-dimensional biomedical data.<sup>1</sup> However, the subsequent period between late 2024 and the first quarter of 2026 has witnessed an exponential acceleration in model capabilities, hardware inference optimizations, and agentic orchestration protocols.<sup>3</sup> The contemporary landscape is no longer defined merely by isolated benchmark superiority on static medical examinations. Instead, the efficacy of a clinical model is now determined by its capacity to operate as an autonomous, interoperable agent within highly governed, multi-agent clinical environments.<sup>4</sup>

This comprehensive research report delivers an exhaustive, component-level analysis of the open-weight and commercially available clinical multimodal models released subsequent to the Med-Gemini baseline, up to the March 2026 cutoff. The analysis dissects supported input and output modalities, evaluates empirical efficacy across both static knowledge (MedQA) and workflow-grounded (MedHELM) benchmarks, and quantifies inference latency on state-of-the-art NVIDIA H200 and Blackwell B200 hardware architectures. Furthermore, the report evaluates each foundation model's architectural suitability as a worker agent within the "noah-rn" hierarchical clinical harness, culminating in an optimized orchestrator-worker model pairing tailored specifically for the rigorous demands of a nursing-first deployment.


## The Agentic Clinical Harness: Architectural Demands of the "noah-rn" Topology

Before evaluating the individual foundation models, it is imperative to establish the structural parameters of the target deployment environment. The "noah-rn" harness represents a hierarchical, multi-agent orchestration topology engineered specifically to augment and automate autonomous nursing workflows.<sup>4</sup> Unlike traditional monolithic clinical decision support systems that suffer from the "swivel chair" problem—forcing nurses to constantly alternate focus between the electronic health record interface and external artificial intelligence applications—the noah-rn architecture embeds artificial intelligence directly into the clinical substrate as an ambient, invisible layer.<sup>7</sup>

In this hierarchical topology, system architecture supersedes isolated model capability. Empirical research from early 2026 demonstrates that orchestrated multi-agent systems maintain a 90.6% accuracy rate at scale, whereas single monolithic agents experience a catastrophic degradation to 16.6% accuracy under identical clinical workloads.<sup>4</sup> The noah-rn harness relies on a bifurcated division of computational labor, dividing tasks between an orchestrator and subordinate worker agents.

The orchestrator operates as the cognitive apex of the system. It is typically a highly capable, large-parameter foundation model responsible for long-horizon planning, multi-step clinical reasoning, and managing the state of the patient encounter across the entirety of a nursing shift.<sup>4</sup> Conversely, worker agents are smaller, modality-specific models optimized for edge-native deployment, zero-trust network environments, and the rapid, localized extraction of protected health information.<sup>4</sup>

To function effectively as a worker agent within the noah-rn harness, a model must integrate seamlessly with the Model Context Protocol. This protocol grants the worker agent secure, read-and-write access to longitudinal patient records, allowing it to treat the electronic health record as a highly structured, callable tool.<sup>4</sup> Furthermore, the worker agent must participate in Agent-to-Agent horizontal orchestration meshes. This requires the model to possess the semantic flexibility to discover other active agents, negotiate the exchange of heterogeneous data modalities such as Fast Healthcare Interoperability Resources JSON payloads or Digital Imaging and Communications in Medicine files, and execute state-transition lifecycles including states categorized as submitted, working, input-required, or completed.<sup>4</sup>

Crucially, nursing-first deployments dictate extraordinarily stringent environmental and operational requirements. Nurses operate in high-friction, mobile-centric environments where physical cognitive load is high, data capture conditions are routinely imperfect, and network connectivity across hospital wards may fluctuate unpredictably.<sup>7</sup> Therefore, a worker agent deployed in the noah-rn harness must demonstrate high resiliency to real-world data degradation and support ambient mobile workflows, such as integration with mobile charting applications.<sup>7</sup>

Safety governance in this environment is paramount. The noah-rn architecture mandates a strict draft-review safety pattern. Under this paradigm, the artificial intelligence is permitted to stage documentation, such as generating patient timelines or drafting pain management assessments based on standardized tools, but the registered nurse retains absolute sign-off authority.<sup>7</sup> Autonomous publishing of clinical data to the official record is strictly prohibited.<sup>7</sup> Latency serves as the final, critical constraint for the worker agent; workflow-triggered decision support hooks demand response times under 500 milliseconds to avoid disrupting the clinical flow, while interactive voice agents require sub-800-millisecond time-to-first-token responses to preserve the fluidity of human-computer conversation.<sup>7</sup>


## The Evolution of Clinical Evaluation: Transitioning from MedQA to MedHELM

The methodology for evaluating clinical large language models underwent a radical transformation between 2024 and 2026. Historically, the United States Medical Licensing Examination-style MedQA dataset served as the gold standard for measuring the medical proficiency of foundation models.<sup>12</sup> The original Med-Gemini model established a highly publicized baseline by achieving 91.1% accuracy on MedQA.<sup>13</sup> By early 2026, the industry recognized that this metric had saturated. Successor models, including GPT-4o mini and Gemini 2.5 Pro, regularly achieve scores above 94% on MedQA.<sup>14</sup>

However, high performance on MedQA correlates poorly with actual clinical competence. A model may flawlessly memorize pathophysiological pathways to answer a multiple-choice question, yet fail entirely to synthesize a coherent discharge summary, recognize under-triage patterns in a symptomatic patient, or maintain documentation integrity under the pressure of electronic health record copy-paste phenomena.<sup>15</sup>

To address this severe knowledge-practice gap, the MedHELM (Holistic Evaluation of Language Models for Medical Tasks) framework was introduced and widely adopted by 2025.<sup>5</sup> MedHELM employs a rigorously clinician-validated taxonomy spanning 121 practical, real-world tasks categorized into five principal domains: Clinical Decision Support, Clinical Note Generation, Patient Communication and Education, Medical Research Assistance, and Administration and Workflow.<sup>5</sup>

Rather than relying on simple exact-match scoring, MedHELM utilizes an advanced large language model-jury methodology that has been empirically validated to align with human clinician ratings. In comparative studies, the large language model-jury intraclass correlation coefficient reached 0.47, exceeding the typical clinician-clinician agreement of 0.43, primarily due to the automated jury's superior self-consistency in handling case-level ambiguity.<sup>5</sup> MedHELM specifically measures three critical error-type metrics: the direction of effect, which evaluates the correct assignment of positive or negative clinical outcomes; numeric accuracy, which tests the fidelity of reported odds ratios, confidence intervals, and p-values; and completeness, which ensures all statistically significant outcomes are included in generated clinical summaries.<sup>5</sup> By focusing on harm-weighted errors and model calibration, MedHELM provides a far more accurate representation of how a model will perform as a worker agent within the noah-rn harness.<sup>15</sup>


## The Physics of Inference Latency: NVIDIA H200 vs. Blackwell B200 Architectures

Within the noah-rn hierarchical harness, the inference latency of a worker agent directly governs the rate of clinician adoption. If a nurse is forced to wait several seconds for a worker agent to parse an electronic health record payload or draft a triage note, the "swivel chair" friction is reintroduced, and the system will inevitably be abandoned.<sup>7</sup> The transition from NVIDIA's Hopper architecture, specifically the H100 and H200, to the next-generation Blackwell B200 architecture has fundamentally altered the economics and physical speed of multimodal token generation.

Large language model inference is physically constrained by two distinct operational phases: the prefill phase and the decode phase.<sup>19</sup> The prefill phase involves processing the entirety of the user's prompt to produce the first token. This phase is heavily compute-bound and benefits immensely from parallel batching.<sup>19</sup> The decode phase, wherein subsequent tokens are generated auto-regressively one at a time, is strictly memory-bandwidth-bound and is highly sensitive to latency, as the rate of generation depends on how quickly model weights can be loaded into the compute cores from the static random-access memory.<sup>19</sup>

The NVIDIA H200 was engineered specifically to mitigate the decode bottleneck inherent in the earlier H100 generation. The H200 expands memory capacity to 141 gigabytes of HBM3e with a memory bandwidth of 4.8 terabytes per second, representing a 1.4-times faster data access rate and a 60% overall throughput boost compared to the H100.<sup>19</sup> This increased memory capacity allows massive key-value caches to remain resident on the chip, stabilizing the performance of models utilizing long context windows and virtually eliminating the need to partition 70-billion-parameter models across multiple nodes.<sup>19</sup>

The Blackwell B200 architecture redefines the frontier of inference physics entirely. Built to support next-generation reasoning models and immense multimodal context windows, the B200 features 192 gigabytes of ultra-fast HBM3e memory with an astonishing 8.0 terabytes per second of memory bandwidth.<sup>22</sup> Furthermore, the Blackwell architecture introduces fifth-generation Tensor Cores and dual Transformer Engines that natively support FP4 micro-tensor scaling.<sup>22</sup> This extreme hardware acceleration allows the B200 to achieve up to 15 times the inference performance of the H100 generation, though this comes at the cost of a 1000-watt thermal design power envelope, significantly higher than the H200's 700-watt threshold.<sup>22</sup>


<table>
  <tr>
   <td><strong>Hardware Architecture</strong>
   </td>
   <td><strong>Memory Capacity</strong>
   </td>
   <td><strong>Memory Bandwidth</strong>
   </td>
   <td><strong>Throughput & Latency Characteristics</strong>
   </td>
   <td><strong>Target Use Case within Clinical AI</strong>
   </td>
  </tr>
  <tr>
   <td><strong>NVIDIA H100</strong>
   </td>
   <td>80 GB HBM3
   </td>
   <td>~3.0 TB/s
   </td>
   <td>Mature, baseline throughput. High off-chip traffic for large contexts.<sup>19</sup>
   </td>
   <td>Legacy deployments; budget-constrained batch tasks.
   </td>
  </tr>
  <tr>
   <td><strong>NVIDIA H200</strong>
   </td>
   <td>141 GB HBM3e
   </td>
   <td>4.8 TB/s
   </td>
   <td>Delivers 1.9x better throughput for long-context scenarios vs. H100. Reduces time-to-first-token by 45%.<sup>19</sup>
   </td>
   <td>Primary target for localized, edge-deployed worker agents requiring massive key-value caches.
   </td>
  </tr>
  <tr>
   <td><strong>NVIDIA B200</strong>
   </td>
   <td>192 GB HBM3e
   </td>
   <td>8.0 TB/s
   </td>
   <td>Achieves 3.1x faster interactive latency than H200. Introduces FP4 precision for massive token-per-second gains.<sup>19</sup>
   </td>
   <td>Ultra-low latency requirements; powers central orchestrator nodes managing real-time voice and millions of tokens.
   </td>
  </tr>
  <tr>
   <td><strong>NVIDIA GB200</strong>
   </td>
   <td>372 GB HBM3e (per superchip)
   </td>
   <td>> 8.0 TB/s
   </td>
   <td>Achieves over 800 tokens per second in offline MLPerf Inference benchmarks.<sup>24</sup>
   </td>
   <td>Hyperscale data center deployments for population-health analytics.
   </td>
  </tr>
  <tr>
   <td><strong>AMD MI300X</strong>
   </td>
   <td>192 GB HBM3
   </td>
   <td>5.3 TB/s
   </td>
   <td>Cost-efficient single-card deployment offering high memory capacity.<sup>19</sup>
   </td>
   <td>Viable alternative for large models where B200 capital expenditure is prohibitive.
   </td>
  </tr>
</table>


To achieve the sub-500-millisecond latency required for clinical decision support hooks, software optimizations such as NVIDIA's TensorRT-LLM and speculative decoding algorithms are essential. Techniques like Medusa leverage the original model as a draft model alongside additional decoding heads to predict candidate tokens in parallel.<sup>21</sup> When running a 70-billion parameter model on an NVIDIA HGX H200 utilizing NVLink Switch technology, Medusa speculative decoding boosts token generation to 268 tokens per second per user, a 1.9-times speedup that ensures the hardware's Tensor Cores are fully utilized during the auto-regressive decode phase.<sup>21</sup>


## Exhaustive Evaluation of Post-Med-Gemini Clinical Multimodal Models

The proliferation of multimodal foundation models in late 2025 and early 2026 has yielded a diverse ecosystem of open-weight and proprietary systems. Evaluating these models against the strict constraints of the noah-rn hierarchical harness requires a granular analysis of their modality support, empirical benchmark performance, hardware latency profiles, and architectural suitability for edge-native, nursing-first deployments.


### 1. The MedGemma 1.5 Family

Released by Google in January 2026, the MedGemma 1.5 collection represents a foundational shift in open-weight clinical artificial intelligence. Expanding upon the Gemma 3 architecture, the collection features a 4-billion parameter multimodal variant optimized for edge devices, a 27-billion parameter text-only variant, and a 27-billion parameter multimodal variant.<sup>25</sup>

**Modalities Supported:** The MedGemma 1.5 multimodal variants utilize a domain-specific MedSigLIP image encoder that has been aggressively pre-trained on a vast corpus of de-identified medical data.<sup>28</sup> MedGemma 1.5 natively processes text, including highly structured Fast Healthcare Interoperability Resources, alongside 2D radiology images, dermatology photography, ophthalmology fundus images, and whole-slide histopathology images.<sup>28</sup> The most profound architectural evolution in MedGemma 1.5 is its native support for high-dimensional 3D volumetric data. It stands as the first public open-weight multimodal model capable of interpreting multi-slice computed tomography and magnetic resonance imaging volumes simultaneously.<sup>27</sup> This allows the model to view multiple sections of a tissue sample concurrently, bypassing the semantic fragmentation that plagues generalist models attempting sequential slice analysis.<sup>30</sup> The model does not natively support audio ingestion, requiring integration with external models like Google's MedASR for speech-to-text translation.<sup>25</sup>

**Benchmark Efficacy:** The MedGemma 1.5 family demonstrates extraordinary competence across specialized radiomics and document understanding metrics. On static knowledge tasks, the 4B variant scores 69.1% on MedQA, while the 27B text-only variant achieves 89.8%.<sup>31</sup> However, the model's true superiority is revealed in imaging and electronic health record parsing. The 4B multimodal variant achieved a 14% absolute improvement in MRI classification over its predecessor, reaching 64.7% Macro Accuracy.<sup>27</sup> In anatomical localization on the Chest ImaGenome benchmark, it improved intersection over union from 3% to 38.0%.<sup>27</sup> For clinical data extraction, the model scores an 89.6% accuracy on the EHRQA dataset, demonstrating profound capability in retrieving information from unstructured medical records.<sup>28</sup>

**Inference Latency:** The 4-billion parameter footprint of the MedGemma 1.5 4B model allows it to operate with extreme velocity. While unoptimized deployments on consumer silicon may yield slow generation rates, deploying the instruction-tuned 4B model on an NVIDIA H200 utilizing TensorRT-LLM and FP8 precision guarantees time-to-first-token latencies well below the 50-millisecond mark.<sup>23</sup> This model is explicitly designed to maximize the 4.8 terabytes per second bandwidth of the H200, generating hundreds of tokens per second and effortlessly clearing the latency constraints of synchronous clinical decision support hooks.<sup>7</sup>

**Suitability for the "noah-rn" Harness:** MedGemma 1.5 4B is the archetypal worker agent. Its compact size permits zero-trust, edge-native deployment directly behind a hospital's firewall.<sup>9</sup> Health IT infrastructure teams can wrap the open-weight model in local Model Context Protocol servers, granting it secure, read-and-write access to the electronic health record.<sup>26</sup> Because it parses protected health information locally and processes high-dimensional DICOM volumes without requiring cloud transmission, it fulfills every security and functional requirement of the noah-rn worker topology.<sup>4</sup>


### 2. The Gemini 3 Ecosystem (Pro and Flash)

Launched in November 2025, the Gemini 3 family—primarily comprising the Gemini 3 Pro and Gemini 3 Flash variants—marks Google's transition to a reasoning-first Mixture-of-Experts architecture.<sup>8</sup>

**Modalities Supported:** The Gemini 3 models are natively omni-modal. They possess an expansive 1-million-token context window capable of ingesting text, complex codebase structures, images, native audio streams, and up to one hour of continuous video simultaneously.<sup>8</sup> The models introduce a dynamic "Thinking Level" parameter, allowing developers to trade computation time and token expenditure for deeper, multi-step spatial and logical reasoning.<sup>8</sup>

**Benchmark Efficacy:** Gemini 3 Pro operates at the absolute frontier of artificial intelligence capability. While Google obscures direct MedQA scores behind the legacy Med-Gemini baseline (which scored 91.1%), internal testing and independent benchmark analytics demonstrate that Gemini 3 Pro consistently outperforms specialized clinical decision support tools like OpenEvidence and UpToDate Expert AI on clinician-alignment tasks.<sup>13</sup> On the MedHELM leaderboard, the Gemini 2.5 Pro predecessor achieved a 0.519 mean win rate, with the Gemini 3 architecture demonstrating perfect completeness scores and unparalleled directional effect logic in real-world evidence summarization tasks.<sup>5</sup> Gemini 3 Flash, while slightly less capable in deep logical deconstruction, dominates the Artificial Analysis Omniscience knowledge benchmark, proving highly resilient to hallucination when grounded by search protocols.<sup>34</sup>

**Inference Latency:** The massive parameter count of the Gemini 3 Pro Mixture-of-Experts architecture demands robust hardware. Achieving sub-100-millisecond latency at the 99th percentile requires the 8.0 terabytes per second bandwidth of the Blackwell B200.<sup>19</sup> On NVIDIA H200 hardware, the model remains highly performant for batch tasks but may incur variable latency during its "pondering" phase, pushing response times toward the 450-800 millisecond range for text and up to 2 seconds for multimodal prompts.<sup>8</sup> Conversely, Gemini 3 Flash is explicitly engineered for velocity. Evaluated in early 2026, Gemini 3 Flash recorded a raw throughput of 218 output tokens per second, making it significantly faster than equivalent reasoning models.<sup>34</sup>

**Suitability for the "noah-rn" Harness:** The proprietary, cloud-locked nature of the Gemini 3 API disqualifies both the Pro and Flash variants from serving as local worker agents parsing raw protected health information.<sup>4</sup> However, their immense context windows, native audio streaming, and high-level reasoning make them the ultimate candidates for the central orchestrator role within the noah-rn topology. Gemini 3 Flash, in particular, possesses the sub-200-millisecond latency required to serve as the ambient, voice-native cognitive engine that monitors the entire nursing shift, delegates tasks to local worker agents, and maintains the longitudinal clinical state.<sup>37</sup>


### 3. OpenAI GPT-5 and the o-Series Architecture (o3-mini, o4-mini)

Released incrementally beginning in August 2025, OpenAI's GPT-5 and the accompanying o-series models (such as o3-mini and o4-mini) represent a continuous refinement of large-scale reinforcement learning and test-time compute scaling.<sup>3</sup>

**Modalities Supported:** GPT-5 expands the multimodal context window to 272,000 tokens, sufficient for processing several years of a patient's medical history concurrently.<sup>3</sup> The models natively process text, images, and audio, featuring highly expressive, emotion-aware voice-to-voice translation capabilities.<sup>39</sup> However, unlike MedGemma 1.5, they lack native, out-of-the-box volumetric understanding for 3D DICOM files without extensive embedding preprocessing.<sup>1</sup>

**Benchmark Efficacy:** The OpenAI models currently dominate the top echelons of clinical evaluation frameworks. On the static MedQA benchmark, the o4-mini model achieved a staggering 95.2% accuracy in March 2026, the highest recorded score on the leaderboard.<sup>14</sup> More importantly, on the clinician-validated MedHELM framework, GPT-5 achieved a mean win rate of 0.703, followed closely by o4-mini at 0.697.<sup>36</sup> These models demonstrate exceptional capability in drafting clinical notes, executing complex differential diagnoses, and maintaining safety protocols across high-risk patient communication scenarios.<sup>15</sup>

**Inference Latency:** The advanced reasoning capabilities of the o-series models inherently introduce latency, as the models generate hidden reasoning tokens before outputting a clinical response.<sup>17</sup> While GPT-5.1 is capable of achieving 125 tokens per second on optimized cloud infrastructure, the "reasoning tax" makes achieving strict sub-100-millisecond time-to-first-token latencies challenging without the raw computational force of a Blackwell B200 deployment.<sup>34</sup>

**Suitability for the "noah-rn" Harness:** Similar to Gemini 3, the OpenAI models are strictly accessible via API, barring them from edge-native worker agent deployments where air-gapped security and local protected health information parsing are mandated.<sup>4</sup> They are, however, exceptional candidates for the orchestrator role. A noah-rn harness could leverage GPT-5 to manage complex, multi-agent care coordination workflows, provided the hospital is willing to route anonymized data through the OpenAI cloud infrastructure.


### 4. Anthropic Claude 4 and 4.5 Sonnet

Anthropic introduced the Claude 4 family in early 2025, followed by the highly capable 4.5 Sonnet iteration. These models are engineered around a modular transformer architecture that prioritizes safety, constitutional alignment, and session persistence.<sup>40</sup>

**Modalities Supported:** Claude 4.5 Sonnet supports text, complex document structures, and image analysis.<sup>39</sup> It features an Extended Thinking Framework designed to decompose multi-step problems.<sup>40</sup> The model excels at parsing dense medical PDFs, extracting data from user interface screenshots, and reviewing compliance documents, but it does not support native audio streaming or 3D volumetric radiology.<sup>39</sup>

**Benchmark Efficacy:** Claude 4.5 Sonnet is highly competitive, scoring 92.3% on the MedQA benchmark and achieving a 0.529 mean win rate on MedHELM.<sup>14</sup> While it slightly trails GPT-5 in raw diagnostic reasoning, it compensates with an unparalleled "ethical-by-design" output filter that virtually eliminates the risk of generating unsafe or contraindicated medical advice, a critical feature for patient-facing educational applications.<sup>35</sup>

**Inference Latency:** The Claude 4 architecture is notably slower in raw token generation than its peers. Baseline evaluations record output speeds of approximately 45 tokens per second.<sup>41</sup> While Anthropic introduced a "fast mode" utilizing advanced memory streaming techniques that pushes generation up to 170 tokens per second, it remains slower than the throughput achieved by Gemini 3 Flash or highly optimized open-weight models on NVIDIA H200 hardware.<sup>20</sup>

**Suitability for the "noah-rn" Harness:** Claude 4.5 Sonnet's lower generation speed and lack of native audio or volumetric imaging support limit its utility as a real-time bedside worker agent or an ambient voice orchestrator.<sup>39</sup> However, its deep ethical constraints and massive context window make it a highly valuable specialized agent within the harness for retrospective tasks, such as reviewing nursing documentation for regulatory compliance or matching patients to complex clinical trials based on dense PDF inclusion criteria.


### 5. Emerging Open-Weight Contenders: Llama 4 Scout, Mistral Mix, and DeepSeek R1

The open-source ecosystem has diversified rapidly, producing highly capable models that challenge proprietary dominance.

**Meta's Llama 4 (Scout/Maverick):** These modified variants integrate spatial awareness and vision-language optimization explicitly designed for on-device edge deployments.<sup>39</sup> By supporting Augmented Reality and Virtual Reality spatial computing, Llama 4 Scout is highly relevant for integration into mobile nursing carts or wearable clinical devices.<sup>39</sup> Because it is open-weight and highly efficient, it generates tokens rapidly on H200 architecture and serves as a highly capable generalized worker agent, though it lacks the deep, specialized clinical fine-tuning inherent to the MedGemma family.

**Mistral Mix:** This model introduces a novel modular architecture that allows enterprise technology teams to swap text, image, and audio processing blocks dynamically.<sup>39</sup> Supported by open weights, it offers extreme customization for local hospital infrastructure. However, the requirement to manually integrate and tune these modalities makes it a more complex engineering lift compared to pre-packaged clinical models.<sup>39</sup>

**DeepSeek R1 and V3.1:** DeepSeek has validated that open-weight models can match proprietary frontier models in pure logical reasoning, achieving a highly respectable 0.565 mean win rate on MedHELM.<sup>36</sup> Generating at approximately 30 tokens per second in deep reasoning modes, DeepSeek models are highly cost-effective alternatives for clinical environments subject to strict air-gapped security requirements.<sup>34</sup> While their text-centric reasoning is superb, their multimodal robustness in complex radiological scenarios remains unproven compared to dedicated imaging models.<sup>17</sup>

(Note: Google's TxGemma, released in March 2025, is explicitly fine-tuned for predicting therapeutic properties, toxicity, and binding affinities in drug discovery. While highly relevant to the pharmaceutical industry, its specialization disqualifies it from standard clinical nursing workflows within the noah-rn harness.<sup>13</sup>)


## Specialized Modality Efficacy: Radiomics and Volumetric Understanding

To fully contextualize the capabilities of the worker agents, their performance on highly specialized imaging benchmarks must be quantified. Generalist models like GPT-5 and Claude 4.5 Sonnet perform well on generalized visual question-answering tasks (e.g., VQAv2), but true clinical utility requires mastery of the nuances of radiographic data.<sup>40</sup>


<table>
  <tr>
   <td><strong>Imaging Benchmark</strong>
   </td>
   <td><strong>Metric</strong>
   </td>
   <td><strong>MedGemma 1.5 4B</strong>
   </td>
   <td><strong>MedGemma 1.5 27B MM</strong>
   </td>
   <td><strong>Clinical Relevance in Nursing Workflows</strong>
   </td>
  </tr>
  <tr>
   <td><strong>MIMIC CXR</strong>
   </td>
   <td>Macro F1 (Top 5)
   </td>
   <td>89.5%
   </td>
   <td>90.0%
   </td>
   <td>Automates the preliminary identification of pneumonia, pneumothorax, or effusion, allowing nurses to prioritize critical patients prior to radiologist overread.<sup>28</sup>
   </td>
  </tr>
  <tr>
   <td><strong>Chest ImaGenome</strong>
   </td>
   <td>Intersection over Union
   </td>
   <td>38.0%
   </td>
   <td>16.0%
   </td>
   <td>Verifies the anatomical localization of indwelling hardware, such as confirming the proper placement of a nasogastric tube.<sup>28</sup>
   </td>
  </tr>
  <tr>
   <td><strong>PathMCQA</strong>
   </td>
   <td>Accuracy
   </td>
   <td>70.0%
   </td>
   <td>71.6%
   </td>
   <td>Provides rapid pathological classification, though less immediately relevant to standard bedside nursing than radiology.<sup>28</sup>
   </td>
  </tr>
  <tr>
   <td><strong>3D CT Dataset 1</strong>
   </td>
   <td>Macro Accuracy
   </td>
   <td>61.1%
   </td>
   <td>57.8%
   </td>
   <td>Enables the worker agent to scan entire volumetric head CTs for signs of hemorrhagic stroke, triggering immediate stroke-protocol alerts.<sup>27</sup>
   </td>
  </tr>
  <tr>
   <td><strong>3D MRI Dataset 1</strong>
   </td>
   <td>Macro Accuracy
   </td>
   <td>64.7%
   </td>
   <td>57.4%
   </td>
   <td>Synthesizes multi-slice data to identify subtle ischemic changes or tissue abnormalities.<sup>27</sup>
   </td>
  </tr>
</table>


The empirical data reveals a critical architectural truth: the heavily compacted, modality-aligned MedGemma 1.5 4B model routinely outperforms its larger 27-billion parameter counterpart in specialized volumetric analysis and anatomical localization. By achieving a 38.0% Intersection over Union on the Chest ImaGenome benchmark, the 4B model proves its unique utility as an embedded radiomics engine capable of operating locally on a hospital's internal NVIDIA H200 cluster.<sup>27</sup>


## Recommendation: The Optimal Orchestrator and Worker Pairing for a Nursing-First Deployment

A nursing-first deployment prioritizes ambient intelligence, the total elimination of the swivel-chair interface, continuous state-tracking across twelve-hour shifts, and the absolute, cryptographically secure protection of patient data.<sup>7</sup> To achieve these objectives within the noah-rn hierarchical harness, relying on a single monolithic foundation model is an architectural misstep. The optimal strategy mandates a decoupled orchestrator-worker topology.

**The Recommended Orchestrator: Gemini 3 Flash Preview (Reasoning)** The orchestrator must sit at the apex of the noah-rn harness, managing the horizontal Agent-to-Agent communications, planning longitudinal care workflows, and ensuring the clinical context of the patient is maintained continuously.<sup>4</sup> Gemini 3 Flash is the optimal selection for this cognitive role.



* **Context and Velocity:** It features a 1-million-token context window capable of ingesting a patient's entire, multi-year medical history, while delivering an astonishing throughput of 218 tokens per second.<sup>34</sup> This ensures that the overarching workflow management remains perfectly fluid.
* **Ambient Audio Native:** It handles native audio streaming, allowing it to process natural, unstructured bedside conversations between the nurse and the patient. It can instantly extract relevant data to trigger downstream documentation workflows without the latency or error-compounding inherent in external automatic speech recognition translation pipelines.<sup>38</sup>
* **Cost Efficiency:** At a price of $0.50 per 1 million input tokens, it is economically viable to run the model continuously as an ambient listener and logical router throughout a nurse's entire shift.<sup>34</sup>

**The Recommended Worker Agent: MedGemma 1.5 4B-IT (Instruction Tuned)** While Gemini 3 Flash orchestrates the clinical logic and natural language interactions in the cloud, MedGemma 1.5 4B acts as the localized, highly specialized worker agent operating securely behind the hospital's firewall.<sup>28</sup>



* **Zero-Trust Edge Deployment:** Deployed on localized NVIDIA H200 clusters, MedGemma 1.5 4B-IT parses private health data locally. When required, it passes mathematically anonymized embeddings or heavily redacted summaries up to the cloud-based orchestrator, ensuring total adherence to the Health Insurance Portability and Accountability Act.<sup>9</sup>
* **Modality Domination:** If a nurse requires an immediate, preliminary read on a bedside point-of-care ultrasound or a longitudinal comparison of a newly captured chest X-ray against prior imaging, MedGemma 1.5 4B handles the high-dimensional imaging locally. Its ability to achieve an 89.5% Macro F1 on chest X-ray datasets ensures that triage logic is grounded in empirical radiomics.<sup>27</sup>
* **Protocol Integration:** MedGemma is specifically optimized for electronic health record information retrieval, boasting an EHRQA accuracy score of 89.6%.<sup>28</sup> It integrates flawlessly with local Model Context Protocol servers to execute the strict draft-review safety patterns, staging pain management assessments and formatting clinical notes directly into the hospital's database for the nurse's final review and signature.<sup>7</sup>


## Conclusion

The evolution of clinical multimodal models from the Med-Gemini baseline in 2024 to the first quarter of 2026 demonstrates a profound maturation. The industry has moved beyond models that merely memorize theoretical medical knowledge to pass examinations, focusing instead on practical, agentic workflow execution. The evaluation ecosystem has appropriately shifted from the static MedQA paradigm toward MedHELM's robust, harm-weighted evaluation of clinical note generation and dynamic decision support. Concurrently, advancements in hardware physics, specifically the transition to NVIDIA's H200 and B200 architectures, have obliterated the memory-bandwidth bottlenecks that previously stifled real-time, interactive clinical artificial intelligence.

For healthcare systems building an autonomous, nursing-first deployment within the noah-rn hierarchical harness, the architecture is the product. The optimal deployment strategy pairs the hyper-fast, massive-context reasoning and ambient voice capabilities of a cloud-based orchestrator like **Gemini 3 Flash** with the edge-native, radiologically specialized, and secure capabilities of **MedGemma 1.5 4B-IT** acting as the localized worker agent. This topological pairing guarantees that nurses experience sub-second ambient assistance, hospitals maintain strict cryptographic boundaries over protected health information, and the immense physical and cognitive burden of clinical documentation is effectively outsourced to an intelligent, interoperable fabric.


#### Works cited



1. (PDF) Advancing Multimodal Medical Capabilities of Gemini - ResearchGate, accessed March 28, 2026, [https://www.researchgate.net/publication/393472202_Advancing_Multimodal_Medical_Capabilities_of_Gemini](https://www.researchgate.net/publication/393472202_Advancing_Multimodal_Medical_Capabilities_of_Gemini)
2. Advancing Biomedical Understanding with Multimodal Gemini - Google DeepMind, accessed March 28, 2026, [https://deepmind.google/research/publications/87645/](https://deepmind.google/research/publications/87645/)
3. New AI Models Coming in 2026 and What They Do - Medium, accessed March 28, 2026, [https://medium.com/@urano10/the-future-of-ai-models-in-2026-whats-actually-coming-410141f3c979](https://medium.com/@urano10/the-future-of-ai-models-in-2026-whats-actually-coming-410141f3c979)
4. Orchestration topologies and federated memory for agentic AI in healthcare.md
5. MedHELM Framework for Medical LLM Evaluation - Emergent Mind, accessed March 28, 2026, [https://www.emergentmind.com/topics/medhelm-framework](https://www.emergentmind.com/topics/medhelm-framework)
6. Offering Support and Listening | inQuest AI, accessed March 28, 2026, [https://inquestai.com/conversation/b8a11060-bda9-4618-b9b1-6ef3377f4a90](https://inquestai.com/conversation/b8a11060-bda9-4618-b9b1-6ef3377f4a90)
7. accessed March 28, 2026, uploaded:Clinical workflow integration and change management for agentic AI in healthcare\n.md
8. Gemini 3 Pro Sets New Vision Benchmarks: Try It Here - Roboflow Blog, accessed March 28, 2026, [https://blog.roboflow.com/gemini-3-pro/](https://blog.roboflow.com/gemini-3-pro/)
9. From Reasoning to Reach: How MedGemma 1.5 and Copilot Health Define the 2026 Era of Distributed Diagnostics | by GreyBrain Med - Medium, accessed March 28, 2026, [https://medium.com/@ClinicalAI/from-reasoning-to-reach-how-medgemma-1-5-b34ddf024d39](https://medium.com/@ClinicalAI/from-reasoning-to-reach-how-medgemma-1-5-b34ddf024d39)
10. INVESTIGATION OF THE PREVALENCE, RISK FACTORS AND IMPACT OF MUSCULOSKELETAL DISORDERS AMONG NURSES AT KATUTURA INTERMEDIATE HOSP - UNAM Repository, accessed March 28, 2026, [https://repository.unam.edu.na/server/api/core/bitstreams/2918dd98-d07e-4afc-9eb5-7dce7806f964/content](https://repository.unam.edu.na/server/api/core/bitstreams/2918dd98-d07e-4afc-9eb5-7dce7806f964/content)
11. Pain Management Nursing Role | PDF | Substance Dependence | Opioid - Scribd, accessed March 28, 2026, [https://www.scribd.com/document/51211766/pain-management-nursing-role](https://www.scribd.com/document/51211766/pain-management-nursing-role)
12. A Novel Evaluation Benchmark for Medical LLMs: Illuminating Safety and Effectiveness in Clinical Domains - ResearchGate, accessed March 28, 2026, [https://www.researchgate.net/publication/394175084_A_Novel_Evaluation_Benchmark_for_Medical_LLMs_Illuminating_Safety_and_Effectiveness_in_Clinical_Domains](https://www.researchgate.net/publication/394175084_A_Novel_Evaluation_Benchmark_for_Medical_LLMs_Illuminating_Safety_and_Effectiveness_in_Clinical_Domains)
13. Gemini 3 in Healthcare: An Analysis of Its Capabilities - IntuitionLabs, accessed March 28, 2026, [https://intuitionlabs.ai/articles/gemini-3-healthcare-applications](https://intuitionlabs.ai/articles/gemini-3-healthcare-applications)
14. MedQA Leaderboard 2026 - Compare AI Model Scores - Price Per Token, accessed March 28, 2026, [https://pricepertoken.com/leaderboards/benchmark/medqa](https://pricepertoken.com/leaderboards/benchmark/medqa)
15. MedHELM: Validate Medical LLMs for Real Clinical Use - Dr7.ai, accessed March 28, 2026, [https://dr7.ai/blog/medical/medhelm-validate-medical-llms-for-real-clinical-use/](https://dr7.ai/blog/medical/medhelm-validate-medical-llms-for-real-clinical-use/)
16. MedQA-CS: Objective Structured Clinical Examination (OSCE)-Style Benchmark for Evaluating LLM Clinical Skills - arXiv, accessed March 28, 2026, [https://arxiv.org/html/2410.01553v2](https://arxiv.org/html/2410.01553v2)
17. \twemojihospital MedHELM: Holistic Evaluation of Large Language Models for Medical Tasks - arXiv, accessed March 28, 2026, [https://arxiv.org/html/2505.23802v2](https://arxiv.org/html/2505.23802v2)
18. Model performance across MedHELM categories Mean normalized scores (0–1... - ResearchGate, accessed March 28, 2026, [https://www.researchgate.net/figure/Model-performance-across-MedHELM-categories-Mean-normalized-scores-0-1-scale-across-the_fig4_399920081](https://www.researchgate.net/figure/Model-performance-across-MedHELM-categories-Mean-normalized-scores-0-1-scale-across-the_fig4_399920081)
19. Deploying Gemini 3 Pro - Clarifai, accessed March 28, 2026, [https://www.clarifai.com/blog/deploying-gemini-3-pro](https://www.clarifai.com/blog/deploying-gemini-3-pro)
20. Two different tricks for fast LLM inference - Sean Goedecke, accessed March 28, 2026, [https://www.seangoedecke.com/fast-llm-inference/](https://www.seangoedecke.com/fast-llm-inference/)
21. Low Latency Inference Chapter 1: Up to 1.9x Higher Llama 3.1 Performance with Medusa on NVIDIA HGX H200 with NVLink Switch, accessed March 28, 2026, [https://developer.nvidia.com/blog/low-latency-inference-chapter-1-up-to-1-9x-higher-llama-3-1-performance-with-medusa-on-nvidia-hgx-h200-with-nvlink-switch/](https://developer.nvidia.com/blog/low-latency-inference-chapter-1-up-to-1-9x-higher-llama-3-1-performance-with-medusa-on-nvidia-hgx-h200-with-nvlink-switch/)
22. NVIDIA H200 vs. B200: Comparing Datacenter-Grade Accelerators - Vast.ai, accessed March 28, 2026, [https://vast.ai/article/nvidia-h200-vs-b200-comparing-datacenter-grade-accelerators](https://vast.ai/article/nvidia-h200-vs-b200-comparing-datacenter-grade-accelerators)
23. B200 Vs H200, B200 Vs H100, B200 Vs A100: Complete Guide - AceCloud, accessed March 28, 2026, [https://acecloud.ai/blog/nvidia-b200-vs-h200-h100-a100/](https://acecloud.ai/blog/nvidia-b200-vs-h200-h100-a100/)
24. CoreWeave Delivers Breakthrough AI Performance with NVIDIA GB200 and H200 GPUs in MLPerf Inference v5.0, accessed March 28, 2026, [https://www.coreweave.com/blog/coreweave-delivers-breakthrough-ai-performance-with-nvidia-gb200-and-h200-gpus-in-mlperf-inference-v5-0](https://www.coreweave.com/blog/coreweave-delivers-breakthrough-ai-performance-with-nvidia-gb200-and-h200-gpus-in-mlperf-inference-v5-0)
25. Blog - Health AI Developer Foundations | Google for Developers, accessed March 28, 2026, [https://developers.google.com/health-ai-developer-foundations/blog](https://developers.google.com/health-ai-developer-foundations/blog)
26. MedGemma | Health AI Developer Foundations, accessed March 28, 2026, [https://developers.google.com/health-ai-developer-foundations/medgemma](https://developers.google.com/health-ai-developer-foundations/medgemma)
27. Next generation medical image interpretation with MedGemma 1.5 and medical speech to text with MedASR - Google Research, accessed March 28, 2026, [https://research.google/blog/next-generation-medical-image-interpretation-with-medgemma-15-and-medical-speech-to-text-with-medasr/](https://research.google/blog/next-generation-medical-image-interpretation-with-medgemma-15-and-medical-speech-to-text-with-medasr/)
28. google/medgemma-1.5-4b-it - Hugging Face, accessed March 28, 2026, [https://huggingface.co/google/medgemma-1.5-4b-it](https://huggingface.co/google/medgemma-1.5-4b-it)
29. medgemma-27b-it - AIKosh, accessed March 28, 2026, [https://aikosh.indiaai.gov.in/home/models/details/medgemma_27b_it.html](https://aikosh.indiaai.gov.in/home/models/details/medgemma_27b_it.html)
30. Google's MedGemma 1.5 brings 3D CT and MRI analysis to open-source medical AI, accessed March 28, 2026, [https://the-decoder.com/googles-medgemma-1-5-brings-3d-ct-and-mri-analysis-to-open-source-medical-ai/](https://the-decoder.com/googles-medgemma-1-5-brings-3d-ct-and-mri-analysis-to-open-source-medical-ai/)
31. MedGemma 1 model card | Health AI Developer Foundations, accessed March 28, 2026, [https://developers.google.com/health-ai-developer-foundations/medgemma/model-card-v1](https://developers.google.com/health-ai-developer-foundations/medgemma/model-card-v1)
32. Google MedGemma : r/LocalLLaMA - Reddit, accessed March 28, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1krb6uu/google_medgemma/](https://www.reddit.com/r/LocalLLaMA/comments/1krb6uu/google_medgemma/)
33. Gemini 3 Flash | Generative AI on Vertex AI - Google Cloud Documentation, accessed March 28, 2026, [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-flash)
34. Gemini 3 Flash arrives with reduced costs and latency — a powerful combo for enterprises, accessed March 28, 2026, [https://venturebeat.com/orchestration/gemini-3-flash-arrives-with-reduced-costs-and-latency-a-powerful-combo-for](https://venturebeat.com/orchestration/gemini-3-flash-arrives-with-reduced-costs-and-latency-a-powerful-combo-for)
35. Generalist Large Language Models Outperform Clinical Tools on Medical Benchmarks, accessed March 28, 2026, [https://www.researchgate.net/publication/398226084_Generalist_Large_Language_Models_Outperform_Clinical_Tools_on_Medical_Benchmarks](https://www.researchgate.net/publication/398226084_Generalist_Large_Language_Models_Outperform_Clinical_Tools_on_Medical_Benchmarks)
36. MedHELM - Holistic Evaluation of Language Models (HELM) - Stanford CRFM, accessed March 28, 2026, [https://crfm.stanford.edu/helm/medhelm/latest/](https://crfm.stanford.edu/helm/medhelm/latest/)
37. Gemini 3 API Latency: Industry Analysis and Market Forecast 2025 - Sparkco, accessed March 28, 2026, [https://sparkco.ai/blog/gemini-3-api-latency](https://sparkco.ai/blog/gemini-3-api-latency)
38. Gemini 3 Flash - Google DeepMind, accessed March 28, 2026, [https://deepmind.google/models/gemini/flash/](https://deepmind.google/models/gemini/flash/)
39. 6 Best Multimodal AI Models in 2025 - Times Of AI, accessed March 28, 2026, [https://www.timesofai.com/industry-insights/top-multimodal-ai-models/](https://www.timesofai.com/industry-insights/top-multimodal-ai-models/)
40. The Most Advanced AI Models of 2025 -Comparative Analysis of Gemini 2.5, Claude 4, LLaMA 4, GPT-4.5, DeepSeek V3.1, and Other Leading Models - ResearchGate, accessed March 28, 2026, [https://www.researchgate.net/publication/392160200_The_Most_Advanced_AI_Models_of_2025_-Comparative_Analysis_of_Gemini_25_Claude_4_LLaMA_4_GPT-45_DeepSeek_V31_and_Other_Leading_Models](https://www.researchgate.net/publication/392160200_The_Most_Advanced_AI_Models_of_2025_-Comparative_Analysis_of_Gemini_25_Claude_4_LLaMA_4_GPT-45_DeepSeek_V31_and_Other_Leading_Models)
41. Claude 4 Sonnet (Non-reasoning) Intelligence, Performance & Price Analysis, accessed March 28, 2026, [https://artificialanalysis.ai/models/claude-4-sonnet](https://artificialanalysis.ai/models/claude-4-sonnet)
42. The state of open source AI models in 2025 | Red Hat Developer, accessed March 28, 2026, [https://developers.redhat.com/articles/2026/01/07/state-open-source-ai-models-2025](https://developers.redhat.com/articles/2026/01/07/state-open-source-ai-models-2025)
43. (PDF) Development and Implementation of a Stroke Nurse Navigator Position to Improve Program and Patient Outcomes - ResearchGate, accessed March 28, 2026, [https://www.researchgate.net/publication/380470448_Development_and_Implementation_of_a_Stroke_Nurse_Navigator_Position_to_Improve_Program_and_Patient_Outcomes](https://www.researchgate.net/publication/380470448_Development_and_Implementation_of_a_Stroke_Nurse_Navigator_Position_to_Improve_Program_and_Patient_Outcomes)
44. Gemini 3 Flash Preview (Reasoning) Intelligence, Performance & Price Analysis, accessed March 28, 2026, [https://artificialanalysis.ai/models/gemini-3-flash-reasoning](https://artificialanalysis.ai/models/gemini-3-flash-reasoning)
