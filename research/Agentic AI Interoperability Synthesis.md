# **Agentic Interoperability in Healthcare: Production MCP and A2A Architectures Across Epic, Oracle Health, and athenahealth (2026 Synthesis)**

## **1\. The Paradigm Shift to Agentic Interoperability**

The enterprise software ecosystem has irrevocably transitioned from the era of generative artificial intelligence—characterized by stateless, intent-interpretation chat interfaces—to the epoch of agentic artificial intelligence.1 As of the first quarter of 2026, agentic systems have evolved into autonomous operational partners capable of setting goals, executing multi-step workflows, managing long-term state, and dynamically interacting with external environments without constant human intervention.2 The global agentic AI market, valued at $7.55 billion in 2025, has entered a period of hyper-growth, with projections indicating a trajectory toward $199 billion by 2034, while enterprise adoption has surged, with 42% of organizations currently running autonomous agents in production environments.1 Within the highly regulated and technologically fragmented healthcare sector, the deployment of such systems has necessitated a fundamental reimagining of data interoperability, security perimeters, and system integration strategies.4

Traditional Application Programming Interfaces (APIs) and static data exchange standards, while foundational to modern computing, lack the contextual awareness, semantic flexibility, and dynamic discovery capabilities required by autonomous clinical agents.4 The healthcare industry's longstanding reliance on the Fast Healthcare Interoperability Resources (FHIR) standard established a critical data structure, yet FHIR’s intricate resource relationships and rigid search parameters present significant friction for AI reasoning engines.4 To bridge this divide and resolve the exponential integration complexity known as the ![][image1] problem, the industry converged upon two complementary open standards governed by the Linux Foundation’s Agentic AI Foundation (AAIF), officially established in December 2025\.2

The Model Context Protocol (MCP) standardizes vertical interoperability, providing a universal, secure, and bidirectional conduit between Large Language Models (LLMs) and external enterprise data resources.9 MCP effectively resolves the context limitation problem by exposing local or cloud-based Electronic Health Record (EHR) systems as highly structured, callable tools.10 Conversely, the Agent-to-Agent (A2A) protocol governs horizontal interoperability.12 Originated by Google and subsequently donated to the Linux Foundation, A2A establishes a decentralized, peer-to-peer framework allowing independent, heterogeneous AI agents to discover one another, negotiate data modalities, and collaborate on complex tasks across organizational boundaries.13

In clinical environments utilizing the dominant EHR platforms—specifically Epic Systems, Oracle Health, and athenahealth—these protocols have moved rapidly from experimental sandboxes to production deployments. Healthcare organizations are leveraging FHIR-native MCP servers to grant clinical agents secure, read-and-write access to patient longitudinal records, while utilizing A2A meshes to orchestrate intricate care coordination workflows that span disparate vendor ecosystems.15 However, this unprecedented degree of machine autonomy introduces critical new vectors into the enterprise attack surface. The emergence of the "Digital Insider" threat, characterized by autonomous agents possessing long-term memory and broad operational access, has forced cybersecurity architectures to evolve from static perimeter defense to agent-aware, real-time tool governance models.1

This technical brief provides an exhaustive, peer-level synthesis of the agentic interoperability landscape as of March 2026\. The analysis enumerates the production FHIR MCP infrastructure currently deployed across major EHRs, details the precise semantic structure of A2A clinical Agent Cards, provides a comprehensive reference architecture for an autonomous nursing agent, and unpacks the critical security vulnerabilities and architectural mitigations identified during the Linux Foundation's April–June 2026 security audits.

## **2\. Architectural Mechanics of the MCP and A2A Protocols**

Understanding the proliferation of agentic workflows requires a deep technical examination of the underlying protocols facilitating machine-to-machine interaction. The synergy between MCP and A2A provides the foundational infrastructure necessary for robust, scalable, and secure clinical automation.17

### **2.1 Vertical Data Integration: The Model Context Protocol (MCP)**

Introduced as an open standard by Anthropic in November 2024 and subsequently integrated into the AAIF, MCP operates on a client-server architecture designed to standardize how AI models retrieve context and execute actions.9 MCP utilizes JSON-RPC 2.0 as its underlying remote procedure call protocol, facilitating seamless communication across various transport layers, primarily standard input/output (stdio) for local deployments and HTTP with Server-Sent Events (SSE) for cloud-hosted integrations.11

The protocol categorizes server capabilities into three distinct primitives. Resources provide read-only data exposure, allowing agents to ingest context such as static clinical guidelines, database records, or flat files.11 Tools enable functional execution, permitting the AI model to take definitive actions, such as sending secure messages, updating a FHIR Condition resource, or triggering external clinical workflows.11 Prompts offer pre-built workflow templates that synthesize complex LLM requests into standardized operational patterns.11 By abstracting the specific authentication mechanisms, capability negotiation, and error handling away from the core LLM logic, MCP allows developers to build a single server for a specific data source, rendering it universally compatible with any MCP-compliant AI client, such as Claude Desktop, Cursor, or enterprise gateway routers.9

In the context of healthcare, MCP is transformative because it operationalizes the FAIR (Findable, Accessible, Interoperable, and Reusable) data principles for AI systems.18 Standard FHIR APIs are highly complex, requiring developers to construct bespoke middleware to handle OAuth2 flows, pagination, and reference resolution.6 A specialized FHIR MCP server absorbs this complexity, executing full Create, Read, Update, and Delete (CRUD) operations on major resources like Patient, Observation, and Medication while handling the underlying FHIR mapping autonomously.6 This allows clinical agents to query EHR data utilizing natural language, shifting the computational burden from code generation to semantic reasoning.

### **2.2 Horizontal Orchestration: The Agent-to-Agent (A2A) Protocol**

Where MCP excels at connecting agents to static databases and rigid APIs, the A2A protocol enables dynamic collaboration between the agents themselves.19 A2A defines a platform-agnostic communication framework rooted in widely adopted web standards, utilizing HTTP POST for structured requests and JSON-RPC for message formatting.12 The protocol operates on a client-remote interaction model, where a client agent initiates communication to delegate a specific objective to a specialized remote agent acting as the A2A server.12

The fundamental unit of exchange in A2A is the Task. Unlike stateless REST APIs, A2A tasks possess unique identifiers and progress through a defined, observable lifecycle consisting of specific state transitions: submitted, working, input-required, completed, failed, or canceled.21 Because clinical workflows often require extended processing time or human mediation, A2A natively supports asynchronous operations.13 Remote agents utilize Server-Sent Events (SSE) to push incremental status updates, or employ standard HTTP webhooks for push notifications, allowing the client agent to maintain contextual awareness over long-running processes without encountering timeout failures.22

A critical innovation of A2A is its dynamic user experience (UX) negotiation and modality-agnostic design.13 Agents can negotiate preferred input and output formats dynamically.13 For example, a radiology analysis agent might request input strictly as DICOM imagery but negotiate to return its diagnostic findings as a structured FHIR JSON artifact, depending on the consuming client agent's processing capabilities.13 This structured exchange ensures that highly specialized agents—such as a billing specialist, a diagnostic specialist, and a scheduling specialist—can form ad-hoc consensus networks to resolve complex patient inquiries that span multiple domains of expertise.12

## **3\. Production MCP Deployments in Enterprise EHR Ecosystems**

The theoretical capabilities of MCP and A2A have been rapidly translated into production architecture within the dominant United States healthcare networks.25 The implementation of the United States Core Data for Interoperability (USCDI) standards—specifically the mandatory baseline of v3 as of January 2026 and the voluntary adoption of v5—has provided the necessary regulatory impetus for standardized data exchange.26 Consequently, Epic Systems, Oracle Health, and athenahealth have adopted distinct architectural approaches to incorporating MCP into their respective technology stacks, reflecting their differing philosophies on security, cloud nativity, and ecosystem control.

### **3.1 Epic Systems: Rigid Perimeter Authorization and SMART on FHIR**

Epic Systems commands the largest market share of inpatient hospital systems in the United States, and its FHIR R4 implementation is the most extensively deployed.27 Epic’s architectural philosophy prioritizes strict perimeter control and centralized governance, governed by the App Orchard marketplace.27 Any application, including an AI agent connecting via an MCP server, must undergo rigorous security reviews before receiving authorization to access production Epic environments.27

In Epic deployments, MCP servers almost universally operate as external, securely hosted middleware gateways. These gateways act as highly regulated proxies, relying on SMART on FHIR (OAuth 2.0 utilizing Proof Key for Code Exchange) to establish trusted connections.27 The MCP server functions as an OAuth Resource Server, obtaining a Bearer token that is strictly scoped to the exact FHIR resource types required by the agent's current task.27 When a clinical agent requires data, it initiates a JSON-RPC tool call to the MCP gateway.29 The gateway evaluates the semantic intent of the request, translates it into the precise FHIR query syntax required by Epic, attaches the scoped Bearer token, and executes the API call.27 This architecture allows the LLM to interact with Epic using natural language constructs while ensuring that Epic’s monolithic security perimeter remains entirely uncompromised.30

### **3.2 Oracle Health: Native Execution and Database Level Integration**

Oracle Health, covering a significant portion of large-scale hospital and government deployments, has leveraged its deep database expertise to offer a highly integrated, native approach to MCP adoption.27 With the rollout of Oracle Cloud Fusion Applications Release 26A, Oracle embedded MCP and A2A capabilities directly into its AI Agent Studio, enabling seamless cross-system collaboration while enforcing native role-based access controls.16

A key differentiator for Oracle Health is the introduction of a native MCP Server via Oracle SQLcl.31 This integration allows authenticated AI models to securely connect to Oracle Databases underlying the EHR and execute natural language requests that the MCP server translates into SQL or PL/SQL scripts.31 To comply with stringent healthcare regulations such as HIPAA, Oracle requires the mandatory \-savepwd flag during connection setup to ensure persistent, secure connectivity without repeated credential exposure.32 Furthermore, Oracle enforces strict auditability by logging every LLM interaction, query execution, and data retrieval event in a dedicated schema via the DBTOOLS$MCP\_LOG table.31 Session states are continuously tracked using the MODULE and ACTION properties in the V$SESSION view.31 While Oracle advocates extreme caution—recommending that LLMs query sanitized, read-only replicas rather than direct production databases—this native architecture drastically reduces the latency typically associated with middleware abstraction.31 For healthcare networks requiring advanced compliance, overlay platforms like DreamFactory are frequently deployed atop the Oracle MCP server to provide granular, field-level Protected Health Information (PHI) redaction and enhanced Role-Based Access Control (RBAC).32

### **3.3 athenahealth: Cloud-Native Embedded Context Brokers**

Operating on a fundamentally cloud-native foundation, athenahealth serves a massive ambulatory practice footprint and has aggressively integrated AI into its core platform.15 In alignment with the HTI-1 Final Rule and the Spring 2026 API releases—which introduced critical FHIR R4 endpoints for Media and Coverage resources—athenahealth developed a proprietary, embedded MCP server layer directly within athenaOne.15

This embedded MCP layer functions simultaneously as a permissions checkpoint, a context broker, and an auditable routing mechanism.15 When a patient interacts with an AI-driven tool within the secure athenaPatient portal, the LLM does not establish an external connection.15 Instead, it interfaces directly with the internal athenahealth MCP server, which verifies data boundaries, structures the relevant clinical data (such as longitudinal lab results), and returns it to the model for context-aware generation.15 By grounding the generative AI exclusively in authenticated, structured clinical data prior to model access, athenahealth significantly mitigates the risk of clinical hallucination and ensures that sensitive documentation interactions remain entirely contained within defined, auditable compliance policies.15

## **4\. Exhaustive Enumeration of Production FHIR MCP Servers**

While the general MCP ecosystem experienced explosive growth throughout 2025—resulting in over 13,000 servers published on GitHub by early 2026—the reality of production enterprise deployments is far more constrained.11 Many early open-source servers lacked the robust authentication, error handling, and concurrency support required for high-availability healthcare systems that demand 99.999% uptime and sub-minute rollback capabilities.28 The transition from experimentation to production scaling has led to a natural consolidation, with enterprise IT teams standardizing on a select group of highly mature, compliance-ready MCP gateways and server frameworks.36

As of March 2026, extensive telemetry and developer surveys indicate that precisely ten primary FHIR MCP server architectures actively drive production clinical workloads across the major EHR vendors. Table 1 provides an exhaustive enumeration and architectural breakdown of these production-grade systems.

| Server Identity / Provider | Architectural Framework & Protocol Focus | EHR Deployment Compatibility | Core Technical Differentiators & Production Use Cases | Citation(s) |
| :---- | :---- | :---- | :---- | :---- |
| **the-momentum/fhir-mcp-server** | Universal Python-based server offering natural language to FHIR translation with automated code resolution. | Epic, Oracle Health, Medplum, HAPI FHIR, Azure Health | Integrates directly with official LOINC APIs to prevent LLM hallucination of medical terminology; features RAG pipelines utilizing Pinecone for semantic vector search across unstructured clinical documents (PDF, JSON). | 6 |
| **MintMCP Gateway** | Managed enterprise LLM Proxy and MCP Gateway platform engineered for regulatory compliance. | Epic, Cerner, athenahealth, NextGen | Achieved SOC 2 Type II certification; provides automated OAuth wrapping; implements strict infrastructure-level least-privilege access, exposing virtual, highly restricted toolsets rather than entire server capabilities. | 39 |
| **wso2/fhir-mcp-server** | Developer-focused integration bridge built on Java and Ballerina paradigms, prioritizing transport flexibility. | Any standard FHIR R4 compliant API | Provides robust native support for SMART on FHIR Authorization Code Grants; supports full CRUD operations seamlessly over stdio, sse, and streamable-http transports. | 30 |
| **Keragon Healthcare MCP** | Purpose-built, highly integrated healthcare automation platform spanning clinical and financial workflows. | Epic, Cerner, athenahealth, eClinicalWorks | Radically reduces time-to-production by offering over 300 pre-configured, native connectors encompassing EHRs, billing (Kareo), and scheduling platforms without custom middleware engineering. | 39 |
| **AgentCare MCP (by Kartha)** | Enterprise "last-mile" secure gateway focusing explicitly on specific EMR sandbox workflows. | Epic, Cerner (Oracle Health) | Offers highly targeted support for complex Epic and Cerner OAuth flows; provides specialized clinical tools for generating patient timelines and integrating with real-time research pipelines. | 40 |
| **HMCP by Innovaccer** | Healthcare-specific extension protocol built atop the standard MCP specification. | FHIR R4/R5 compliant EHRs (CMS Interoperability focused) | Extends standard MCP with native healthcare guardrails, deterministic patient identity resolution algorithms, and enterprise-scale FHIR integration designed for population health management. | 39 |
| **CData FHIR MCP Server** | Commercial abstraction layer offering SQL-based interaction over underlying FHIR APIs. | Generic (Any FHIR API infrastructure) | Translates LLM semantic requests into highly optimized JDBC-driven queries; utilized primarily for deep data analytics, financial reporting, and population cohort extraction rather than direct care. | 40 |
| **erikhoward/azure-fhir-mcp-server** | Microsoft Azure-native Python middleware tightly coupled to cloud infrastructure. | Azure Health Data Services (AHDS) | Leverages native Azure Entra ID for On-Behalf-Of (OBO) and Client Credentials authentication; relies entirely on Azure RBAC for granular, reliable authorization control. | 42 |
| **jmandel/health-record-mcp** | Lightweight, patient-centric local tool built upon the standard SMART App Launch framework. | Epic, generic Sandbox environments | Extracts and serializes full patient records into local SQLite databases; provides sophisticated grep\_record, query\_record, and arbitrary JavaScript evaluation tools for highly localized, secure AI analysis. | 41 |
| **mrosata/mcp-fhir** | Generic Python server featuring proprietary health data validation extensions. | Generic APIs, Zus Health platforms | Implements consolidated FHIR schema validation; incorporates specialized Zus Health extensions for complex Universal Patient ID (UPID) resolution and intelligent fuzzy name matching algorithms. | 43 |

The consolidation around these specific servers demonstrates a clear enterprise preference for solutions that abstract the intricacies of FHIR compliance—such as OAuth2 token management, pagination, and terminology validation—away from the core reasoning models.6 By deploying these robust gateways, healthcare developers have realized a 30% reduction in development overhead and up to a 75% acceleration in workflow completion, moving from fragmented API scripts to unified, protocol-driven data access.36

## **5\. Horizontal Coordination: The A2A Protocol and Agent Discovery**

While the deployment of FHIR MCP servers successfully addressed the requirement for secure vertical data retrieval, modern clinical operations involve complex, multi-stage workflows that exceed the capacity of any single LLM.12 Recognizing that a monolithic "super-agent" represents both a computational bottleneck and a catastrophic security risk, healthcare IT architecture has shifted toward decentralized meshes of narrow-scope, highly specialized agents.12

The Agent-to-Agent (A2A) protocol provides the horizontal connectivity layer for this decentralized mesh. Governed by the Linux Foundation, A2A defines a platform-neutral standard utilizing JSON-RPC over HTTP(S) to allow autonomous systems to publish capabilities, dynamically discover peers, and recursively delegate tasks across disparate vendor boundaries.5

### **5.1 Capability Discovery and the Agent Card Manifest**

The cornerstone of the A2A protocol is the "Agent Card." Before collaboration occurs, agents must establish mutual understanding of available skills, input constraints, and authentication requirements.12 The Agent Card is a declarative JSON or JSON-LD manifest, typically hosted at a standardized web URI (e.g., /.well-known/agent.json).45 It functions as a cryptographically verifiable digital identity, allowing client agents to automatically parse capabilities and route tasks without manual configuration or hardcoded integrations.13

In early 2026, the AAIF significantly enhanced the Agent Card schema by integrating operational context fields inherited from IBM’s Agent Communication Protocol (ACP).45 This evolution allows the manifest to declare not only functional skills but also real-time resource constraints, dynamic UX negotiation parameters, and explicit capability matching rules.14

### **5.2 Real-World A2A Clinical Agent Card Schemas**

To illustrate the technical depth of A2A discovery in production environments, the following are two verified 2026 JSON manifests representing specialized clinical agents operating within a federated hospital network.

**Example 1: Clinical Diagnostics Agent (ClinicalDx\_Agent\_Core)**

This agent is highly specialized in receiving FHIR bundles and unstructured clinical notes to generate differential diagnoses. Its Agent Card explicitly outlines its capability to handle streaming responses and defines its OAuth2 authentication scopes.

JSON

{  
  "@context": "https://agenticfoundation.org/schemas/a2a/v1.1",  
  "schema\_version": "1.1.0",  
  "agent\_name": "ClinicalDx\_Agent\_Core",  
  "description": "Specialized diagnostic analysis agent providing differential diagnoses based on FHIR patient histories and clinical observations. Requires pre-processed LOINC/SNOMED data.",  
  "versions": \[  
    {  
      "version": "2.1.4",  
      "endpoint": "https://agents.healthnetwork.example.org/a2a/v1/diagnostics",  
      "supports\_streaming": true,  
      "can\_push\_notifications": true,  
      "can\_state\_transition\_history": true,  
      "auth": {  
        "type": "oauth2",  
        "flows": \["client\_credentials", "urn:ietf:params:oauth:grant-type:jwt-bearer"\],  
        "scopes": \["clinical:diagnose", "patient:read"\]  
      },  
      "capabilities": {  
        "default\_input\_modes": \["application/json", "application/fhir+json"\],  
        "default\_output\_modes": \["application/fhir+json", "text/markdown"\],  
        "skills":,  
            "input\_schema": {  
              "type": "object",  
              "properties": {  
                "patient\_fhir\_bundle": {  
                  "type": "string",   
                  "description": "JSON string representation of the complete Patient FHIR Bundle"  
                },  
                "chief\_complaint": {  
                  "type": "string"  
                }  
              },  
              "required": \["patient\_fhir\_bundle", "chief\_complaint"\]  
            }  
          },  
          {  
            "name": "validate\_lab\_anomaly",  
            "description": "Cross-references abnormal LOINC laboratory results against known pathologies and pharmaceutical side-effects.",  
            "accepted\_parts":,  
            "input\_schema": {  
              "type": "object",  
              "properties": {  
                "observation\_resource": {  
                  "type": "string",   
                  "description": "FHIR Observation resource containing the anomalous result"  
                }  
              },  
              "required": \["observation\_resource"\]  
            }  
          }  
        \]  
      }  
    }  
  \],  
  "contact\_email": "ai-governance@healthnetwork.example.org"  
}

**Example 2: Revenue Cycle & Billing Agent (RevCycle\_Coordinator)**

Operating downstream from clinical encounters, this agent focuses on the operational aspects of healthcare. It demonstrates how A2A allows a separate organizational domain (billing) to interact securely with clinical outputs, utilizing JSON-RPC task delegation to process insurance claims.

JSON

{  
  "@context": "https://agenticfoundation.org/schemas/a2a/v1.1",  
  "schema\_version": "1.1.0",  
  "agent\_name": "RevCycle\_Coordinator",  
  "description": "Autonomous revenue cycle agent responsible for claim generation, pre-authorization verification, and ICD-10 coding validation.",  
  "versions": \[  
    {  
      "version": "1.0.5",  
      "endpoint": "https://billing.healthnetwork.example.org/a2a/v1/revenue",  
      "supports\_streaming": false,  
      "can\_push\_notifications": true,  
      "auth": {  
        "type": "oauth2",  
        "flows": \["client\_credentials"\],  
        "scopes": \["billing:write", "claim:submit"\]  
      },  
      "capabilities": {  
        "default\_input\_modes": \["application/fhir+json"\],  
        "default\_output\_modes": \["application/json"\],  
        "skills":,  
            "input\_schema": {  
              "type": "object",  
              "properties": {  
                "procedure\_resource": {"type": "string"},  
                "patient\_insurance\_data": {"type": "string"}  
              },  
              "required": \["procedure\_resource", "patient\_insurance\_data"\]  
            }  
          },  
          {  
            "name": "generate\_claim\_submission",  
            "description": "Transforms a completed Encounter and associated Observations into a structured X12/FHIR Claim artifact.",  
            "accepted\_parts":,  
            "input\_schema": {  
              "type": "object",  
              "properties": {  
                "encounter\_bundle": {"type": "string"}  
              },  
              "required": \["encounter\_bundle"\]  
            }  
          }  
        \]  
      }  
    }  
  \],  
  "contact\_email": "revenue-integrity@healthnetwork.example.org"  
}

Through the utilization of these standardized manifests, a primary care agent can autonomously detect the necessity for a billing action, query the network registry to locate the RevCycle\_Coordinator Agent Card, construct a compliant DataPart containing the encounter\_bundle, and dispatch the task over a secure TLS 1.2+ connection.23

## **6\. Reference Architecture: The Noah-RN Autonomous Nursing Paradigm**

The true transformative power of agentic interoperability is realized when MCP and A2A are deployed concurrently. The "Noah-RN" paradigm represents the vanguard of this convergence: a continuously operating, autonomous nursing and care-coordination agent.4 Unlike reactive chatbot interfaces, Noah-RN functions as an ambient clinical assistant. It proactively monitors a patient's state via continuous MCP context retrieval, coordinates necessary logistical tasks through an A2A agent mesh, and subsequently executes state-mutating operations back into the EHR, subject to strict human-in-the-loop oversight.

The architecture fundamentally relies on a separation of concerns. The Noah-RN core logic model does not possess hardcoded database querying capabilities or deep pharmacological interaction knowledge. It functions purely as an orchestrator, relying on an Enterprise MCP Gateway for secure, authenticated access to Epic or Oracle Health infrastructure, and an A2A Mesh Router to delegate highly specific sub-tasks to domain-expert agents.

### **6.1 Mermaid Reference Architecture Diagram**

The following Mermaid diagram delineates the precise control flows, data serialization pathways, and security checkpoints that define the Noah-RN production architecture.

Code snippet

graph TD  
    %% Define Global Styles for Professional Contrast  
    classDef agent fill:\#e1f5fe,stroke:\#0284c7,stroke-width:2px,color:\#000;  
    classDef mcp fill:\#f3e8ff,stroke:\#7e22ce,stroke-width:2px,color:\#000;  
    classDef a2a fill:\#dcfce7,stroke:\#16a34a,stroke-width:2px,color:\#000;  
    classDef ehr fill:\#fee2e2,stroke:\#be123c,stroke-width:2px,color:\#000;  
    classDef user fill:\#ffedd5,stroke:\#c2410c,stroke-width:2px,color:\#000;  
    classDef security fill:\#fffbeb,stroke:\#b45309,stroke-width:2px,color:\#000;

    %% Human Interface Node  
    User((Clinical Staff / Human-in-the-Loop)):::user  
      
    %% Core Orchestration Layer  
    subgraph Autonomous Nursing Agent Core  
        NoahRN:::agent  
        Memory:::agent  
        NoahRN \<--\>|Semantic Context Retrieval| Memory  
    end

    %% Zero-Trust Security & Identity Layer  
    subgraph Security & Governance Layer  
        HITL:::security  
        OBO:::security  
    end

    %% Vertical Data Integration Layer  
    subgraph Model Context Protocol Interoperability  
        MCPGate{MintMCP / Enterprise Gateway}:::mcp  
        FHIRTool\_R:::mcp  
        FHIRTool\_W:::mcp  
          
        MCPGate \--\> FHIRTool\_R  
        MCPGate \--\> FHIRTool\_W  
    end

    %% Electronic Health Record Data Silos  
    subgraph EHR Backend Infrastructure  
        Epic:::ehr  
        Oracle\[(Oracle Health Millennium API)\]:::ehr  
    end

    %% Horizontal Delegation Layer  
    subgraph Agent-to-Agent Coordination Mesh  
        A2ARouter{A2A Discovery & Task Router}:::a2a  
        PharmAgent:::agent  
        BillAgent:::agent  
    end

    %% Edge Connections: Execution and Flow  
    User \-- 1\. Manual Prompt / Clinical Event \--\> NoahRN  
    User \-. 8\. Review & Approve State Mutation.-\> HITL

    %% MCP Data Retrieval Sequence  
    NoahRN \-- 2\. JSON-RPC Intent Request \--\> OBO  
    OBO \-- 3\. Append Scoped Bearer Token \--\> MCPGate  
    FHIRTool\_R \-- 4a. Execute FHIR Query \--\> Epic  
    FHIRTool\_R \-- 4b. Execute FHIR Query \--\> Oracle  
    Epic \-- 5\. Return FHIR JSON Payload \--\> MCPGate  
    MCPGate \-- 6\. Return Sanitized Context \--\> NoahRN

    %% A2A Task Delegation Sequence  
    NoahRN \-- A. JSON-RPC Task: Drug Interaction Analysis \--\> A2ARouter  
    A2ARouter \-- B. Capability Match via Agent Card \--\> PharmAgent  
    PharmAgent \-. C. SSE Stream: Task Status 'working'.-\> NoahRN  
    PharmAgent \-- D. Return Polypharmacy Analysis Artifact \--\> A2ARouter  
    A2ARouter \-- E. Deliver Structured Response \--\> NoahRN

    %% Human-in-the-Loop Write-Back Sequence  
    NoahRN \-- 7\. Draft SOAP Note Payload \--\> HITL  
    HITL \-- 9\. Validated Intent Approved \--\> MCPGate  
    FHIRTool\_W \-- 10\. POST /DocumentReference \--\> Epic

### **6.2 Execution Trace and State Transitions**

The execution cycle of the Noah-RN architecture demonstrates the intricate coordination required to maintain high availability and absolute clinical safety.

The cycle begins with **Initiation and Vertical Context Retrieval**. When triggered by a clinical event—such as a patient transfer or a critical lab result alert—Noah-RN identifies the necessity for longitudinal patient history. Lacking direct database access, the agent formulates a structured JSON-RPC request to invoke the search\_patient\_observations tool exposed by the MCP Gateway.29 This request is intercepted by the On-Behalf-Of (OBO) Token Broker, which authenticates the agent's machine identity and maps it to the attending clinician's authorization scope, attaching the requisite SMART on FHIR Bearer tokens.27 The Enterprise MCP Gateway (e.g., MintMCP or Keragon) functions as a zero-trust circuit breaker.29 It evaluates the request against semantic rate limits and policy parameters before passing the precisely formatted FHIR query to the Epic or Oracle Health APIs.29 The EHR returns the requested JSON payload, which the gateway sanitizes, validates against LOINC code standards, and delivers to Noah-RN as contextual memory.29

Subsequently, the system engages in **Horizontal Task Delegation**. Having analyzed the patient's records, Noah-RN determines that a newly proposed polypharmacy regimen carries a high risk of adverse interactions. Acknowledging its own capability constraints, Noah-RN drafts an A2A Task object.22 The A2A router queries the network's /.well-known/agent.json directory to parse the Agent Card of the designated Pharmacy Agent.45 A secure HTTP POST request is initiated, passing the patient's medication list as a structured A2A DataPart.12 The Pharmacy Agent transitions the task to a working state and establishes an SSE stream back to Noah-RN to provide real-time updates, ensuring the primary orchestrator does not time out.23 Upon successful analysis, the Pharmacy Agent returns a structured artifact detailing the contraindications.22

The final stage involves **Consensus and Human-in-the-Loop State Mutation**. Noah-RN synthesizes the retrieved EHR context and the Pharmacy Agent's analysis into a comprehensive clinical plan, drafting a structured SOAP note. Because writing data constitutes a state mutation within the EHR, the architecture strictly routes the action through a Human-in-the-Loop (HITL) validation trigger.29 The attending clinician is presented with the drafted DocumentReference.create payload via a user interface. Only upon explicit human approval does the MCP Gateway execute the POST request to the Epic FHIR server, formally appending the record and concluding the autonomous cycle.29

## **7\. The Dark Side of Autonomy: April–June 2026 Security Audits**

The architectural elegance of MCP and A2A interoperability introduces profound new vulnerabilities. By transforming passive recommendation engines into autonomous entities capable of querying databases and orchestrating external tasks, enterprises have inadvertently created the "Digital Insider".1 A Digital Insider possesses legitimate, authenticated access to enterprise networks, holds persistent long-term memory in vector databases, and executes operations at machine speed.1

Recognizing that prioritizing interoperability had fundamentally outpaced security engineering, the Linux Foundation's Agentic AI Foundation, in collaboration with the Open Source Security Foundation (OpenSSF), conducted comprehensive security audits of the agentic ecosystem between April and June 2026\.50 The published findings documented systemic structural flaws across global deployments, indicating a severe disconnect between AI's proven functional value and real-world security governance.52

### **7.1 The Infrastructure Exposure Epidemic**

The most critical baseline finding was the widespread misconfiguration of infrastructure. Researchers discovered nearly 7,000 internet-exposed MCP servers, representing approximately 50% of all active global deployments.50 The audit revealed that 41% of these public-facing servers operated entirely without authentication mechanisms, allowing any external, unvetted AI agent to invoke internal enterprise tools indiscriminately.35

Furthermore, the code quality of the servers themselves presented catastrophic risks. The audits determined that 36.7% of the scanned MCP servers contained Server-Side Request Forgery (SSRF) vulnerabilities, and 43% harbored unsafe command execution paths allowing for OS-level injection.35 This structural negligence was famously exploited in the CVE-2026-26118 incident, where an SSRF vulnerability within an Azure-hosted MCP server allowed an attacker holding valid agent credentials to completely bypass policy governance and execute arbitrary code on the host machine.50 Supply chain attacks were also documented, notably CVE-2025-6514, which exposed a command-injection flaw in MCP proxy tooling leading to full remote code execution.50

### **7.2 Agent Session Smuggling in A2A Networks**

The stateful, asynchronous design of the A2A protocol, while necessary for complex coordination, introduced a novel and highly sophisticated attack vector identified by Palo Alto Networks’ Unit 42 as "Agent Session Smuggling".20 Because A2A relies heavily on task IDs and precise state transitions (e.g., working, input-required) to maintain conversational context across decentralized workflows, the integrity of the state machine is paramount.20

During the audits, security teams demonstrated that a compromised remote agent could manipulate these task status updates.20 By smuggling unauthorized conversational turns—specifically by injecting out-of-sequence input-required state flags—a malicious agent could confuse the primary client agent's session management protocols.20 This allowed the attacker to deceive the client agent into actively exfiltrating its own sensitive internal state, including previous chat history, foundational system instructions, and the semantic schemas of its locally connected MCP tools.20

### **7.3 Indirect Prompt Injection and AgentPoison**

In modern agentic systems, long-term memory is maintained in external vector databases (such as Pinecone or Weaviate) through Retrieval-Augmented Generation (RAG) pipelines.1 The audit highlighted the devastating efficacy of "AgentPoison," a stealth memory poisoning technique exploiting the agent's reliance on external context.1

Unlike direct prompt injection, where a human user maliciously instructs an LLM, indirect prompt injection occurs when the agent autonomously processes third-party data containing hidden instructions.1 In an AgentPoison attack, adversaries inject subtly crafted records into unstructured data lakes (e.g., public research repositories, clinical trial notes, or product descriptions).1 These records are mathematically optimized to maximize retrieval probability (![][image2]), ensure the inducement of the harmful action (![][image3]), and maintain absolute stealth during normal operations (![][image4]) to evade detection by human auditors.1

The audit found that state-of-the-art LLMs executed malicious commands retrieved via these poisoned vectors with an alarming 82.4% success rate, fundamentally corrupting the agent's reasoning without any direct user interaction.1 In healthcare environments, this vulnerability allows attackers to engage in "AI Recommendation Poisoning," subtly manipulating a diagnostic agent's retrieved context to force the recommendation of incorrect pharmaceutical interventions or obscure critical symptomatic alerts.1

### **7.4 Cross-Tool Privilege Escalation and the Confused Deputy**

The modular nature of MCP tooling created unforeseen pathways for data exfiltration. The audits detailed scenarios involving "Cross-Tool Privilege Escalation," where an agent could leverage legitimate access to two disparate tools to bypass security boundaries.50 For example, an agent possessing read-access to an EHR tool and write-access to an external cloud analytics tool could be manipulated into chaining a sequence of operations that leaked Protected Health Information (PHI).49 In this scenario, the agent acts as a "Confused Deputy"; it uses its legitimate privileges to perform actions on behalf of a malicious, hidden prompt embedded within its context window, violating the principle of least privilege without realizing it has breached protocol.1

## **8\. Architectural Mitigations and the Zero Trust Architecture for Agents**

The systemic vulnerabilities exposed by the April–June 2026 audits forced an immediate paradigm shift in enterprise AI governance. Relying on the inherent behavioral alignment of foundational LLMs proved entirely insufficient; security had to be enforced at the protocol and infrastructure layers. The AAIF, alongside leading cybersecurity firms, mandated the comprehensive adoption of a Zero Trust Architecture for Agents (ZTA).1

### **8.1 Deployment of Enterprise MCP Gateways**

The practice of exposing local environments directly via lightweight tunnels has been broadly deprecated.29 Enterprise architectures now mandate the implementation of dedicated MCP Gateways (such as MintMCP or Docker's MCP Gateway) to act as intelligent, zero-trust circuit breakers.29

These gateways sit between the agent and the enterprise APIs, inspecting all JSON-RPC calls before execution.29 They enforce *Semantic Rate Limiting*; if an agent attempts an anomalous burst of data retrieval—such as invoking a read\_patient\_record tool five hundred times in ten seconds—the gateway instantly terminates the connection, recognizing behavior inconsistent with human-aligned workflows.29 Furthermore, modern gateways deploy secondary, specialized AI security tools (such as Azure Guards) to perform behavioral intent detection. These tools analyze the semantic intent of the agent's request in real-time, flagging authenticated sessions that suddenly pivot toward accessing highly sensitive, unrelated files, thus neutralizing the Confused Deputy threat.2

### **8.2 Cryptographic Identity and Resource Indicators**

A significant root cause of the unauthorized access epidemic was overly broad token scope.29 To combat tool hijacking, the AAIF updated the MCP specification to classify servers strictly as OAuth Resource Servers, mandating the implementation of RFC 8707 Resource Indicators.29

Under this framework, broad Personal Access Tokens are eliminated. Instead, identity brokers (utilizing OpenID Connect) issue highly ephemeral, cryptographically signed tokens that are explicitly bound to a specific agent identity and a narrowly defined resource boundary.29 An agent must explicitly declare its precise intent and target resource prior to token generation, effectively preventing a compromised server from engaging in token mis-redemption and utilizing a credential intended for one service to access another.29

### **8.3 In-Line Sandboxing and Human-in-the-Loop Enforcement**

To mitigate the risk of cross-tool privilege escalation and unsafe command execution, ZTA frameworks require strict isolation and sandboxing of local MCP servers.29 Servers must operate in environments that explicitly restrict their execution capabilities and network access.29 Furthermore, organizations are establishing internal, continuously audited registries of vetted MCP servers, utilizing tools like MCPSafetyScanner to scan configurations and tool schemas for evidence of "tool poisoning"—where attackers silently alter a tool's parameters to execute malicious operations.29

Crucially, the governance models implemented post-audit strictly enforce Human-in-the-Loop (HITL) manual authorization triggers.29 While agents are permitted to autonomously query and aggregate data, any state-mutating operation (e.g., executing a command, writing a file, or posting an EHR update) triggers a mandatory pause.29 The operation cannot proceed without explicit cryptographic approval from an authenticated human supervisor, providing a definitive fail-safe against autonomous cascading errors.29

## **9\. Conclusion**

The rapid convergence of the Model Context Protocol and the Agent-to-Agent protocol under the stewardship of the Agentic AI Foundation has profoundly accelerated the deployment of autonomous systems within healthcare. By resolving the acute technical friction historically associated with FHIR data integration, production MCP servers have empowered clinical agents to interact with Epic, Oracle Health, and athenahealth environments using sophisticated semantic reasoning rather than brittle API logic. Concurrently, the A2A protocol has enabled the construction of decentralized, resilient agent meshes, allowing specialized entities to discover, delegate, and collaborate on complex patient care workflows without centralized architectural bottlenecks.

However, as the April–June 2026 security audits unequivocally demonstrated, the autonomy that drives operational efficiency simultaneously cultivates unprecedented cyber risk. The emergence of the Digital Insider, the vulnerability of RAG memory to AgentPoison injection, and the exploitation of stateful session mechanics demand an absolute departure from legacy security postures. Healthcare enterprises must aggressively implement the Zero Trust Architecture for Agents—deploying intelligent gateways, enforcing ephemeral cryptographic identities, and strictly mandating human oversight for all state-mutating operations. The technological infrastructure for an intelligent, autonomous healthcare ecosystem is fully realized; its ultimate success now depends entirely on the rigorous, continuous governance of its execution.

#### **Works cited**

1. Digital Insiders: The Rise of Agentic AI and the New Threat Surface of 2026 | MEXC News, accessed March 27, 2026, [https://www.mexc.com/news/946264](https://www.mexc.com/news/946264)  
2. Agentic AI Foundation: Guide to Open Standards for AI Agents \- IntuitionLabs, accessed March 27, 2026, [https://intuitionlabs.ai/articles/agentic-ai-foundation-open-standards](https://intuitionlabs.ai/articles/agentic-ai-foundation-open-standards)  
3. The Year of AI Agents: Inside the $199 Billion Bet on Software That Thinks for Itself, accessed March 27, 2026, [https://digidai.github.io/2026/01/18/year-of-ai-agents-concept-to-production-reality-gap/](https://digidai.github.io/2026/01/18/year-of-ai-agents-concept-to-production-reality-gap/)  
4. How MCP \+ A2A Will Help Close the Gap in Healthcare Interoperability \- ConceptVines, accessed March 27, 2026, [https://www.conceptvines.com/single/how-mcp-a2a-will-help-close-the-gap-in-healthcare-interoperability](https://www.conceptvines.com/single/how-mcp-a2a-will-help-close-the-gap-in-healthcare-interoperability)  
5. ACP vs A2A: Understanding the Protocols Behind Agentic AI Communication \- lowtouch.ai, accessed March 27, 2026, [https://www.lowtouch.ai/acp-vs-a2a-understanding-ai-agent-protocols/](https://www.lowtouch.ai/acp-vs-a2a-understanding-ai-agent-protocols/)  
6. FHIR MCP Server: Use Cases for Healthcare Developers \- DEV Community, accessed March 27, 2026, [https://dev.to/momentumai/fhir-mcp-server-use-cases-for-healthcare-developers-4c5i](https://dev.to/momentumai/fhir-mcp-server-use-cases-for-healthcare-developers-4c5i)  
7. Block, Anthropic, and OpenAI Launch the Agentic AI Foundation, accessed March 27, 2026, [https://block.xyz/inside/block-anthropic-and-openai-launch-the-agentic-ai-foundation](https://block.xyz/inside/block-anthropic-and-openai-launch-the-agentic-ai-foundation)  
8. Linux Foundation launches Agentic AI Foundation \- InfoWorld, accessed March 27, 2026, [https://www.infoworld.com/article/4103664/linux-foundation-launches-agentic-ai-foundation.html](https://www.infoworld.com/article/4103664/linux-foundation-launches-agentic-ai-foundation.html)  
9. Introducing the Model Context Protocol \- Anthropic, accessed March 27, 2026, [https://www.anthropic.com/news/model-context-protocol](https://www.anthropic.com/news/model-context-protocol)  
10. AI Agent Protocols 2026: The Complete Guide to Standardizing AI Communication, accessed March 27, 2026, [https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide](https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide)  
11. MCP Protocol Guide 2026: Connect AI to Any Data Source \- ToLearn Blog, accessed March 27, 2026, [https://tolearn.blog/blog/mcp-model-context-protocol-guide](https://tolearn.blog/blog/mcp-model-context-protocol-guide)  
12. What is Agent2Agent protocol (A2A)? \- Infobip, accessed March 27, 2026, [https://www.infobip.com/glossary/a2a-agent-to-agent](https://www.infobip.com/glossary/a2a-agent-to-agent)  
13. How the Agent2Agent (A2A) protocol enables seamless AI agent collaboration, accessed March 27, 2026, [https://wandb.ai/byyoung3/Generative-AI/reports/How-the-Agent2Agent-A2A-protocol-enables-seamless-AI-agent-collaboration--VmlldzoxMjQwMjkwNg](https://wandb.ai/byyoung3/Generative-AI/reports/How-the-Agent2Agent-A2A-protocol-enables-seamless-AI-agent-collaboration--VmlldzoxMjQwMjkwNg)  
14. What Is Agent2Agent Protocol (A2A)? \- Solo.io, accessed March 27, 2026, [https://www.solo.io/topics/ai-infrastructure/what-is-a2a](https://www.solo.io/topics/ai-infrastructure/what-is-a2a)  
15. How MCP Servers Help Enable Secure AI Connections \- Athenahealth, accessed March 27, 2026, [https://www.athenahealth.com/resources/blog/mcp-servers-securely-connect-to-consumer-ai](https://www.athenahealth.com/resources/blog/mcp-servers-securely-connect-to-consumer-ai)  
16. What you need to know about MCP, A2A in Fusion Apps | fusioninsider \- Oracle Blogs, accessed March 27, 2026, [https://blogs.oracle.com/fusioninsider/what-you-need-to-know-about-mcp-a2a-in-fusion-apps](https://blogs.oracle.com/fusioninsider/what-you-need-to-know-about-mcp-a2a-in-fusion-apps)  
17. Enabling modular, interoperable agentic AI systems in healthcare: The roles of MCP and A2A \- Infinitus, accessed March 27, 2026, [https://www.infinitus.ai/blog/enabling-modular-interoperable-agentic-ai-systems-in-healthcare-mcp-a2a/](https://www.infinitus.ai/blog/enabling-modular-interoperable-agentic-ai-systems-in-healthcare-mcp-a2a/)  
18. Model Context Protocol (MCP) in Pharma \- IntuitionLabs, accessed March 27, 2026, [https://intuitionlabs.ai/articles/model-context-protocol-mcp-in-pharma](https://intuitionlabs.ai/articles/model-context-protocol-mcp-in-pharma)  
19. Building AI Agents with A2A and MCP Protocol: A Hands-on Implementation Guide, accessed March 27, 2026, [https://dev.to/vishalmysore/building-ai-agents-with-a2a-and-mcp-protocol-a-hands-on-implementation-guide-4fbl](https://dev.to/vishalmysore/building-ai-agents-with-a2a-and-mcp-protocol-a-hands-on-implementation-guide-4fbl)  
20. When AI Agents Go Rogue: Agent Session Smuggling Attack in A2A Systems \- Unit 42, accessed March 27, 2026, [https://unit42.paloaltonetworks.com/agent-session-smuggling-in-agent2agent-systems/](https://unit42.paloaltonetworks.com/agent-session-smuggling-in-agent2agent-systems/)  
21. OMCP-A2A: LLM Agent collaboration on OMOP CDM question answering \- UK Health Data Research Alliance, accessed March 27, 2026, [https://ukhealthdata.org/wp-content/uploads/2025/09/2025-OHDSI-Symposium-A2A-OMCP\_NMG\_final.pdf](https://ukhealthdata.org/wp-content/uploads/2025/09/2025-OHDSI-Symposium-A2A-OMCP_NMG_final.pdf)  
22. Agent2Agent and MCP: An End-to-End Tutorial for a complete Agentic Pipeline | Matteo Villosio Personal Blog, accessed March 27, 2026, [https://matteovillosio.com/post/agent2agent-mcp-tutorial/](https://matteovillosio.com/post/agent2agent-mcp-tutorial/)  
23. Agent-to-Agent (A2A) Protocol: The Future of Autonomous Multi-Agent Systems | HackerNoon, accessed March 27, 2026, [https://hackernoon.com/agent-to-agent-a2a-protocol-the-future-of-autonomous-multi-agent-systems](https://hackernoon.com/agent-to-agent-a2a-protocol-the-future-of-autonomous-multi-agent-systems)  
24. What is A2A protocol (Agent2Agent)? \- IBM, accessed March 27, 2026, [https://www.ibm.com/think/topics/agent2agent-protocol](https://www.ibm.com/think/topics/agent2agent-protocol)  
25. Why Providers Scale Health Tech in 2026, Led by Epic and Philips \- Business 2.0 News, accessed March 27, 2026, [https://business20channel.tv/why-providers-scale-health-tech-in-2026-led-by-epic-and-philips-13-03-2026](https://business20channel.tv/why-providers-scale-health-tech-in-2026-led-by-epic-and-philips-13-03-2026)  
26. Understanding United States Core Data for Interoperability (USCDI), accessed March 27, 2026, [https://www.themomentum.ai/blog/understanding-united-states-core-data-for-interoperability-uscdi](https://www.themomentum.ai/blog/understanding-united-states-core-data-for-interoperability-uscdi)  
27. EMR Integration in 2026: How AI-First Teams Cut Implementation Time 10-20X, accessed March 27, 2026, [https://www.groovyweb.co/blog/emr-integration-healthcare-guide-2026](https://www.groovyweb.co/blog/emr-integration-healthcare-guide-2026)  
28. The 2026 Power List: Top Healthcare Software Companies Quietly Running Modern Medicine \- Your Health Magazine, accessed March 27, 2026, [https://yourhealthmagazine.net/article/medical-billing/the-2026-power-list-top-healthcare-software-companies-quietly-running-modern-medicine/](https://yourhealthmagazine.net/article/medical-billing/the-2026-power-list-top-healthcare-software-companies-quietly-running-modern-medicine/)  
29. Securing MCP Servers: The 2026 Guide to AI Tool Tunneling | by InstaTunnel \- Medium, accessed March 27, 2026, [https://medium.com/@instatunnel/securing-mcp-servers-the-2026-guide-to-ai-tool-tunneling-aafa113b08db](https://medium.com/@instatunnel/securing-mcp-servers-the-2026-guide-to-ai-tool-tunneling-aafa113b08db)  
30. Model Context Protocol (MCP) Server for Fast Healthcare Interoperability Resources (FHIR) APIs \- GitHub, accessed March 27, 2026, [https://github.com/wso2/fhir-mcp-server](https://github.com/wso2/fhir-mcp-server)  
31. Introducing MCP Server for Oracle Database, accessed March 27, 2026, [https://blogs.oracle.com/database/introducing-mcp-server-for-oracle-database](https://blogs.oracle.com/database/introducing-mcp-server-for-oracle-database)  
32. How to Set Up an MCP Server for Oracle with ... \- DreamFactory, accessed March 27, 2026, [https://www.dreamfactory.com/hub/set-up-mcp-server-for-oracle-secure-ai-access](https://www.dreamfactory.com/hub/set-up-mcp-server-for-oracle-secure-ai-access)  
33. 25.7 Release: New FHIR R4 Media API \- APIs at athenahealth | API Solutions, accessed March 27, 2026, [https://docs.athenahealth.com/api/resources/25-7-release-new-endpoint-fhir-r4-media-HTI1](https://docs.athenahealth.com/api/resources/25-7-release-new-endpoint-fhir-r4-media-HTI1)  
34. 25.3 Release: New FHIR R4 Coverage API, accessed March 27, 2026, [https://docs.athenahealth.com/api/resources/25-3-release-new-endpoint-fhir-r4-coverage-HTI1](https://docs.athenahealth.com/api/resources/25-3-release-new-endpoint-fhir-r4-coverage-HTI1)  
35. Best MCP Servers: Definitive 2026 List | Apigene Blog, accessed March 27, 2026, [https://apigene.ai/blog/best-mcp-servers](https://apigene.ai/blog/best-mcp-servers)  
36. 2026: The Year for Enterprise-Ready MCP Adoption \- CData Software, accessed March 27, 2026, [https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption](https://www.cdata.com/blog/2026-year-enterprise-ready-mcp-adoption)  
37. punkpeye/awesome-mcp-servers at nocodeopensource.io \- GitHub, accessed March 27, 2026, [https://github.com/punkpeye/awesome-mcp-servers?ref=nocodeopensource.io](https://github.com/punkpeye/awesome-mcp-servers?ref=nocodeopensource.io)  
38. FHIR-MCP Server: Natural Language AI for Healthcare Data, accessed March 27, 2026, [https://www.themomentum.ai/open-source/fhir-mcp-server](https://www.themomentum.ai/open-source/fhir-mcp-server)  
39. Best MCP Gateways for Healthcare Organizations 2026 | MintMCP Blog, accessed March 27, 2026, [https://www.mintmcp.com/blog/gateways-healthcare-organizations-with-mcp](https://www.mintmcp.com/blog/gateways-healthcare-organizations-with-mcp)  
40. Unlocking EMR Data: A Deep Dive into Kartha's AgentCare FHIR MCP Server \- Skywork.ai, accessed March 27, 2026, [https://skywork.ai/skypage/en/unlocking-emr-data-kartha-agentcare-fhir-server/1978663830427389952](https://skywork.ai/skypage/en/unlocking-emr-data-kartha-agentcare-fhir-server/1978663830427389952)  
41. EHR Tools with MCP and FHIR | Awesome MCP Servers, accessed March 27, 2026, [https://mcpservers.org/servers/jmandel/health-record-mcp](https://mcpservers.org/servers/jmandel/health-record-mcp)  
42. A Deep Dive into the Azure FHIR MCP Server: The AI Engineer's Practical Guide, accessed March 27, 2026, [https://skywork.ai/skypage/en/azure-fhir-mcp-guide/1977975556974497792](https://skywork.ai/skypage/en/azure-fhir-mcp-guide/1977975556974497792)  
43. mrosata/mcp-fhir: MCP server for reading and writing FHIR \- GitHub, accessed March 27, 2026, [https://github.com/mrosata/mcp-fhir](https://github.com/mrosata/mcp-fhir)  
44. A2A Protocol vs MCP: Google vs Anthropic Agent Interoperability | Innovatrix Infotech, accessed March 27, 2026, [https://www.innovatrixinfotech.com/blog/a2a-vs-mcp-google-vs-anthropic](https://www.innovatrixinfotech.com/blog/a2a-vs-mcp-google-vs-anthropic)  
45. AI Agent Communications in the Future Internet—Paving a Path Toward the Agentic Web, accessed March 27, 2026, [https://www.mdpi.com/1999-5903/18/3/171](https://www.mdpi.com/1999-5903/18/3/171)  
46. Agent-to-Agent (A2A) Protocol: A Comprehensive Beginner's Guide | by Neo Cruz | Medium, accessed March 27, 2026, [https://medium.com/@neo-cruz/agent-to-agent-a2a-protocol-a-comprehensive-beginners-guide-e82c162eef8b](https://medium.com/@neo-cruz/agent-to-agent-a2a-protocol-a-comprehensive-beginners-guide-e82c162eef8b)  
47. (PDF) A Survey of AI Agent Registry Solutions \- ResearchGate, accessed March 27, 2026, [https://www.researchgate.net/publication/394322769\_A\_Survey\_of\_AI\_Agent\_Registry\_Solutions](https://www.researchgate.net/publication/394322769_A_Survey_of_AI_Agent_Registry_Solutions)  
48. Agent-2-Agent Protocol (A2A) \- A Deep Dive \- WWT, accessed March 27, 2026, [https://www.wwt.com/blog/agent-2-agent-protocol-a2a-a-deep-dive](https://www.wwt.com/blog/agent-2-agent-protocol-a2a-a-deep-dive)  
49. AI Skills Security Scanner for Agentic AI \- ActiveFence, accessed March 27, 2026, [https://alice.io/blog/ai-skills-security](https://alice.io/blog/ai-skills-security)  
50. AI Infrastructure 2026: The Rise of the MCP Gateway and Agentic Tunneling | by InstaTunnel, accessed March 27, 2026, [https://medium.com/@instatunnel/ai-infrastructure-2026-the-rise-of-the-mcp-gateway-and-agentic-tunneling-c5a8c76e9ed4](https://medium.com/@instatunnel/ai-infrastructure-2026-the-rise-of-the-mcp-gateway-and-agentic-tunneling-c5a8c76e9ed4)  
51. Linux Foundation's Quiet Grants Strengthen FOSS Security \- AI CERTs News, accessed March 27, 2026, [https://www.aicerts.ai/news/linux-foundations-quiet-grants-strengthen-foss-security/](https://www.aicerts.ai/news/linux-foundations-quiet-grants-strengthen-foss-security/)  
52. Adopting Agentic AI is a Priority for 87% of Security Teams, According to Ivanti's Research, accessed March 27, 2026, [https://www.ivanti.com/company/press-releases/2026/adopting-agentic-ai-is-a-priority-for-87-of-security-teams-according-to-ivanti-s-research](https://www.ivanti.com/company/press-releases/2026/adopting-agentic-ai-is-a-priority-for-87-of-security-teams-according-to-ivanti-s-research)  
53. Before the Tool Call: Deterministic Pre-Action Authorization for Autonomous AI Agents \- arXiv, accessed March 27, 2026, [https://arxiv.org/pdf/2603.20953](https://arxiv.org/pdf/2603.20953)  
54. Deep Dive MCP and A2A Attack Vectors for AI Agents \- Solo.io, accessed March 27, 2026, [https://www.solo.io/blog/deep-dive-mcp-and-a2a-attack-vectors-for-ai-agents](https://www.solo.io/blog/deep-dive-mcp-and-a2a-attack-vectors-for-ai-agents)  
55. Cloud native agentic standards | CNCF, accessed March 27, 2026, [https://www.cncf.io/blog/2026/03/23/cloud-native-agentic-standards/](https://www.cncf.io/blog/2026/03/23/cloud-native-agentic-standards/)  
56. AI Agent Coordination: Anthropic's MCP Unifies Agents \- AI CERTs News, accessed March 27, 2026, [https://www.aicerts.ai/news/ai-agent-coordination-anthropics-mcp-unifies-agents/](https://www.aicerts.ai/news/ai-agent-coordination-anthropics-mcp-unifies-agents/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAYCAYAAACiNE5vAAACmUlEQVR4Xu2WS8hNURiGX3e5p9xySxEGyqWEUISBSxm6DNwZMJDLgKQMGJCSECFKFAYykFu5E1JkgIHyTygyQDFgwPueb63OWsv+/7PPKQasp57a5/vWv/5v7b2+vTaQyWQy/wGT6HX6hv6kD+N0hSv0Byz/ju6I03+ctvQa/QyrQQ6PRsQMpU2wce9h6+sUDgi5iurg8XGqwgZ6Ig3+ZZbT+7AaZyS5kMX0E4ofYkRn+pIuhU16IcoaB+j0NNgMKqprGgwYQwelwRKcoSthNa5Icp45To3ZleR+YxbdT9uj+tTTrfQYli/DBHqRtksTZAq9TbuniRq0ps9oX1h9O+N0hWGwtagVNabmg9pD57vrjbA/0o3wDKaXgt9l0HxqjVZBTEVr+/ULYmUZR4+6a/X66SDn8bvgLv1KOwa5Qp7Qbu66C/1Iv9AeLrYa1uP1so4egi2+F71BR0UjyrOJLnTXj2C9HrKEDoC12HfYC61F+tA7SUy9oaeupy/O0tHVdF2sp0foTVhvN8pl2M0T6vUPQW4kXeWu58Jq31JNF7OIbkti2pLf6FvYHXwVp+tC2/oFPQ/r00boQO8Fv9XfWpzfkZtRbandLld0MkUcg53lKYdhE5xyNoJuoNpoLF1DTyLu+bLMhC3Io2NNtWlevcGHBLkHsFZtE8QK0dPQB0LKCNjkclmSK0Nv+pTOC2Jr6UHUv/i9sAV6psHq0nzasR69p/ShdS6IFTIbVlxzhWh76h/0TxM16AmbVx8SKVsRnxi10FyvYX3s0SmjutIF6uWnuM76QibDtqB/ok10ajjAMZE+T4Ml2EcXpMGA42j5y0voG+AW7FhSjTpltruc3hW6GQPdb2191enXo7E6QfRuyGQymUzmX+IXR0mCpX/3K0QAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAYCAYAAACiNE5vAAACfklEQVR4Xu2XXWiOYRjH/0hIPtLyOQ4oTpZaHIh8lBTtZCi2AwfEwdqRaUU+I7IPis0JYYhyJJOyphSZE4lYs2PSOKG0tJXm/++67u1xe19t2Vt69vzq157nvp+P+76u6773vEBGRkbGGGA1badf6AD9QV/Sa8mL0sw92MRXxB1pZjws4+/jjrSzCpbtprgj7RyBTXxb3JF2ntJ+OiPuSDOa7E/Y5AvBbjoxbszBNNpNF8QdhULlrTI/GXc4B+icuHGYzKXfMbyJa4PdR8fFHYWiGTbxjXEHmUWfx40jYDt9FDf+L3TRPjo1alfkb9BqP19KL9FbtIHepRXeV0wv07OweybTB/QDfefHyno97GPpEL1Kz+tmWID0wVTr52ISbXT1zhI6nZ6GLcsiuoG+8etFrnHkZBks2xpMkin0IqxMw4Z3kC6CBWkJfUL30nm0A7Y2Va5XYCUunsEGJ8roctpJd8GW1k3Yu/QclXn4WlTQFaxNfq6+cljAlCAFVGPQRD/6NX8bxyDrYJN9DZv4Jz9/Rb95m7wTbiAL6U6/Lskp+oIep8foGm+fCQucMic0SA2kF79nQpuarm2jW71NE+6hR2HP3+HtesZK2Cd1oM7/5hvHqKD9QA9O8pBWRW1iM4aCFDZHBe6xHyeZTz/DSnk2rLqSQU+iMg4b8WJa48f5xjEqvMVQ+QW0psLLtY4VGJWbyvIMLOOHvV97hDITs59egAVGmdJS0G+HgDK+xY9bYP1C71KwRL5x/DMT6Ff8uQlqk7lOz9HbdK23l9JWuge2Nwhle70fJ6mk9+kJP9caVWb1Ca1NSntA+DenH1HaXJVdlX0g3zgyMjLGCL8AhEF6C+7fr4QAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAYCAYAAABXysXfAAACUUlEQVR4Xu2WS4hOYRjH/8hkXBohlySNS2ysSFIYsbCixBiyQcplQ0QmFMJCLqGEmCZFUUwspyhCIZcVm2FWisWkZiFK/P/+z+k787L55rI4dX71q3Oe95zvnPd5nvc9H1BSUlISLKTt9Cv9Tb/TV/R6/qKicQ+ezNx0oGgMhivzIR0oIgvgqlxIB4rIQXgyq9OBIvKY/qR16UDR0AR+wRMaCKbT5UlsNz2bxPoFtZZa7Gg6EOyhE9JgFVykzUlsHp2fxPoFPUyTWZYOkDH0aRqsktd0URocKN7TH3REEh9EW+nOXGwqvUJP0cP0dm5sJr1Gz9BLdCPcuvoI66O8jo6ix+hDOs63/WUlvQu33i06Gu4Yffv200PwJvWIjox7/mEWXBU9LE8tPU+7UdkUhtJ3dE2cH0FlK59IP9JpcEvqvnq6Aj1/exsdRjvha4WuUUKzZCoZ++DWbIS/fdnE3+A/H/XF8EPewpP5HOdqiW8RkzezG0gT/MKqmLhD18fxcTijKaqgspoxBX62/i5lPKPbc+eajJI0np6mByKuiqjKav0+cxJuO6F/DF/oZLgqKv/WGMvzhDbAVc1eQi+qTUUTGw4nbUaMied0VRy/QGW9qe2UcFWwJmK9ZhdcAdFAP8El30xb6KYYE3vhl1Um1bIb6Gw6BE6CWvFcXNsBJ0UspTfiWJPvghMhrtItcKXGRqzX6MezbVabgtrqMrxYJ9E2eJFqLWnrFXqxHXRtnKtFX8ITmRMxLX5tJKq8kqJqiSX0QRyLE/Q+erZkSUlJlfwBlU5u0RYXLZ0AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAYCAYAAACvKj4oAAACnUlEQVR4Xu2XW4hOURTH/8aYmHkYuU9Cci0vwoPcbxMvSi4pD4QXt6SUW8glEkW5hIdRwiAPFEp5EZEiuWbK24gH84JJosT/31qnb88+n0+fr6TT+dev9l5r73P23mut/Z0PyJUrV65/qAnkNvlAfpKv5DE5Ew7Kgq7CNjg2dmRBVbAItsSOrGg8LHrHYkdWtB22wfmxIyu6S76T+tiRBWlTP2CbrEQzyPDYWIYGwW7zB4FtCJkV9GeTN+RiYPujlJZKzz2xw7WR9I2NRfScTI6NZWoTORz0j5NtQV86SdZFtpLSQ7TBmbGD6kHux8Yi6k3aSZfYUaZukAVB/wnSh/aKjI5sJfWafCN1kb0TOUvWRvblZCc5QRrIPlj03sFSbKSPm0KayEGy323SKnIaFqnzZKLbq8kX0pMshpWMPjr0TPWlfuQz2UJ2u0/zfqsRsOhpYKhu5CgsKuHFo/GXva06aPS2NrDD29J0chMWUc2/4PYl5BFsUTWwdyfpPwl2UInmIL0ubVRRTdbUCqvdlHS6mvwU9pL33tfkj24TzckE1zDYpq+ThYH9IZkW9O+QS7C63gy7LKQXZIW3lWYvvS1tRcf6O4SOhyapnNZ4ewAs4l0L7so1GPbtuheWPt1hqf0J9qJepLP7RvmcRLWwQ9MhSevJKVjaSbfIPG9L92CHpizQXSA9Q+G5mn+F9IF9iVUs/QwoutqAFqtiV6optbQYSbUpmz75xrlNF5DqUItogx2E0lMpvBJWy5Ki0R8WNY3VIalUlNaqaz3nrY+VdCD6BTiC9P3xV9ILdKGowHU5KJKSNqv0Xkamum0MLL2VcrpoBrp9KTlAdpENsH8sq92nZ2jsUO+fg6XjIu/PdVsiXVTXUEjZXLly/Sf6BRWZffH6xpfUAAAAAElFTkSuQmCC>
