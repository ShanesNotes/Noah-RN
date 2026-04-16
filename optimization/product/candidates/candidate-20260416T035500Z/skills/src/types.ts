export type WorkflowScope = string;
export type ContextRequirement = string;

export interface WorkflowRegistryEntry {
  name: string;
  source_path: string;
  scope: WorkflowScope[];
}

export interface WorkflowRegistry {
  version: number;
  status: string;
  authoritative_surface: string;
  skills: WorkflowRegistryEntry[];
}

export interface RegisteredWorkflow {
  name: string;
  source_path: string;
  scope: WorkflowScope[];
  exists: boolean;
  has_contract: boolean;
  authoritative_surface: string;
}

export interface WorkflowSelectionInput {
  scope?: WorkflowScope;
  availableContext?: ContextRequirement[];
}

export interface SelectedWorkflow extends RegisteredWorkflow {
  mandatory: ContextRequirement[];
  mandatory_one_of: ContextRequirement[];
  mandatory_satisfied: boolean;
  mandatory_one_of_satisfied: boolean;
  scope_match: boolean;
  selected: true;
}

export interface ToolRegistryEntry {
  name: string;
  kind: string;
  source_path: string;
  authoritative_surface: string;
  exists: boolean;
}

export interface ClinicalResourceRegistryEntry {
  name: string;
  kind: string;
  source_path: string;
  authoritative_surface: string;
  exists: boolean;
}

export interface RoutingCandidate {
  name: string;
  source_path: string;
  scope: WorkflowScope[];
  contract_ready: boolean;
  required_context: {
    mandatory: ContextRequirement[];
    mandatory_one_of: ContextRequirement[];
  };
  tool_families: ToolRegistryEntry[];
  knowledge_assets: ClinicalResourceRegistryEntry[];
  knowledge_sources_raw: string[];
  service_surface_refs: string[];
  authoritative_surface: string;
}

export interface HarnessInvocationInput {
  workflowName: string;
  patientId?: string;
  clinicalNarrative?: string;
  availableContext?: ContextRequirement[];
  traceCaseId?: string;
}

export interface HarnessInvocationPlan {
  workflowName: string;
  contextSource: "clinical-mcp" | "clinical-narrative";
  serviceSurfaceRefs: string[];
  toolFamilyNames: string[];
  clinicalResourceNames: string[];
}
