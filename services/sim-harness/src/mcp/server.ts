// Product C — Agent-Native Clinical Simulation MCP server.
//
// This is the sim-harness's own MCP surface. Agents reach sim tools
// through this server, NOT via direct function imports from clinical-mcp.
//
// Phase 8a scope: register the contract-shaped tool set with stub
// handlers backed by services/sim-harness/src/mcp/stub-store.ts. Real
// physiology (Pulse + scenario controller + waveform buffer) wires in
// Phase 8b alongside Lanes B/C of the execution packet.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  advanceClock,
  getVitalsSnapshot,
  listScenarios,
  loadScenario,
  setClockMode,
} from './stub-store.js';

function jsonToolResult(data: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
  };
}

const EncounterIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9\-_.]+$/, 'Encounter ID must be alphanumeric/UUID')
  .describe('FHIR Encounter resource ID this simulation instance is bound to.');

export function createSimMcpServer(): McpServer {
  const server = new McpServer({
    name: 'noah-rn-sim-harness',
    version: '0.1.0',
  });

  // sim_list_scenarios
  server.tool(
    'sim_list_scenarios',
    'List available simulation scenarios (pressor titration, fluid-responsive shock, hyporesponsive shock, etc.).',
    {},
    async () => jsonToolResult({ scenarios: listScenarios() }),
  );

  // sim_load_scenario
  server.tool(
    'sim_load_scenario',
    'Load a scenario into a simulation instance bound to an Encounter. Returns the initial encounter view.',
    {
      scenario_id: z.string().min(1).describe('Scenario identifier from sim_list_scenarios.'),
      encounter_id: EncounterIdSchema,
    },
    async ({ scenario_id, encounter_id }) => {
      const view = loadScenario(scenario_id, encounter_id);
      return jsonToolResult(view);
    },
  );

  // sim_get_vitals_snapshot
  server.tool(
    'sim_get_vitals_snapshot',
    'Return the current L1 monitor snapshot for a scenario instance (HR, RR, SpO2, etCO2, MAP, SBP, DBP, temp, rhythm label).',
    {
      encounter_id: EncounterIdSchema,
    },
    async ({ encounter_id }) => jsonToolResult(getVitalsSnapshot(encounter_id)),
  );

  // sim_advance_clock
  server.tool(
    'sim_advance_clock',
    'Advance the simulation clock for an encounter by duration_seconds. Scenario-controller-mediated; respects release gates and obligation lifecycle (stub in Phase 8a).',
    {
      encounter_id: EncounterIdSchema,
      duration_seconds: z
        .number()
        .int()
        .positive()
        .max(60 * 60 * 4)
        .describe('Seconds to advance. Bounded at 4 hours per call in v1.'),
    },
    async ({ encounter_id, duration_seconds }) =>
      jsonToolResult(advanceClock(encounter_id, duration_seconds)),
  );

  // sim_set_clock_mode
  server.tool(
    'sim_set_clock_mode',
    'Set the simulation clock mode for an encounter: wall-clock | accelerated | frozen.',
    {
      encounter_id: EncounterIdSchema,
      mode: z.enum(['wall-clock', 'accelerated', 'frozen']),
    },
    async ({ encounter_id, mode }) => {
      setClockMode(encounter_id, mode);
      return jsonToolResult({ encounter_id, mode });
    },
  );

  return server;
}
