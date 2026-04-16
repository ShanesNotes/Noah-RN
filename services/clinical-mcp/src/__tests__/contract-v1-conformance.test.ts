// Clinical-MCP Contract v1.0.0 conformance test.
//
// This file asserts that Product B (services/clinical-mcp) implements the
// tools it claims to implement in the conformance matrix at
// docs/standards/clinical-mcp-contract-v1.md, and that the shapes produced
// by those tools satisfy the contract's structural requirements.
//
// Structural-assertion-only for v1.0.0 — a full JSON Schema validator may
// be layered on later without changing the contract itself.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- Contract v1.0.0 tool inventory ----------
// Keep this in sync with docs/standards/clinical-mcp-contract-v1.md#tool-inventory.
// Only agent-callable MCP tools appear here; Product B internal writers
// (chartMedicationAdministration, holdMedicationAdministration,
// recordProcedure, recordHumanAttestedProvenance) are covered by
// medication-list.test.ts.
const CONTRACT_V1_TOOLS = {
  read: {
    get_patient_context: 'implemented',
    list_patients: 'implemented',
    inspect_context: 'implemented',
    get_medication_list: 'implemented',
  },
  write: {
    queue_draft_task: 'implemented',
    create_draft_document: 'implemented', // Shift Report specialization today
    queue_draft_medication_administration: 'implemented',
    record_provenance: 'implemented',
    finalize_draft_document: 'planned',
    lookup_drug: 'planned',
  },
} as const;

const IMPLEMENTED_READ_TOOLS = Object.entries(CONTRACT_V1_TOOLS.read)
  .filter(([, status]) => status === 'implemented')
  .map(([name]) => name);

const IMPLEMENTED_WRITE_TOOLS = Object.entries(CONTRACT_V1_TOOLS.write)
  .filter(([, status]) => status === 'implemented')
  .map(([name]) => name);

describe('clinical-mcp contract v1.0.0 — conformance', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.doUnmock('../fhir/client.js');
  });

  it('server registers every read tool marked implemented in the contract', async () => {
    const { createServer } = await import('../server.js');
    const server = createServer();
    const rawTools = (server as unknown as { _registeredTools?: Record<string, unknown> })._registeredTools ?? {};
    const registered = Object.keys(rawTools);

    for (const tool of IMPLEMENTED_READ_TOOLS) {
      expect(registered, `read tool ${tool} must be registered on the MCP server`).toContain(tool);
    }
  });

  it('write tools are importable from the fhir/writes module', async () => {
    const writes = (await import('../fhir/writes.js')) as Record<string, unknown>;

    // queue_draft_task
    expect(typeof writes.queueDraftTask, 'queue_draft_task must be exported as queueDraftTask').toBe('function');
    // create_draft_document (Shift Report specialization today)
    expect(typeof writes.createDraftShiftReport, 'create_draft_document (shift-report specialization) must be exported as createDraftShiftReport').toBe('function');
    // queue_draft_medication_administration
    expect(typeof writes.queueDraftMedicationAdministration, 'queue_draft_medication_administration must be exported as queueDraftMedicationAdministration').toBe('function');
    // record_provenance
    expect(typeof writes.recordDraftProvenance, 'record_provenance must be exported as recordDraftProvenance').toBe('function');

    // Verify the writes module is not missing future-slot names by accident.
    // (Planned tools may or may not be exported; this test only asserts implemented ones.)
    expect(IMPLEMENTED_WRITE_TOOLS.length).toBeGreaterThanOrEqual(4);
  });

  it('queue_draft_task output satisfies the contract Task shape', async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: { resourceType: 'Task', id: 'task-abc', status: 'requested' },
      error: null,
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { queueDraftTask } = await import('../fhir/writes.js');
    const task = await queueDraftTask({
      patientId: 'patient-conformance',
      description: 'Review draft conformance verification',
      executionId: 'conformance-exec-1',
    });

    expect(task.resourceType).toBe('Task');

    // Posted payload must include the required contract fields.
    const [, payload] = fhirPost.mock.calls[0] ?? [];
    const body = payload as Record<string, unknown>;
    expect(body.resourceType).toBe('Task');
    expect(body.status).toBe('requested');
    expect(body.intent).toBe('order');
    const forRef = body.for as { reference?: string } | undefined;
    expect(forRef?.reference).toBe('Patient/patient-conformance');
  });

  it('create_draft_document output satisfies the DocumentReference contract shape', async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: { resourceType: 'DocumentReference', id: 'doc-abc', status: 'current', docStatus: 'preliminary' },
      error: null,
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { createDraftShiftReport } = await import('../fhir/writes.js');
    const draft = await createDraftShiftReport({
      patientId: 'patient-conformance',
      reportMarkdown: '# Conformance report',
      executionId: 'conformance-exec-2',
    });

    expect(draft.resourceType).toBe('DocumentReference');

    const [, payload] = fhirPost.mock.calls[0] ?? [];
    const body = payload as Record<string, unknown>;
    expect(body.resourceType).toBe('DocumentReference');
    expect(body.status).toBe('current');
    expect(body.docStatus).toBe('preliminary');
    const subject = body.subject as { reference?: string } | undefined;
    expect(subject?.reference).toBe('Patient/patient-conformance');
  });

  it('queue_draft_medication_administration output uses status=not-done with draft-proposal statusReason', async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: { resourceType: 'MedicationAdministration', id: 'medadmin-abc', status: 'not-done' },
      error: null,
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { queueDraftMedicationAdministration } = await import('../fhir/writes.js');
    const medadmin = await queueDraftMedicationAdministration({
      patientId: 'patient-conformance',
      medicationName: 'Norepinephrine',
      executionId: 'conformance-exec-3',
    });

    expect(medadmin.resourceType).toBe('MedicationAdministration');

    const [, payload] = fhirPost.mock.calls[0] ?? [];
    const body = payload as Record<string, unknown>;
    expect(body.status).toBe('not-done');
    const statusReason = body.statusReason as { coding?: Array<{ code?: string }> } | undefined;
    expect(statusReason?.coding?.[0]?.code).toBe('draft-proposal');
  });

  it('record_provenance output carries the agent-authored provenance envelope', async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: { resourceType: 'Provenance', id: 'prov-abc' },
      error: null,
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { recordDraftProvenance } = await import('../fhir/writes.js');
    const prov = await recordDraftProvenance({
      resourceType: 'DocumentReference',
      id: 'doc-abc',
      identifier: [
        { system: 'https://noah-rn.dev/execution-id', value: 'conformance-exec-4' },
      ],
    } as unknown as Parameters<typeof recordDraftProvenance>[0]);

    expect(prov.resourceType).toBe('Provenance');

    const [, payload] = fhirPost.mock.calls[0] ?? [];
    const body = payload as Record<string, unknown>;
    expect(body.resourceType).toBe('Provenance');

    const target = body.target as Array<{ reference?: string }> | undefined;
    expect(target?.[0]?.reference).toBe('DocumentReference/doc-abc');

    const agents = body.agent as Array<{ who?: { display?: string } }> | undefined;
    expect(
      agents?.some(a => a.who?.display === 'Noah RN Agent'),
      'contract v1 requires closed-set agent.who.display value (Noah RN Agent for agent-authored writes)',
    ).toBe(true);

    const entity = body.entity as Array<{ what?: { identifier?: { system?: string; value?: string } } }> | undefined;
    const sourceLayer = entity?.find(
      e => e.what?.identifier?.system === 'https://noah-rn.dev/source-layer',
    );
    expect(sourceLayer?.what?.identifier?.value).toBe('L3-original');
  });
});
