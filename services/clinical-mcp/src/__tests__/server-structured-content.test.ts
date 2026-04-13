import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RegisteredToolLike {
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  }>;
}

interface McpServerWithTools {
  _registeredTools: Record<string, RegisteredToolLike>;
}

describe('MCP server structuredContent consistency', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../context/assembler.js');
    vi.doUnmock('../fhir/client.js');
    vi.doUnmock('../tools/inspector.js');
    vi.doUnmock('../events/generator.js');
  });

  it('returns structuredContent for get_patient_context', async () => {
    const ctx = { patient: { id: 'patient-123' }, timeline: [] };
    vi.doMock('../context/assembler.js', () => ({
      assemblePatientContext: vi.fn().mockResolvedValue(ctx),
    }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const result = await server._registeredTools.get_patient_context.handler({ patient_id: 'patient-123' });

    expect(result.structuredContent).toEqual(ctx);
    expect(result.content[0]?.text).toBe(JSON.stringify(ctx, null, 2));
  });

  it('returns structuredContent for list_patients', async () => {
    const patients = {
      data: [{ id: 'patient-123', name: 'John Doe', gender: 'male' }],
      error: null,
    };
    vi.doMock('../fhir/client.js', () => ({
      listPatients: vi.fn().mockResolvedValue(patients),
    }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const result = await server._registeredTools.list_patients.handler({ count: 1 });

    expect(result.structuredContent).toEqual(patients);
    expect(result.content[0]?.text).toBe(JSON.stringify(patients, null, 2));
  });

  it('returns structuredContent for inspect_context', async () => {
    const inspection = { sources: ['Patient'], gaps: [], tokenEstimate: 10 };
    vi.doMock('../tools/inspector.js', () => ({
      inspectContext: vi.fn().mockResolvedValue(inspection),
    }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const result = await server._registeredTools.inspect_context.handler({ patient_id: 'patient-123' });

    expect(result.structuredContent).toEqual(inspection);
    expect(result.content[0]?.text).toBe(JSON.stringify(inspection, null, 2));
  });

  it('returns structuredContent for get_scenario', async () => {
    const scenario = { id: 'pressor-titration', state: { map: 58 } };
    vi.doMock('../events/generator.js', () => ({
      getScenario: vi.fn().mockResolvedValue(scenario),
      advanceScenario: vi.fn(),
      resetScenario: vi.fn(),
    }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const result = await server._registeredTools.get_scenario.handler({ scenario_id: 'pressor-titration' });

    expect(result.structuredContent).toEqual(scenario);
    expect(result.content[0]?.text).toBe(JSON.stringify(scenario, null, 2));
  });

  it('returns structuredContent for advance_scenario', async () => {
    const advanced = { id: 'pressor-titration', state: { map: 65 }, actionApplied: 'titrate' };
    vi.doMock('../events/generator.js', () => ({
      getScenario: vi.fn(),
      advanceScenario: vi.fn().mockResolvedValue(advanced),
      resetScenario: vi.fn(),
    }));

    const { createServer } = await import('../server.js');
    const server = createServer() as unknown as McpServerWithTools;
    const result = await server._registeredTools.advance_scenario.handler({
      scenario_id: 'pressor-titration',
      action: 'titrate',
      medication: 'norepinephrine',
      new_dose: 0.08,
    });

    expect(result.structuredContent).toEqual(advanced);
    expect(result.content[0]?.text).toBe(JSON.stringify(advanced, null, 2));
  });
});
