import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('harness-client adapter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proxies render_shift_report to the injected harness client', async () => {
    const {
      callHarnessTool,
      __setHarnessClientFactoryForTests,
      __resetHarnessClientFactoryForTests,
    } = await import('../adapters/harness-client.js');

    const spy = vi.fn().mockResolvedValue({ markdown: '# rendered' });
    __setHarnessClientFactoryForTests(async () => ({
      callHarnessTool: spy,
    }));

    const result = await callHarnessTool('render_shift_report', {
      patientId: 'patient-123',
      context: { patient: { id: 'patient-123' } },
      laneCoverage: { 'ehr/chart': 'present' },
    });

    expect(result).toEqual({ markdown: '# rendered' });
    expect(spy).toHaveBeenCalledWith('render_shift_report', {
      patientId: 'patient-123',
      context: { patient: { id: 'patient-123' } },
      laneCoverage: { 'ehr/chart': 'present' },
    });

    __resetHarnessClientFactoryForTests();
  });

  it('rejects unsupported tools in the default (package-backed) client', async () => {
    const {
      callHarnessTool,
      __resetHarnessClientFactoryForTests,
    } = await import('../adapters/harness-client.js');

    __resetHarnessClientFactoryForTests();

    await expect(
      // @ts-expect-error — exercising the runtime guard with an unknown tool name
      callHarnessTool('definitely_not_a_tool', {}),
    ).rejects.toThrow(/Unsupported harness tool/);
  });
});
