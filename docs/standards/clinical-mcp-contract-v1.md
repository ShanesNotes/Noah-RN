# Clinical-MCP Contract v1.0.0

> Published 2026-04-16. This is the normative schema any EHR implements to be agent-ready. Product B (the Noah RN Agent-Native Nursing EHR) implements it today via `services/clinical-mcp/`. Third-party implementations — an Epic-bridge, Cerner-bridge, or any FHIR R4 backbone — are explicitly supported and expected.

## Status

- **Version.** v1.0.0 (initial publication).
- **Stability.** Core shapes are frozen for v1. Additive changes (new optional fields, new tools) go in v1.minor. Breaking changes (removed fields, semantic shifts) require v2.
- **Source of truth.** This file + the JSON Schemas under [`schemas/`](schemas/) are the authoritative contract. The Product B server implementation is expected to conform; other implementations are expected to conform; any divergence is a contract violation on the implementation's side, not the contract's side.

## Purpose

An agent-native EHR exposes an MCP surface an agent harness can reach. The agent never couples to the EHR's internal types; it couples to this contract. An EHR conforming to this contract can host any agent harness that speaks it, including the Noah RN Agent Harness. Conversely, the Noah RN Agent Harness can drop into any EHR implementing this contract with no changes to its workflows.

## Product boundary

Under the three-product topology (see [`../plans/three-product-alignment-2026-04-16.md`](../plans/three-product-alignment-2026-04-16.md)), this contract is the seam between:

- **Product A — Noah RN Agent Harness.** MCP client.
- **Product B — Agent-Native Nursing EHR.** MCP server implementing this contract.

Product C (Agent-Native Clinical Simulation) exposes a separate contract for sim-specific tools (Phase 8 of the alignment plan). Product C writes into Product B via FHIR; agents reach Product C via its own MCP surface, not through this contract.

## Tool inventory

Agent-callable MCP tools:

| Tool | Direction | Status in Product B | Schema |
|---|---|---|---|
| `get_patient_context` | read | implemented | [schemas/patient-context-bundle.schema.json](schemas/patient-context-bundle.schema.json) |
| `list_patients` | read | implemented | `PatientSummary[]` — see below |
| `inspect_context` | read | implemented | `ContextAssemblyTrace` — see below |
| `get_medication_list` | read | implemented | [schemas/medication-list-view.schema.json](schemas/medication-list-view.schema.json) |
| `queue_draft_task` | write | implemented | [schemas/draft-task-write-input.schema.json](schemas/draft-task-write-input.schema.json) |
| `create_draft_document` | write | implemented | [schemas/draft-document-write-input.schema.json](schemas/draft-document-write-input.schema.json) |
| `queue_draft_medication_administration` | write | implemented | [schemas/draft-medication-administration-write-input.schema.json](schemas/draft-medication-administration-write-input.schema.json) |
| `record_provenance` | write | implemented | [schemas/provenance-envelope.schema.json](schemas/provenance-envelope.schema.json) |
| `finalize_draft_document` | write | **planned (Phase 4b)** | `FinalizeDraftDocumentInput` — see below |
| `lookup_drug` | read | implemented | Resource-lane tool routed through `clinical-resources/drug-reference/`. See `@noah-rn/contracts/drug-reference`. |

Product B internal write functions (NOT agent-callable MCP tools — called by the nursing-station UI or the Medplum worker on behalf of a human Practitioner; the write path rejects agent performer references):

| Function | Purpose | Status | Backing code |
|---|---|---|---|
| `chartMedicationAdministration` | Finalize a human-attested medication administration | implemented | `services/clinical-mcp/src/fhir/writes.ts` |
| `holdMedicationAdministration` | Hold a scheduled medication with documented reason | implemented | `services/clinical-mcp/src/fhir/writes.ts` |
| `recordProcedure` | Record a completed procedure with optional MedAdmin `partOf` links (e.g. RSI) | implemented | `services/clinical-mcp/src/fhir/writes.ts` |
| `recordHumanAttestedProvenance` | Human-authored Provenance (`activity=record`, Practitioner agent) | implemented | `services/clinical-mcp/src/fhir/writes.ts` |

Implementations must mark each tool `implemented`, `planned`, or `unsupported` in their conformance manifest. A tool that is neither exposed nor marked `unsupported` is a contract violation.

## Core types

### Identifier and reference shapes

All patient identifiers conform to `^[a-zA-Z0-9\-_.]+$`. All FHIR resource references follow the `<ResourceType>/<id>` string form per FHIR R4.

### PatientContextBundle

The core context bundle returned by `get_patient_context`. Full schema at [`schemas/patient-context-bundle.schema.json`](schemas/patient-context-bundle.schema.json). Required fields:

- `patient` — identity bundle: `id`, `name`, `dob`, `gender`.
- `timeline` — ordered list of `TimelineEntry` (observations, conditions, medication requests, medication administrations, encounters, notes, devices).
- `trends` — computed trend summaries per measurement.
- `gaps` — explicit missing-data callouts (string reasons).
- `assembledAt` — ISO 8601 timestamp.
- `sources` — list of FHIR resource types actually queried.
- `tokenEstimate` — approximate token size.
- `budgetTruncated` — boolean; true if context compression dropped older entries.
- `truncatedCount` — how many entries were dropped.

Optional extensions (v1.minor allowed):

- `laneCoverage` — `{ 'ehr/chart': Coverage, memory: Coverage, 'clinical-resources': Coverage, 'patient-monitor/simulation': Coverage }` where `Coverage ∈ 'present' | 'partial' | 'missing' | 'not-assembled'`. If absent, consumers may infer from `sources`.

### TimelineEntry (discriminated union)

Each entry carries a `type` discriminator plus a FHIR `resource`:

- `observation` (subtype: `vital | lab | survey | unknown`)
- `condition`
- `medication` (backed by MedicationRequest)
- `medicationAdministration`
- `note` (backed by DocumentReference)
- `encounter`
- `device`

Every entry carries `timestamp` (FHIR `effectiveDateTime` or equivalent), `relativeTime` (`T-0h`, `T-4h`, `T-12h`, `T-3d` format), and `relativeMinutes` (sortable integer).

### Provenance envelope

Every write tool MUST produce a FHIR Provenance resource describing authorship. See [`schemas/provenance-envelope.schema.json`](schemas/provenance-envelope.schema.json) for required fields. The envelope distinguishes:

- **Agent-authored** — `agent.who.display = 'Noah RN Agent'` (or the agent identifier), `activity = propose`, `source-layer = L3-original`.
- **Human-authored** — `agent.who = Practitioner/{id}`, `activity = record`, no `source-layer`.
- **Device-authored** — `agent.who.display = 'Device/{deviceId}'`, `source-layer = L1-device-stream`. Used by Product C device-bridge writes.
- **Historical-seed** — `agent.who.display = 'historical-seed'`, `source-layer = L0-history`. Only Product C's historical-seed loader may emit this; runtime writes carrying this author MUST be rejected by the write path.

The closed-set `agent.who.display` vocabulary for v1 is: `'Noah RN Agent'`, `Practitioner/{id}`, `Device/{deviceId}`, `historical-seed`, `device-auto`. Additions require a v1.minor extension or v2.

### Lane vocabulary

Normative lane names used in context bundles, renderer input, and observability:

- `ehr/chart`
- `memory`
- `clinical-resources`
- `patient-monitor/simulation`

Extensions are permitted but must be namespaced (e.g. `ext:telemetry/smart-pump`).

## Read tools

### `get_patient_context`

```
input:  { patient_id: string, context_budget?: number }
output: PatientContextBundle
```

Assembles a context bundle for a given patient ID up to the optional token budget (default 4000). Implementation MAY apply compression; if so, `budgetTruncated` MUST be `true` and `truncatedCount` MUST reflect dropped entries.

### `list_patients`

```
input:  { count?: number }  // 1..500, default 100
output: Array<{ id: string, name: string, dob?: string, gender?: string }>
```

Returns available patient identities the agent can reference.

### `inspect_context`

```
input:  { patient_id: string }
output: {
  queries_fired: string[],
  record_counts: Record<string, number>,
  gaps: string[],
  token_estimate: number,
  assembled_at: string
}
```

Debug/audit surface: returns the assembly trace for `patient_id` without the full bundle.

### `get_medication_list` (planned — Phase 4)

```
input:  { patient_id: string, filter?: { status?: 'active' | 'held' | 'all' } }
output: MedicationListView
```

Returns the MAR view: active `MedicationRequest`s, recent `MedicationAdministration`s, computed `scheduled | overdue | PRN | held` states, and high-alert flags where drug-reference metadata is available.

## Write tools (draft-review lifecycle)

All write tools implement the Contract 5 draft-review lifecycle: agent writes land as drafts, humans review and finalize, Provenance is recorded on every write.

### `queue_draft_task`

```
input:  DraftTaskWriteInput (see schemas/draft-task-write-input.schema.json)
output: Task (FHIR R4, status=requested)
```

### `create_draft_document`

```
input:  DraftDocumentWriteInput
output: DocumentReference (status=current, docStatus=preliminary)
```

### `queue_draft_medication_administration`

```
input:  DraftMedicationAdministrationWriteInput
output: MedicationAdministration (status=not-done, statusReason.code=draft-proposal)
```

A draft MAR entry. `status=not-done` with `statusReason.code=draft-proposal` keeps it unmistakably non-final because FHIR R4 has no `preliminary` docStatus for MedicationAdministration. A paired review `Task` is typically queued alongside.

### `record_provenance`

```
input:  { target: Reference, executionId?: string }
output: Provenance
```

MANDATORY with every write. Implementations SHOULD call it inside their write tools rather than requiring the agent to.

### `finalize_draft_document` (planned — Phase 4)

```
input:  { document_reference_id: string, reviewer_id: string, attestation_text?: string }
output: DocumentReference (status=current, docStatus=final)
```

Promotes a preliminary `DocumentReference` to final with an attestation Provenance. Reviewer identity is required.

## Error model

Implementations return errors as structured MCP tool errors:

```
{ error: { code: string, message: string, retryable: boolean } }
```

Standard codes:

- `not_found` — resource/patient not in backing store.
- `validation_error` — input did not match schema.
- `fhir_error` — underlying FHIR server rejected the write.
- `forbidden` — write policy (e.g. finalizing without attestation, agent attempting human-only action).
- `internal_error` — implementation-specific.

## Security / PHI

- Patient identifiers may be PHI. Implementations MUST NOT log full context bundles without redaction in production configurations.
- All write tools MUST generate Provenance capable of surviving restart.
- Implementations SHOULD rate-limit write tools to prevent runaway agents.

## Product B conformance matrix

| Tool | Product B status as of 2026-04-16 | Backing code |
|---|---|---|
| `get_patient_context` | implemented | `services/clinical-mcp/src/context/assembler.ts` |
| `list_patients` | implemented | `services/clinical-mcp/src/fhir/client.ts#listPatients` |
| `inspect_context` | implemented | `services/clinical-mcp/src/tools/inspector.ts` |
| `get_medication_list` | implemented | `services/clinical-mcp/src/context/medication.ts#getMedicationList` |
| `queue_draft_task` | implemented | `services/clinical-mcp/src/fhir/writes.ts#queueDraftTask` |
| `create_draft_document` | implemented | `services/clinical-mcp/src/fhir/writes.ts#createDraftShiftReport` (specialization; generic variant lands Phase 4b) |
| `queue_draft_medication_administration` | implemented | `services/clinical-mcp/src/fhir/writes.ts#queueDraftMedicationAdministration` |
| `record_provenance` | implemented | `services/clinical-mcp/src/fhir/writes.ts#recordDraftProvenance` + `recordHumanAttestedProvenance` |
| `finalize_draft_document` | planned (Phase 4b) | n/a |
| `lookup_drug` | implemented | `services/clinical-mcp/src/tools/drug-reference.ts` reads `clinical-resources/drug-reference/drugs/*.json` |

Product B internal writers (not agent-callable):

| Function | Status | Backing code |
|---|---|---|
| `chartMedicationAdministration` | implemented | `services/clinical-mcp/src/fhir/writes.ts` |
| `holdMedicationAdministration` | implemented | `services/clinical-mcp/src/fhir/writes.ts` |
| `recordProcedure` | implemented | `services/clinical-mcp/src/fhir/writes.ts` |

Conformance is enforced in `services/clinical-mcp/src/__tests__/contract-v1-conformance.test.ts`.

## Contract versioning policy

- **v1.0.x.** Bug fixes in the spec wording, no shape changes.
- **v1.1.x, v1.2.x, …** Additive changes: new optional fields, new tools marked `planned` or `implemented`. Existing consumers must continue to work.
- **v2.0.0.** Breaking changes (removed fields, semantic shifts, closed-set additions that break old consumers). Requires migration notes.

## References

- [../ARCHITECTURE.md](../ARCHITECTURE.md) — three-product architecture map.
- [../plans/three-product-alignment-2026-04-16.md](../plans/three-product-alignment-2026-04-16.md) — active alignment plan.
- [../foundations/medplum-write-path-expansion.md](../foundations/medplum-write-path-expansion.md) — Contract 5 write-path expansion (Product B's draft-review lifecycle).
- [../foundations/patient-context-bundle-contract.md](../foundations/patient-context-bundle-contract.md) — pre-v1 context bundle notes.
- [../foundations/invariant-kernel-simulation-architecture.md](../foundations/invariant-kernel-simulation-architecture.md) — Product C projection kernel.
