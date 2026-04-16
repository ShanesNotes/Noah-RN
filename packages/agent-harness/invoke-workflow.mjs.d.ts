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
