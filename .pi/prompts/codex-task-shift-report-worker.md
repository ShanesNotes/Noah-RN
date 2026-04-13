# Codex Task: Shift Report Task Worker

## Context

You are working in `noah-rn`, a clinical decision-support agent for bedside nurses. The codebase is a monorepo. You will be working in `services/clinical-mcp/` — the patient context assembly and FHIR access service.

Before writing code, read these files to understand the existing architecture:

- `services/clinical-mcp/src/fhir/client.ts` — FHIR read and write primitives (`fhirFetch`, `fhirPost`, resource query functions)
- `services/clinical-mcp/src/fhir/writes.ts` — existing draft write functions (`createDraftShiftReport` is implemented, others deferred)
- `services/clinical-mcp/src/fhir/types.ts` — FHIR R4 type definitions
- `services/clinical-mcp/src/context/assembler.ts` — patient context assembly
- `services/clinical-mcp/src/context/types.ts` — `PatientContext` type
- `services/clinical-mcp/src/server.ts` — MCP server tool definitions
- `services/clinical-mcp/src/config.ts` — configuration
- `docs/foundations/medplum-shift-report-contract.md` — the authoritative contract for Task → DocumentReference → Task completion
- `graphify-out/GRAPH_REPORT.md` — high-level topology report

## The gap

The Medplum Shift Report Contract defines a complete loop:

1. A `Task` with `status: requested` and `code: shift-report` enters Medplum
2. Noah RN picks it up, assembles patient context, generates a shift report draft
3. The draft is written back as a `DocumentReference` with `docStatus: preliminary`
4. The originating `Task` is updated to `status: completed` with an output reference to the `DocumentReference`
5. On failure, the `Task` is updated to `status: failed` with `statusReason.text`

Currently only step 3 is partially implemented (`createDraftShiftReport` in `writes.ts`), and its `DocumentReference` coding does not match the contract.

## Required deliverables

### 1. Add Task query/update functions to `client.ts`

Add these functions following the existing patterns in `client.ts`:

- `getRequestedShiftReportTasks(count?)`
  - Query: `Task?code=shift-report&status=requested&_sort=-_lastUpdated&_count={count}`
  - Return type: `Promise<FhirResult<Task[]>>`
- `fhirPut(path, body)`
  - New helper mirroring `fhirPost`, but using HTTP `PUT`
- `updateTask(taskId, task)`
  - Implement as a full-resource `PUT` to `Task/{taskId}`
  - Signature should be explicitly typed
  - Use this for both completion and failure updates

Implementation rule: use full-resource `PUT`, not PATCH. The worker should update the in-memory `Task` object and write back the complete resource.

### 2. Align `createDraftShiftReport` with the contract

Update the `DocumentReference` payload in `writes.ts`:

Primary coding:
- `type.coding[0].system`: `https://noah-rn.dev/artifacts`
- `type.coding[0].code`: `shift-report-draft`
- `type.coding[0].display`: `Draft Shift Report`

Secondary coding:
- Keep LOINC `28651-8` as an additional coding

Other fields:
- `description`: `Draft Shift Report — requires nurse review`
- `content[0].attachment.contentType`: use `text/markdown`
  - The contract says `text/plain`
  - Keep `text/markdown` because the artifact content is markdown-formatted
  - Add a short comment noting this intentional contract divergence

Tests should assert:
- primary coding is the noah-rn artifact coding
- secondary LOINC coding is preserved
- attachment content type is `text/markdown`

### 3. Build the Task worker module

Create:

- `services/clinical-mcp/src/worker/shift-report-worker.ts`

Export:

- `pollOnce(count?)`
- `processTask(task)`

Behavior:

- Query requested shift-report Tasks
- For each Task:
  - validate `task.id`
  - extract `patientId` from `Task.for.reference`
  - accepted format: `Patient/{id}`
  - if missing, malformed, or not a Patient reference, mark the Task failed with `statusReason.text`
  - optionally extract `encounterId` from `Task.encounter.reference` if present and well-formed
- Call `assemblePatientContext(patientId)`
- For now, the report body is just:
  - `JSON.stringify(context, null, 2)`
- Call `createDraftShiftReport()`
- On success:
  - update the Task to `status: completed`
  - set `output[0].type.text = shift-report-draft`
  - set `output[0].valueReference.reference = DocumentReference/{id}`
- On failure:
  - update the Task to `status: failed`
  - set `statusReason.text` to a concise machine-readable failure summary

Failure handling:
- If context assembly or draft creation fails, make a best-effort attempt to mark the Task failed
- If completion update fails, also make a best-effort attempt to mark the Task failed
- If the failure update itself fails, return that fact in the poll summary; do not invent a successful update

This is a single-pass poller, not a daemon.

### 4. Register an MCP tool

In `server.ts`, add:

- `poll_shift_report_tasks`

It should run `pollOnce()` and return this JSON shape:

```ts
{
  found: number;
  completed: number;
  failed: number;
  results: Array<{
    taskId: string;
    status: 'completed' | 'failed';
    documentReferenceId?: string;
    error?: string;
  }>;
}
```

### 5. Write tests

Add:

- `services/clinical-mcp/src/__tests__/shift-report-worker.test.ts`

Follow existing test patterns from `writes.test.ts`:
- use `vi.doMock`
- use fake timers where useful
- keep tests explicit and typed

Mock as needed:
- FHIR client functions
- `assemblePatientContext`
- `createDraftShiftReport`

Required test cases:
- Happy path: Task found → context assembled → `DocumentReference` created → Task completed
- No tasks: poll returns empty and no writes occur
- Context assembly failure: Task marked failed with `statusReason.text`
- FHIR draft write failure: Task marked failed with `statusReason.text`

## Constraints

- Follow existing code patterns closely. Match the style of `client.ts`, `writes.ts`, and `server.ts`.
- Use the existing type system in `types.ts`. Add new types there if needed.
- All new functions should have explicit TypeScript types — no `any`.
- The worker must not import from outside `services/clinical-mcp/`.
- Do not modify `assembler.ts` or `temporal.ts`.
- CLI wiring is out of scope unless an obvious existing entry point already exists.
- Run `npx vitest run` from `services/clinical-mcp/` before finishing and confirm tests pass.
