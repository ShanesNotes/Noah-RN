# **Healthcare AI Governance Readiness Assessment (HAIRA) v2: Deployment Instrument and Policy Enforcement**

## **The Imperative for Architectural AI Governance in 2026**

The year 2026 represents a definitive inflection point in the operationalization of artificial intelligence within the healthcare and life sciences sectors. AI has transitioned from an experimental capability into the core operating infrastructure driving drug discovery, clinical trial optimization, and frontline patient care.1 The defining characteristic of this era is the rapid displacement of narrow, rules-based predictive algorithms by Agentic AI—autonomous, goal-driven systems that possess the capacity to orchestrate multi-step workflows, retrieve real-time data via application programming interfaces (APIs), and execute complex clinical and administrative actions with minimal human oversight.1

This architectural evolution fundamentally alters the risk profile of digital medicine. As agentic systems assume responsibilities ranging from parsing fragmented real-world data to synthesizing competitive clinical trial readouts, traditional IT governance frameworks have proven dangerously inadequate.3 Historically, healthcare governance relied on static compliance checklists, vendor intake questionnaires, and event-driven post-market audits.6 These mechanisms function as mere records of intent rather than active controls. By 2026, the industry consensus dictates that an AI system lacking the ability to verify its own logic, cite its evidentiary sources, and operate within strict programmatic constraints is fundamentally broken.4

The fragmentation of early AI governance models frequently resulted in frameworks that assumed massive institutional resources, effectively alienating smaller hospital networks, rural health systems, and independent clinics.8 To rectify this disparity, researchers conducted a comprehensive systematic review of 35 distinct healthcare AI implementation frameworks published between 2019 and 2024\.8 The synthesis of this literature produced the Healthcare AI Governance Readiness Assessment (HAIRA), published in *npj Digital Medicine*.8 The HAIRA framework categorizes the AI lifecycle into seven critical domains and establishes a five-level maturity model that provides adaptive, resource-aware governance pathways for organizations of all sizes.8

The transition to advanced clinical intelligence mandates a shift from reactive oversight to architectural governance, adhering to the 10-20-70 rule of transformation: allocating ten percent of organizational effort to algorithms, twenty percent to technology and data infrastructure, and seventy percent to clinical workflows and change management.2 This comprehensive report translates the theoretical HAIRA v2 framework into a pragmatic, ready-to-deploy clinical instrument. It details the exhaustive 7-domain assessment questionnaire and corresponding scoring rubric, establishes the Infrastructure-as-Code (IaC) policy architecture necessary to programmatically enforce these maturity benchmarks, and provides a pre-deployment executive dashboard modeling the rollout of a high-autonomy clinical research assistant.

## **HAIRA v2 Maturity Model Architecture and Scoring Dynamics**

The HAIRA v2 maturity model evaluates a healthcare organization's capability to safely develop, procure, deploy, and maintain AI systems. The framework establishes a continuum from informal, ad hoc practices to highly optimized, self-healing technological ecosystems.8 The progression across these levels is not merely an accumulation of documentation; it represents a fundamental shift in how digital risk is managed at the infrastructure layer.12

The maturity spectrum is defined across five distinct echelons. At Level 1 (Initial / Ad Hoc), governance processes are informal, heavily reliant on individual discretion, and lack organizational consistency.8 Level 2 (Repeatable) indicates the presence of basic governance mechanisms, though application remains fragmented and siloed across different departments.12 Level 3 (Defined) serves as the critical operational threshold where documented policies are universally enforced, and specific architectural safeguards are integrated directly into the deployment pipeline.12 Advancing to Level 4 (Managed) requires continuous, dashboard-driven monitoring of AI performance, active root cause analysis protocols, and automated telemetry.12 Finally, Level 5 (Leading / Optimized) represents an ecosystem where AI governance is deeply embedded into the organizational DNA, featuring programmable logic verifiers, automated drift mitigation, and seamless cross-functional interoperability.4

### **The Minimum-Domain Evaluation Protocol**

To prevent the artificial inflation of institutional readiness scores, the HAIRA v2 instrument employs a stringent minimum-domain or "weakest-link" scoring methodology.18 Under this protocol, an organization's overarching governance maturity level cannot exceed the score of its lowest-performing domain.18

The rationale for this restrictive scoring architecture is deeply rooted in the realities of clinical safety. A health system may invest heavily in acquiring state-of-the-art algorithmic models and possess Level 4 capabilities in algorithm development, but if that same organization lacks the telemetry infrastructure to monitor model degradation post-deployment (Level 1 or 2 in Monitoring and Maintenance), the entire system is critically vulnerable.18 In high-stakes medical environments, a highly accurate diagnostic algorithm becomes a severe liability the moment its underlying data distribution shifts without detection. Therefore, the HAIRA v2 instrument forces organizations to elevate their foundational capabilities across all seven domains simultaneously, ensuring no blind spots remain in the AI operational lifecycle.12

## **Domain 1: Organizational Structure and Executive Sponsorship**

The foundation of robust AI governance lies in the structural alignment of the organization. Effective oversight requires moving beyond siloed IT departments to establish multidisciplinary governance bodies that possess the authority to halt unsafe deployments and mandate technical standards.19 The systematic review underpinning HAIRA identified cross-functional representation as a critical success factor, necessitating the inclusion of data scientists, clinical experts, legal counsel, and patient advocacy representatives.19 Furthermore, the emergence of the Chief AI Officer (CAIO) role mirrors the historical evolution of the Chief Medical Information Officer, reflecting the need for executive-level accountability in digital transformation.19 This domain assesses the permanence, authority, and composition of the teams responsible for AI stewardship.11

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Executive Accountability** | No dedicated leadership; AI initiatives are scattered across departments. | Ad hoc leadership assigned per project without enterprise authority. | Formal CAIO or executive steering committee established with a defined mandate. | AI leadership holds budgetary control and enforces enterprise-wide compliance. | AI strategy is fully integrated into the board-level corporate vision and risk management. |
| **Committee Composition** | IT-only or clinical-only decision making without cross-disciplinary input. | Committees formed reactively during vendor procurement phases. | Standing multidisciplinary committee (IT, clinical, legal, ethics) convenes regularly. | Committee features sub-panels for distinct lifecycle phases (e.g., procurement vs. monitoring). | Ecosystem includes patient advocates and external auditors in continuous governance loops. |
| **Lifecycle Integration** | Leadership only involved during initial purchasing or crisis response. | Governance acts as a single pre-deployment approval gate. | Governance mandates checkpoints at procurement, testing, and deployment. | Active governance presence from problem formulation through decommissioning. | Governance is fully automated, triggering reviews based on real-time system metrics. |
| **Role Clarity (RACI)** | Ownership of AI failures or model drift is ambiguous. | Roles are informally understood but rarely documented. | RACI matrices are strictly documented for every approved AI deployment. | Accountability is tied to performance evaluations and clinical safety metrics. | Decentralized data mesh ownership empowers domain experts with central platform support. |

## **Domain 2: Problem Formulation and Clinical Alignment**

The deployment of artificial intelligence must be driven by verifiable clinical or operational needs rather than the pursuit of technological novelty. The Problem Formulation domain evaluates the rigor with which an organization assesses its current standard of care to establish an objective rationale for algorithmic intervention.11 This phase is highly susceptible to framing biases, where the optimization objectives of the model may inadvertently misalign with equitable patient outcomes.20 For example, optimizing an algorithm solely for cost reduction rather than clinical efficacy can introduce severe systemic risks.20 The HAIRA framework demands structured analyses of the intended use case, the targeted patient population, and the projected return on investment, ensuring the AI solution integrates logically into the healthcare ecosystem.11

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Needs Assessment** | AI is pursued as a solution looking for a problem based on vendor marketing. | Informal discussions define the clinical problem without workflow mapping. | Current standards of care are formally documented to establish an objective baseline. | Deep workflow analysis identifies specific bottlenecks addressable exclusively by AI. | Continuous operational analytics automatically surface systemic inefficiencies for AI intervention. |
| **Objective Specification** | Success criteria are vague (e.g., "improve patient care"). | Broad objectives are stated but lack quantifiable measurement parameters. | Specific, quantifiable clinical and operational targets are defined prior to development. | Optimization metrics are meticulously balanced against safety and ethical constraints. | Dynamic objective frameworks adapt targets based on evolving population health data. |
| **Value & Impact Modeling** | No financial or clinical impact projections are conducted. | Basic cost-benefit analyses are performed inconsistently. | Structured Return on Investment (ROI) and clinical value models are mandated. | Impact assessments include longitudinal projections of secondary operational effects. | Financial models dynamically update based on real-time algorithmic performance data. |
| **Equity & Framing Audit** | No consideration of how problem framing might encode bias. | Ad hoc reviews of problem definitions for obvious discriminatory risks. | Formal equity audits assess whether optimization metrics disadvantage vulnerable groups. | Stakeholder mapping actively includes marginalized communities in the design phase. | Participatory design frameworks ensure the AI targets root causes of health disparities. |

## **Domain 3: Algorithm Development and Model Training**

While many health systems procure AI through external vendors, the capacity to develop, fine-tune, or retrain models internally requires rigorous technical governance. This domain scrutinizes the architectural safety, data hygiene, and privacy-preserving mechanisms utilized during model creation.11 High-maturity organizations must ensure that training datasets accurately reflect the demographic and clinical realities of their specific patient populations.11 Furthermore, as the industry transitions toward Agentic AI, development pipelines must embed advanced reasoning constraints, such as Chain of Thought verification, to guarantee that autonomous logic remains auditable and clinically sound.4 Privacy-by-design principles, including differential privacy and federated learning protocols, serve as fundamental benchmarks within this domain.22

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Data Representativeness** | Models are trained on available convenience samples without demographic analysis. | Basic demographic checks are performed on training datasets. | Datasets undergo systematic statistical evaluation against target population distributions. | Measurement biases and differential missingness are proactively corrected during curation. | Continuous representation monitoring automatically flags shifts in population demographics. |
| **Privacy-by-Design** | Data is utilized with minimal de-identification protocols. | Standard HIPAA de-identification is applied inconsistently. | Strict, programmatic de-identification and access control pipelines are mandated. | Advanced privacy-preserving techniques (differential privacy) are utilized in training. | Federated learning architectures allow model improvement without centralizing sensitive data. |
| **Architectural Safety** | Models operate as impenetrable black boxes with no reasoning transparency. | Basic feature importance metrics are generated for predictive models. | Agentic systems utilize documented prompt architectures and reasoning constraints. | Chain of Thought (CoT) and automated logic verifiers are structurally embedded. | Verifier models autonomously audit and halt primary agents attempting unsafe reasoning paths. |
| **Regulatory Alignment** | Development occurs in a vacuum isolated from compliance mandates. | Legal teams review models post-development for glaring regulatory violations. | Development adheres strictly to FDA, HIPAA, and relevant international AI standards. | Proactive mapping of technical vectors to specific regulatory controls (e.g., NIST AI RMF). | Development pipelines automatically generate compliance dossiers and model cards. |

## **Domain 4: External Product Evaluation and Selection**

Given the proliferation of commercially available clinical AI, the ability to rigorously vet and select external vendors is paramount. The HAIRA framework emphasizes that algorithmic performance reported in vendor literature rarely translates flawlessly to local clinical environments due to distributional shifts in patient demographics and equipment variances.23 Therefore, this domain evaluates the mechanisms by which organizations interrogate vendor transparency, mandate comprehensive model cards, and conduct independent validation.11 Furthermore, high-maturity procurement involves establishing explicit contractual frameworks that delineate liability in the event of AI-induced patient harm, moving beyond standard software licensing agreements.11

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Generalizability Testing** | Vendor marketing claims regarding accuracy are accepted without verification. | Informal testing is conducted on small, localized data samples prior to purchase. | Rigorous pre-launch testing on diverse, local, unseen datasets is universally mandated. | Comprehensive distributional shift analysis identifies specific cohorts where the vendor model degrades. | Continuous, automated benchmarking of vendor models against local baseline clinical standards. |
| **Vendor Transparency** | Vendors provide no visibility into algorithmic architecture or training data. | Vendors supply basic technical summaries upon request. | Procurement mandates the submission of standardized, exhaustive Model Cards. | Deep technical audits are conducted on vendor algorithms for hidden biases and constraints. | Vendors provide secure enclave access for continuous institutional auditing of model weights. |
| **Integration Viability** | AI products operate in isolated silos, requiring duplicate data entry. | Partial EMR integration exists, but workflows remain clumsy and fragmented. | Solutions are deeply integrated via FHIR/HL7, enhancing rather than disrupting workflows. | Bi-directional integration allows the AI to autonomously queue actions for clinician review. | Vendor ecosystem is fully interoperable, with distinct AI models sharing context seamlessly. |
| **Liability & Contracting** | Standard End User License Agreements cover all AI deployments. | Legal counsel attempts to negotiate custom terms with limited success. | Standardized liability frameworks explicitly address AI hallucination and patient harm. | Contracts mandate continuous performance SLAs and financial penalties for algorithmic drift. | Dynamic, programmable financial contracts (e.g., smart contracts) execute based on model reliability. |

## **Domain 5: Model Evaluation and Validation**

Before an AI system interfaces with live clinical workflows, it must undergo exhaustive empirical validation to ensure safety, fairness, and clinical accuracy.11 This domain assesses the transition from technical performance metrics to clinical reality. High-maturity validation requires disaggregating performance data across various demographic subgroups (e.g., age, race, socioeconomic status) to ensure demographic parity and prevent the exacerbation of existing health disparities.20 Additionally, systems must be subjected to adversarial robustness testing to expose failure modes, and uncertainty quantification must be calibrated so that the model fails gracefully when presented with inputs outside its operational confidence threshold.20

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Fairness & Disaggregation** | Overall accuracy is the sole metric evaluated prior to deployment. | Basic stratification by age or gender is occasionally reviewed. | Performance metrics (PPV, sensitivity) are strictly disaggregated across all protected classes. | Automated equity audits flag statistically significant disparate impacts during testing. | Counterfactual fairness testing ensures equitable outcomes regardless of demographic variance. |
| **Adversarial Robustness** | The model is only tested against clean, perfectly structured clinical data. | Informal edge-case scenarios are presented to the model during QA. | Systematic adversarial testing simulates corrupted inputs and malicious prompt injections. | Automated red-teaming pipelines continuously probe the model for novel vulnerabilities. | Models feature intrinsic defensive architectures that neutralize adversarial perturbations instantly. |
| **Human-in-the-Loop** | Technical teams declare the model validated without clinical oversight. | Clinicians perform superficial reviews of a small subset of model outputs. | Subject-matter experts formally benchmark AI decisions against clinical gold standards. | Structured Turing-style tests determine if AI recommendations are distinguishable from experts. | Global networks of specialists continuously validate and vote on complex edge-case predictions. |
| **Uncertainty Quantification** | The system presents all outputs with absolute certainty, regardless of data quality. | The system occasionally provides low-confidence warnings. | The AI explicitly quantifies its uncertainty and escalates ambiguous cases to human experts. | Confidence thresholds are dynamically adjusted based on the severity of the clinical context. | The system autonomously requests additional diagnostic testing when epistemic uncertainty is high. |

## **Domain 6: Deployment and Integration**

The physical deployment of AI into the clinical environment introduces extreme human-computer interaction risks. A perfectly validated algorithm can still cause harm if its integration induces alert fatigue or obscures critical patient data.20 The Deployment and Integration domain focuses on workflow ergonomics and the architectural strategies utilized to mitigate risk during rollout.11 To achieve Level 3 maturity, organizations must abandon immediate, full-scale deployments in favor of programmatic shadow modes (where the AI runs silently in the background for evaluation) or canary releases (where only a marginal percentage of traffic is routed to the new system).14 Furthermore, this domain evaluates the existence of intuitive override mechanisms, ensuring that clinicians retain ultimate authority over patient care.20

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Rollout Architecture** | "Big bang" deployments push updates to all clinical staff simultaneously. | Phased rollouts occur manually across different hospital departments. | Shadow mode execution and canary deployments are programmatically enforced. | Automated deployment pipelines seamlessly transition traffic based on real-time health metrics. | Systems utilize A/B testing at scale to continuously optimize the clinical interface. |
| **Workflow Ergonomics** | The AI introduces significant friction and pop-up fatigue for clinical staff. | UI/UX is considered, but the tool still requires context switching by the user. | Integration is seamless; insights are delivered contextually within existing EMR workflows. | Cognitive load analysis informs the design, minimizing unnecessary clicks and alerts. | Ambient clinical intelligence operates invisibly, anticipating clinician needs proactively. |
| **Clinical Literacy** | Staff receive an email notification regarding the new software tool. | Optional training sessions are provided on how to use the AI interface. | Mandatory competency training covers both tool functionality and algorithmic limitations. | Continuous education modules update staff on newly discovered model behaviors or drifts. | AI literacy is a core requirement for clinical credentialing and institutional onboarding. |
| **Human Override** | Overriding the AI requires navigating complex administrative menus. | Clinicians can ignore the AI, but the reasoning is not captured. | Intuitive override mechanisms exist, requiring a brief justification from the clinician. | Clinician overrides are systematically aggregated and fed directly into model retraining pipelines. | The system learns individual clinician preferences and adapts its interaction style safely. |

## **Domain 7: Monitoring and Maintenance**

Governance does not conclude at deployment; it is an ongoing, continuous process.6 The Monitoring and Maintenance domain is arguably the most critical for Agentic AI, as these systems interact with dynamic environments where data distributions shift constantly.11 High maturity in this domain requires moving beyond simplistic uptime tracking to implement full-stack observability. This involves deep hierarchical tracing of LLM token usage, intermediate reasoning steps, and external API tool calls.27 Additionally, organizations must establish automated drift detection mechanisms and strict decommissioning protocols that instantly suspend operations when performance metrics breach acceptable safety thresholds.18

| Assessment Criterion | Level 1 (Initial) | Level 2 (Repeatable) | Level 3 (Defined) | Level 4 (Managed) | Level 5 (Leading) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Observability & Tracing** | Only basic server uptime and crash logs are monitored. | High-level API latency and basic error rates are tracked. | Full-stack observability (e.g., Langfuse) traces tokens, prompts, and tool calls. | Deep hierarchical tracing maps every agentic micro-decision for instant debugging. | Telemetry data is analyzed by secondary AI models to predict impending system failures. |
| **Drift Detection** | Performance degradation is only discovered through user complaints. | Periodic manual audits check for accuracy degradation over time. | Automated statistical monitors detect data drift and concept drift in near real-time. | The system distinguishes between benign seasonal variations and critical structural shifts. | Automated retraining pipelines are triggered the moment specific drift thresholds are crossed. |
| **Feedback & RCA** | User feedback is collected informally and rarely acted upon. | A ticketing system exists for reporting AI errors and bugs. | Structured Root Cause Analysis (RCA) is mandated for every clinical AI hallucination. | Feedback loops seamlessly align user corrections with LLM-as-a-judge evaluators. | The system autonomously generates incident reports detailing exactly why a failure occurred. |
| **Decommissioning** | Broken models remain in production while IT attempts to patch them. | Manual intervention is required to disable malfunctioning AI systems. | Predefined thresholds exist that trigger immediate, programmatic system rollbacks. | "Kill switches" instantly isolate rogue autonomous agents from clinical databases. | Automated failovers instantly route traffic to secure, legacy algorithms during a crisis. |

## **Bridging Policy to Infrastructure: Terraform and Sentinel Enforcement**

A recurring failure mode in enterprise digital transformation is the divergence between written governance policies and actual deployed infrastructure.13 When teams operate across multiple cloud environments, relying on intake questionnaires and post-deployment audits creates massive governance gaps that facilitate "Shadow AI".13 To advance a healthcare organization from HAIRA Level 2 (Repeatable) to Level 3 (Defined), governance must be codified into the infrastructure pipeline itself.

HashiCorp Terraform, the industry standard for Infrastructure-as-Code (IaC), combined with the Sentinel policy-as-code framework, provides the precise mechanism to enforce HAIRA requirements.13 By evaluating the Terraform execution plan (tfplan/v2) before any resources are provisioned, Sentinel allows IT governance committees to establish hard regulatory boundaries.32 If a development team attempts to deploy an AI architecture that violates the codified HAIRA standards, the deployment is programmatically blocked.34

The following section details the automated Terraform Sentinel policy set designed to enforce two critical HAIRA Level 3 benchmarks: **Mandatory Observability Tracing** (Domain 7\) and **Risk-Mitigated Deployment Patterns** (Domain 6).29

### **IaC Policy 1: Enforcing Langfuse Telemetry**

To satisfy the stringent monitoring requirements of Domain 7, complex LLM applications must utilize advanced observability backends. Langfuse has emerged as a premier open-source platform, utilizing OpenTelemetry standards to capture nested traces, token costs, prompt versions, and user feedback.28 Deploying an Agentic AI system without this telemetry constitutes a critical risk.29

The following Sentinel policy intercepts the creation or modification of any AWS Elastic Container Service (ECS) task definitions. It parses the environmental variables to ensure that the required Langfuse API keys and host configurations are injected into the computational environment. If these variables are missing, the policy evaluates to a failure, and the hard-mandatory enforcement level prevents the infrastructure from being built.32

Terraform

\# Policy: require-langfuse-tracing.sentinel  
\# Enforcement Level: hard-mandatory  
\# Description: Prevents the deployment of AI computational resources that lack  
\# explicit configuration for Langfuse telemetry tracing, enforcing HAIRA Domain 7\.

import "tfplan/v2" as tfplan

\# Identify all AWS ECS Task Definitions being created or modified in the plan  
ai\_compute\_tasks \= filter tfplan.resource\_changes as address, rc {  
    rc.type is "aws\_ecs\_task\_definition" and  
    rc.mode is "managed" and  
    (rc.change.actions contains "create" or rc.change.actions contains "update")  
}

\# Rule: Verify Langfuse API keys are injected into the container environment  
langfuse\_configured \= rule {  
    all ai\_compute\_tasks as \_, task {  
        any task.change.after.container\_definitions as container {  
            \# The container configuration must contain the Langfuse connection variables  
            \# enabling OpenTelemetry tracing back to the observability plane.  
            container.environment contains "LANGFUSE\_PUBLIC\_KEY" and  
            container.environment contains "LANGFUSE\_SECRET\_KEY" and   
            container.environment contains "LANGFUSE\_HOST"  
        }  
    }  
}

\# The main rule determines the pass/fail state of the policy check  
main \= rule {  
    langfuse\_configured  
}

By institutionalizing this policy within the HashiCorp Cloud Platform (HCP), the governance committee ensures that no AI model—regardless of which internal team develops it—can achieve production status without being fully transparent to the central observability dashboard.32

### **IaC Policy 2: Mandating Canary Deployments for Clinical AI**

Achieving Level 3 maturity in Domain 6 (Deployment and Integration) explicitly prohibits instantaneous, system-wide rollouts of new clinical algorithms.14 To limit the blast radius of algorithmic anomalies, new models must be introduced via canary deployments, where only a fractional percentage of clinical requests are routed to the updated system.14

This Sentinel policy scrutinizes the configuration of AWS Application Load Balancer (ALB) listener rules. It verifies that when a new target group (representing the new AI model version) is provisioned, the network traffic routing is explicitly weighted, and the canary weight does not exceed the predefined safety threshold of 10%.

Terraform

\# Policy: enforce-canary-deployment.sentinel  
\# Enforcement Level: hard-mandatory  
\# Description: Ensures that new AI model endpoints are deployed using weighted   
\# routing, capped at a maximum of 10% traffic (Canary threshold), enforcing HAIRA Domain 6\.

import "tfplan/v2" as tfplan

\# Identify routing rules for application load balancers  
alb\_listener\_rules \= filter tfplan.resource\_changes as address, rc {  
    rc.type is "aws\_alb\_listener\_rule" and  
    rc.mode is "managed" and  
    (rc.change.actions contains "create" or rc.change.actions contains "update")  
}

\# Rule: Verify weighted routing is utilized and the canary weight is \<= 10%  
valid\_canary\_weight \= rule {  
    all alb\_listener\_rules as \_, rule {  
        all rule.change.after.action as action {  
            action.type is "forward" and  
            all action.forward.target\_group as tg {  
                \# Ensure the newly created target group is restricted to the canary threshold  
                tg.weight \<= 10  
            }  
        }  
    }  
}

\# Evaluate the canary enforcement rule  
main \= rule {  
    valid\_canary\_weight  
}

The synergy between these two policies is profound. The canary routing policy guarantees that a new model only processes a small fraction of clinical interactions, while the Langfuse tracing policy guarantees that every nuance of those interactions is captured for empirical review. This combination provides the IT governance committee with a secure, highly observable sandbox to validate clinical logic before authorizing broader institutional exposure.

## **Architectural Telemetry: The Langfuse Integration**

While the Terraform policies enforce the *presence* of observability, the actual mechanics of that observability dictate the organization's capabilities in Domain 5 (Validation) and Domain 7 (Monitoring). For agentic systems, traditional application performance monitoring is insufficient; knowing an API call took three seconds provides no insight into the clinical safety of the generated response.28

Langfuse operates as the "air traffic control tower" for LLM interactions.37 It provides a comprehensive, OpenTelemetry-compatible backend that maps complex, nested traces.29 This architecture relies on a robust data foundation: a Redis cache (configured with maxmemory-policy=noeviction) to handle high-throughput ingestion spikes, a ClickHouse OLAP database for rapid analytical querying of trace data, and S3 blob storage to securely retain multimodal artifacts generated by the AI.38

This specialized infrastructure enables three vital governance capabilities:

1. **Granular Span Tracing:** Every multi-step interaction is documented. If an agent executes a vector search across clinical guidelines, formulates a SQL query for a patient's medication history, and synthesizes a recommendation, Langfuse logs each distinct span.27 If the final recommendation is erroneous, governance teams can pinpoint the exact failure node—determining if it was a data retrieval error or a foundational model hallucination.28  
2. **Prompt Version Control:** Langfuse centralizes prompt management outside the application codebase.40 This allows clinical steering committees to iteratively refine the system prompts (e.g., adjusting the strictness of diagnostic constraints) and track how different prompt versions impact both latency and clinical accuracy.36  
3. **Automated LLM-as-a-Judge Evaluation:** Human review of every AI interaction is unscalable. Observability platforms like Langfuse integrate automated evaluation pipelines, where constrained, secondary "Verifier Models" continuously score the output of the primary agent against a rubric of factual consistency, medical safety, and adherence to policy.4

## **Pre-Deployment Visualization: The noah-rn Rollout Dashboard**

The integration of the HAIRA v2 questionnaire, the IaC Sentinel policies, and the Langfuse telemetry culminates in the executive visualization layer. To effectively govern, Clinical Champions and IT Committees require a centralized dashboard that aggregates these disparate data streams into actionable intelligence.

To model this, we examine the theoretical rollout of noah-rn (Noah AI). As an advanced, Agentic AI designed for biopharma and medical research, noah-rn possesses the autonomy to design task plans, execute parallel searches across PubMed and FDA databases, parse complex clinical trial readouts, and synthesize real-world efficacy data into deliver-ready outputs.5 Deploying a Level 4 autonomous agent into a health system possessing only Level 2 governance maturity invites catastrophic risk.4

The following tables represent the data architecture of a pre-rollout Executive Dashboard, providing the IT Governance Committee with the empirical data required to authorize or halt the noah-rn deployment.

### **Module 1: HAIRA v2 Organizational Readiness Index**

This module provides a real-time assessment of the organization's governance maturity across the seven HAIRA domains. By applying the minimum-domain calculation, the dashboard instantly highlights the structural deficiencies that must be remediated prior to introducing an autonomous agent.

| HAIRA Governance Domain | Current Score (1-5) | Target Score for noah-rn | Remediation Status |
| :---- | :---- | :---- | :---- |
| 1\. Organizational Structure | 4.2 | 3.0 | Sufficient |
| 2\. Problem Formulation | 3.8 | 3.0 | Sufficient |
| 3\. Algorithm Dev & Training | 3.5 | 4.0 | **Critical Vulnerability** |
| 4\. External Product Evaluation | 3.0 | 3.0 | Sufficient |
| 5\. Model Evaluation & Validation | 2.8 | 4.0 | **Critical Vulnerability** |
| 6\. Deployment & Integration | 4.0 | 3.0 | Sufficient |
| 7\. Monitoring & Maintenance | 2.5 | 4.0 | **Critical Vulnerability** |
| **Overall HAIRA Maturity Level** | **2.5 (Level 2\)** | **Level 4** | **DEPLOYMENT BLOCKED** |

*Strategic Interpretation:* The dashboard immediately reveals a governance mismatch. While the health system excels in organizational structure and deployment strategy, it severely lacks the necessary empirical validation (Domain 5\) and continuous monitoring capabilities (Domain 7\) required to oversee an autonomous research agent. Based on the minimum-domain rule, the overall maturity is locked at Level 2, and the deployment of noah-rn is hard-blocked until telemetry and robust validation pipelines are institutionalized.

### **Module 2: Infrastructure-as-Code (IaC) Policy Compliance Matrix**

This module interfaces directly with the HCP Terraform API, reporting on the enforcement status of the automated infrastructure policies across the cloud environment.

| Infrastructure Policy Rule | Framework | Enforcement Level | Current Compliance | Action Required |
| :---- | :---- | :---- | :---- | :---- |
| require-langfuse-tracing | Sentinel | Hard-Mandatory | 100% (Passed) | None |
| enforce-canary-deployment | Sentinel | Hard-Mandatory | 100% (Passed) | None |
| restrict-public-s3-access | OPA | Hard-Mandatory | 100% (Passed) | None |
| verify-hipaa-vpc-boundaries | Sentinel | Soft-Mandatory | 85% (3 Overrides) | Audit manual overrides |
| enforce-model-card-metadata | Sentinel | Advisory | 40% (Warning) | Escalate to Mandatory |

*Strategic Interpretation:* The strict engineering controls designed to mitigate blast radius (canary routing) and enforce visibility (tracing) are successfully codified, operating flawlessly to prevent non-compliant infrastructure from being built. However, the enforce-model-card-metadata policy, currently set as merely advisory, is being routinely bypassed by development teams. To achieve the Level 4 maturity required for the noah-rn deployment, the governance committee must utilize HCP Terraform to elevate this policy to a mandatory enforcement level.

### **Module 3: Pre-Deployment Observability Sandbox (noah-rn Canary Metrics)**

Because the enforce-canary-deployment policy restricts the noah-rn agent to processing a maximum of 10% of clinical research queries, the governance committee possesses a secure sandbox. This module surfaces the real-time telemetry captured by the mandated Langfuse integration from that canary traffic.

| Telemetry Metric | Real-Time Observation (Canary) | Safety Threshold / Baseline | Operational Status |
| :---- | :---- | :---- | :---- |
| **P95 Latency (End-to-End)** | 8.4 seconds | \< 10.0 seconds | Nominal |
| **Token Cost per Query** | $0.042 | \< $0.050 | Nominal |
| **Hallucination / Faithfulness Score** | 99.1% | \> 98.0% | Nominal |
| **Unresolved Tool Call Failures** | 0.4% | \< 1.0% | Nominal |
| **Clinical Override Rate** | 12.5% | N/A (Baseline Phase) | **Investigation Required** |

*Strategic Interpretation:* The Langfuse telemetry indicates that the noah-rn agent is performing well within the established operational, financial, and computational safety boundaries during its canary phase. However, the "Clinical Override Rate" of 12.5% provides a vital empirical feedback loop. Before authorizing the escalation of canary traffic from 10% to 50%, the clinical champions must utilize the Langfuse dashboard to isolate the specific trace interactions that triggered those overrides, determining why the human practitioners rejected the agent's logic.11

## **The Future of Embedded Clinical Governance**

The transition toward Agentic AI in 2026 demands that healthcare organizations discard the illusion that static policies equate to operational control. The synthesis of the HAIRA v2 maturity model with programmatic Infrastructure-as-Code enforcement represents the definitive maturation of digital health governance. By shifting governance "left" directly into the CI/CD pipeline and the cloud infrastructure layer, health systems fundamentally eliminate the systemic vulnerabilities inherent in manual, compliance-driven oversight.13

The implementation of robust, hierarchical tracing platforms bridges the historical divide between IT infrastructure metrics and clinical efficacy, transforming AI governance from a theoretical administrative exercise into a rigorous, empirical discipline.6 The automated orchestration of shadow deployments, precise canary weighting, and deep token-level tracing ensures that when advanced autonomous systems like the noah-rn assistant are eventually granted enterprise-wide access, they function not as opaque, high-risk software experiments, but as verifiable, deeply governed, and trusted clinical collaborators.1

#### **Works cited**

1. AI in Pharma 2026 Projections, Agentic Innovation, and Industry Transformation \- YouTube, accessed March 30, 2026, [https://www.youtube.com/watch?v=TMuLvSDES6A](https://www.youtube.com/watch?v=TMuLvSDES6A)  
2. How AI Agents and Tech Will Transform Health Care in 2026 \- Boston Consulting Group, accessed March 30, 2026, [https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care](https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care)  
3. Why Digital Maturity Is Essential for Health Systems in 2026 \- Modea, accessed March 30, 2026, [https://www.modea.com/insights/the-great-pivot-digital-maturity-becomes-essential-for-health-systems-in-2026/](https://www.modea.com/insights/the-great-pivot-digital-maturity-becomes-essential-for-health-systems-in-2026/)  
4. AI in 2026: Predictions Mapped to the Agentic AI Maturity Model | by Ali Arsanjani \- Medium, accessed March 30, 2026, [https://dr-arsanjani.medium.com/ai-in-2026-predictions-mapped-to-the-agentic-ai-maturity-model-c6f851a40ef5](https://dr-arsanjani.medium.com/ai-in-2026-predictions-mapped-to-the-agentic-ai-maturity-model-c6f851a40ef5)  
5. Noah | AI Agent for Life-Science Professionals, accessed March 30, 2026, [https://www.noah.bio/](https://www.noah.bio/)  
6. Policy Is Not a Control. ARISE™ fixes it. | Assessed Intelligence, accessed March 30, 2026, [https://assessedintelligence.com/policy-is-not-a-control-arise-fixes-it/](https://assessedintelligence.com/policy-is-not-a-control-arise-fixes-it/)  
7. Translating AI Ethics into Hospital Operations: A PPTO Framework for Evidence-Based Governance \- Scirp.org., accessed March 30, 2026, [https://www.scirp.org/journal/paperinformation?paperid=149967](https://www.scirp.org/journal/paperinformation?paperid=149967)  
8. Advancing healthcare AI governance through a comprehensive maturity model based on systematic review \- PubMed, accessed March 30, 2026, [https://pubmed.ncbi.nlm.nih.gov/41673321/](https://pubmed.ncbi.nlm.nih.gov/41673321/)  
9. Establishing organizational AI governance in healthcare: a case study in Canada \- PMC, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12356831/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12356831/)  
10. Advancing Healthcare AI Governance: A Comprehensive Maturity Model Based on Systematic Review \- R Discovery, accessed March 30, 2026, [https://discovery.researcher.life/article/advancing-healthcare-ai-governance-a-comprehensive-maturity-model-based-on-systematic-review/ea4381c8f6db3b509eb820d5c1358eff](https://discovery.researcher.life/article/advancing-healthcare-ai-governance-a-comprehensive-maturity-model-based-on-systematic-review/ea4381c8f6db3b509eb820d5c1358eff)  
11. Advancing Healthcare AI Governance: A Comprehensive Maturity Model Based on Systematic Review \- ResearchGate, accessed March 30, 2026, [https://www.researchgate.net/publication/387578225\_Advancing\_Healthcare\_AI\_Governance\_A\_Comprehensive\_Maturity\_Model\_Based\_on\_Systematic\_Review](https://www.researchgate.net/publication/387578225_Advancing_Healthcare_AI_Governance_A_Comprehensive_Maturity_Model_Based_on_Systematic_Review)  
12. AI Governance Maturity Model: Assess, Benchmark, and Advance Your AI \- Agility at Scale, accessed March 30, 2026, [https://agility-at-scale.com/ai/governance/ai-governance-maturity-model/](https://agility-at-scale.com/ai/governance/ai-governance-maturity-model/)  
13. AI Governance with Terraform: Enforcing Control at the Infrastructure Layer \- Hoop.dev, accessed March 30, 2026, [https://hoop.dev/blog/ai-governance-with-terraform-enforcing-control-at-the-infrastructure-layer/](https://hoop.dev/blog/ai-governance-with-terraform-enforcing-control-at-the-infrastructure-layer/)  
14. The AI Operating Model: From Pilot Success to Enterprise Capability \- thinkingML, accessed March 30, 2026, [https://thinkingml.com/blogs/blog-prod-operating-model](https://thinkingml.com/blogs/blog-prod-operating-model)  
15. AI Application Operations \- A Socio-Technical Framework for Data-driven Organizations \- AI Sweden, accessed March 30, 2026, [https://www.ai.se/sites/default/files/2025-12/AI%20Application%20Operations%20-%20A%20Socio-Technical%20Framework%20for%20Data-driven%20Organizations%20-%20251215.pdf](https://www.ai.se/sites/default/files/2025-12/AI%20Application%20Operations%20-%20A%20Socio-Technical%20Framework%20for%20Data-driven%20Organizations%20-%20251215.pdf)  
16. Course: AI-Driven Business Transformation; Strategies and Frameworks, accessed March 30, 2026, [https://academy.theartofservice.com/course/view.php?id=1503\&guest=true](https://academy.theartofservice.com/course/view.php?id=1503&guest=true)  
17. LLM Operations \- ManaGen AI, accessed March 30, 2026, [https://www.managen.ai/Understanding/building\_applications/back\_end/llm\_ops/index.html](https://www.managen.ai/Understanding/building_applications/back_end/llm_ops/index.html)  
18. AI Deployment in Healthcare: Why Most Prototypes Fail \- The Public Health AI Handbook, accessed March 30, 2026, [https://publichealthaihandbook.com/implementation/deployment.html](https://publichealthaihandbook.com/implementation/deployment.html)  
19. Advancing Healthcare AI Governance: A Comprehensive Maturity Model Based on Systematic Review | medRxiv, accessed March 30, 2026, [https://www.medrxiv.org/content/10.1101/2024.12.30.24319785v1.full-text](https://www.medrxiv.org/content/10.1101/2024.12.30.24319785v1.full-text)  
20. Ethics, Bias, and Equity in Healthcare AI \- The Public Health AI Handbook, accessed March 30, 2026, [https://publichealthaihandbook.com/implementation/ethics.html](https://publichealthaihandbook.com/implementation/ethics.html)  
21. A.I.'s impact on nursing and health care | National Nurses United, accessed March 30, 2026, [https://www.nationalnursesunited.org/artificial-intelligence](https://www.nationalnursesunited.org/artificial-intelligence)  
22. Managing artificial intelligence applications in healthcare: Promoting information processing among stakeholders | Request PDF \- ResearchGate, accessed March 30, 2026, [https://www.researchgate.net/publication/376478206\_Managing\_artificial\_intelligence\_applications\_in\_healthcare\_Promoting\_information\_processing\_among\_stakeholders](https://www.researchgate.net/publication/376478206_Managing_artificial_intelligence_applications_in_healthcare_Promoting_information_processing_among_stakeholders)  
23. The Accuracy of AI in Healthcare: A Statistical Breakdown | 7T, accessed March 30, 2026, [https://7t.ai/blog/accuracy-of-ai-in-healthcare-7tt/](https://7t.ai/blog/accuracy-of-ai-in-healthcare-7tt/)  
24. AI Policy and Governance in Healthcare \- The Public Health AI Handbook, accessed March 30, 2026, [https://publichealthaihandbook.com/future/policy.html](https://publichealthaihandbook.com/future/policy.html)  
25. Standardized Threat Taxonomy for AI Security, Governance, and Regulatory Compliance, accessed March 30, 2026, [https://www.researchgate.net/publication/397906127\_Standardized\_Threat\_Taxonomy\_for\_AI\_Security\_Governance\_and\_Regulatory\_Compliance](https://www.researchgate.net/publication/397906127_Standardized_Threat_Taxonomy_for_AI_Security_Governance_and_Regulatory_Compliance)  
26. How to Implement Canary Deployments with Terraform CI/CD \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-02-23-how-to-implement-canary-deployments-with-terraform-cicd/view](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-canary-deployments-with-terraform-cicd/view)  
27. Observability for LLM Applications: Meet Langfuse | by Jay Kim | Medium, accessed March 30, 2026, [https://medium.com/@bravekjh/observability-for-llm-applications-meet-langfuse-17d2cb6f2125](https://medium.com/@bravekjh/observability-for-llm-applications-meet-langfuse-17d2cb6f2125)  
28. Top 8 LLM Observability Tools: Complete Guide for 2025 \- LangWatch, accessed March 30, 2026, [https://langwatch.ai/blog/top-10-llm-observability-tools-complete-guide-for-2025](https://langwatch.ai/blog/top-10-llm-observability-tools-complete-guide-for-2025)  
29. Amazon Bedrock AgentCore Observability with Langfuse | Artificial Intelligence \- AWS, accessed March 30, 2026, [https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-observability-with-langfuse/](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-observability-with-langfuse/)  
30. Terraform Your AWS AgentCore \- DEV Community, accessed March 30, 2026, [https://dev.to/aws-builders/terraform-your-aws-agentcore-11kl](https://dev.to/aws-builders/terraform-your-aws-agentcore-11kl)  
31. AI\_Security\_Framework (1) | PDF | Information Technology Management \- Scribd, accessed March 30, 2026, [https://www.scribd.com/document/1012492688/AI-Security-Framework-1](https://www.scribd.com/document/1012492688/AI-Security-Framework-1)  
32. Terraform Policy Enforcement: A Practical Guide to Sentinel and OPA | by Ting Li | Medium, accessed March 30, 2026, [https://tingli666.medium.com/terraform-policy-enforcement-a-practical-guide-to-sentinel-and-opa-3407d496bc83](https://tingli666.medium.com/terraform-policy-enforcement-a-practical-guide-to-sentinel-and-opa-3407d496bc83)  
33. Write a Sentinel policy for a Terraform deployment \- HashiCorp Developer, accessed March 30, 2026, [https://developer.hashicorp.com/terraform/tutorials/policy/sentinel-policy](https://developer.hashicorp.com/terraform/tutorials/policy/sentinel-policy)  
34. How to Create Terraform Sentinel Policies \- OneUptime, accessed March 30, 2026, [https://oneuptime.com/blog/post/2026-01-30-terraform-sentinel-policies/view](https://oneuptime.com/blog/post/2026-01-30-terraform-sentinel-policies/view)  
35. HCP Terraform policy enforcement overview \- HashiCorp Developer, accessed March 30, 2026, [https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement)  
36. GitHub \- langfuse/langfuse: Open source LLM engineering platform: LLM Observability, metrics, evals, prompt management, playground, datasets. Integrates with OpenTelemetry, Langchain, OpenAI SDK, LiteLLM, and more. YC W23, accessed March 30, 2026, [https://github.com/langfuse/langfuse](https://github.com/langfuse/langfuse)  
37. Data & AI Technology Radar \- Unit8, accessed March 30, 2026, [https://radar.unit8.com/](https://radar.unit8.com/)  
38. Self-host Langfuse (Open Source LLM Observability), accessed March 30, 2026, [https://langfuse.com/self-hosting](https://langfuse.com/self-hosting)  
39. Langfuse Redis Primary Pod Terminated Due to AOF fsync Delays \#11977 \- GitHub, accessed March 30, 2026, [https://github.com/orgs/langfuse/discussions/11977](https://github.com/orgs/langfuse/discussions/11977)  
40. LangFuse Tutorial: LLM Engineering Platform For Monitoring And Evals \- DataCamp, accessed March 30, 2026, [https://www.datacamp.com/tutorial/langfuse](https://www.datacamp.com/tutorial/langfuse)  
41. Noah AI Tutorial: Mastering Your AI-Powered Biopharma & Medical Research Assistant, accessed March 30, 2026, [https://www.noah.bio/blog/tutorial](https://www.noah.bio/blog/tutorial)  
42. Mastering Policy-as-Code with Terraform Sentinel: A Guide for Cloud Security and Compliance | by Aurion Howard | Medium, accessed March 30, 2026, [https://medium.com/@aurionhoward/mastering-policy-as-code-with-terraform-sentinel-a-guide-for-cloud-security-and-compliance-00370d655cf0](https://medium.com/@aurionhoward/mastering-policy-as-code-with-terraform-sentinel-a-guide-for-cloud-security-and-compliance-00370d655cf0)  
43. 2026 Healthcare Predictions: AI, Blockchain, and the Rise of Decentralized Innovation, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12860439/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12860439/)
