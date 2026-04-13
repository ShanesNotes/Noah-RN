import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function jsonToolResult(data: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: JSON.parse(JSON.stringify(data)) as Record<string, unknown>,
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'noah-rn-clinical',
    version: '0.1.0',
  });

  // Tool: get_patient_context
  server.tool(
    'get_patient_context',
    'Assemble structured patient context from MIMIC-IV FHIR data. Returns a timeline-ordered context bundle with no pre-classification.',
    {
      patient_id: z.string().regex(/^[a-zA-Z0-9\-_.]+$/, 'Patient ID must be alphanumeric/UUID').describe('FHIR Patient resource ID'),
      context_budget: z.number().optional().describe('Max approximate tokens for context bundle (default: 4000)'),
    },
    async ({ patient_id, context_budget }) => {
      // Implemented in Step 3
      const { assemblePatientContext } = await import('./context/assembler.js');
      const ctx = await assemblePatientContext(patient_id, context_budget);
      return jsonToolResult(ctx);
    },
  );

  // Tool: list_patients
  server.tool(
    'list_patients',
    'List available MIMIC-IV patients from the FHIR server.',
    {
      count: z.number().int().min(1).max(500).optional().describe('Max patients to return (default: 100, max: 500)'),
    },
    async ({ count }) => {
      const { listPatients } = await import('./fhir/client.js');
      const patients = await listPatients(count ?? 100);
      return jsonToolResult(patients);
    },
  );

  // Tool: inspect_context
  server.tool(
    'inspect_context',
    'Inspect what context was assembled for a patient — queries executed, record counts, gaps, token estimate.',
    {
      patient_id: z.string().regex(/^[a-zA-Z0-9\-_.]+$/, 'Patient ID must be alphanumeric/UUID').describe('FHIR Patient resource ID'),
    },
    async ({ patient_id }) => {
      const { inspectContext } = await import('./tools/inspector.js');
      const inspection = await inspectContext(patient_id);
      return jsonToolResult(inspection);
    },
  );

  // Tool: get_scenario
  server.tool(
    'get_scenario',
    'Get an ICU simulation scenario with current physiologic state.',
    {
      scenario_id: z.enum(['pressor-titration', 'fluid-responsive', 'hyporesponsive']).describe('Scenario ID'),
    },
    async ({ scenario_id }) => {
      const { getScenario } = await import('./events/generator.js');
      const scenario = await getScenario(scenario_id);
      return jsonToolResult(scenario);
    },
  );

  // Tool: advance_scenario
  server.tool(
    'advance_scenario',
    'Apply a clinical action to a scenario (titrate medication, give fluid bolus) and return updated physiologic state.',
    {
      scenario_id: z.enum(['pressor-titration', 'fluid-responsive', 'hyporesponsive']).describe('Scenario ID'),
      action: z.enum(['titrate', 'bolus', 'add_medication']).describe('Action type'),
      medication: z.string().optional().describe('Medication name (for titrate/add_medication)'),
      new_dose: z.number().optional().describe('New dose value (for titrate)'),
      volume_ml: z.number().optional().describe('Fluid volume in mL (for bolus)'),
    },
    async ({ scenario_id, action, medication, new_dose, volume_ml }) => {
      const { advanceScenario } = await import('./events/generator.js');
      const result = await advanceScenario(scenario_id, { action, medication, new_dose, volume_ml });
      return jsonToolResult(result);
    },
  );

  // Tool: reset_scenario
  server.tool(
    'reset_scenario',
    'Reset a scenario to its initial state, clearing all persisted state.',
    {
      scenario_id: z.enum(['pressor-titration', 'fluid-responsive', 'hyporesponsive']).describe('Scenario ID to reset'),
    },
    async ({ scenario_id }) => {
      const { resetScenario } = await import('./events/generator.js');
      await resetScenario(scenario_id);
      return { content: [{ type: 'text' as const, text: `Scenario "${scenario_id}" reset to initial state.` }] };
    },
  );

  // Tool: poll_shift_report_tasks
  server.tool(
    'poll_shift_report_tasks',
    'Poll Medplum for requested shift-report Tasks, create draft DocumentReferences, and complete or fail each Task.',
    {
      count: z.number().int().min(1).max(100).optional().describe('Max tasks to process in a single poll pass (default: 20)'),
    },
    async ({ count }) => {
      const { pollOnce } = await import('./worker/shift-report-worker.js');
      const summary = await pollOnce(count ?? 20);
      return jsonToolResult(summary);
    },
  );

  return server;
}
