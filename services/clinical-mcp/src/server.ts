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
 * Under the three-product topology (docs/plans/three-product-alignment-2026-04-16.md):
 *
 *   - Product C (sim-harness) has its OWN MCP server at
 *     services/sim-harness/src/mcp/server.ts (createSimMcpServer()).
 *     Agents normally reach sim tools via that server directly.
 *
 *   - This seam remains as a compatibility hook: when Product B is bundled
 *     with Product C (single-process deployments, local dev), sim tools
 *     may optionally be proxied through this Product B server by an
 *     explicit wiring step that imports createSimMcpServer from
 *     @noah-rn/sim-harness and bridges its tools here.
 *
 *   - This file remains no-op by default to preserve the product boundary.
 *     A direct import from @noah-rn/sim-harness here would be a Product B
 *     → Product C boundary violation; the bridge (when wired) must use
 *     MCP transport, not imports.
 *
 * Phase 8b will formalize the bridge pattern. Until then, the Product C
 * MCP server runs standalone.
 */
function registerSimTools(_server: McpServer): void {
  // no-op: Product C runs its own MCP server; cross-product imports forbidden.
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

  // Tool: get_medication_list (clinical-MCP contract v1)
  server.tool(
    'get_medication_list',
    'Assemble a MAR-style view for a patient: active MedicationRequests with scheduled/overdue/PRN/held state, recent MedicationAdministrations, and inline ISMP high-alert flags.',
    {
      patient_id: z.string().regex(/^[a-zA-Z0-9\-_.]+$/, 'Patient ID must be alphanumeric/UUID').describe('FHIR Patient resource ID'),
      filter_status: z.enum(['active', 'held', 'all']).optional().describe('Filter for MedicationRequest status (default: active).'),
    },
    async ({ patient_id, filter_status }) => {
      const { getMedicationList } = await import('./context/medication.js');
      const list = await getMedicationList(patient_id, {
        filter: filter_status ? { status: filter_status } : undefined,
      });
      return jsonToolResult(list);
    },
  );

  // Tool: lookup_drug (clinical-MCP contract v1)
  // Routes through the clinical-resources/drug-reference/ subordinate lane.
  server.tool(
    'lookup_drug',
    'Look up a drug in the Noah RN Lexicomp-mirror scaffold by generic name, brand name, or drug class. Returns matching entries plus staleness warnings for entries older than 12 months.',
    {
      query: z.string().min(1).describe('Drug name, brand name, or drug class (e.g. "norepinephrine", "Levophed", "vasopressor").'),
    },
    async ({ query }) => {
      const { lookupDrug } = await import('./tools/drug-reference.js');
      return jsonToolResult(lookupDrug(query));
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
