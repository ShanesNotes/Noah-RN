# **Architecture and Design of a Living Guideline Diff Engine for Clinical Knowledge Lifecycle Management**

## **1\. Architectural Paradigm for Continuous Clinical Knowledge Integration**

The exponential proliferation of biomedical literature and the rapid cadence of clinical discoveries have fundamentally challenged the efficacy of static, monolithic Clinical Practice Guidelines (CPGs). Traditional guidelines often suffer from temporal degradation, wherein novel pharmaceutical safety alerts or updated therapeutic efficacy data render existing recommendations obsolete before a formal revision cycle concludes. To address this structural latency, the transition toward a computable, continuously updated knowledge architecture is imperative. The system proposed herein—designated the Living Guideline Diff Engine—serves as the foundational orchestration layer for a production-grade clinical knowledge lifecycle management system. It transitions healthcare data ecosystems from retrospective, document-centric paradigms to proactive, computationally interpretable knowledge graphs.

The core operational objective of the Living Guideline Diff Engine is to autonomously ingest, extract, validate, and distribute clinical knowledge artifacts. The system is engineered to monitor authoritative issuing bodies, specifically the National Comprehensive Cancer Network (NCCN), the American Heart Association (AHA), the U.S. Preventive Services Task Force (USPSTF), and the National Institute for Health and Care Excellence (NICE), synchronizing with their distinct release cadences.1 Upon the detection of an update, the orchestration layer triggers an advanced extraction pipeline. This pipeline uniquely integrates the open-source llm\_extractinator framework with the MedKGent Large Language Model (LLM) agent framework to systematically convert unstructured clinical narratives into structured Clinical Quality Language (CQL) logic and temporally aware, evidence-graded relational triples.4

Recognizing that heterogeneous clinical guidelines frequently present divergent or directly contradictory recommendations for overlapping patient cohorts, the extraction phase is inextricably linked to a rigorous semantic validation tier. The engine formalizes the extracted clinical logic into Abstract Syntax Trees (ASTs) and routes them through a Z3 Satisfiability Modulo Theories (SMT) solver to execute deterministic conflict detection.6 When logical contradictions are identified, a multi-agent LLM debate protocol is instantiated to negotiate a semantic reconciliation based on evidence grading, source authority, and temporal relevance. Following reconciliation, the unified clinical logic is mapped to the Fast Healthcare Interoperability Resources (FHIR) standard, automatically generating computable CPG-on-FHIR artifacts, including PlanDefinition, ActivityDefinition, and Library resources.8

The terminal phase of the lifecycle pushes these computable artifacts and their underlying semantic triples as delta updates into a highly optimized, versioned persistence layer comprising a Neo4j property graph and a PostgreSQL pgvector database.10 This dual-storage architecture is purpose-built to support downstream publish-subscribe (pub/sub) consumers, specifically powering a Phase 2 MEGA-RAG (Retrieval-Augmented Generation) deployment and a Phase 3 pre-computation cache. Through this end-to-end architecture, the Living Guideline Diff Engine ensures that clinical decision support (CDS) systems maintain absolute fidelity to the most current, non-contradictory evidence available, strictly enforcing a maximum four-hour latency Service Level Agreement (SLA) for critical drug safety alerts.

### **System Architecture Diagram**

Code snippet

graph TD  
    subgraph Ingestion Layer  
        A1\[NCCN API & Flash Updates\] \--\>|Webhooks/JSON| B  
        A2 \--\>|RSS/XML| B  
        A3 \--\>|REST/JSON| B  
        A4 \--\>|RSS/Email| B  
    end

    subgraph Orchestration & SLA Layer  
        B  
        B \--\>|Event: Safety Alert| C1{Timer: 4h SLA}  
        B \--\>|Event: Standard Update| C2{Timer: Routine}  
    end

    subgraph Extraction Layer  
        D1\[llm\_extractinator Pipeline\]  
        D2\[MedKGent Extractor Agent\]  
        C1 \--\> D1  
        C1 \--\> D2  
        C2 \--\> D1  
        C2 \--\> D2  
        D1 \--\>|CQL Logic Extraction| E  
        D2 \--\>|Relational Triples \+ Confidence| E  
    end

    subgraph Validation & Conflict Resolution  
        E \--\> F1  
        F1 \--\>|Conflict Detected| F2  
        F1 \--\>|No Conflict| G  
        F2 \--\>|Resolved Logic| G  
    end

    subgraph Transformation Layer  
        G  
        G \--\>|PlanDefinition, Library, ActivityDefinition| H  
    end

    subgraph Versioned Storage Layer  
        H \--\> I1  
        H \--\> I2  
        I1 \--\>|Event: Graph Delta| J\[Liquigraph Versioning\]  
    end

    subgraph Downstream Consumers  
        J \-.-\> K1  
        I2 \-.-\> K1  
        J \-.-\> K2\[Phase 3 Pre-computation Cache\]  
    end

## **2\. Multi-Modal Ingestion and Cadence Synchronization**

The foundational prerequisite for a responsive clinical knowledge system is the capacity to capture updates at the exact moment of their promulgation. Clinical issuing bodies utilize highly heterogeneous notification mechanisms, payload structures, and publication cadences, necessitating a modular, protocol-agnostic ingestion layer capable of normalizing inputs before they reach the extraction pipeline.

The National Comprehensive Cancer Network (NCCN) operates a dynamic update model, issuing continuous revisions to its algorithms, biomarker compendia, and chemotherapy order templates.1 The engine interfaces with the NCCN ecosystem through a dual-channel approach. First, it subscribes to NCCN Flash Updates, which provide automated email and webhook notifications detailing the publication of updated guidelines from the preceding day.13 Upon receipt of a Flash Update webhook indicating a modification, the ingestion worker authenticates against the NCCN Developer API utilizing a designated AccessKey over an IP-secured connection.1 The system specifically targets endpoints to retrieve the comprehensive XML and JSON representations of the updated guidelines, ensuring all data fields viewable on the NCCN web interface are ingested digitally.1 Because NCCN strictly embargoes its content prior to public release, the ingestion layer is designed to execute immediate integration upon the removal of the embargo to minimize the latency between publication and CDS availability.14

The American Heart Association (AHA) presents a different ingestion paradigm. While major comprehensive updates to Cardiopulmonary Resuscitation (CPR) and Emergency Cardiovascular Care (ECC) guidelines are released on a multi-year cadence (e.g., the 2020 and 2025 updates), critical interim updates and drug safety advisories are published continuously.15 To capture these, the ingestion layer monitors the AHA Newsroom RSS feeds for structural policy shifts.17 Furthermore, to accommodate real-time cardiovascular safety alerts and operational changes, the system parses incoming data from emergency dispatch notification platforms, including the PulsePoint API, which tracks high-acuity out-of-hospital cardiac arrest (OHCA) protocols and automated external defibrillator (AED) integration directives.18

The U.S. Preventive Services Task Force (USPSTF) follows a rigorous, multistep recommendation development process, transitioning from draft research plans to final recommendation statements published in peer-reviewed journals.20 The Diff Engine monitors the USPSTF Prevention TaskForce REST API, which returns structured JSON payloads encapsulating screening, counseling, and preventive medication services indexed by specific patient characteristics such as age, sex, and behavioral risk factors.2 The system utilizes RSS subscriptions to trigger targeted API polling immediately upon the release of a finalized "A" or "B" grade recommendation, ensuring that critical preventive measures, such as updated thresholds for statin utilization or novel drug screening protocols, are instantly ingested.21

For the National Institute for Health and Care Excellence (NICE), the ingestion layer prioritizes the capture of safety-critical medication data. NICE and the Medicines and Healthcare products Regulatory Agency (MHRA) utilize the Central Alerting System (CAS) to broadcast National Patient Safety Alerts.3 These alerts are issued exclusively for safety-critical issues carrying a risk of death or severe disability and contain explicit, time-sensitive actions for healthcare organizations.3 The system subscribes to the CAS RSS feeds and parses the alert payloads, extracting the alert number, product description, and clinical problem description to initiate emergency extraction workflows.3

The following table details the specific ingestion modalities and their corresponding operational characteristics:

| Issuing Body | Primary Ingestion Modality | Data Format | Cadence Type | Primary Content Target |
| :---- | :---- | :---- | :---- | :---- |
| NCCN | Developer API & Flash Webhooks | XML / JSON | Continuous | Oncology Guidelines, Biomarkers, Chemotherapy Templates |
| AHA | RSS Feeds & PulsePoint API | XML / JSON | Episodic & Continuous | ECC Protocols, Cardiovascular Drug Safety |
| USPSTF | Prevention TaskForce REST API | JSON | Episodic | Preventive Screening, Risk-reducing Medications |
| NICE / MHRA | CAS RSS & Safety Email Alerts | XML / Text | Continuous | National Patient Safety Alerts, Medication Contraindications |

## **3\. Temporal Workflow Orchestration and SLA Enforcement**

Given the disparities in urgency between routine guideline updates and critical medication safety alerts, the orchestration layer must manage stateful, fault-tolerant execution while strictly enforcing temporal deadlines. The architecture leverages Temporal.io (which can operate beneath a LangGraph coordination abstraction) to coordinate the distributed microservices comprising the extraction, validation, and transformation phases. Temporal's event-driven architecture is ideally suited for this environment due to its native support for durable timers, asynchronous activity retries, and programmatic Service Level Agreement (SLA) escalation mechanisms.

The paramount operational mandate of the Living Guideline Diff Engine is the rapid propagation of critical safety information. When the ingestion layer detects a National Patient Safety Alert from NICE, an FDA-aligned cybersecurity or drug alert affecting AHA guidelines, or an urgent OHCA protocol shift, the payload is tagged with a DRUG\_SAFETY classification.3 This classification subjects the entire downstream processing pipeline to a rigorous freshness SLA of ![][image1] hours. Routine updates, such as the annual publication of an NCCN oncology pathway, are processed under a standard 7-day SLA to allow for extensive background computation and pre-caching.24

Temporal achieves this through the use of deterministic workflow definitions. The orchestration engine dynamically allocates timeouts and retry policies based on the payload classification. If the extraction, validation, or FHIR generation activities fail to yield a successful commit to the Neo4j/pgvector store within the 4-hour window, the workflow engine automatically intercepts the TimeoutError and triggers an out-of-band escalation sequence, routing the raw alert directly to human-in-the-loop (HITL) clinical informaticists via integrated paging systems.

The following Temporal workflow skeleton illustrates the programmatic enforcement of these execution boundaries:

Python

from datetime import timedelta  
from temporalio import workflow  
from temporalio.common import RetryPolicy  
from temporalio.exceptions import ApplicationError

\# Define aggressive retry policies for critical safety tasks to ensure resilience  
CRITICAL\_RETRY \= RetryPolicy(  
    initial\_interval=timedelta(seconds=10),  
    backoff\_coefficient=2.0,  
    maximum\_interval=timedelta(minutes=1),  
    maximum\_attempts=10  
)

@workflow.defn  
class LivingGuidelineUpdateWorkflow:  
    @workflow.run  
    async def process\_update(self, payload: dict) \-\> dict:  
        \# Determine the urgency based on the ingestion metadata  
        is\_critical\_safety\_alert \= payload.get("alert\_type") \== "DRUG\_SAFETY"  
        sla\_timeout \= timedelta(hours=4) if is\_critical\_safety\_alert else timedelta(days=7)  
          
        try:  
            \# Enforce the strict SLA using Temporal's bounded execution timer  
            async with workflow.unsafe.metrics.timer("guideline\_processing\_time"):  
                return await workflow.wait\_condition(  
                    lambda: False,   
                    timeout=sla\_timeout  
                ) or await self.\_execute\_pipeline(payload, is\_critical\_safety\_alert)  
                  
        except workflow.TimeoutError:  
            \# Automatic escalation protocol upon SLA breach  
            await workflow.execute\_activity(  
                "trigger\_pagerduty\_escalation",  
                {"reason": "SLA\_BREACH", "payload": payload},  
                schedule\_to\_close\_timeout=timedelta(minutes=5)  
            )  
            raise ApplicationError("Critical SLA breached for Guideline Processing")

    async def \_execute\_pipeline(self, payload: dict, is\_critical: bool) \-\> dict:  
        \# Stage 1: Extract structured CQL and relational triples  
        extraction\_result \= await workflow.execute\_activity(  
            "extract\_knowledge\_llm\_medkgent",  
            payload,  
            start\_to\_close\_timeout=timedelta(minutes=45),  
            retry\_policy=CRITICAL\_RETRY if is\_critical else None  
        )  
          
        \# Stage 2: SMT conflict detection via Z3  
        conflict\_result \= await workflow.execute\_activity(  
            "detect\_conflicts\_z3",  
            extraction\_result,  
            start\_to\_close\_timeout=timedelta(minutes=20)  
        )  
          
        \# Stage 3: Multi-Agent Debate for semantic reconciliation (conditional)  
        if conflict\_result.get("has\_conflicts"):  
            reconciled\_result \= await workflow.execute\_activity(  
                "agent\_debate\_resolution",  
                conflict\_result,  
                start\_to\_close\_timeout=timedelta(minutes=60)  
            )  
        else:  
            reconciled\_result \= conflict\_result

        \# Stage 4: Generate computable CPG-on-FHIR resources  
        fhir\_resources \= await workflow.execute\_activity(  
            "generate\_cpg\_fhir\_artifacts",  
            reconciled\_result,  
            start\_to\_close\_timeout=timedelta(minutes=15)  
        )

        \# Stage 5: Push delta updates to versioned Neo4j \+ pgvector stores  
        await workflow.execute\_activity(  
            "push\_to\_graph\_and\_vector\_stores",  
            fhir\_resources,  
            start\_to\_close\_timeout=timedelta(minutes=10)  
        )  
          
        return {"status": "SUCCESS", "resources\_generated": len(fhir\_resources)}

## **4\. Structured Knowledge Extraction via llm\_extractinator and MedKGent**

The transformation of dense, unstructured clinical text into computable logic necessitates an extraction pipeline that is both highly accurate and verifiable. This architecture utilizes a composite approach, combining the llm\_extractinator framework for rigorous schema validation with the MedKGent agent framework for the extraction of temporally evolving relational triples.4

### **Schema-Driven Extraction with llm\_extractinator**

The llm\_extractinator framework is an open-source, highly scalable tool designed specifically for automating information extraction from clinical texts.4 By relying on local LLM deployment through Ollama, the framework circumvents the data privacy and compliance constraints associated with transmitting sensitive, embargoed medical data to external commercial APIs.25 The framework operates through four modular stages: task specification via JSON Taskfiles, dynamic prompt construction utilizing LangChain, resource-efficient model inference with context-length scaling, and rigorous post-processing.4

For this production environment, the engine leverages sophisticated open-weight generative models. Empirical evaluations on the DRAGON benchmark—a comprehensive clinical natural language processing suite covering 28 distinct extraction tasks—demonstrate that 14-billion parameter models, such as Qwen-2.5-14B and Phi-4-14B, perform competitively in zero-shot settings, matching or exceeding fine-tuned specialized models in structured reasoning and regression tasks.4 Higher-parameter models like Llama-3.3-70B are dynamically engaged for highly complex extraction topologies requiring deep semantic inference.25

Crucially, the post-processing layer of the llm\_extractinator enforces structured JavaScript Object Notation (JSON) generation by validating the LLM output against strict Pydantic schemas.4 If an output deviates from the defined schema, the framework initiates up to three autonomous self-correction cycles, feeding the model its previous response alongside a precise list of schema violations, thereby ensuring pipeline continuity and data integrity.4

### **Triple Extraction and Confidence Estimation via MedKGent**

Concurrently, the MedKGent Extractor Agent parses the clinical text to identify and extract evidence-graded relational triples. This agent utilizes PubTator3 to detect and normalize biomedical entities—such as genes, diseases, chemicals, and variants—assigning standardized identifiers to resolve synonyms and facilitate downstream entity disambiguation.5

To counter the stochastic nature of LLMs and mitigate the risk of clinical hallucinations, the Extractor Agent employs a robust sampling-based confidence estimation strategy rooted in the principle of self-consistency.26 For each parsed clinical rule or abstract, the agent executes ![][image2] parallel inferences utilizing an elevated temperature coefficient (![][image3]) to foster prediction diversity.26 The frequency of each generated triple across these parallel runs is computed, and an initial confidence score ![][image4] is established by discretizing the frequency to the nearest lower ![][image5] increment.5

For example, if a triple mapping *Aspirin* to *Cardiovascular Disease* with the relation *PREVENTS* appears in 46 out of 50 runs (![][image6]), the score is truncated to ![][image7]. Triples failing to achieve a minimum confidence threshold of ![][image8] are systematically discarded.5 Retained triples are subsequently enriched with contextual metadata, including the source URL, publication timestamp, and exact phrase grounding, ensuring absolute traceability.5

### **Prompt Templates for Extraction and Validation**

The efficacy of both frameworks is predicated on the precision of the LLM prompt structures. The following templates delineate the exact instructions utilized to extract the requisite CQL logic and relational triples, followed by the self-correction protocol.

**Prompt Template: Zero-Shot Chain-of-Thought Extraction Phase**

JSON

{  
  "system\_instruction": "You are an expert clinical knowledge engineer specializing in Clinical Quality Language (CQL) and medical ontology mapping. Your objective is to extract computable clinical logic and relational triples from the provided clinical guideline text. Do not paraphrase entities; use the exact terminology present in the source text. Execute a zero-shot chain-of-thought reasoning process to deduce the clinical intent before outputting the final JSON.",  
  "input\_text": "{{ document\_text }}",  
  "output\_schema\_requirements": {  
    "reasoning": "A step-by-step logical deduction detailing how the patient cohort, intervention, and evidence grade were derived from the text.",  
    "cql\_elements": {  
      "population\_criteria": "The exact patient cohort expressed as logical predicates (e.g., 'Patient.Age \>= 50 AND Has\_Condition(Hypertension)').",  
      "intervention": "The specific recommended clinical action, procedure, or medication dosage.",  
      "evidence\_quality": "The grade or quality of the evidence (e.g., 'Level A', 'Category 1', 'Moderate Certainty').",  
      "recommendation\_strength": "The strength of the recommendation (e.g., 'Strong', 'Weak', 'Conditional')."  
    },  
    "relational\_triples":  
  },  
  "few\_shot\_example": {  
    "text": "For adults aged 40 to 59 years with a 10-year CVD risk of 10% or greater, the USPSTF recommends initiating low-dose aspirin use for the primary prevention of CVD.",  
    "extraction": {  
      "reasoning": "The text defines a population of adults aged 40-59 with a specific 10-year CVD risk metric. The intervention is the initiation of low-dose aspirin. The clinical goal is primary prevention.",  
      "cql\_elements": {  
        "population\_criteria": "Patient.Age \>= 40 AND Patient.Age \<= 59 AND Patient.CVDRisk\_10Year \>= 10",  
        "intervention": "Prescribe(Medication: 'Aspirin', Dose: 'Low')",  
        "evidence\_quality": "Grade C",  
        "recommendation\_strength": "Conditional"  
      },  
      "relational\_triples":  
    }  
  }  
}

**Prompt Template: Pydantic Validation and Self-Correction Cycle**

JSON

{  
  "system\_instruction": "You are an automated validation auditor for a clinical extraction pipeline. The previous LLM generation failed programmatic Pydantic schema validation. Review the error log carefully, identify the specific formatting or logical breach, and correct the JSON structure to strictly adhere to the requirements without altering the underlying clinical intent.",  
  "original\_input\_text": "{{ document\_text }}",  
  "failed\_json\_output": "{{ previous\_llm\_output }}",  
  "schema\_violations": "{{ pydantic\_error\_trace }}",  
  "correction\_directive": "Regenerate the JSON payload. Ensure all data types explicitly match the schema (e.g., integers are not strings). If a specific entity or evidence grade cannot be reliably mapped, return 'null' rather than hallucinating a category or violating the schema bounds."  
}

## **5\. Inter-Guideline Conflict Detection and Semantic Reconciliation**

The synthesis of medical knowledge is inherently fraught with contradictions. Differing regulatory bodies routinely issue conflicting guidance due to varying interpretations of clinical trials, disparate regional mandates, or the temporal lag between publications. For instance, an established AHA therapeutic pathway endorsing a specific medication might be suddenly contradicted by an MHRA or FDA safety alert identifying severe adverse events.3 To safeguard downstream clinical applications, the Diff Engine treats extracted clinical logic as formal mathematical propositions, deploying computational theorem proving to identify conflicts prior to database integration.

### **Logic Encoding and Z3 SMT Solving**

Upon extraction, the cql\_elements and relational\_triples are deterministically mapped into Abstract Syntax Trees (ASTs). These ASTs translate the complex clinical conditions—such as overlapping age brackets, biomarker thresholds, and contraindications—into first-order logic formulas. These formulas are subsequently evaluated by the Z3 theorem prover, an advanced SMT solver.6

The Z3 solver operates utilizing a Conflict-Driven Clause Learning (CDCL) loop augmented with Theory reasoning, a paradigm known as CDCL(T).6 The SMT solver maintains a set of formulas ![][image9] (representing the existing knowledge base) and a partial assignment to literals ![][image10] (representing the incoming guideline logic). The solver evaluates the state ![][image11]. If the Theory engine determines that a subset of assertions is inconsistent relative to the existing graph—for example, if Guideline A asserts Prescribe(Drug\_X) | Condition\_Y while an incoming Alert B asserts Contraindicated(Drug\_X) | Condition\_Y—it isolates the contradiction.6

The solver then generates a conflict clause ![][image12] that highlights the exact locus of the logical intersection. By modeling clinical guideline harmonization as a Boolean Satisfiability (SAT) problem, the Z3 solver guarantees the detection of explicit logical fallacies and overlapping normative conflicts that rule-based heuristics typically overlook.7

### **Multi-Agent Debate for Semantic Adjudication**

While the SMT solver excels at identifying mathematical and logical contradictions, it cannot unilaterally resolve semantic medical disputes. When the Z3 solver outputs a conflict clause, the workflow triggers the MedKGent Constructor Agent operating within a multi-agent debate framework.5 This framework instantiates three specialized sub-agents with distinct systemic personas:

1. **The Proponent Agent:** Tasked with arguing for the integration of the newly ingested guideline logic. This agent formulates its defense based on the recency of the publication, the statistical superiority of its evidence grade, and the specific authority of the issuing body regarding the condition.  
2. **The Defender Agent:** Tasked with advocating for the preservation of the existing graph logic. This agent analyzes the potential downstream risks of modifying established CDS rules, highlighting historical precedence and the stability of the older recommendation.  
3. **The Adjudicator Agent:** Operates as the synthesis engine. It analyzes the precise conflict clause generated by the Z3 solver alongside the dialectical outputs of the Proponent and Defender agents to execute a resolution policy.

The resolution mechanics are heavily influenced by the ingestion SLA metadata. If the conflict arises from an ingested DRUG\_SAFETY alert (triggering the 4-hour SLA), the Adjudicator Agent applies a hard-coded monotonic precedence policy. Patient safety parameters automatically supersede routine practice guidelines. In such scenarios, the Adjudicator immediately overrides the existing node, applying a Negative\_Correlate, Inhibits, or Contraindicated relation to the targeted therapy.10

Conversely, for routine conflicts arising between equivalent bodies (e.g., NCCN vs. NICE oncology pathways), the Adjudicator evaluates the comparative confidence scores generated during the extraction phase. It synthesizes the resolution by transforming the standard triple into a quadruple, appending the debate context and rationale as a standalone semantic field. This guarantees that when clinicians encounter the finalized recommendation, the underlying ambiguity and the systemic resolution logic are fully transparent and explainable.10

## **6\. Generation of Computable CPG-on-FHIR Resources**

Following extraction and semantic reconciliation, the formalized clinical logic remains abstracted. To be actionable within Electronic Health Record (EHR) systems, this logic must be translated into standardized, interoperable formats. The Diff Engine accomplishes this by automatically generating CPG-on-FHIR (Clinical Practice Guidelines on FHIR) resources, adhering strictly to the HL7 FHIR Clinical Reasoning module specifications.8

A foundational tenet of the CPG-on-FHIR approach is the creation of a singular, faithful computable representation of the narrative guideline.28 The transformation layer maps the reconciled JSON outputs into the corresponding FHIR reasoning layers, creating a suite of interconnected artifacts:

1. **Library Resources:** The Library resource encapsulates the actual evaluated clinical logic.9 The extracted CQL expressions defining patient inclusion, exclusion, and sub-population criteria are embedded natively within this resource. This enables EHR-based CDS hooks to execute the logic directly against continuous streams of patient data.  
2. **ActivityDefinition Resources:** The ActivityDefinition resource specifies the precise clinical intervention. Utilizing the intervention data extracted by the pipeline, the system automatically instantiates definitions that map to distinct clinical activities. The architecture relies on standardized mapping protocols to ensure semantic interoperability across different healthcare environments.  
3. **PlanDefinition Resources:** Serving as the orchestrator, the PlanDefinition resource utilizes the cpg-computableplandefinition profile to string together the sequential clinical scenario.29 It dictates the conditions under which an action should occur by referencing the specific Library and triggering the corresponding ActivityDefinition.

Furthermore, to maintain clinical trust, the engine incorporates Evidence-Based Medicine on FHIR (EBM-on-FHIR) profiles into the generation process. EBM-on-FHIR resources explicitly capture the evidence\_quality (e.g., Level A, Level B) and the recommendation\_strength.9 This integration ensures that downstream clinicians interacting with the CDS prompt can view the precise statistical provenance and task force backing of the automated recommendation.

The following table illustrates the mapping heuristics utilized by the transformation layer to convert extracted clinical activities into formalized FHIR events 9:

| Extracted Clinical Activity | Corresponding CPG-on-FHIR Event | Relevant FHIR Resource |
| :---- | :---- | :---- |
| Order a medication / dosage | CPGMedicationDispense / CPGMedicationAdministration | ActivityDefinition |
| Recommend an immunization | CPGImmunization | ActivityDefinition |
| Order a diagnostic service | CPGProcedure / CPGObservation | ActivityDefinition |
| Propose a diagnosis | CPGCondition | ActivityDefinition |
| Record a safety / detected issue | CPGDetectedIssue | PlanDefinition |
| Collect structured information | CPGQuestionnaireResponse | ActivityDefinition |
| Generate a clinical report | CPGCaseSummary / CPGMetricReport | PlanDefinition |

## **7\. Versioned Delta Persistence and Downstream Subscriptions**

The final stage of the clinical knowledge lifecycle requires persisting the reconciled relational triples, the intermediate reasoning metadata, and the finalized FHIR artifacts into a highly optimized, dual-storage infrastructure. This architecture is designed specifically to support complex, high-throughput downstream consumers, ensuring rapid retrieval and seamless chronological tracking of knowledge evolution.

### **Neo4j Graph Construction and Temporal Reinforcement**

The relational triples extracted and validated by the MedKGent framework are integrated into a Neo4j property graph. The graph schema is rigidly defined by biomedical ontologies (e.g., UMLS, SNOMED CT) dictating entity constraints and relation domains.10

Crucially, the Constructor Agent does not simply overwrite existing edges when new guidelines are ingested. Instead, it employs a mechanism of temporal reinforcement to reflect the continuous accumulation of scientific consensus.10 When a new triple matches the entities and relations of an existing edge, the confidence score of that edge is dynamically updated using a multiplicative enhancement function:

![][image13]  
This algorithmic approach ensures monotonic confidence growth as multiple guidelines converge on a single clinical truth over time.5 Each edge within the Neo4j store is exhaustively annotated with metadata payloads containing evidence provenance, PubMed IDs, guideline URLs, and precise processing timestamps, enabling rigorous auditability.10

### **Liquigraph-Style Versioning and Delta Tracking**

Because clinical guidelines dictate critical therapeutic pathways, tracking the precise historical states of the knowledge graph is a mandatory compliance requirement. The engine utilizes a schema migration approach structurally akin to Liquigraph.30 Changes to the Neo4j graph are recorded as discrete, immutable deltas. When an update deprecates a previous therapy pathway, the existing edges are not deleted; rather, they are soft-deleted by appending a valid\_until timestamp attribute. This enables temporal graph queries, allowing informaticists to reconstruct the exact state of clinical knowledge as it existed on any given historical date, which is vital for retrospective quality measurement and medico-legal auditing.

### **PostgreSQL pgvector Semantic Store**

Operating in tandem with the Neo4j graph, a PostgreSQL database augmented with the pgvector extension serves as the repository for dense semantic embeddings.11 The raw narrative text of the guidelines, the step-by-step chain-of-thought reasoning generated by the LLM, and the compiled JSON schemas are embedded using domain-specific models, such as BiomedBERT.10 Storing these high-dimensional embeddings natively within pgvector circumvents the operational overhead of managing decoupled, standalone vector databases while keeping semantic similarity search operations in close proximity to relational metadata (e.g., FHIR identifiers and temporal tags).11

### **Publish/Subscribe Mechanisms for CDS Operations**

The unified Neo4j and pgvector persistence layer functions as the single source of truth for the entire clinical enterprise. As new deltas are committed and versioned, the storage layer emits targeted publish/subscribe (pub/sub) events to drive downstream architectural phases:

1. **Phase 2 MEGA-RAG Integration:** The MEGA-RAG system subscribes directly to the pgvector embedding stream and the Neo4j temporal graph updates. Upon receiving a pub/sub event indicating a new commit, the RAG system dynamically reconstructs its embedding indices and sub-graph mappings. This continuous synchronization ensures that downstream conversational agents and clinical copilots query the absolute most current guideline data, neutralizing the risk of hallucinating obsolete or contra-indicated protocols.  
2. **Phase 3 Pre-computation Cache:** In parallel, the pre-computation cache subscribes to the FHIR artifact generation stream. As new PlanDefinition and Library resources are finalized, the cache pre-compiles the updated logical pathways against mock patient data cohorts. By caching these execution trajectories in advance, the system guarantees ultra-low latency inference when the logic is eventually invoked by an EHR's live CDS Hooks in a high-acuity clinical setting.

By intertwining multi-modal ingestion, rigorous SMT-driven conflict resolution, structured FHIR generation, and temporally robust graph persistence, the Living Guideline Diff Engine provides a definitive, deployable architecture for continuous clinical knowledge management.

#### **Works cited**

1. Developer API \- NCCN, accessed March 30, 2026, [https://www.nccn.org/developer-api](https://www.nccn.org/developer-api)  
2. U.S. Preventive Services | Prevention TaskForce API \- USPSTF, accessed March 30, 2026, [https://www.uspreventiveservicestaskforce.org/apps/api.jsp](https://www.uspreventiveservicestaskforce.org/apps/api.jsp)  
3. Managing medicines safety alerts \- new MHRA Central Alerting System \- Ashtons, accessed March 30, 2026, [https://ashtons.com/insights/managing-medicines-safety-alerts-new-mhra-central-alerting-system/](https://ashtons.com/insights/managing-medicines-safety-alerts-new-mhra-central-alerting-system/)  
4. Leveraging open-source large language models for clinical information extraction in resource-constrained settings \- Oxford Academic, accessed March 30, 2026, [https://academic.oup.com/jamiaopen/article/8/5/ooaf109/8270821](https://academic.oup.com/jamiaopen/article/8/5/ooaf109/8270821)  
5. MedKGent: A Large Language Model Agent Framework for Constructing Temporally Evolving Medical Knowledge Graph \- ChatPaper, accessed March 30, 2026, [https://chatpaper.com/paper/181246](https://chatpaper.com/paper/181246)  
6. Z3 Internals (Draft), accessed March 30, 2026, [https://z3prover.github.io/papers/z3internals.html](https://z3prover.github.io/papers/z3internals.html)  
7. Neuro-Symbolic Resolution of Recommendation Conflicts in Multimorbidity Clinical Guidelines \- OpenReview, accessed March 30, 2026, [https://openreview.net/pdf/0c8f26a17632d5398b2e06632bc6d43fc3ac348b.pdf](https://openreview.net/pdf/0c8f26a17632d5398b2e06632bc6d43fc3ac348b.pdf)  
8. CPG Home \- Clinical Practice Guidelines v2.0.0 \- FHIR specification, accessed March 30, 2026, [https://build.fhir.org/ig/HL7/cqf-recommendations/](https://build.fhir.org/ig/HL7/cqf-recommendations/)  
9. Methodology \- Clinical Practice Guidelines v2.0.0 \- FHIR specification, accessed March 30, 2026, [https://build.fhir.org/ig/HL7/cqf-recommendations/methodology.html](https://build.fhir.org/ig/HL7/cqf-recommendations/methodology.html)  
10. Medical Knowledge Graph: Structure & Insights \- Emergent Mind, accessed March 30, 2026, [https://www.emergentmind.com/topics/medical-knowledge-graph-kg](https://www.emergentmind.com/topics/medical-knowledge-graph-kg)  
11. pgvector: The Critical PostgreSQL Component for Your Enterprise AI Strategy \- Percona, accessed March 30, 2026, [https://www.percona.com/blog/pgvector-the-critical-postgresql-component-for-your-enterprise-ai-strategy/](https://www.percona.com/blog/pgvector-the-critical-postgresql-component-for-your-enterprise-ai-strategy/)  
12. Development and Update of Guidelines \- NCCN, accessed March 30, 2026, [https://www.nccn.org/guidelines/guidelines-process/development-and-update-of-guidelines](https://www.nccn.org/guidelines/guidelines-process/development-and-update-of-guidelines)  
13. Flash Updates \- NCCN, accessed March 30, 2026, [https://www.nccn.org/business-policy/business/flash-updates](https://www.nccn.org/business-policy/business/flash-updates)  
14. Embargo Policy \- NCCN, accessed March 30, 2026, [https://www.nccn.org/business-policy/business/embargo-policy](https://www.nccn.org/business-policy/business/embargo-policy)  
15. Highlights of the 2025 American Heart Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care, accessed March 30, 2026, [https://cpr.heart.org/-/media/CPR-Files/2025-documents-for-cpr-heart-edits-posting/Resuscitation-Science/252500\_Hghlghts\_2025ECCGuidelines.pdf?sc\_lang=en](https://cpr.heart.org/-/media/CPR-Files/2025-documents-for-cpr-heart-edits-posting/Resuscitation-Science/252500_Hghlghts_2025ECCGuidelines.pdf?sc_lang=en)  
16. AHA ACLS Guidelines 2025 : What's New & Why It Matters \- Online CPR Certification, accessed March 30, 2026, [https://cpraedcourse.com/blog/aha-acls-guidelines/](https://cpraedcourse.com/blog/aha-acls-guidelines/)  
17. RSS | American Heart Association, accessed March 30, 2026, [https://newsroom.heart.org/rss](https://newsroom.heart.org/rss)  
18. Updated AHA guidelines recommend mobile technology to alert bystanders \- EMS1, accessed March 30, 2026, [https://www.ems1.com/ems-products/technology/press-releases/updated-aha-guidelines-recommend-mobile-technology-to-alert-bystanders-z6y35Bkq61xHlIL6/](https://www.ems1.com/ems-products/technology/press-releases/updated-aha-guidelines-recommend-mobile-technology-to-alert-bystanders-z6y35Bkq61xHlIL6/)  
19. PulsePoint | Building informed communities, accessed March 30, 2026, [https://www.pulsepoint.org/](https://www.pulsepoint.org/)  
20. USPSTF Recommendations Development Process | United States Preventive Services Taskforce, accessed March 30, 2026, [https://www.uspreventiveservicestaskforce.org/uspstf/about-uspstf/task-force-resources/uspstf-recommendations-development-process](https://www.uspreventiveservicestaskforce.org/uspstf/about-uspstf/task-force-resources/uspstf-recommendations-development-process)  
21. U.S. Preventive Services | Prevention TaskForce Subscription \- USPSTF, accessed March 30, 2026, [https://www.uspreventiveservicestaskforce.org/apps/subscribe.jsp](https://www.uspreventiveservicestaskforce.org/apps/subscribe.jsp)  
22. Recommendation: Unhealthy Drug Use: Screening | United States Preventive Services Taskforce \- USPSTF, accessed March 30, 2026, [https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/drug-use-illicit-screening](https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/drug-use-illicit-screening)  
23. FDA updates cybersecurity guidance for medical device makers | AHA News, accessed March 30, 2026, [https://www.aha.org/news/headline/2023-09-26-fda-updates-cybersecurity-guidance-medical-device-makers](https://www.aha.org/news/headline/2023-09-26-fda-updates-cybersecurity-guidance-medical-device-makers)  
24. Permission to Cite or Use NCCN Content FAQ, accessed March 30, 2026, [https://www.nccn.org/guidelines/submissions-licensing-and-permissions/permission-to-cite-or-use-nccn-content-faq](https://www.nccn.org/guidelines/submissions-licensing-and-permissions/permission-to-cite-or-use-nccn-content-faq)  
25. Leveraging Open-Source Large Language Models for Clinical Information Extraction in Resource-Constrained Settings \- arXiv, accessed March 30, 2026, [https://arxiv.org/html/2507.20859v1](https://arxiv.org/html/2507.20859v1)  
26. MedKGent: A Large Language Model Agent Framework for Constructing Temporally Evolving Medical Knowledge Graph \- arXiv, accessed March 30, 2026, [https://arxiv.org/html/2508.12393v1](https://arxiv.org/html/2508.12393v1)  
27. (PDF) Z3: an efficient SMT solver \- ResearchGate, accessed March 30, 2026, [https://www.researchgate.net/publication/225142568\_Z3\_an\_efficient\_SMT\_solver](https://www.researchgate.net/publication/225142568_Z3_an_efficient_SMT_solver)  
28. Standards-based Clinical Practice Guidelines for the Digital Age \- eCQI \- HealthIT.gov, accessed March 30, 2026, [https://ecqi.healthit.gov/standards-based-clinical-practice-guidelines-digital-age](https://ecqi.healthit.gov/standards-based-clinical-practice-guidelines-digital-age)  
29. CPG Computable Plan Definition \- Definitions \- Clinical Practice Guidelines v2.0.0, accessed March 30, 2026, [https://build.fhir.org/ig/HL7/cqf-recommendations/StructureDefinition-cpg-computableplandefinition-definitions.html](https://build.fhir.org/ig/HL7/cqf-recommendations/StructureDefinition-cpg-computableplandefinition-definitions.html)  
30. How to do versioning of a graph database like neo4j \- Stack Overflow, accessed March 30, 2026, [https://stackoverflow.com/questions/24194105/how-to-do-versioning-of-a-graph-database-like-neo4j](https://stackoverflow.com/questions/24194105/how-to-do-versioning-of-a-graph-database-like-neo4j)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAXCAYAAAAcP/9qAAABPUlEQVR4Xu2UvUoDQRSFT9AUImgRUATBiIJiZWfvCyiKkMraLpA6DxD8eQGNRYqA4ANorY2Vb2ChiKWFpY2ew92V3cHdmXWTQtgPvmLnLnN/dmaBiorRsUuP3cUQZmiX3tEVJ+ajSZ/owFnPpUFP6D3dphPpsJc67dMvBCZeppewDrdoLR0O5oCe0Vd4Eq/R68gN/D2haNJzuk6f8Utiba6ubmBdqtuyaMSnsH0XkJF4h37QPZTrMMk+7cD2y0wsyh6iJEv0gs5Gz7mJY+Jr8wCbRNECJmkPNuKYoMQx07RNH+khnUqHM5mDTe0l4RvsOn1Gz0c/b+egQ9KCFaBCVFBRCnXsopFr9Ld01Yn5WITd4yFGd3hz0XSuYCPWqOU7Akc9VvQd52HfwqcOT9GTnskm7NcWov67KqDif/AN8QI8Zy2+9j4AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAAYCAYAAABN9iVRAAACkklEQVR4Xu2WTahNURTH/0L5lhIpBk8ipZCeepIiiUTykXxM9AYkpRi8GL2SwXsDCqVQMlLITIkBM4qMfIwMSBkIk6e8N8D/f9bZ9669j3vepdyT3vnXr3vu2uueu9faa+29gVq1ao1lrSefyM+c+2SyG59BHrhxcZdMdT6d0B6yhkwj48gccpCs8E6wue8nV8ggWRIPF6WXyXmEDJOeeDjTTnIHcWI6pQnkFuIFELfJTOen54fkDCxJSsxrssv5FDSL3CDHYS+9BEuI1wlyILF1UtfIS/IetghbyfjIA+gjz2DxBGnOb8hcZ4u0nJwn82COH0iXG1fmr+Z+VekiWZUanRSwAtcienWTIbI9sTek7BzOn/thq3+sMQrMhr3UZ7TTGi34peQzisHrN9/I2cTe0Dk0X7yMfCVP0eyntbA/r1JqRVXnC1hlPiEr3XgIslXwqT1T6HetrqQSv0l+kM25TVXRbr8vIs9hvdku+7Jflus6OYVmn2un/0JW59+3wSo2DbI0+NDvfoNT0ApeSdDuXnW/S9MRb3DzYRWgOWrBtuAvgvf9HqRyV9mr/Deg+n7/nbQ5vyNvYTt5qyBb2bPVVi9rR0ylslImdU4OJGNl0uroAqLJtYvO5DIdglXiEWcLwQs9LyQfUQwyBH86sRf63UvZ1LGnBLTb75JufjqDd/8B2qnLpPNb8/DBh7J/DEue0PM9MqnhBWyEXd70GUklravqlHQgVz/s+Bhtcv9aPbDdfqKz7SXfEd/eVK3aQLvy76ps3fb8yZVlYQjNa+IwbLVS6djTXb/qflcQJ8kj0ksuwBblaD4WpORczv12wAJ/heL9/7/UAlhQmxDf6b2UjMWwdlqHuFpq1apVq9aY0C+duZAO9FMvdAAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAYCAYAAABJA/VsAAACBklEQVR4Xu2WP0gcQRSHn6gQ8R/RoAgKomIQG1EbwVLFKIqgRdTSwsYmFtoKYqGlNmKXQizUUhAS5MQuWonYWAghkCJYCjYSfz/n9m52dnbvtvD2hPng43ZnZo99M2/erIjD4XAUjs9wC+7BOVjh77bSBI/hWPratCo7tPiYhrewR9SLrsMfsFYfZKEPPsL/IS5mhxYXLfAOzmttH+ElXNLabEzAK1HZoZuCPyX3pCUGg+VqcdU8SuC+qJePStFvcMhoY6CHsNtol3LYKME9kMQ+2JZg0OQ7/AvbjHadXlin3XOyNkVtFx8D8J8E89/zBH7IjH57GFxY0Lb2KCbhrqhFzdAhKmVGRa3qFNxJX3tGBcznuYd+x3D29Uk7zKqU2IOLG3Q9PBO1qD6+wnbtfkOSrXCVogqOLbi4QTO2G/jJ7NBhhTyHg2ZHgQkLLqzdBs/0U3gEy4w+H/yza9hsdkRQChskWPyizFUYmW224Bj0H8nv/brgg6hnIlmFF7Da7IiA6TgOZ2LIF4qCxedZ/EcP6woLql5UOeGt2r3OF1FFmBMYipcOOWemALAA/YJrWhsLJleZ+9RjQVRgBxJMYdYl9nEhQ+kUdWwlWcR0+uE9XBGVHfwa43mrHz38+npKj+F5rLMseQTNVOEM87dY4NYZEXWM8tM0Dnx2GNaYHQ6Hw+F4j7wAtyhtPW7MRz0AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAYCAYAAADtaU2/AAACLElEQVR4Xu2VTUhVURDHJ1RIMTMSP6CQWgTSoiAIBHMRGbgwWgYZRAttUQS5CFpEENJSkEKKNi5amKItVMSgHrQJahkUhAshcOXGpdDH/3/nHN9588493npL/cGPpzP33nPfnDnzRPYpRgM8bIMRmuFBG/xfuOALeN4mInTDOfdZE/XwObxtEwkuwLdSrEK5DMCSxB/SDt/DGyZ+AD6DD0y8MI1wBd6xCccluO0+Lb3wGzxhE0U4B3/AHptwPIQb8KRNgCPwM7xuEyEdcAj2i3avZxR+hIeCWJ1oidk87+AH0W/VGlzjeQVfi5a+gk7RDlyA1+AjuCrl/Zx2hhyHE6L3/IZf4Es4ItULcI/ti2dv/FX0Jn9GP8FN0dLyPJbguLvektpfD6u4Drt8gEeEZfgp5c1n7Ba8KvrmfuG8zkztr4cLV1zDb8RvxjJzwRiphTmZlpypKcWFt+CZMPAH3veBCKmFj4lWK28bPFWlHhRdmAlLk2jnshKsCLfEwn39Jfocwkl1t5zegUdpTfTUZLAzeT5v+oDjIpyHR93/kxIvJ4+Z3zs25ZTEZzP7oOp+vi3LNSva2SX4FLYE11wR7fy2IEZOwe+iR2oRnq1MZ/iKxbYqO0YsAwcCy2thx3OBPpsQvZf3hQMnhPdyZHJ0/jM8Vk9EB74dDrsxDGck/8V2hR3MsXjaJhKwR5al2O93Ej7gjcR/Gi2szGM45v6uGXb8PRuMcFnic3sP8hey6FgECVDL/AAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAACLElEQVR4Xu2VT0hVQRTGv6igMMtoEaZgtVAEF0FUBCEtctFCEQuKEl1Zy6BNfyAQwoURLYIIJPrjRhJduFCMBFu0UFoF/YFAiEBcSZsKMrS+7517unPncfXSLngf/N68OffMnHNnzswFKqqouLaTC2SI3CFN2cfraie5Aht7i9RmH2Mb6SEtyf/NpJ5cIvtTN2AXeUlukx3kEPlAzoROOWogb0kfLMhp8okcDXxqyDz5HXGXbA38cI28IbsD20XykewNbLG2kEdkLPnvGiDTsFWW9HKT5B1ZIE/JMbIpeV6SgiuJZ6GROkK+kY7IHuogWYK9SKgu8p0cTvpKRPPHW5ZRM1lGeSKaRJPp7fJ0iqyhPJF22NJrVaVCiXjAvERieygPmJeI25XIc3IPtj2LZAJRofqgOGCRRBSoaCIvyDlYXQgdDBW1ir0kVfm/JnIVxRJR4OqkdakGf5B+N+QFzLOHigNuZA/l88+QKhm88uOA7ngzsoc6QX6hPKAnotMjDcL82v56pPO/gm1d6UcdnXNdSC6diJWkdeni24d0ievIZ3LfHRJdhp1EnUhJL7mKbCK+NU8QbFk3+UIOJH0vpjlYcGkP7Ab9SY6v46ebcpSMIL3kzpPrSAOqvUG+InsDlwY/JLOkEzb5e9hV79LKTSGqdFgCsut4qvAfk9ewb4lL8z8g46SXDMNWTP5lUpaN5CxpRfQN2ED6iGnPNVat+rHC+U8iWwYVVfT/6A8WZnk/DY2hnwAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAXCAYAAABj7u2bAAACkUlEQVR4Xu2VS8hNURiGX6EIUeQSIpeBkYFbSvoVUi4DDISMXEYSg18upZSBW4mSpGRgIjI1MPhdCikZiAESKSGMDKTwPv+319nrrHM6BpTSeevpnL3W2mt967ttqat/o4FmrBleThQaZgaXg39bI811c9xcMVvMgKYVoRmKdZPKiaShZqM5b46o/UJuvtKcrViveC/XXnPVDDKjzT1z26wwE8xMs9+8N2uqd1o03twypxSGrDKvzKJsDa49Yw6Z6Wab+WqemCnVGkJwU3Fg0j6z2PSYTWaD2WVOK4xuEYMXzDMzLhvHS/cVIUDckMMmNlZIm81PxfvsgwdeK7yUxP/V2TO5RSjbRaBfs8wn06fmJGSTH2Zp9czG6fAkNn1rXiouM8LcUbNBvar3IJeOqkOo0ByF6/vUahAGpM3nmsdme2NF7RHgPzppLisOJ7/OqfbqMkVatA1V0u8Myj1Sihz7rqiWIdUY+fTQHFAcvqcax5vXqt+OIkfIFVyNy5PIIQy6lI3lIskvmi9mfjGHZ/DGbIWn8AjGpVClij6mKJAWrTMfzYLqeaoiyTsZxDvvVOdHJ2FIChUXobVQreQvEUhV2hC3oNRfKPKBEOxQcw7lwiOPzLxyoo3KUC00z8206pnq3V397ygMyqssCWPuKjot4taU/6jGilplqBA5lRcBhpIeTdqpyKHkOjxGfuR9CDFPF85dPEYRgjz/kvJQJeHx3CB+Tyi+Ag2RJ98U7kR4gfzIb0Y35xPw2bzJ+KBodGUpc3PGaYS51qrZIKr8cD0d4uCnZqs5qGh25UcxNcZ2lC5PoaLSSk1W9LMliv05r926/k5L71mu+Cb9iXoUB+UXykUxPDA3FJeh8rrq6v/ULxlTgBxTYQqfAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAACKklEQVR4Xu2VP0hVcRTHv1JCgSWhELqkIUpbIiKCOoRDEUWUQ6jgVhBBkKDQGi6Ci0OBizhES45F0FDRUNDUUIESpQiiYFMNOVjf7zu/c+/v3cv1Pd2C94UP7/7O788597zzOxeoqabqdZyMkgUyS7rKp/fVSXIPtvdBGGdVR/rIPHlELpMjZSuoRvKKPCQN5Dz5Qm7Eiwp0Drb2Pmkht8O4M1qjIKbIW9JOmsgTWOD10TpMk4/kVGQbI1/J6ciWlYJ+Q17CMiodJc/I0/As9ZAtMhDG0lmyRi66Qc4VxJIbgnrJL3I1Y481TPaQ36sX24FlS5qBOVXGXCfIO7IIy1hpsTZlD9Nb/IYdUqQr5C/yexWI7Jo/Rp4jH4hnM/kn3GH2sCJ7rEqBqG7cYVEgib3osGoCUeFtwAqvlF6kNaIzFZCcyFnFQC7h8IHIuW7DKmkLNl3Rn0gDUbF/QxWBFDkssmelXnCXrJMfsB6hNuA1knMYlLPrGm0i79ADUYM6qNS0/Nb4X1UUiG6OblBiUGWrwl26mrvh16XG14ryepgjy2FO8vPiPpK9zlIz+QwLOtE4LLXtYSxHSu8HpA7UDT+RP6Q/2NypCtb3qhsrw91hLHXA1tyMbINkG+lZJanNPiavyTVYEIpWrd4lpy/ICjkT2SfJe1gn1tt9Jxeiedd12NwtMgH7DNxBmt1EMuj7MEKGkPkG7CPta4O9QKV9yqoKWOi5ppr+P/0Do8eAObD/nI4AAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFEAAAAYCAYAAACC2BGSAAAEHElEQVR4Xu2YXagVVRiG39DQtKxIzKCIIgQRSkgUQwUtI+lPkkDUKAosQlEUNDNCEJEQEdSMRJAuItIog5RI0R3eiEp0YRpERCCIRjeBN0Hp95xv1tlrr71m9sxBzWA/8HIOa83MWvP9rtlSnz7/Z2413ZkOZrjdNDId7OPG+9g0NZ3I8KDpi+Jvn4Lhpg9Nb6UTFcw0HVC9yL2e3GKaZtpu2mV61jSs44pqbjMtMu02bTLd3zldn7mmlvIGGWc6anolGWfzO01rk/EyZptOmBbKy8a1gD2sMX1vesh0j+lTuUHqrDHR9KNpndx4L5tOyt+5EXjiW9OydKLgKdPfxd+U6aZz8heoA2u9Lt/4G6bRndONedx00TQjGnvY9LvpmWgsB4Y6IzcgzmAvR0yX5c9tBDf8IvdKjndNF+SbS7nbdMq0OJ3oAVFCRJ42vWca0zldG9IPg90Xjd1hOm7aKzdOGWTQn+p87ydN78idneVe0/OmWeoM9Tfli7J4gJqCp2gch03H5NF2V3RNYI88hao2XAbrzJGvv0WejnXhdHBQ3Ubk5NCSOxcn56BsUVq4hjUR71taS8fLO+lXcu+/b/pO7fr3SaGYB0zb5Pf8K48Y6sxSdRsLj6ZOaArPpDngLOpsbJQygrHKjJiOxxB9RCGGpKGuN+0w/WSaHF03AJFE3odCGzwQwjgsSFrkqKqHAaK7asNNGCF38nnTI8lcCuuxbrp2HSNSwqh9BMhLxRiO/EBe4wc7NMcWUo0NkYphjMI+X35TWLCsw1bVwwBG7HVNL+KGs0L1Gg7l6Vd1G6uJEYm8sdE473JFXuIGCCFLKmO8HFVGDDUHVX2dsPBfpsfSiRpgLIz2g5offcqMVTYew17Zc0t+fSAYcbC8hYFVYSBDlREJaaK4LNUDQ0lnujFdmdLyoioKegUEBgGSrh3eqapOhyhuqYcR5xUDTKSMkm88bIS0T6EO/iN/DvCFsrw9PQjHGzbExnrBy9I4aCBPaGjGi8kdU0hP0pQvmAARTn8Ikc57f6buDt6VznRYzn+vhYECjhRfqn2cYLFcyvKgUOtoSB8p/61M3czdn/Kc6WvTo+ru8EOF5kO2UAoCOPuS/EMgsFVunA3RGF9pf6h9sM42FiCKWGS/vEO3TJvVebh9Qd7B4wILE0w/y4853yjT+tWO5Fw5uFHQXX+TH79eNZ01va1OR62UnzIWRGNEJSUl3MsRB1tNia4ZhItJtbLDJJ0bY8WfTgHu5b6ygs+9eC72+n8BWUUqoiYHdiBjOa08rXqngix4bKO8VjVNsyWmz1Vu5JjgTOpiL5U5/KaGGkCxn5ROVIDHD6ne749AOaCk1BE1rEm3v2nAGPuU/zkshYjdYFpd/N8ngs7N4bcX1A+Kcd+Affpcd64CC/DIId9GQPcAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAA0ElEQVR4XmNgGAWeQPyfCPwViI2hejDAQiD+DcQ2aOLMQJwGxM+AWBNNDgwEgfg0EN8FYnE0ORAQAeKtQCyJLgEC+kD8CYjXADELVIwRiLmhbJDm6UDMA+WjgGgGiL+KkMRATuxhgBgiAMShUDYGmMOA6l+QP9uBOB2uAgeA+RdkMyhQvkDZ34DYFEkdVgAKflA0IPsX5OQ9DBC/4gUw/5YjiSH7FycASc5nwIxfVgZESOMEhOIXL8DmX4LAhQESsshp9x0Q7wBiISR1o2DoAgAXri9QT5a+dQAAAABJRU5ErkJggg==>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAABS0lEQVR4Xu2TLUsEURSGj2BQ0LIKBg2LzbiIxQ8waNSoP8Cy2aK2LQZBBLNRxGJUEDH4J4yCQTGJIGpQ/HjeOfeycx2RnbBtXniYYc6Zc89977lmlbqtaXiA78A1DCcZqRbh0zxXz0sYSjJy2oV7uIOxX7Eo/XwMz3ACvWk41QAcwj68wmQaztQDTdiCL1hPw0WNwwGsmG9rKQ1napgX3YQPmE3DRS2bdzAFb1bsoh9aMApncAMj+YS/1IIFmIBH2E6iZqvmcRW9tRJ+6nC0uro4MvdQqsOGeREVLuVnn/kCVwG9q5AK1j01ey/lp6Tu1GX0TJ1p65IWLe1nlPyUr/OwY35IkuzRDHfkp4ZZFkTJL02AftYYRXXs5wycwmDum2ZUsypL4mFJ2sG/fs7Bk7Xv+zushZhu04W17/MevIS8mHsOtRCvVKkb+gFM/0ZwbSwG7gAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAYCAYAAACmwZ5SAAAC+ElEQVR4Xu2XTagOURjHH6F8Jh+R2JCNKAtRRAoLFiRZKGXrY0WJYnNTkoUFEgsRpShbNixuLG1ZSTdFysJC2VD4/95zjvfMeWfOzNx3lNu9v/p355wz78w85/k612yKycksr4nIHGl6OlnHZWlLOjlBOCbtSSdzLJNuS/OS+UXSc+m31y9pd+GOIkulN9a//5O0vXBHPXzLe+s/I6dz/jfrpZvSDD+u5bB0Mp2MwMgxcwYfTNYC06Qz5j72s7S6uNyafeaMupQuiA3SB3OeBQy9YQ3fyc3XpFXpQgQ7yYu/+esyNksXpLfSC2lucbk1vA+D96YLnuvmNiVQ57S/1IUD87ekXeZ29X5xuQepMGLunu9W7pU2sFlsWhopcXG6KG2M1qrScgC8kkv4FdIDaaX0ysq9d1TaZi7Ecl5pCkZibPwuOgiO4XvgkLTYXwdqC+8C6a60JF2IwJAr5l74VHotLYzW15gLc3b+ng16ZTywYWn+7pQeW751YixGV4Jn8XAOjAmF6o700Zy3YaZ03o/ZtK7z96v0xV8j3pUDB7LphPcAVFUeHOdBSsjftX6M8eRo+A2eOOCvmesif8nBUStGymzpieVbYoDCRQEbAC+Q5MvThYiQv/P9GE+HHKXnjpjzMnSdv6PWL0Bp/uYgaqs6SfVueEL+xuOf0nFz4bXOzxMtD62b/N1vg/nL89l0/uaojVo+joZd1ZLYqSPRmIZPL+b0dSKab5K/RAJRESKiirr+m4OzBHWGFCgFQwkVenEKx8pn0qZojvCnF780VyACwfO5/L1qzpCRZD6mLH/bgHNiB5VCzJ+OxvQ2DAqVET0y1/T5IFpTOB9TROIqisakrX495pS5oylRkB4O8Dw9/of1n8P1Oyt/Vhl4Fe/mTow9KOGU8thj/wpCnxSqCvthIG+JsLo870EvblLyh4WDwdl0siNa2dBqd8YJYcypLlT2LiFyeHbjKG0c/0PA4WVHOtkRaR1qBP9qNS0Q/xsUxHAanGLS8QcqgZiU/CmvYwAAAABJRU5ErkJggg==>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAABEElEQVR4Xu3TvUoDQRSG4RMkEDEQQkAUIlliGvUOhIBICktBe9u0sdIgksbSwspGRO1yASKkCgpaeAdaBULsRSwUou9xZ9dxsu6WAfGDB4ZzdhjmZ0X+ZLJYwSYWMGHqUyia8UgWcYcXtLGNC3SwhCvUwq9N0tjDG3Yw+bMtVTyjL87KOvEY79iwG1YyuDR0HKaOD+wiZTecnKNpFyoY4BFzdiMiJ+LstyX+qgd28ZfkxN/iV/Q6uhhKxAkmZRY9PKHs9BITTFY6jose6rJdyONekicXcIppt3Eo/p7X3IaJXp2+ssj7L+EB15hxevrK9tGQmPv3cItXnGELR7jBqsRMDKIfeFg35uX7T/rPWPMJCSkp/c7RsHEAAAAASUVORK5CYII=>

[image13]: <data:image/png;base64,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>
