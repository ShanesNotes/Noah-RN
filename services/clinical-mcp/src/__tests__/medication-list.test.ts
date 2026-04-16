import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MedicationAdministration, MedicationRequest } from '../fhir/types.js';

describe('getMedicationList (Product B MAR read path)', () => {
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

  it('assembles active MedicationRequests with high-alert flags and links last-administered timestamps', async () => {
    const requests: MedicationRequest[] = [
      {
        resourceType: 'MedicationRequest',
        id: 'req-norepi',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: { text: 'Norepinephrine' },
        dosageInstruction: [{ text: '0.05 mcg/kg/min IV', route: { text: 'IV' } }],
      },
      {
        resourceType: 'MedicationRequest',
        id: 'req-acetaminophen',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: { text: 'Acetaminophen 650 mg PO' },
      },
      {
        resourceType: 'MedicationRequest',
        id: 'req-heparin-held',
        status: 'on-hold',
        intent: 'order',
        medicationCodeableConcept: { text: 'Heparin infusion' },
      },
    ];
    const administrations: MedicationAdministration[] = [
      {
        resourceType: 'MedicationAdministration',
        id: 'ma-norepi-1',
        status: 'completed',
        request: { reference: 'MedicationRequest/req-norepi' },
        effectiveDateTime: '2026-04-16T11:30:00.000Z',
        medicationCodeableConcept: { text: 'Norepinephrine' },
        performer: [{ actor: { display: 'Jane Nurse' } }],
        dosage: { text: '0.05 mcg/kg/min' },
      },
    ];
    vi.doMock('../fhir/client.js', () => ({
      getMedicationRequests: vi.fn().mockResolvedValue({ data: requests, error: null }),
      getMedicationAdministrations: vi.fn().mockResolvedValue({ data: administrations, error: null }),
    }));

    const { getMedicationList } = await import('../context/medication.js');
    const view = await getMedicationList('patient-123');

    expect(view.patientId).toBe('patient-123');
    expect(view.assembledAt).toBe('2026-04-16T12:00:00.000Z');
    expect(view.active).toHaveLength(3);

    const norepi = view.active.find((e) => e.medicationRequestId === 'req-norepi');
    expect(norepi?.highAlert, 'norepinephrine must flag as high-alert').toBe(true);
    expect(norepi?.highAlertReason).toMatch(/Vasopressor/);
    expect(norepi?.lastAdministeredAt).toBe('2026-04-16T11:30:00.000Z');
    expect(norepi?.state).toBe('scheduled');

    const apap = view.active.find((e) => e.medicationRequestId === 'req-acetaminophen');
    expect(apap?.highAlert).toBe(false);
    expect(apap?.lastAdministeredAt).toBeUndefined();

    const heparin = view.active.find((e) => e.medicationRequestId === 'req-heparin-held');
    expect(heparin?.state).toBe('held');
    expect(heparin?.highAlert, 'heparin must flag as high-alert').toBe(true);
  });

  it('filters to held-only when requested', async () => {
    const requests: MedicationRequest[] = [
      { resourceType: 'MedicationRequest', id: 'req-1', status: 'active', intent: 'order', medicationCodeableConcept: { text: 'Ceftriaxone' } },
      { resourceType: 'MedicationRequest', id: 'req-2', status: 'on-hold', intent: 'order', medicationCodeableConcept: { text: 'Enoxaparin' } },
    ];
    vi.doMock('../fhir/client.js', () => ({
      getMedicationRequests: vi.fn().mockResolvedValue({ data: requests, error: null }),
      getMedicationAdministrations: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const { getMedicationList } = await import('../context/medication.js');
    const view = await getMedicationList('patient-123', { filter: { status: 'held' } });
    expect(view.active.map((e) => e.medicationRequestId)).toEqual(['req-2']);
  });

  it('marks draft-proposal administrations as draft in recentAdministrations', async () => {
    const requests: MedicationRequest[] = [];
    const administrations: MedicationAdministration[] = [
      {
        resourceType: 'MedicationAdministration',
        id: 'ma-draft',
        status: 'not-done',
        statusReason: {
          coding: [{ system: 'https://noah-rn.dev/review-state', code: 'draft-proposal' }],
          text: 'Agent proposal awaiting review',
        },
        effectiveDateTime: '2026-04-16T11:00:00.000Z',
        medicationCodeableConcept: { text: 'Furosemide' },
      },
    ];
    vi.doMock('../fhir/client.js', () => ({
      getMedicationRequests: vi.fn().mockResolvedValue({ data: requests, error: null }),
      getMedicationAdministrations: vi.fn().mockResolvedValue({ data: administrations, error: null }),
    }));

    const { getMedicationList } = await import('../context/medication.js');
    const view = await getMedicationList('patient-123');
    expect(view.recentAdministrations).toHaveLength(1);
    expect(view.recentAdministrations[0]?.reviewState).toBe('draft-proposal');
  });
});

describe('Phase 4 MAR write path boundaries', () => {
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

  it('chartMedicationAdministration rejects agent-like performer references', async () => {
    vi.doMock('../fhir/client.js', () => ({ fhirPost: vi.fn() }));
    const { chartMedicationAdministration } = await import('../fhir/writes.js');

    await expect(
      chartMedicationAdministration({
        patientId: 'patient-123',
        medicationName: 'Norepinephrine',
        performerRef: 'Noah RN Agent',
      }),
    ).rejects.toThrow(/Practitioner/);

    await expect(
      chartMedicationAdministration({
        patientId: 'patient-123',
        medicationName: 'Norepinephrine',
        performerRef: 'Practitioner/noah-agent-noah-rn-agent',
      }),
    ).rejects.toThrow(/agent identifier/);
  });

  it('chartMedicationAdministration writes a completed MedAdmin plus a human-attested Provenance', async () => {
    const calls: Array<{ resourceType: string; body: unknown }> = [];
    const fhirPost = vi.fn().mockImplementation(async (resourceType: string, body: unknown) => {
      calls.push({ resourceType, body });
      return {
        data: {
          resourceType,
          id: `${resourceType.toLowerCase()}-abc`,
          ...(resourceType === 'MedicationAdministration' ? { status: 'completed' } : {}),
        },
        error: null,
      };
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { chartMedicationAdministration } = await import('../fhir/writes.js');
    const medadmin = await chartMedicationAdministration({
      patientId: 'patient-123',
      encounterId: 'enc-456',
      medicationName: 'Norepinephrine',
      medicationRequestId: 'req-norepi',
      performerRef: 'Practitioner/jane-nurse',
      dosageText: '0.05 mcg/kg/min',
    });

    expect(medadmin.resourceType).toBe('MedicationAdministration');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.resourceType).toBe('MedicationAdministration');
    const medBody = calls[0]?.body as Record<string, unknown>;
    expect(medBody.status).toBe('completed');
    expect(medBody.performer).toEqual([{ actor: { reference: 'Practitioner/jane-nurse' } }]);
    expect(medBody.effectiveDateTime).toBe('2026-04-16T12:00:00.000Z');

    expect(calls[1]?.resourceType).toBe('Provenance');
    const provBody = calls[1]?.body as { agent?: Array<{ who?: { reference?: string } }>; activity?: { coding?: Array<{ code?: string }> } };
    expect(provBody.agent?.[0]?.who?.reference).toBe('Practitioner/jane-nurse');
    expect(provBody.activity?.coding?.[0]?.code).toBe('record');
  });

  it('holdMedicationAdministration writes not-done with reason + human-attested Provenance', async () => {
    const calls: Array<{ resourceType: string; body: unknown }> = [];
    const fhirPost = vi.fn().mockImplementation(async (resourceType: string, body: unknown) => {
      calls.push({ resourceType, body });
      return { data: { resourceType, id: `${resourceType.toLowerCase()}-hold` }, error: null };
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { holdMedicationAdministration } = await import('../fhir/writes.js');
    await holdMedicationAdministration({
      patientId: 'patient-123',
      medicationName: 'Heparin',
      medicationRequestId: 'req-heparin',
      performerRef: 'Practitioner/jane-nurse',
      reason: 'HIT suspicion — platelet drop >50%',
    });

    expect(calls[0]?.resourceType).toBe('MedicationAdministration');
    const medBody = calls[0]?.body as Record<string, unknown>;
    expect(medBody.status).toBe('not-done');
    const statusReason = medBody.statusReason as { coding?: Array<{ code?: string }>; text?: string };
    expect(statusReason.coding?.[0]?.code).toBe('held');
    expect(statusReason.text).toMatch(/HIT suspicion/);
  });

  it('recordProcedure links partOf MedAdmin refs for RSI bundle', async () => {
    const calls: Array<{ resourceType: string; body: unknown }> = [];
    const fhirPost = vi.fn().mockImplementation(async (resourceType: string, body: unknown) => {
      calls.push({ resourceType, body });
      return { data: { resourceType, id: `${resourceType.toLowerCase()}-proc` }, error: null };
    });
    vi.doMock('../fhir/client.js', () => ({ fhirPost }));

    const { recordProcedure } = await import('../fhir/writes.js');
    await recordProcedure({
      patientId: 'patient-123',
      encounterId: 'enc-456',
      procedureCode: 'intubation',
      procedureDisplay: 'Endotracheal intubation',
      performerRef: 'Practitioner/drew-md',
      partOfMedAdminRefs: [
        'MedicationAdministration/ma-etomidate',
        'MedicationAdministration/ma-rocuronium',
      ],
      note: 'Glidescope, first-pass success, ETT 7.5 @ 22cm',
    });

    expect(calls[0]?.resourceType).toBe('Procedure');
    const body = calls[0]?.body as Record<string, unknown>;
    expect(body.status).toBe('completed');
    const partOf = body.partOf as Array<{ reference?: string }>;
    expect(partOf).toHaveLength(2);
    expect(partOf[0]?.reference).toBe('MedicationAdministration/ma-etomidate');
  });
});
