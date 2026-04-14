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

/**
 * Conditional sim-tool registration seam.
 *
 * The clinical-mcp server is the single agent-facing MCP boundary. Per the
 * invariant kernel, agents never talk to services/sim-harness/ directly —
 * sim tools register here and only when a sim-harness runtime is present.
 *
 * This function is intentionally a no-op today. Runtime wiring for live
 * vitals, waveform vision, medication administration, intervention, scenario
 * control, charting authority, and obligation tools lands in execution-packet
 * Lane F per docs/foundations/execution-packet-simulation-architecture.md,
 * shaped by Contracts 4, 5, 6, 7 in the foundational contracts document.
 */
function registerSimTools(_server: McpServer): void {
  // no-op until Lane F
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

  // Sim-harness tools register conditionally through registerSimTools().
  // See docs/foundations/sim-harness-runtime-access-contract.md (working reference)
  // and Contracts 4 + 6 in docs/foundations/foundational-contracts-simulation-architecture.md
  // for the authoritative tool surface. No sim-harness runtime is wired in this build,
  // so the helper is a no-op. Wiring lands with execution-packet Lane F.
  registerSimTools(server);

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
