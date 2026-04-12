# Medplum Deep Research: noah-rn Agentic Clinical Workspace Integration

```yaml
---
provenance:
  document_type: "research-distillation"
  target_consumer: "claude-code-cli-agent"
  format: "yaml-heavy for machine ingestion"
  sources:
    - type: "deep-research"
      provider: "claude-opus"
      method: "web search + web fetch + project knowledge cross-reference"
      date: "2026-04-04"
    - type: "deep-research"
      provider: "gemini"
      method: "web research report"
      date: "2026-04-04"
    - type: "project-knowledge"
      artifacts:
        - "noah-rn-research-distillation.md"
        - "docs/archive/noah-rn-phase2-prd.md"
        - "Orchestration_Topologies_and_Federated_Memory.md"
        - "Streaming_Inference_Fabric.md"
        - "Deployment_Scaling_and_Operational_Architecture.md"
  conflict_resolution: "gemini claims cross-checked against medplum.com/docs and github.com/medplum/medplum; hallucinated content filtered"
  filtered_from_gemini:
    - "'Noah AI Engine' use cases (Go/No-Go evaluation, drug discovery) — conflated with different product"
    - "'~50 packages' claim — actual count is 18"
    - "'Level Five agent' framing — marketing language with no architectural content"
    - "'33 MCP tools' attributed to official server — actually from community rkirkendall/medplum-mcp"
---
```

## 1. Platform Overview

```yaml
medplum:
  version: "5.1.5"
  release_date: "2026-03"
  license: "Apache-2.0"
  github: "github.com/medplum/medplum"
  stars: ~2200
  forks: ~710
  release_cadence: "weekly (~10 releases Q1 2026)"
  language: "TypeScript 5.9.2"
  runtime: "Node.js 22+"
  framework: "Express v5"
  database: "PostgreSQL 14-18"
  cache_queue: "Redis 7 + BullMQ"
  fhir_version: "R4 (4.0.1)"
  module_system: "ESM default, dual CJS+ESM for SDK"
  build_system: "Turborepo + npm workspaces"
  corporate: "Orangebot, Inc. | YC S22 | ~$6.5M raised | ~8-11 employees"
  what_it_is: |
    API-first FHIR R4 platform. Not just a FHIR server — includes built-in OAuth/OIDC,
    bot automation (Lambda + VM), subscriptions, access policies, terminology services,
    MCP integration, and React component library. All functionality exposed via REST + GraphQL
    with zero hidden internal pathways. AI agent gets identical programmatic access as human UI.
  architecture_key_decision: |
    Stores FHIR resources as raw JSON in ONE PostgreSQL table per resource type (not HAPI's
    single-table JPA). Search params extracted via FHIRPath, indexed transactionally at write
    time. Full-text search via PostgreSQL tsvector (no Elasticsearch dependency).
  published_benchmarks:
    peak_throughput: "6,738 req/s full CRUD (auth + read + write + search)"
    failures: "zero HTTP failures at peak"
    test_type: "production-mirror cluster"
```

## 2. Monorepo Packages

```yaml
packages:
  # --- CRITICAL for noah-rn ---
  - name: "@medplum/core"
    path: "packages/core"
    size: "3.47 MB"
    description: |
      Pure TypeScript SDK. MedplumClient handles FHIR CRUD, search, auth, WebSocket,
      FHIRPath evaluation, validation. Browser AND Node.js compatible.
    noah_rn_relevance: "CRITICAL — replaces raw fetch() calls to HAPI FHIR"
    key_exports:
      - "MedplumClient — authenticated FHIR client with caching"
      - "FHIRPath evaluation engine"
      - "FHIR search parameter parsing"
      - "OAuth 2.0 / SMART on FHIR token management"
      - "WebSocket subscription management"

  - name: "@medplum/fhirtypes"
    path: "packages/fhirtypes"
    size: "2.72 MB"
    description: |
      Auto-generated TypeScript interfaces for ALL FHIR R4 resources. Compile-time
      type safety — Patient.name enforced as HumanName[] not string.
    noah_rn_relevance: "CRITICAL — eliminates malformed FHIR resources at compile time"

  - name: "@medplum/mock"
    path: "packages/mock"
    description: "MockClient + mock FHIR data for unit testing"
    noah_rn_relevance: "HIGH — test skills without running any FHIR server"

  - name: "@medplum/react-hooks"
    path: "packages/react-hooks"
    size: "238 KB"
    description: |
      Headless React hooks: useMedplum, useResource, useSearch, useSubscription.
      Abstracts caching/fetching independent of UI library.
    noah_rn_relevance: "HIGH — headless data layer for React Native frontend"
    key_hooks:
      - "useMedplum() — global MedplumClient instance"
      - "useResource(type, id) — single resource by ID with caching"
      - "useSearch(type, params) — FHIR search with auto-fetch"
      - "useSubscription(criteria, callback) — WebSocket real-time events"

  - name: "@medplum/expo-polyfills"
    path: "packages/expo-polyfills"
    description: |
      Bridges web-based MedplumClient with React Native runtime. Two functions:
      1. polyfillMedplumWebAPIs() — injects mock web interfaces for SDK compatibility
      2. ExpoClientStorage — wraps Expo SecureStore (async, encrypted) to satisfy
         SDK's synchronous localStorage expectations. HIPAA-compliant credential storage.
    noah_rn_relevance: "CRITICAL — without this, MedplumClient crashes on React Native"
    integration_pattern: |
      // App.tsx — MUST call before any MedplumClient initialization
      import { polyfillMedplumWebAPIs } from '@medplum/expo-polyfills';
      polyfillMedplumWebAPIs();
      // Then wrap app in <MedplumProvider>

  # --- IMPORTANT for noah-rn ---
  - name: "@medplum/server"
    path: "packages/server"
    description: "FHIR R4 API server (Express v5)"
    noah_rn_relevance: "PRIMARY — replacement for HAPI FHIR Docker container"

  - name: "@medplum/definitions"
    path: "packages/definitions"
    size: "97.1 MB"
    description: "Raw FHIR data definitions for deep validation and schema parsing"
    noah_rn_relevance: "MEDIUM — local validation without server round-trip"

  - name: "@medplum/cli"
    path: "packages/cli"
    description: "CLI for CRUD, bulk import, bot deployment, Synthea data loading"
    noah_rn_relevance: "MEDIUM — dev workflow tooling"

  - name: "@medplum/bot-layer"
    path: "packages/bot-layer"
    description: "AWS Lambda Layer with pre-packaged bot dependencies"
    noah_rn_relevance: "MEDIUM — pattern for skill dependency packaging"

  # --- LOW priority / future ---
  - name: "@medplum/react"
    path: "packages/react"
    description: "React component library (Mantine v8, Storybook v9)"
    noah_rn_relevance: "LOW — web-only; NOT compatible with React Native"
    warning: |
      Built on Mantine v7+, PostCSS, HTML DOM elements (div, span).
      React Native uses native views (View, Text, ScrollView).
      CANNOT import @medplum/react into React Native — use @medplum/react-hooks instead.

  - name: "@medplum/agent"
    path: "packages/agent"
    description: "On-premise agent for HL7v2/MLLP, ASTM, DICOM bridging"
    noah_rn_relevance: "LOW — future EHR integration phase"

  - name: "@medplum/hl7"
    path: "packages/hl7"
    description: "HL7 v2 client and server (MLLP protocol)"
    noah_rn_relevance: "LOW — future integration"

  - name: "@medplum/fhir-router"
    path: "packages/fhir-router"
    description: "FHIR URL router"
    noah_rn_relevance: "LOW — internal server component"

  - name: "@medplum/cdk"
    path: "packages/cdk"
    description: "AWS CDK IaC (v2.212.0)"
    noah_rn_relevance: "LOW — production deployment only"

  - name: "@medplum/app"
    path: "packages/app"
    description: "Frontend admin app (React 19 + Mantine v8)"
    noah_rn_relevance: "LOW"

  - name: "@medplum/graphiql"
    path: "packages/graphiql"
    description: "Preconfigured GraphiQL IDE"
    noah_rn_relevance: "LOW"

  - name: "@medplum/generator"
    path: "packages/generator"
    description: "Code generator for TS types from FHIR spec"
    noah_rn_relevance: "LOW"

dependency_management:
  critical_rules:
    - "Use exact version strings (no ^ or ~) — Medplum mandates this"
    - "Use `npm ci` not `npm install` — relies on tested package-lock.json"
    - "NEVER use --force or --legacy-peer-deps"
    - "Deep reset: ./scripts/reinstall.sh (recursive clean install)"
```

## 3. Medplum vs HAPI FHIR — Decision Matrix

```yaml
comparison:
  verdict: "SWITCH to Medplum as primary FHIR backend"
  confidence: "HIGH"
  migration_risk: "LOW — incremental path available"

  critical_dimensions:
    typescript_sdk:
      medplum: "FIRST-CLASS: @medplum/core, @medplum/fhirtypes, compile-time type safety"
      hapi: "NONE: Java SDK only. TypeScript must use raw fetch()"
      winner: "medplum — eliminates impedance mismatch with noah-rn codebase"

    ai_agent_integration:
      medplum: "Official MCP server, $ai operation, AI access controls, Lambda streaming"
      hapi: "None built-in"
      winner: "medplum — no contest"

    realtime_events:
      medplum: "Subscriptions → Bots (TS lambdas), pre-commit interceptor, WebSocket push"
      hapi: "REST-hook subscriptions only, no built-in automation layer"
      winner: "medplum — subscription+bot = CDS pipeline out of the box"

    access_control:
      medplum: "AccessPolicy: element-level, criteria-based, FHIRPath write constraints, compartment multi-tenancy"
      hapi: "Interceptor-based, no built-in framework"
      winner: "medplum — 'can suggest, not act' enforced declaratively"

    authentication:
      medplum: "Built-in OAuth2, OIDC, SMART on FHIR v2.0.0, MFA, SSO, Google/Okta/Entra"
      hapi: "Must implement yourself"
      winner: "medplum"

    react_native_support:
      medplum: "@medplum/expo-polyfills + @medplum/react-hooks = headless mobile SDK"
      hapi: "Nothing — raw HTTP only"
      winner: "medplum — purpose-built for the noah-rn architecture"

    test_infrastructure:
      medplum: "@medplum/mock for unit tests without server; Synthea via CLI"
      hapi: "Pre-loaded Docker images with 629 Synthea patients"
      winner: "medplum — @medplum/mock enables serverless testing"

    graphql:
      medplum: "Built-in FHIR GraphQL endpoint + GraphiQL IDE"
      hapi: "Available but less integrated"
      winner: "medplum"

  secondary_dimensions:
    docker_setup:
      medplum: "4 containers (postgres, redis, server, app) via docker-compose"
      hapi: "1 container with embedded H2 DB"
      winner: "hapi — simpler cold start"
      note: "Minor — 30-minute one-time setup difference"

    fhir_versions:
      medplum: "R4 only"
      hapi: "DSTU2 through R5"
      winner: "hapi"
      note: "Irrelevant — noah-rn targets R4; US Core standard is R4"

    terminology:
      medplum: "SNOMED, LOINC, RxNorm, ICD-10, CPT via UMLS; $expand, $validate-code, $translate, $lookup"
      hapi: "Comprehensive with Elasticsearch-backed expansion"
      winner: "slight hapi edge in upload tooling"
      note: "Medplum v5 delivered 95% reduction in $expand latency"

    community:
      medplum: "~2.2K stars, smaller but active, weekly releases"
      hapi: "Larger, more established, broader enterprise adoption"
      winner: "hapi"
      note: "Medplum Apache-2.0 ensures fork-ability if company fails"

  keep_hapi_for: "interoperability testing against a second FHIR implementation"
```

## 4. Bot System → noah-rn Skill Architecture Mapping

```yaml
bot_architecture:
  what_bots_are: |
    TypeScript functions executing in sandboxed AWS Lambda (production) or Node.js VM
    (local dev). Receive rich execution context. Equivalent to noah-rn "skills" but
    with production-tested event-driven infrastructure.

  handler_signature: "handler(medplum: MedplumClient, event: BotEvent): Promise<any>"

  bot_event_interface:
    bot: "Reference<Bot> — the executing bot"
    contentType: "string — application/fhir+json, text/plain, x-application/hl7-v2+er7, etc."
    input: "string | Resource | Hl7Message | Record<string, any> — trigger payload"
    secrets: "Record<string, ProjectSetting> — project-level secrets (API keys)"
    traceId: "string? — request correlation ID"
    requester: "Reference<Bot|ClientApplication|Patient|Practitioner|RelatedPerson>"
    headers: "Record<string, string|string[]> — original HTTP headers"

  trigger_mechanisms:
    fhir_subscription:
      description: "rest-hook channel → Bot/<BOT_ID>"
      timing: "async (post-commit) OR sync (pre-commit with preCommitSubscriptionsEnabled)"
      noah_rn_analog: "CDS hook triggered by clinical event"
      criteria_examples:
        - "Observation?code=85354-9"  # blood pressure
        - "MedicationRequest?status=active"
        - "Encounter?status=in-progress"

    dollar_execute:
      description: "POST /fhir/R4/Bot/{id}/$execute"
      timing: "synchronous HTTP request/response"
      noah_rn_analog: "Direct skill invocation by LLM orchestrator"

    cron:
      description: "Scheduled recurring execution"
      noah_rn_analog: "Periodic background analysis, SLA checks, freshness monitoring"

    questionnaire_link:
      description: "Auto-trigger on QuestionnaireResponse creation"
      noah_rn_analog: "Assessment completion trigger (PHQ-9, fall risk, Braden)"

    custom_fhir_operation:
      description: "Bot linked to OperationDefinition via extension"
      noah_rn_analog: "Typed skill API with defined input/output schema"

  skill_mapping:
    medplum_concept: "noah_rn_equivalent"
    handler_signature: "Skill handler with injected FHIR client + context"
    event_input: "Skill input payload from hook trigger"
    event_secrets: "Skill configuration / LLM API credentials"
    medplum_client: "Agent's FHIR data access layer"
    access_policy: "Skill permission boundaries"
    audit_event: "Skill execution audit log"
    bot_version_history: "Skill version management"
    requester: "Originating clinician identity"
    trace_id: "Execution trace for debugging"

  lambda_constraints:
    max_compressed_size: "50 MB"
    default_timeout: "15 seconds"
    implication_for_noah_rn: |
      15s is insufficient for LLM inference chains. Bots must remain lightweight
      orchestrators: queue a Task resource, terminate, let external service process
      the AI generation, post result back via API. This matches noah-rn's async
      skill execution model.
    async_pattern: |
      1. Initiating Bot receives trigger
      2. Bot creates Task(status=requested) with input parameters
      3. Bot terminates (avoids timeout)
      4. External inference service subscribes to Task events
      5. Service processes AI generation (minutes)
      6. Service updates Task(status=completed) + posts result
      7. Subscription notifies mobile client via WebSocket

  audit_configuration:
    options:
      - destination: "resource"
        description: "Full AuditEvent persisted to FHIR DB"
        use_for: "ALL LLM-driven actions, clinical decision support"
      - destination: "log"
        description: "Console log (CloudWatch)"
        use_for: "High-volume routing, deterministic transformations"
      - destination: "off"
        description: "No audit"
        use_for: "Never for clinical paths"
    critical_rule: |
      High-volume HL7 message processing generates immense DB bloat with default
      AuditEvent creation. Configure Bot.auditEventDestination="log" for routing
      bots. ALWAYS preserve auditEventDestination="resource" for LLM-driven skills.

  dollar_extract_operation:
    description: |
      Bridges form-based data collection → structured FHIR resources.
      QuestionnaireResponse → Observation, Condition, Procedure resources
      based on Questionnaire template mappings.
    noah_rn_relevance: |
      When nurse completes intake assessment (PHQ-9, Braden, fall risk) via mobile app,
      $extract auto-generates structured Observations. Eliminates manual transcription.
      AI agent gets immediate access to coded data.
    flow: "QuestionnaireResponse → Bot → $extract → Observation[] + Condition[]"
```

## 5. MCP Integration & AI Features

```yaml
mcp:
  official_server:
    status: "beta (June 2025)"
    endpoint: "https://api.medplum.com/mcp/stream"
    transport: "SSE + Streamable HTTP"
    auth: "OAuth 2.0"
    tool: "fhir-request (single low-level tool — any FHIR REST operation)"
    capabilities:
      - "FHIR CRUD on any resource type"
      - "Search with full FHIR query syntax"
      - "Bot $execute invocation"
      - "Agent $push for HL7v2 message construction"
      - "Bulk operations"
    warning: "EXPERIMENTAL — not for PHI/production (no HIPAA BAA from LLM vendors)"

  community_servers:
    - name: "rkirkendall/medplum-mcp"
      tools: 33
      transport: "stdio"
      license: "MIT"
      tool_categories:
        - category: "Patient Management"
          count: 4
          examples: "createPatient, getPatientById, updatePatient"
        - category: "Practitioner & Organization"
          count: 9
          examples: "managing rosters, assigning care teams"
        - category: "Encounters & Episodes"
          count: 8
          examples: "tracking episodes of care, opening encounters"
        - category: "Clinical Data"
          count: 4
          examples: "fetching Observations, parsing lab results"
        - category: "Medications"
          count: 7
          examples: "MedicationRequest CRUD, drug interaction analysis"
        - category: "Generic FHIR"
          count: 1
          examples: "fhir-request for arbitrary REST calls"
      advantage: "Higher-level tools than official single fhir-request"
    - name: "@ncodeuy/medplum-mcp"
      transport: "npm deployable via npx"

  dollar_ai_operation:
    endpoint: "/fhir/R4/$ai"
    description: |
      FHIR-compliant operation for direct LLM invocation via Medplum API.
      Supports standard request/response AND streaming modes.
    input_format: |
      Parameters resource containing:
      - messages: JSON array of conversation history
      - model: string (e.g. "gpt-4")
      - tools: array of function definitions with JSON schema
      - authentication credentials
    function_calling_flow: |
      1. Client sends prompt + tool definitions to $ai
      2. LLM determines if tool call needed
      3. If yes: returns tool_call response (suspends text generation)
      4. Backend executes function against FHIR DB
      5. Second request to LLM with tool_call_output appended
      6. LLM generates final response with tool results incorporated
    noah_rn_relevance: |
      Multi-turn orchestration: parse clinical note → detect missing lab →
      invoke fetch tool → synthesize complete summary. Maps directly to
      noah-rn's skill chaining architecture.

  lambda_streaming:
    added: "February 2026"
    description: "SSE-style streaming from Lambda-hosted bots"
    use_case: "AI scribes, copilots, conversational CDS"
    noah_rn_relevance: "Enables real-time token streaming to mobile interface"

  ai_access_controls:
    pattern: "can suggest, but not act"
    mechanism: "AccessPolicy on AI agent's ProjectMembership"
    enforcement: "Write constraints via FHIRPath, status restrictions"
    audit: "AuditEvent for every AI read/write — immutable"
```

## 6. Access Control & Security Model

```yaml
access_control:
  framework: "AccessPolicy resource — NOT simple RBAC roles"
  capabilities:
    - "Resource-level: block, read-only, or read/write per type"
    - "Element-level: hiddenFields, readonlyFields"
    - "Criteria-based row filtering via FHIR search syntax"
    - "FHIRPath write constraints with %before/%after variables"
    - "Compartment-based multi-tenancy"
    - "Parameterized templates with %profile and custom %variables"
    - "IP Access Rules (whitelist/blacklist IPv4 addresses/subnets)"

  ai_agent_policy_example:
    resourceType: "AccessPolicy"
    name: "noah-rn CDS Agent"
    resource:
      - resourceType: "Patient"
        readonly: true
      - resourceType: "Observation"
        readonly: true
      - resourceType: "Condition"
        readonly: true
      - resourceType: "MedicationRequest"
        readonly: true
      - resourceType: "Encounter"
        readonly: true
      - resourceType: "ClinicalImpression"
        readonly: false
        writeConstraint:
          - language: "text/fhirpath"
            expression: "status = 'in-progress'"
      - resourceType: "Task"
        readonly: false
        writeConstraint:
          - language: "text/fhirpath"
            expression: "status = 'draft'"
      - resourceType: "ServiceRequest"
        readonly: false
        writeConstraint:
          - language: "text/fhirpath"
            expression: "status = 'draft'"
      - resourceType: "AuditEvent"
        interaction: ["read", "search"]
    enforcement_mechanism: |
      AI drafts ServiceRequest(status=draft) → human reviews →
      human transitions to active/completed. FHIRPath constraint
      "%before.exists() implies %before.status != 'final'" prevents
      AI from finalizing any clinical documentation.

  multi_tenancy:
    mechanism: "Compartment-based isolation (not separate databases)"
    compartment_types:
      Organization: "MSOs, multi-clinic — strict vertical separation"
      HealthcareService: "Intra-hospital departments (Oncology vs Cardiology)"
      CareTeam: "Patient-centric — dynamic access as clinicians join/leave"
    how_it_works: |
      1. Patient registered → $set-accounts links to tenant Organization
      2. All linked resources (Observation, MedicationRequest, etc.) inherit compartment
      3. Agent's ProjectMembership scoped to compartment
      4. Query engine auto-appends filters — agent ONLY sees authorized data

  open_registration_warning: |
    If enabled for patient self-enrollment: MUST enforce default Patient AccessPolicy
    restricting new account to own Patient resource compartment only. Otherwise exposes
    project data structure to unverified accounts.

  ip_access_rules: |
    Embedded in AccessPolicy. Whitelist/blacklist IPv4 addresses or subnets.
    For hospital deployment: block all traffic outside approved VPN ranges.
```

## 7. Clinical Workflows & CDS

```yaml
cds_status:
  cds_hooks_standard:
    status: "in development — HTI-4 compliance initiative"
    enforcement_date: "January 2027"
    current_recommendation: "Use Bots + Subscriptions as pragmatic CDS implementation"

  cds_implementation_pattern:
    trigger: "FHIR Subscription on resource create/update"
    processing: "Bot executes CDS logic (rules, ML model via ONNX, LLM call)"
    output: "ClinicalImpression, Task, or Flag resource"
    sync_option: "preCommitSubscriptionsEnabled for synchronous interception"
    cds_categories:
      predictive: "ML models deployed via ONNX in Bots"
      linked_referential: "Infobutton-style hyperlinks to reference material"
      evidence_based: "Drug interactions via SMART apps or APIs"

  onc_certification:
    g10_api: "CERTIFIED (US Core IG STU 5.0.1, CHPL listed)"
    a9_predictive_cds: "NOT YET — pursuing"
    a3_a4_linked_referential: "NOT YET — pursuing"

charting:
  soap_model:
    subjective: "Observation(performer=Patient)"
    objective: "Observation(performer=Practitioner|Device)"
    assessment: |
      ClinicalImpression — preferred over DocumentReference because:
      - Discrete, searchable fields (not opaque blob)
      - Status workflow (in-progress → completed)
      - Native references to supporting Observations
      - Signing: status=completed + Provenance = signed note
    plan: "ServiceRequest, MedicationRequest, CarePlan"
  noah_rn_mapping: |
    noah-rn skill output → ClinicalImpression(status=in-progress)
    Nurse reviews → transitions to completed
    Provenance resource attributes AI-generated content to agent identity

list_and_task_resources:
  List:
    use_cases:
      - "Active problem list"
      - "Allergy list"
      - "Patient cohort flagged by predictive model"
    agent_pattern: |
      AI agent performing HAI prediction populates List with high-risk Patient
      references, mode=changes for real-time updates.
  Task:
    use_cases:
      - "Work item requiring human action"
      - "Multi-agent task queue routing"
    agent_pattern: |
      AI evaluates chart → creates Task(status=draft, code=assessment-needed)
      → routed to appropriate practitioner by specialty/availability.
      Supports top-of-license care workflows.

questionnaires:
  features: "Form builder, $extract to Observations, Bot auto-trigger on completion"
  dollar_extract: |
    QuestionnaireResponse → $extract → structured Observation[], Condition[]
    based on Questionnaire template mappings. Eliminates manual transcription.
    Critical for: PHQ-9, Braden scale, fall risk, NIHSS, GCS assessments.

terminology:
  systems: ["SNOMED CT", "LOINC", "RxNorm", "ICD-10", "CPT"]
  operations: ["$expand", "$validate-code", "$translate", "$lookup"]
  source: "UMLS semiannual imports (latest 2025AA)"
  v5_improvement: "95% reduction in $expand latency, synonym search"
```

## 8. Real-Time Architecture

```yaml
websocket_subscriptions:
  mechanism: |
    useSubscription hook → lightweight in-memory WebSocket connection
    bound to FHIR search criteria (e.g. Communication?encounter=123).
    Server pushes event when matching resource changes.
  binding_token: "GET /fhir/R4/Subscription/{id}/$get-ws-binding-token"
  noah_rn_use: |
    Mobile chat interface: when AI agent posts ClinicalImpression or
    Communication to server, WebSocket pushes notification → client
    re-renders → auto-scrolls to new content. No polling.

communication_resources:
  architecture: |
    Chat is NOT proprietary tables — it's native FHIR Communication resources
    structured as hierarchical trees. Parent thread establishes context
    (Patient subject, Practitioner sender). Child Communications = messages.
  features:
    - "Media attachments via Binary resources"
    - "Read receipt tracking via resource status"
    - "Omni-channel routing"
  noah_rn_pattern: |
    Clinician types query → POST Communication(child) →
    AI agent processes → POST Communication(response) →
    WebSocket pushes to client → UI re-renders

fhircast:
  spec: "FHIRcast STU3"
  protocol: "HTTP + WebSocket publish/subscribe"
  description: |
    Real-time context synchronization across devices. Extension of SMART on FHIR
    launch protocol. Replaces legacy CCOW.
  roles:
    context_source: "Application initiating change (desktop EHR)"
    context_subscriber: "Application reacting (noah-rn mobile agent)"
  events:
    Patient-open:
      trigger: "User selects new patient"
      noah_rn_action: "Agent auto-retrieves patient summary, labs, meds, problems"
    Encounter-open:
      trigger: "New encounter initiated"
      noah_rn_action: "Triggers CDS models for real-time recommendations"
    DiagnosticReport-update:
      trigger: "Radiologist adds findings to imaging study"
      noah_rn_action: "Agent updates care plan without manual transcription"
    DiagnosticReport-select:
      trigger: "User highlights section of report"
      noah_rn_action: "Focuses LLM attention on highlighted text for targeted Q&A"
  noah_rn_value: |
    As clinician moves room-to-room, context update in one system synchronizes
    AI agent on mobile. Drastically reduces cognitive load and chart-entry errors.
    Agent proactively prepares patient briefing BEFORE clinician requests it.
```

## 9. Rate Limiting & Scaling

```yaml
rate_limits:
  total_requests:
    free_tier: "6,000 req/IP/minute"
    enterprise: "60,000 req/IP/minute"
  fhir_interaction_load:
    description: "Point-based quota — operations weighted by computational cost"
    points:
      Read: 1
      History: 10
      Search: 20
      Create: 100
      Update: 100
      Patch: 100
      Delete: 100
    example_workflow_cost: |
      Agent searches 10 params (200 pts) + reads 50 records (50 pts) +
      patches 10 resources (1000 pts) = 1,250 points in seconds.
      Multiple concurrent agents exhaust quota rapidly.
    mitigation: |
      Monitor RateLimit HTTP headers:
      - r=X (units remaining)
      - t=X (seconds until reset)
      Implement algorithmic backoff BEFORE triggering 429.
    configuration: |
      Override limits at Server, Project, or User level via
      systemSettings field on Project resource.

self_hosting:
  docker_quickstart:
    commands:
      - "curl https://raw.githubusercontent.com/medplum/medplum/refs/heads/main/docker-compose.full-stack.yml > docker-compose.yml"
      - "docker compose up -d"
    services: ["PostgreSQL:5432", "Redis:6379", "Server:8103", "App:3000"]
  operational_burden: |
    Estimated 0.5 FTE for ongoing DB maintenance, PostgreSQL upgrades,
    24/7 on-call incident response. Significant for solo founder.
  cloud_alternative: |
    Managed cloud abstracts infrastructure scaling, security patching,
    log streaming to Datadog/Sumo Logic. Better for noah-rn development
    phase — focus on AI architecture, not database management.
```

## 10. Compliance

```yaml
compliance:
  achieved:
    - "ONC (g)(10) — CERTIFIED, CHPL listed, US Core IG STU 5.0.1"
    - "SOC 2 Type II"
    - "HIPAA compliant — will sign BAA"
    - "CFR Part 11 (FDA electronic records)"
    - "CLIA/CAP documented"
    - "ISO 9001 documented"
  in_progress:
    - "HTI-4 (enforcement January 2027) — includes CDS Hooks"
    - "HITRUST"
    - "ISO 27001"
  not_yet:
    - "ONC (a)(9) Predictive CDS — pursuing"
    - "ONC (a)(3,4) Linked Referential CDS — pursuing"
  trust_center: "https://app.vanta.com/medplum.com/trust/ybe9my9rkc6ok8yijm04h"
  cds_exemption_note: |
    Medplum positions as platform for building CDS, not standalone CDS product.
    noah-rn's CDS exemption positioning is independent of Medplum's certification.
    noah-rn four-part test (no image analysis, displays/analyzes medical info,
    supports without replacing judgment, enables independent review) still applies.
```

## 11. First-Party Integrations

```yaml
integrations:
  ehr:
    - name: "Epic Systems"
      capability: "Bidirectional Read/Write via FHIR APIs + Epic JWT auth"
      noah_rn_relevance: "Mission 3 — read from/write to legacy Epic deployments"
  hie:
    - name: "Health Gorilla Patient 360"
      capability: "External patient records, ADT data, longitudinal analytics"
    - name: "Zus Health"
      capability: "Aggregated patient data across providers"
  diagnostics:
    - name: "Labcorp"
      capability: "Autonomous lab order routing + structured result ingestion"
    - name: "Quest Diagnostics"
      capability: "Same as Labcorp"
    - name: "Health Gorilla Lab Network"
      capability: "Aggregated lab network access"
  billing:
    - name: "Candid Health"
      capability: "Revenue cycle management"
  communications:
    - name: "eFax"
      capability: "Fax send/receive mapped to FHIR Communication resources"
  identity:
    - name: "Okta"
    - name: "Auth0"
    - name: "Google Authentication"
    - name: "Microsoft Entra SSO"
  imaging:
    - name: "FHIRcast"
      capability: "Real-time PACS context sharing (Rad AI uses this)"
```

## 12. Key Server Configuration

```yaml
server_config:
  preCommitSubscriptionsEnabled:
    type: "boolean"
    default: false
    noah_rn_relevance: "CRITICAL for real-time CDS — synchronous interception before resource commit"
  vmContextBotsEnabled:
    type: "boolean"
    default: false
    noah_rn_relevance: "HIGH for local dev (not a security sandbox)"
  botCustomFunctionsEnabled:
    type: "boolean"
    default: false
  defaultBotRuntimeVersion:
    values: ["awslambda", "vmcontext"]
  maxJsonSize:
    description: "Increase for Synthea bundle imports"

api_endpoints:
  fhir_base: "/fhir/R4"
  bot_execute: "/fhir/R4/Bot/{id}/$execute"
  bot_deploy: "/fhir/R4/Bot/{id}/$deploy"
  ai_operation: "/fhir/R4/$ai"
  mcp_stream: "/mcp/stream"
  smart_launch: "/fhir/R4/ClientApplication/$smart-launch"
  oauth_authorize: "/oauth2/authorize"
  oauth_token: "/oauth2/token"
  valueset_expand: "/fhir/R4/ValueSet/$expand"
  plan_apply: "/fhir/R4/PlanDefinition/{id}/$apply"
  bulk_export: "/fhir/R4/$export"
  ws_binding: "/fhir/R4/Subscription/{id}/$get-ws-binding-token"
  healthcheck: "/healthcheck"
  jwks: "/.well-known/jwks.json"
```

## 13. Recommended Architectural Patterns

```yaml
patterns:
  pattern_1_skills_as_operations:
    name: "Skills as Custom FHIR Operations"
    flow: "OperationDefinition → Bot (skill) → LLM call → Response cards"
    advantage: "Typed input/output schema per skill"
    when: "Synchronous skill invocation by orchestrator"
    mechanism: "Bot linked to OperationDefinition via extension"

  pattern_2_event_driven_routing:
    name: "Event-Driven Skill Routing"
    flow: "FHIR write → Subscription → Router Bot → LLM evaluation → Skill Bots"
    advantage: "Decoupled, reactive triggering"
    when: "CDS when clinical data changes"
    mechanism: "Subscription criteria + Bot $execute chain"

  pattern_3_mcp_agent_loop:
    name: "MCP-Powered Agent Loop"
    flow: "Claude (via MCP) → fhir-request → Read context → Bot/$execute → Recommendations"
    advantage: "LLM navigates FHIR data, chooses skills autonomously"
    when: "Conversational CDS, complex multi-step reasoning"
    mechanism: "Official MCP endpoint + fhir-request tool"

  pattern_4_precommit_interceptor:
    name: "Pre-Commit Interceptor for Real-Time CDS"
    flow: "Clinician action → Resource write → Pre-commit subscription → CDS Bot → Validate/flag"
    advantage: "Synchronous safety check BEFORE data persistence"
    when: "Drug interactions, duplicate orders, safety checks"
    mechanism: "preCommitSubscriptionsEnabled server config"
    warning: "Must be fast — blocks the write operation"

  pattern_5_async_llm_via_task:
    name: "Async LLM Inference via Task Queue"
    flow: |
      1. Trigger Bot receives event
      2. Creates Task(status=requested) with input
      3. Bot terminates (avoids 15s Lambda timeout)
      4. External inference service subscribes to Task events
      5. Processes AI generation (minutes)
      6. Updates Task(status=completed) + posts result
      7. WebSocket notifies mobile client
    advantage: "Handles arbitrarily complex LLM chains without timeout"
    when: "Any LLM inference that may exceed 15 seconds"
    mechanism: "Task resource + Subscription + external service"
```

## 14. React Native Frontend Architecture

```yaml
react_native_strategy:
  approach: "Headless hooks — NOT Medplum React components"
  reason: |
    @medplum/react depends on Mantine v8, PostCSS, HTML DOM.
    React Native uses native views (View, Text, ScrollView).
    These are structurally incompatible.

  required_packages:
    - "@medplum/core"
    - "@medplum/fhirtypes"
    - "@medplum/react-hooks"
    - "@medplum/expo-polyfills"

  initialization_sequence:
    step_1: "import { polyfillMedplumWebAPIs } from '@medplum/expo-polyfills'"
    step_2: "polyfillMedplumWebAPIs()  // BEFORE any MedplumClient init"
    step_3: "Wrap app in <MedplumProvider>"
    step_4: "Use useMedplum(), useResource(), useSearch(), useSubscription()"

  credential_storage: |
    ExpoClientStorage wraps Expo SecureStore (Apple Keychain / Android Keystore).
    Async, encrypted, HIPAA-compliant. Transparently handles SDK's synchronous
    localStorage expectations.

  recommended_ui_stack:
    components: "gluestack-ui v2"
    styling: "Tailwind CSS (NativeWind)"
    features: "Native animations, dark mode, safe area handling"

  chat_interface:
    data_model: "FHIR Communication resources as hierarchical trees"
    real_time: "useSubscription(criteria) → WebSocket → auto-render"
    media: "Binary resources for image/video attachments"
```

## 15. Phased Action Plan

```yaml
actionable_now:
  immediate:
    - action: "Stand up Medplum Docker alongside existing HAPI FHIR"
      command: |
        curl https://raw.githubusercontent.com/medplum/medplum/refs/heads/main/docker-compose.full-stack.yml > docker-compose.yml
        docker compose up -d
      effort: "30 minutes"
      value: "Hands-on platform evaluation"

    - action: "Install core Medplum packages in noah-rn"
      command: "npm install @medplum/core @medplum/fhirtypes @medplum/expo-polyfills @medplum/react-hooks"
      effort: "5 minutes"
      value: "Compile-time FHIR type safety + mobile SDK"

    - action: "Install mock for unit testing"
      command: "npm install -D @medplum/mock"
      effort: "5 minutes"
      value: "Test skills without running FHIR server"

    - action: "Load Synthea data into Medplum"
      effort: "1 hour"
      value: "Realistic test data (replaces MIMIC-IV for initial dev)"

  phase_2_refactor:
    - action: "Replace raw FHIR HTTP calls with MedplumClient"
      effort: "2-4 hours"
      value: "Type-safe, authenticated, cached FHIR access"

    - action: "Model skill handlers after BotEvent interface"
      pattern: "handler(client: MedplumClient, event: SkillEvent): Promise<SkillResult>"
      value: "Proven production pattern for context injection, secrets, audit"

    - action: "Define AccessPolicy for AI agent identity"
      value: "Enforce 'can suggest, not act' boundary from day one"

    - action: "Implement ClinicalImpression-based skill output"
      pattern: "AI → ClinicalImpression(status=in-progress) → nurse review → finalize"
      value: "Aligns with CDS exemption criteria 3 and 4"

  phase_3_cds:
    - action: "CDS triggers via FHIR Subscriptions + Bots"
      example: "Subscription on MedicationRequest → Bot → LLM drug interaction check"

    - action: "Evaluate pre-commit subscriptions for synchronous CDS"
      config: "preCommitSubscriptionsEnabled: true"

    - action: "Implement $extract for structured assessment capture"
      flow: "QuestionnaireResponse → $extract → Observation[] for Braden, GCS, NIHSS"

  phase_4_agent_integration:
    - action: "Integrate MCP for Claude ↔ FHIR interaction"
      blocker: "MCP experimental, no HIPAA BAA from hosted LLM vendors"
      alternative: "Self-hosted LLM or BAA-covered provider"

    - action: "Lambda streaming for conversational CDS interface"
      use_case: "Real-time AI scribe/copilot at bedside"

    - action: "FHIRcast integration for multi-device context sync"

  phase_5_production:
    - action: "Deploy Medplum via AWS CDK"
      components: "ECS Fargate, Aurora PostgreSQL, ElastiCache Redis, Lambda"

    - action: "Deprecate HAPI FHIR (keep as interop test target only)"

    - action: "Evaluate Medplum Agent for HL7v2 integration with hospital systems"

risks:
  - risk: "MCP not HIPAA-compliant for PHI with hosted LLMs"
    mitigation: "Self-hosted LLM or BAA-covered provider"
  - risk: "Medplum small company (~8-11 employees)"
    mitigation: "Apache-2.0 license ensures fork-ability"
  - risk: "Bot Lambda 15s timeout insufficient for LLM inference"
    mitigation: "Async Task queue pattern (Pattern 5)"
  - risk: "CDS Hooks not yet formally implemented"
    mitigation: "Bots + Subscriptions provide equivalent; formal CDS Hooks coming HTI-4"
  - risk: "Rate limit exhaustion with multiple concurrent agents"
    mitigation: "Monitor RateLimit headers, implement algorithmic backoff"
  - risk: "R4 only (no R5)"
    mitigation: "R4 is US Core standard; R5 migration future concern"
```

## 16. Key Differences from noah-rn Research Distillation

```yaml
alignment_with_existing_research:
  confirms:
    - "FHIR MCP servers already exist — noah-rn consumes MCP, doesn't build from scratch"
    - "Sequencing: standalone output → read-only FHIR → write-back"
    - "Tier 1 hooks must remain executable code, not prompt instructions"
    - "CDS exemption four-part test as regulatory north star"
    - "Universal skill output: summary → evidence → confidence → provenance"
    - "'AI suggests, human decides' as architectural constraint"

  adds:
    - "AccessPolicy write constraints enforce 'suggest not act' DECLARATIVELY — superior to app-level"
    - "BotEvent interface = production-tested skill invocation envelope noah-rn should adopt"
    - "Pre-commit subscriptions fill CDS Hooks gap without waiting for formal standard"
    - "@medplum/expo-polyfills solves React Native SDK compatibility"
    - "$extract operation automates assessment → structured data pipeline"
    - "Communication resources + WebSocket = FHIR-native chat (not proprietary)"
    - "FHIRcast STU3 enables multi-device context sync without CCOW"
    - "Rate limit point system requires careful agent query optimization"
    - "Lambda 15s timeout requires async Task queue for LLM inference"
    - "ClinicalImpression preferred over DocumentReference for CDS output"

  updates_distillation:
    - pattern: "FHIR MCP servers already exist"
      update: "Medplum's official MCP is the strongest candidate — direct Bot/$execute + full FHIR CRUD"
    - pattern: "HAPI FHIR as dev/test backend"
      update: "Medplum provides dramatically more value — TypeScript SDK, bots, auth, MCP, mock testing"
    - pattern: "Langfuse for Mission 2 LLMOps"
      update: "Medplum AuditEvent + Bot audit config provides built-in observability for FHIR-bound operations"
```
