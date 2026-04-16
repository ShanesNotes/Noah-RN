declare module '../../../../packages/agent-harness/invoke-workflow.mjs' {
  export interface WorkflowCandidate {
    name: string;
    source_path: string;
    scope?: string;
    contract_ready?: boolean;
    required_context: {
      mandatory?: string[];
      mandatory_one_of?: string[][];
    };
    tool_families: Array<{ name: string }>;
    knowledge_assets: Array<{ name: string }>;
    knowledge_sources_raw?: string[];
    service_surface_refs: string[];
    authoritative_surface?: string;
    pi_skill_target?: string;
  }

  export function getWorkflowCandidate(workflowName: string, rawInput?: string): WorkflowCandidate;
}

declare module '../../../../packages/agent-harness/shift-report-renderer.mjs' {
  export interface RendererCandidate {
    name: string;
    source_path: string;
    tool_families: Array<{ name: string }>;
    knowledge_assets: Array<{ name: string }>;
    service_surface_refs: string[];
  }

  export interface RendererInput {
    candidate: RendererCandidate;
    patientId: string;
    context: unknown;
    laneCoverage?: Record<string, string>;
  }

  export function buildShiftReportRendererInput(
    candidate: RendererCandidate,
    patientId: string,
    context: unknown,
    options?: { laneCoverage?: Record<string, string> },
  ): RendererInput;

  export function renderShiftReportFromPatientContext(input: RendererInput): string;
}
