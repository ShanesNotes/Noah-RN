import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSimMcpServer } from '../src/mcp/server.js';
import { __resetStubStoreForTests } from '../src/mcp/stub-store.js';

function registeredToolNames(server: ReturnType<typeof createSimMcpServer>): string[] {
  const tools = (server as unknown as { _registeredTools?: Record<string, unknown> })._registeredTools ?? {};
  return Object.keys(tools);
}

describe('Product C — sim-harness MCP server (Phase 8a skeleton)', () => {
  beforeEach(() => {
    __resetStubStoreForTests();
  });

  afterEach(() => {
    __resetStubStoreForTests();
  });

  it('registers the minimum Phase 8a tool set', () => {
    const server = createSimMcpServer();
    const tools = registeredToolNames(server);
    for (const expected of [
      'sim_list_scenarios',
      'sim_load_scenario',
      'sim_get_vitals_snapshot',
      'sim_advance_clock',
      'sim_set_clock_mode',
    ]) {
      expect(tools, `${expected} must be registered on the sim MCP server`).toContain(expected);
    }
  });

  it('sim_load_scenario followed by sim_get_vitals_snapshot returns contract-shaped vitals', async () => {
    const { loadScenario, getVitalsSnapshot } = await import('../src/mcp/stub-store.js');
    loadScenario('pressor-titration', 'enc-test-1');
    const vitals = getVitalsSnapshot('enc-test-1');
    expect(vitals).toMatchObject({
      hr: expect.any(Number),
      rr: expect.any(Number),
      spo2: expect.any(Number),
      etco2: expect.any(Number),
      map: expect.any(Number),
      sbp: expect.any(Number),
      dbp: expect.any(Number),
      temp_c: expect.any(Number),
      rhythm_label: expect.any(String),
    });
    expect(vitals.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sim_advance_clock increments scenario_minutes_elapsed', async () => {
    const { loadScenario, getVitalsSnapshot, advanceClock } = await import('../src/mcp/stub-store.js');
    loadScenario('pressor-titration', 'enc-test-2');
    const before = getVitalsSnapshot('enc-test-2');
    advanceClock('enc-test-2', 120);
    const after = getVitalsSnapshot('enc-test-2');
    expect(after.scenario_minutes_elapsed).toBeGreaterThan(before.scenario_minutes_elapsed);
  });

  it('sim_get_vitals_snapshot throws when no scenario is loaded for the encounter', async () => {
    const { getVitalsSnapshot } = await import('../src/mcp/stub-store.js');
    expect(() => getVitalsSnapshot('enc-unloaded')).toThrow(/No loaded scenario/);
  });

  it('sim_load_scenario rejects unknown scenario ids', async () => {
    const { loadScenario } = await import('../src/mcp/stub-store.js');
    expect(() => loadScenario('does-not-exist', 'enc-test-3')).toThrow(/Unknown scenario/);
  });

  it('sim_list_scenarios returns the seeded ICU scenario set', async () => {
    const { listScenarios } = await import('../src/mcp/stub-store.js');
    const scenarios = listScenarios();
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids).toEqual(['fluid-responsive', 'hyporesponsive', 'pressor-titration']);
  });
});
