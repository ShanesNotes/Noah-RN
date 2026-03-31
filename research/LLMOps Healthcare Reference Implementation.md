# **Reference Implementation: Production-Grade Clinical LLMOps Architecture on Kubernetes**

The deployment of Large Language Models (LLMs) within a highly regulated, 40-hospital health system introduces unique infrastructural demands that eclipse standard microservice orchestration. Clinical artificial intelligence workloads, ranging from agentic diagnostic assistants to vast Retrieval-Augmented Generation (RAG) pipelines for Electronic Health Record (EHR) summarization, require strict adherence to data sovereignty, unyielding latency Service Level Objectives (SLOs), and highly efficient utilization of expensive GPU accelerators. Standard Kubernetes deployment strategies prove inadequate for LLM inference due to the inherently stateful and memory-bound nature of autoregressive token generation, coupled with the highly variable compute-bound nature of prompt processing.1

This comprehensive engineering report delivers a production-ready reference implementation designed to satisfy advanced Phase 8 infrastructure requirements. The architecture achieves dynamic Kubernetes Event-Driven Autoscaling (KEDA) based on hardware-specific utilization metrics, leverages the llm-d framework for disaggregated prefill and decode execution with precise prefix-cache-aware routing, ensures active-active multi-region high availability with a 15-minute Recovery Time Objective (RTO), introduces zero-downtime blue/green vector index updating mechanisms, and implements granular FinOps tagging for precise, department-level cost accounting.

## **Multi-Region Infrastructure as Code Repository Structure**

Operating a multi-region, active-active Kubernetes infrastructure demands rigorous separation of concerns between underlying infrastructure provisioning, baseline workload definitions, and environment-specific application configurations. The required repository structure employs Terraform for foundational cloud resources, Helm for application packaging, and Kustomize for deterministic, environment-specific manifest patching.4

This monorepo topology guarantees that identical architectural patterns are deployed consistently across geographically distributed regions (such as us-east-1 and us-west-2) while permitting tightly controlled, localized overrides for regional subnets, compliance-specific storage classes, or localized HuggingFace token secrets.4 The integration of Helm and Kustomize is particularly critical for managing third-party vendor charts where the base Helm templates cannot be directly modified. By utilizing Helm's \--post-renderer pipeline capability, the deployment workflow renders the upstream Helm templates and immediately pipes the standard output through Kustomize, applying regional overlays to objects like Gateway definitions, NodeSelectors, or custom annotations prior to submission to the Kubernetes API server.6

Table 1 details the required file and directory taxonomy for the clinical LLMOps platform.

| Directory Path | Primary Tooling | Architectural Purpose and Configuration Responsibility |
| :---- | :---- | :---- |
| /terraform/modules/ | Terraform | Reusable infrastructure modules (VPC, EKS/AKS clusters, Route 53 global traffic management, multi-region Temporal Cloud setups). |
| /terraform/live/\<region\>/ | Terraform | Environment-specific instantiations of the modules, maintaining isolated state files for each deployment region to prevent cross-regional blast radiuses. |
| /helm-charts/vllm-stack/ | Helm | The upstream vllm-production-stack chart, defining the core inference engine, persistent volume claims for model weight caching, and base resource limits. |
| /helm-charts/llm-d-system/ | Helm | The Gateway API Inference Extension (GAIE) control plane, including the External Processing Pods (EPPs) and llm-d-modelservice deployments.7 |
| /helm-charts/clinical-agents/ | Helm | Custom charts defining the LangGraph agent architectures and Temporal worker pods responsible for executing clinical orchestration code. |
| /kustomize/base/ | Kustomize | Foundational Kubernetes manifests, including baseline Namespace declarations, ScaledObject definitions for KEDA, and cross-cluster PrometheusRule objects. |
| /kustomize/overlays/\<region\>/ | Kustomize | Regional patches adjusting GPU tolerations (e.g., matching NVIDIA L40S taints in one region vs. H100 taints in another), specific ingress hostnames, and localized secrets.3 |

## **Orchestration Layer: Integrating LangGraph and Temporal**

Clinical agentic workflows engineered via LangGraph frequently entail complex, multi-step cognitive architectures. These systems must query distributed EHR databases, synthesize longitudinal patient histories, cross-reference medical literature, and format outputs for clinical review. In a naive Kubernetes deployment, any infrastructure failure mid-workflow—such as an Out of Memory (OOM) pod eviction or a preempted Spot instance—results in a complete loss of the agent's execution state. Consequently, the LLM is forced to recompute the entire sequence upon retry, which degrades the clinician's user experience and exponentially inflates GPU compute costs.8

To secure durable execution, the reference architecture deconstructs the monolithic LangGraph state machine, explicitly delegating state persistence, timeout enforcement, and retry backoff logic to Temporal.8

### **State Management Transformation**

Traditional LangGraph deployments frequently rely on external, ephemeral caches such as Redis to pass state objects between execution nodes. This architecture introduces severe liabilities regarding race conditions, requires manual cache lifecycle management, and complicates recovery from distributed system failures.10 The Temporal integration fundamentally shifts state management directly into the workflow execution memory.

The clinical state is defined as a highly structured, serializable data class (e.g., a Python @dataclass representing a ResearchWorkflowState) and is passed natively through the Temporal workflow engine.10 As each conceptual LangGraph node—now refactored as a distinct Temporal Activity—compleres its designated task, it returns the mutated state object. Temporal automatically and durably persists this state transition within its immutable event history.10 Should the worker processing the heavy LLM inference request crash, Temporal seamlessly resumes the workflow on a healthy worker pod, injecting the exact state parameters from the last successfully completed activity without necessitating Redis lookups.8

### **Mechanics of Durable Execution**

Implementing this integration safely within a healthcare context requires the enforcement of strict architectural boundaries to guarantee reproducibility and data integrity.

The overarching Temporal Workflow must remain entirely deterministic.11 Any operations that yield variable results, such as random number generation, HTTP calls to the vLLM endpoint, or write operations to the EHR system, must be strictly encapsulated within Temporal Activities.11 Because Temporal implements automated retry policies for failed Activities (e.g., triggering a retry with an exponential backoff if the model inference API times out), the operations within those Activities must be rigorously idempotent. This ensures that a retried network call does not result in duplicated clinical notes or redundant database records.11

Furthermore, shared resources such as connection pools or language model API clients cannot be maintained in the global memory space of the application. They must be lazily initialized within the Temporal Activity itself, ensuring that any stateless Kubernetes worker pod can pull a task from the Temporal queue and execute it in complete isolation.10

## **Disaggregated Inference Architecture**

Large Language Model inference relies on two distinct and highly asymmetrical computational phases. The initial *prefill* phase processes the entire input prompt in parallel to compute the initial Key-Value (KV) cache hidden states. This phase is intensely compute-bound, demanding maximum hardware Floating Point Operations (FLOPs).1 Conversely, the *decode* phase generates output tokens autoregressively, one token at a time. This phase requires minimal raw compute but is heavily bound by memory bandwidth, as the engine must repeatedly load the massive KV cache from High Bandwidth Memory (HBM) into the streaming multiprocessors for every single generated token.1

In standard monolithic deployments, both phases contend for the same GPU resources. When a massive 30,000-token clinical document enters the prefill phase, the GPU's compute resources are monopolized. This compute saturation temporarily starves the decode steps of all other in-flight requests sharing the batch, manifesting as severe spikes in Inter-Token Latency (ITL) and disrupting the streaming text experience for clinicians.1

### **Prefill and Decode Disaggregation (llm-d)**

The llm-d framework, operating atop the vLLM engine, eliminates this resource contention through physical disaggregation. The prefill and decode workloads are split into entirely separate Kubernetes deployments, allowing each operational phase to be provisioned, scaled, and hardware-optimized independently based on its specific bottlenecks.1

Table 2 outlines the hardware specialization strategy for the disaggregated architecture.

| Inference Phase | Primary Hardware Bottleneck | Optimal Accelerator Profile | Autoscaling Indicator |
| :---- | :---- | :---- | :---- |
| **Prefill Workers** | Compute (FLOPs) | High-compute, dense GPUs (e.g., NVIDIA H200, AMD MI300X) | vllm:num\_requests\_waiting (Queue Depth) |
| **Decode Workers** | Memory Bandwidth & VRAM | High-capacity HBM GPUs (e.g., NVIDIA L40S, A100) | vllm:gpu\_cache\_usage\_perc (Cache Saturation) |

To bridge these independent worker pools, llm-d orchestrates high-speed, point-to-point KV cache transfers. Upon completing the prefill computation, the worker transmits the resulting KV tensors directly to a decode worker. This transfer leverages the NVIDIA Inference Xfer Library (NIXL) over fast interconnect fabrics such as RDMA via InfiniBand or RoCE, completely bypassing CPU overhead.13

### **Precise Prefix-Cache-Aware Routing**

Clinical agentic workflows frequently utilize large, static system prompts or RAG contexts containing extensive, standardized medical ontologies. Recomputing the prefill phase for these identical prefixes across thousands of daily requests wastes immense amounts of GPU compute.18 While modern engines like vLLM support Automatic Prefix Caching (APC) on a single instance to reuse previously computed KV blocks, standard Kubernetes load balancers destroy this cache locality by blindly scattering requests across the entire pod cluster via round-robin algorithms.18

The llm-d architecture resolves this systemic inefficiency by implementing precise prefix-cache-aware routing, governed by the Gateway API Inference Extension (GAIE) and a specialized External Processing Pod (EPP).19

The system operates across two highly optimized data paths. On the write path, the distributed vLLM decode pods continuously publish ZMQ events (BlockStored, BlockRemoved) detailing their localized physical cache states.19 The EPP's kvevents.Pool module ingests these high-throughput event streams, updating a sub-millisecond, two-level LRU kvblock.Index that maintains a global, real-time map of which Kubernetes pod holds which specific cached token blocks.18

On the read path, when a new inference request enters the Gateway, the EPP intercepts the payload and tokenizes the prompt. The kvblock.TokenProcessor chunks these tokens into deterministic keys that perfectly mirror vLLM's internal KV block hashing logic.19 The kvblock.Scorer evaluates all active pods, generating a "cache affinity score" based on the longest consecutive sequence of matching prefix blocks.19

The Inference Gateway (e.g., kgateway) evaluates this affinity score against current pod load and queue depth to route the request to the optimal worker.20 If the non-cached suffix of the prompt exceeds the configured nonCachedTokens threshold, the EPP scheduler intelligently triggers the disaggregated flow. It assigns both a specialized prefill worker and a decode worker, injecting an x-prefiller-url HTTP header into the request.20 The sidecar container on the decode pod reads this header, proxies the prompt to the designated prefill worker, awaits the RDMA KV-cache transfer, and subsequently executes the local decode generation.20

## **Autoscaling Infrastructure: Hardware-Aware KEDA Configuration**

Native Kubernetes Horizontal Pod Autoscalers (HPA) scale resources based on raw CPU and memory utilization. This paradigm completely fails for LLM workloads. Due to vLLM's PagedAttention memory management system, the engine pre-allocates a massive contiguous block of GPU memory (typically 90% of available VRAM) at startup to virtually manage KV cache blocks.2 Consequently, the GPU memory metric will perpetually report near 100% utilization regardless of actual traffic load, rendering standard HPA scaling algorithms ineffective.23 Furthermore, concurrency-based autoscalers like Knative prove highly sensitive and unstable when processing heterogeneous clinical workloads characterized by massive variations in input and output sequence lengths.25

To maintain strict Service Level Objectives (SLOs)—such as a median Inter-Token Latency (ITL) below 75 milliseconds across the health network—the architecture employs Kubernetes Event-Driven Autoscaling (KEDA) integrated directly with the vLLM Prometheus /metrics endpoint.23

Autoscaling is governed by a composite trigger evaluating three critical telemetry signals:

1. **Inference Queue Depth (vllm:num\_requests\_waiting):** This metric acts as a proactive scaling signal for compute-heavy prefill workers, expanding capacity before accumulating queue times degrade Time-to-First-Token (TTFT) metrics for end users.15  
2. **KV-Cache Utilization (vllm:gpu\_cache\_usage\_perc):** This metric drives the scaling of memory-bound decode workers. If cache utilization consistently exceeds 85-90%, the vLLM engine exhausts available memory pages and is forced to preempt, swap, or entirely recompute active sequences, causing catastrophic latency spikes.15  
3. **Inter-Token Latency (vllm:inter\_token\_latency\_seconds\_bucket):** Serving as the ultimate Service Level Indicator (SLI) for user experience, this metric guarantees scaling actions occur when streaming performance falls below acceptable clinical thresholds.25

The following production-ready KEDA ScaledObject defines this composite, hardware-aware scaling behavior for the deployment:

YAML

apiVersion: keda.sh/v1alpha1  
kind: ScaledObject  
metadata:  
  name: vllm-clinical-decode-scaler  
  namespace: llm-serving  
spec:  
  scaleTargetRef:  
    apiVersion: apps/v1  
    kind: Deployment  
    name: ms-kv-events-llm-d-modelservice-decode  
  minReplicaCount: 2  
  maxReplicaCount: 24  
  pollingInterval: 15  
  cooldownPeriod: 300   
  advanced:  
    restoreToOriginalReplicaCount: true  
  triggers:  
    \- type: prometheus  
      metadata:  
        serverAddress: http://prometheus-operated.monitoring.svc:9090  
        metricName: vllm\_queue\_depth  
        query: 'sum(vllm:num\_requests\_waiting{model\_name="clinical-llama-70b"})'  
        threshold: '4'   
    \- type: prometheus  
      metadata:  
        serverAddress: http://prometheus-operated.monitoring.svc:9090  
        metricName: vllm\_kv\_cache\_saturation  
        query: 'avg(vllm:gpu\_cache\_usage\_perc{model\_name="clinical-llama-70b"})'  
        threshold: '0.80' 

A critical operational parameter in this configuration is the cooldownPeriod set to 300 seconds (5 minutes).23 Loading multi-gigabyte LLM weights into GPU VRAM imposes a severe startup penalty. Without a substantial cooldown delay, KEDA would immediately terminate pods the moment a burst of requests clears the queue. When the next wave of clinical traffic arrives shortly thereafter, the system would suffer massive latency penalties while waiting for new pods to initialize and pull weights from network storage.23 The 300-second window prevents this thrashing.

## **Active-Active Multi-Region High Availability**

Clinical data infrastructure demands continuous availability. To satisfy a 15-minute Recovery Time Objective (RTO) and a near-zero Recovery Point Objective (RPO) during catastrophic regional failures, the platform implements an active-active, multi-region architecture.27 Maintaining a dormant "hot standby" region incurs prohibitive expenses due to idle GPU costs; therefore, both regions (e.g., us-east-1 and us-west-2) process live production traffic simultaneously, actively distributing the computational load.28

### **Global Traffic Management and Failover**

Global traffic routing is orchestrated via an intelligent DNS layer, such as Amazon Route 53 or Azure Front Door, utilizing latency-based routing paired with rigorous health checking mechanisms.27 The global load balancer evaluates the health of the Gateway API ingress controllers in both operating regions.

These health checks must be implemented as "deep" probes. A rudimentary HTTP 200 check against the ingress layer is insufficient for LLMOps; the probe must explicitly evaluate the readiness of the underlying vLLM engines and ensure that GPU memory capacity is not saturated.27 In the event of a regional outage or systemic GPU memory exhaustion, the DNS layer automatically diverts traffic to the healthy region. Because both regions are already scaled to accommodate baseline traffic, the localized KEDA instances dynamically absorb the displaced load by rapidly spinning up additional pods, averting the massive delays associated with cold-start disaster recovery failovers.27

### **Temporal Multi-Region Namespaces**

While stateless LLM inference requests can be easily rerouted, complex LangGraph agent workflows hold critical state. To guarantee that long-running clinical reasoning tasks are not abandoned during an outage, the architecture integrates Temporal Cloud's Multi-Region Namespaces functionality.31

Temporal employs a highly optimized, asynchronous replication protocol between the active and replica regions.32 Workflow execution histories are continuously synchronized in the background. Because this replication is asynchronous, it avoids penalizing the latency or throughput of active clinical workflows.31

If the active region experiences a catastrophic failure, Temporal automatically executes a failover to the replica region. The stateless Temporal worker pods residing in the surviving region immediately begin polling the newly active Temporal service. Because the LangGraph agent's execution state is securely preserved within the replicated event history, the agents seamlessly resume their clinical data synthesis from the exact point of interruption.32 This architecture reliably satisfies the 15-minute RTO requirement without dropping active clinician sessions.

## **Zero-Downtime Blue/Green Vector Store Indexing**

Clinical RAG pipelines rely fundamentally on vector databases (such as Qdrant, Milvus, or OpenSearch) to provide semantic search capabilities over vast repositories of medical literature and patient records.33 As embedding models are continually upgraded or as hospital ontologies evolve, billions of dense vectors must be frequently re-indexed. Executing in-place updates overwrites existing vectors, causing search quality to degrade unpredictably and heavily taxing database compute resources, which leads to unacceptable query latency spikes in production.36

To circumvent these operational risks, the reference implementation mandates a rigorous Blue/Green indexing strategy governed by logical alias swapping.36

This strategy involves several meticulously orchestrated phases. Initially, the production application routes all search queries through a stable index alias (e.g., clinical\_kb\_active), which points to the current "Blue" index.38 When an update is required, an entirely new "Green" index is provisioned alongside the live environment.36 The new, updated dataset is embedded and bulk-ingested into this shadow index. While this temporarily doubles storage and memory consumption, it strictly isolates the heavy write operations from the latency-sensitive production read queries.36

Following ingestion, automated test queries are executed against the Green index to empirically validate that recall, precision, and Hierarchical Navigable Small World (HNSW) graph connectivity meet strict clinical standards.39 Once validated, an atomic swap is executed at the database layer.

Using OpenSearch API semantics as an example, the atomic swap is executed via the \_aliases endpoint, redirecting the pointer instantaneously:

JSON

POST /\_aliases  
{  
  "actions": \[  
    { "remove": { "index": "clinical\_kb\_v1\_blue", "alias": "clinical\_kb\_active" } },  
    { "add":    { "index": "clinical\_kb\_v2\_green", "alias": "clinical\_kb\_active" } }  
  \]  
}

This mechanism guarantees absolute zero downtime for the clinical RAG agents.36 The legacy Blue index is intentionally retained for a configurable stabilization window (e.g., 24 to 48 hours), permitting an instant, single-API-call rollback in the event of unforeseen hallucination regressions or data anomalies, after which it is gracefully decommissioned to reclaim storage.36

## **FinOps Governance: Department-Level Cost Per Clinical Query**

In a sprawling 40-hospital network, the ability to distinguish the exorbitant GPU expenditure of the Oncology department's diagnostic agent from the minimal compute required for the HR department's policy-lookup chatbot is essential for accurate departmental chargebacks. Standard cloud billing mechanisms merely report aggregate EC2 or EKS instance costs, failing to provide the granularity required for LLMOps.42

This architecture implements deep cost visibility by deploying Kubecost alongside the Prometheus OpenCost Exporter.42

### **The Cost Allocation Pipeline**

Kubecost derives the micro-level cost of any Kubernetes workload by synthesizing real-time cloud billing APIs (such as AWS Cost and Usage Reports or Azure Rate Cards) with the time-weighted maximum of resource requests and actual usage.42

To enable highly specific departmental reporting, every inference deployment, gateway route, and agent worker pod must be tagged with a standardized Kubernetes labeling taxonomy.45

Table 3 details the required minimum labeling standards for cost attribution.

| Label Key | Example Value | Purpose in FinOps Pipeline |
| :---- | :---- | :---- |
| department | oncology, hr, radiology | Primary grouping for organizational chargebacks and budget tracking. |
| cost-center | CC-8092 | Direct mapping to internal enterprise accounting systems.45 |
| clinical-domain | diagnostic, administrative | Allows analysis of cost efficiency across different types of medical workflows. |

Because the vLLM engine exports inference metrics like vllm:request\_success\_total (a counter of successfully completed queries) and Kubecost exports financial metrics like container\_gpu\_allocation and node\_gpu\_hourly\_cost, these distinct datasets can be synthesized directly within the Prometheus monitoring stack.48

By leveraging PromQL's advanced vector matching capabilities—specifically utilizing the group\_left modifier to handle cardinality differences—the system joins the cost metrics with the inference metrics based on common pod and namespace labels.44 The following PromQL query calculates the real-time hourly GPU cost per successful clinical query, accurately segmented by department:

Code snippet

sum by (department) (  
  (container\_gpu\_allocation \* on (node) group\_left node\_gpu\_hourly\_cost)  
  \* on (pod, namespace) group\_left(department)  
  kube\_pod\_labels{label\_department\!=""}  
)  
/  
sum by (department) (  
  rate(vllm:request\_success\_total\[1h\])   
  \* on (pod, namespace) group\_left(department)  
  kube\_pod\_labels{label\_department\!=""}  
)

This query first calculates the exact dollar cost of the GPU hardware allocated to the specific department's workload.44 It then joins the inference throughput generated by that same departmental deployment, ultimately dividing the cost by the throughput to produce a dynamic "Cost per Query" report.44 This dashboard updates automatically as KEDA scales the underlying infrastructure, providing financial stakeholders with precise, actionable intelligence.

## **Observability and Chaos Engineering Test Plan**

Maintaining resilience across a distributed inference architecture requires sophisticated observability. Effective alerting must adhere to the RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methodologies, focusing on end-user symptoms rather than opaque, internal system states.52

The Prometheus Rule definition below establishes critical Service Level Indicator (SLI) thresholds. It focuses explicitly on the 90th percentile (p90) Inter-Token Latency (ITL) to ensure streaming text quality, and monitors KV-cache exhaustion to predict system saturation before preemptions occur.15

YAML

apiVersion: monitoring.coreos.com/v1  
kind: PrometheusRule  
metadata:  
  name: vllm-clinical-alerts  
  namespace: monitoring  
spec:  
  groups:  
    \- name: LLM\_Inference\_Degradation  
      rules:  
        \- alert: HighInterTokenLatency  
          expr: |  
            histogram\_quantile(0.90, sum by(model\_name, le) (rate(vllm:inter\_token\_latency\_seconds\_bucket\[5m\]))) \> 0.15  
          for: 3m  
          labels:  
            severity: critical  
            team: ai-platform  
          annotations:  
            summary: "p90 Inter-Token Latency exceeds 150ms"  
            description: "Streaming generation for model {{ $labels.model\_name }} is severely degraded, impacting interactive clinical agents."  
              
        \- alert: KVCacheSaturation  
          expr: avg by (model\_name) (vllm:gpu\_cache\_usage\_perc) \> 0.95  
          for: 5m  
          labels:  
            severity: warning  
          annotations:  
            summary: "KV Cache near exhaustion"  
            description: "Model {{ $labels.model\_name }} is experiencing KV cache saturation. vLLM preemptions are imminent. Verify KEDA autoscaling targets."  
              
        \- alert: ExcessivePreemptions  
          expr: rate(vllm:num\_preemptions\_total\[2m\]) \> 0  
          for: 1m  
          labels:  
            severity: critical  
          annotations:  
            summary: "vLLM is preempting requests"  
            description: "Requests are being recomputed due to KV cache exhaustion. Increase \`gpu\_memory\_utilization\` or verify decode worker scale."

If vllm:gpu\_cache\_usage\_perc consistently approaches 100%, the vLLM engine exhausts available PagedAttention memory blocks. To prevent crashing, the scheduler is forced to preempt requests, swap them to CPU memory, or entirely recompute active sequences, utterly destroying latency metrics.15 The ExcessivePreemptions alert explicitly flags instances where the KEDA autoscaler has failed to scale capacity rapidly enough to absorb the load.15

### **Chaos Engineering Validation**

To ensure the 15-minute RTO and the durability of the complex Temporal and llm-d integration function reliably in production, a rigorous Chaos Engineering test plan must be executed utilizing Chaos Mesh.54

Table 4 outlines the core chaos scenarios required to validate architectural resilience.

| Failure Scenario | Chaos Mesh Tool | Target Component | Expected System Behavior and Validation |
| :---- | :---- | :---- | :---- |
| **Decode Node Failure** | PodChaos (action: pod-kill) | vllm-decode-worker | The Gateway API instantly removes the pod from the routing pool. KEDA detects the capacity drop and schedules a replacement. No HTTP 500 errors surface to the clinician.54 |
| **RDMA Network Partition** | NetworkChaos | Prefill-to-Decode interconnect | NIXL KV cache transfer times out. The llm-d sidecar gracefully abandons the disaggregated pipeline and falls back to computing both prefill and decode locally on the decode node.22 |
| **Agent Memory Leak** | StressChaos (memory) | Temporal Worker Pod | The worker pod is forcefully OOMKilled by Kubernetes. The Temporal Server detects the worker timeout. A new worker pulls the task and seamlessly resumes the clinical agent execution from the last persisted state checkpoint.8 |

A critical validation step involves simulating severe KV-cache pressure to ensure KEDA autoscaling triggers correctly. Using the StressChaos resource, engineers can artificially consume memory within the vLLM pods, mimicking an anomalous influx of exceptionally long-context RAG prompts.58

YAML

apiVersion: chaos-mesh.org/v1alpha1  
kind: StressChaos  
metadata:  
  name: simulate-kv-cache-exhaustion  
  namespace: llm-serving  
spec:  
  mode: all  
  selector:  
    labelSelectors:  
      "llm-d.ai/role": "decode"  
  stressors:  
    memory:  
      workers: 4  
      size: "60GB"   
  duration: "10m"

Because StressChaos with a memory stressor consumes actual memory rather than merely applying read/write pressure, this experiment forces the vLLM PagedAttention manager to register high utilization.59 Observability tools will confirm a rapid spike in vllm:gpu\_cache\_usage\_perc. Crucially, platform engineers must verify that KEDA successfully intercepts this metric via the Prometheus query and initiates the spin-up of additional decode worker pods *before* the vLLM engine reaches the threshold that necessitates request preemption.2

#### **Works cited**

1. Prefill-decode disaggregation | LLM Inference Handbook \- BentoML, accessed March 30, 2026, [https://bentoml.com/llm/inference-optimization/prefill-decode-disaggregation](https://bentoml.com/llm/inference-optimization/prefill-decode-disaggregation)  
2. vLLM Production Deployment: Complete 2026 Guide \- SitePoint, accessed March 30, 2026, [https://www.sitepoint.com/vllm-production-deployment-guide-2026/](https://www.sitepoint.com/vllm-production-deployment-guide-2026/)  
3. Getting started with llm-d for distributed AI inference \- Red Hat Developer, accessed March 30, 2026, [https://developers.redhat.com/articles/2025/08/19/getting-started-llm-d-distributed-ai-inference](https://developers.redhat.com/articles/2025/08/19/getting-started-llm-d-distributed-ai-inference)  
4. ifaakash/multi-region-terraform \- GitHub, accessed March 30, 2026, [https://github.com/ifaakash/multi-region-terraform](https://github.com/ifaakash/multi-region-terraform)  
5. Terraform Multi-Cloud Project Structure: Multi Region Setups \- Cheesecake Labs, accessed March 30, 2026, [https://cheesecakelabs.com/blog/terraform-multi-cloud-project-structure-multi-region-setups/](https://cheesecakelabs.com/blog/terraform-multi-cloud-project-structure-multi-region-setups/)  
6. When and How to Use Helm and Kustomize Together | Thomas Stringer, accessed March 30, 2026, [https://trstringer.com/helm-kustomize/](https://trstringer.com/helm-kustomize/)  
7. Model Service \- llm-d, accessed March 30, 2026, [https://llm-d.ai/docs/architecture/Components/modelservice](https://llm-d.ai/docs/architecture/Components/modelservice)  
8. Temporal \+ LangGraph: A Two-Layer Architecture for Multi-Agent Coordination \- Anup Jadhav, accessed March 30, 2026, [https://www.anup.io/temporal-langgraph-a-two-layer-architecture-for-multi-agent-coordination/](https://www.anup.io/temporal-langgraph-a-two-layer-architecture-for-multi-agent-coordination/)  
9. LangGraph Agents in Production: Architecture, Costs & Real-World Outcomes \- AlphaBOLD, accessed March 30, 2026, [https://www.alphabold.com/langgraph-agents-in-production/](https://www.alphabold.com/langgraph-agents-in-production/)  
10. From prototype to production-ready agentic AI solution: A use case ..., accessed March 30, 2026, [https://temporal.io/blog/prototype-to-prod-ready-agentic-ai-grid-dynamics](https://temporal.io/blog/prototype-to-prod-ready-agentic-ai-grid-dynamics)  
11. Durable execution \- Docs by LangChain, accessed March 30, 2026, [https://docs.langchain.com/oss/python/langgraph/durable-execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)  
12. Durable Digest: August 2025 \- Temporal, accessed March 30, 2026, [https://temporal.io/blog/durable-digest-august-2025](https://temporal.io/blog/durable-digest-august-2025)  
13. Introducing Disaggregated Inference on AWS powered by llm-d | Artificial Intelligence, accessed March 30, 2026, [https://aws.amazon.com/blogs/machine-learning/introducing-disaggregated-inference-on-aws-powered-by-llm-d/](https://aws.amazon.com/blogs/machine-learning/introducing-disaggregated-inference-on-aws-powered-by-llm-d/)  
14. Deploying Disaggregated LLM Inference Workloads on Kubernetes | NVIDIA Technical Blog, accessed March 30, 2026, [https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)  
15. 5 steps to triage vLLM performance | Red Hat Developer, accessed March 30, 2026, [https://developers.redhat.com/articles/2026/03/09/5-steps-triage-vllm-performance](https://developers.redhat.com/articles/2026/03/09/5-steps-triage-vllm-performance)  
16. Prefill/Decode Disaggregation \- llm-d, accessed March 30, 2026, [https://llm-d.ai/docs/guide/Installation/pd-disaggregation](https://llm-d.ai/docs/guide/Installation/pd-disaggregation)  
17. Prefill/decode disaggregation \- Ray Serve, accessed March 30, 2026, [https://docs.ray.io/en/latest/serve/llm/user-guides/prefill-decode.html](https://docs.ray.io/en/latest/serve/llm/user-guides/prefill-decode.html)  
18. KV-Cache Wins You Can See: From Prefix Caching in vLLM to Distributed Scheduling with llm-d, accessed March 30, 2026, [https://llm-d.ai/blog/kvcache-wins-you-can-see](https://llm-d.ai/blog/kvcache-wins-you-can-see)  
19. Master KV cache aware routing with llm-d for efficient AI inference \- Red Hat Developer, accessed March 30, 2026, [https://developers.redhat.com/articles/2025/10/07/master-kv-cache-aware-routing-llm-d-efficient-ai-inference](https://developers.redhat.com/articles/2025/10/07/master-kv-cache-aware-routing-llm-d-efficient-ai-inference)  
20. Deep Dive into llm-d and Distributed Inference \- Solo.io, accessed March 30, 2026, [https://www.solo.io/blog/deep-dive-into-llm-d-and-distributed-inference](https://www.solo.io/blog/deep-dive-into-llm-d-and-distributed-inference)  
21. llm-d \- Distributed Inference Serving on Kubernetes \- kgateway, accessed March 30, 2026, [https://kgateway.dev/blog/llm-d-kgateway/](https://kgateway.dev/blog/llm-d-kgateway/)  
22. Disaggregated Prefill/Decode Inference Serving in LLM-D \- GitHub, accessed March 30, 2026, [https://github.com/llm-d/llm-d-inference-scheduler/blob/main/docs/disagg\_pd.md](https://github.com/llm-d/llm-d-inference-scheduler/blob/main/docs/disagg_pd.md)  
23. Scaling LLM Workloads on Kubernetes: A Production Engineer's Guide \- Zartis, accessed March 30, 2026, [https://www.zartis.com/scaling-llm-workloads-on-kubernetes-a-production-engineers-guide/](https://www.zartis.com/scaling-llm-workloads-on-kubernetes-a-production-engineers-guide/)  
24. Performance and Tuning — vLLM \- Read the Docs, accessed March 30, 2026, [https://nm-vllm.readthedocs.io/en/0.5.0/models/performance.html](https://nm-vllm.readthedocs.io/en/0.5.0/models/performance.html)  
25. Autoscaling vLLM with OpenShift AI model serving: Performance validation, accessed March 30, 2026, [https://developers.redhat.com/articles/2025/11/26/autoscaling-vllm-openshift-ai-model-serving](https://developers.redhat.com/articles/2025/11/26/autoscaling-vllm-openshift-ai-model-serving)  
26. Optimization and Tuning \- vLLM, accessed March 30, 2026, [https://docs.vllm.ai/en/v0.10.2/configuration/optimization.html](https://docs.vllm.ai/en/v0.10.2/configuration/optimization.html)  
27. AWS Multi-Region Deployment Best Practices | by Thilina Ashen Gamage \- Medium, accessed March 30, 2026, [https://medium.com/platform-engineer/aws-multi-region-deployment-best-practices-db0c3ce25ff2](https://medium.com/platform-engineer/aws-multi-region-deployment-best-practices-db0c3ce25ff2)  
28. Designing Multi-Region Kubernetes for Active-Active Workloads, accessed March 30, 2026, [https://vcloudlabs.medium.com/designing-multi-region-kubernetes-for-active-active-workloads-3a711dee62f1](https://vcloudlabs.medium.com/designing-multi-region-kubernetes-for-active-active-workloads-3a711dee62f1)  
29. Reference Architecture for Highly Available Multi-Region Azure Kubernetes Service (AKS), accessed March 30, 2026, [https://techcommunity.microsoft.com/blog/azurearchitectureblog/reference-architecture-for-highly-available-multi-region-azure-kubernetes-servic/4490479](https://techcommunity.microsoft.com/blog/azurearchitectureblog/reference-architecture-for-highly-available-multi-region-azure-kubernetes-servic/4490479)  
30. Building a Disaster Recovery Solution on AWS: Achieving 4-Hour RTO and 15-Minute RPO, accessed March 30, 2026, [https://builder.aws.com/content/37sNSi9kmyMyyvjfqB1TnUhLx9w/building-a-disaster-recovery-solution-on-aws-achieving-4-hour-rto-and-15-minute-rpo](https://builder.aws.com/content/37sNSi9kmyMyyvjfqB1TnUhLx9w/building-a-disaster-recovery-solution-on-aws-achieving-4-hour-rto-and-15-minute-rpo)  
31. New feature: Multi-region Namespaces in Temporal Cloud, accessed March 30, 2026, [https://community.temporal.io/t/new-feature-multi-region-namespaces-in-temporal-cloud/12335](https://community.temporal.io/t/new-feature-multi-region-namespaces-in-temporal-cloud/12335)  
32. RPO and RTO | Temporal Platform Documentation, accessed March 30, 2026, [https://docs.temporal.io/cloud/rpo-rto](https://docs.temporal.io/cloud/rpo-rto)  
33. Vector Databases: Pinecone vs Weaviate vs Milvus | MI \- 超智諮詢, accessed March 30, 2026, [https://www.meta-intelligence.tech/en/insight-vector-database](https://www.meta-intelligence.tech/en/insight-vector-database)  
34. Vector Database Showdown 2025: Qdrant vs Milvus vs Weaviate Performance Benchmarks for RAG on VPS \- Onidel, accessed March 30, 2026, [https://onidel.com/blog/vector-database-benchmarks-vps](https://onidel.com/blog/vector-database-benchmarks-vps)  
35. Ultimate Guide to Vector Databases \- Dataaspirant, accessed March 30, 2026, [https://dataaspirant.com/vector-database/](https://dataaspirant.com/vector-database/)  
36. Vector Database Reindexing Pipeline | by Kandaanusha | Mar, 2026 \- Medium, accessed March 30, 2026, [https://medium.com/@kandaanusha/vector-database-reindexing-pipeline-87efa1d1cd19](https://medium.com/@kandaanusha/vector-database-reindexing-pipeline-87efa1d1cd19)  
37. Best option for bulk refresh: alias blue/green vs single-index \+ version filter \- Elasticsearch, accessed March 30, 2026, [https://discuss.elastic.co/t/best-option-for-bulk-refresh-alias-blue-green-vs-single-index-version-filter/382441](https://discuss.elastic.co/t/best-option-for-bulk-refresh-alias-blue-green-vs-single-index-version-filter/382441)  
38. How to Use Amazon OpenSearch Service Index Aliases with Knowledge Bases in Amazon Bedrock \- DEV Community, accessed March 30, 2026, [https://dev.to/aws-builders/how-to-use-amazon-opensearch-service-index-aliases-with-knowledge-bases-in-amazon-bedrock-5gi7](https://dev.to/aws-builders/how-to-use-amazon-opensearch-service-index-aliases-with-knowledge-bases-in-amazon-bedrock-5gi7)  
39. Seamless Swapping: A Comprehensive Guide to Blue-Green Deployments, accessed March 30, 2026, [https://dev.to/adityapratapbh1/seamless-swapping-a-comprehensive-guide-to-blue-green-deployments-3bnm](https://dev.to/adityapratapbh1/seamless-swapping-a-comprehensive-guide-to-blue-green-deployments-3bnm)  
40. How do I roll out versioned updates without downtime? \- Milvus, accessed March 30, 2026, [https://milvus.io/ai-quick-reference/how-do-i-roll-out-versioned-updates-without-downtime](https://milvus.io/ai-quick-reference/how-do-i-roll-out-versioned-updates-without-downtime)  
41. Index aliases \- OpenSearch Documentation, accessed March 30, 2026, [https://docs.opensearch.org/latest/im-plugin/index-alias/](https://docs.opensearch.org/latest/im-plugin/index-alias/)  
42. README.md \- kubecost/cost-analyzer \- GitHub, accessed March 30, 2026, [https://github.com/kubecost/cost-analyzer/blob/gh-pages/README.md](https://github.com/kubecost/cost-analyzer/blob/gh-pages/README.md)  
43. Cloud FinOps \- Part 4: Kubernetes Cost Report \- Engineering Blog, accessed March 30, 2026, [https://engineering.empathy.co/cloud-finops-part-4-kubernetes-cost-report/](https://engineering.empathy.co/cloud-finops-part-4-kubernetes-cost-report/)  
44. OpenCost as a Prometheus metric exporter | OpenCost — open source cost monitoring for cloud native environments, accessed March 30, 2026, [https://opencost.io/docs/integrations/opencost-exporter/](https://opencost.io/docs/integrations/opencost-exporter/)  
45. How to Use Kubecost for Cluster Cost Allocation and Analysis \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-02-09-kubecost-cost-allocation/view](https://oneuptime.com/blog/post/2026-02-09-kubecost-cost-allocation/view)  
46. Allocations Dashboard \- IBM, accessed March 30, 2026, [https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=ui-allocations-dashboard](https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=ui-allocations-dashboard)  
47. How to Use Kubecost for Kubernetes Costs \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-01-27-kubecost-kubernetes-costs/view](https://oneuptime.com/blog/post/2026-01-27-kubecost-kubernetes-costs/view)  
48. Kubecost Metrics \- IBM, accessed March 30, 2026, [https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics](https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics)  
49. Prometheus metrics \- llm-d/llm-d-inference-sim \- GitHub, accessed March 30, 2026, [https://github.com/llm-d/llm-d-inference-sim/blob/main/docs/metrics.md](https://github.com/llm-d/llm-d-inference-sim/blob/main/docs/metrics.md)  
50. How to use PromQL joins for more effective queries of Prometheus metrics at scale, accessed March 30, 2026, [https://grafana.com/blog/how-to-use-promql-joins-for-more-effective-queries-of-prometheus-metrics-at-scale/](https://grafana.com/blog/how-to-use-promql-joins-for-more-effective-queries-of-prometheus-metrics-at-scale/)  
51. How to Join Two Metrics in Prometheus Query \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2025-12-17-prometheus-join-two-metrics/view](https://oneuptime.com/blog/post/2025-12-17-prometheus-join-two-metrics/view)  
52. How to Implement Prometheus Alert Rule Design \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-01-30-prometheus-alert-rule-design/view](https://oneuptime.com/blog/post/2026-01-30-prometheus-alert-rule-design/view)  
53. Optimization and Tuning \- vLLM, accessed March 30, 2026, [https://docs.vllm.ai/en/stable/configuration/optimization/](https://docs.vllm.ai/en/stable/configuration/optimization/)  
54. Chaos Engineering in Kubernetes: Testkube \+ Chaos Mesh, accessed March 30, 2026, [https://testkube.io/blog/orchestrating-chaos-engineering-with-testkube-and-chaos-mesh](https://testkube.io/blog/orchestrating-chaos-engineering-with-testkube-and-chaos-mesh)  
55. GitHub \- chaos-mesh/chaos-mesh: A Chaos Engineering Platform for Kubernetes., accessed March 30, 2026, [https://github.com/chaos-mesh/chaos-mesh](https://github.com/chaos-mesh/chaos-mesh)  
56. Simulate Pod Faults | Chaos Mesh, accessed March 30, 2026, [https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/](https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/)  
57. K8s Chaos Dive: Chaos-Mesh Part 2 \- DEV Community, accessed March 30, 2026, [https://dev.to/craigmorten/k8s-chaos-dive-chaos-mesh-part-2-536m](https://dev.to/craigmorten/k8s-chaos-dive-chaos-mesh-part-2-536m)  
58. How to Configure Stress Chaos Experiments with Flux CD \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-03-13-configure-stress-chaos-experiments-with-flux-cd/view](https://oneuptime.com/blog/post/2026-03-13-configure-stress-chaos-experiments-with-flux-cd/view)  
59. Simulate Stress Scenarios \- Chaos Mesh, accessed March 30, 2026, [https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/](https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/)  
60. StressChaos \- Chaos Mesh \- Mintlify, accessed March 30, 2026, [https://www.mintlify.com/chaos-mesh/chaos-mesh/chaos/stresschaos](https://www.mintlify.com/chaos-mesh/chaos-mesh/chaos/stresschaos)
