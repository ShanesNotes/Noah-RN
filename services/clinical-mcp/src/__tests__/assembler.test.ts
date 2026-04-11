import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('assemblePatientContext', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock('../fhir/client.js');
  });

  it('assembles provider notes and medication administrations from the read path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline for fixtures')));

    const { assemblePatientContext } = await import('../context/assembler.js');
    const ctx = await assemblePatientContext('patient-123', 20_000);

    expect(ctx.sources).toContain('DocumentReference');
    expect(ctx.sources).toContain('MedicationAdministration');

    const noteEntry = ctx.timeline.find((entry) => entry.type === 'note');
    expect(noteEntry).toBeDefined();
    expect(noteEntry?.resource.resourceType).toBe('DocumentReference');
    expect(noteEntry?.timestamp).toBe('2026-04-10T11:30:00Z');

    const administrationEntry = ctx.timeline.find((entry) => entry.type === 'medicationAdministration');
    expect(administrationEntry).toBeDefined();
    if (administrationEntry?.type === 'medicationAdministration') {
      expect(administrationEntry.resource.medicationCodeableConcept?.text).toBe('Norepinephrine');
    }

    expect(ctx.gaps).not.toContain('No provider notes found');
    expect(ctx.gaps).not.toContain('No medication administration history found');
    expect(ctx.gaps).not.toContain('No provider notes (DocumentReference absent in MIMIC-IV demo)');
  });

  it('reports missing note and MAR gaps from real query results instead of stale assumptions', async () => {
    vi.doMock('../fhir/client.js', () => ({
      getPatient: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'Patient',
          id: 'patient-456',
          name: [{ text: 'Jane Doe' }],
          gender: 'female',
          birthDate: '1970-01-01',
        },
        error: null,
      }),
      getObservations: vi
        .fn()
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null }),
      getConditions: vi.fn().mockResolvedValue({ data: [], error: null }),
      getMedicationRequests: vi.fn().mockResolvedValue({ data: [], error: null }),
      getMedicationAdministrations: vi.fn().mockResolvedValue({ data: [], error: null }),
      getEncounters: vi.fn().mockResolvedValue({ data: [], error: null }),
      getDocumentReferences: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    const { assemblePatientContext } = await import('../context/assembler.js');
    const ctx = await assemblePatientContext('patient-456', 20_000);

    expect(ctx.gaps).toContain('No provider notes found');
    expect(ctx.gaps).toContain('No medication administration history found');
    expect(ctx.gaps).not.toContain(expect.stringContaining('MIMIC-IV demo'));
    expect(ctx.gaps).not.toContain(expect.stringContaining('Allergy'));
  });
});
