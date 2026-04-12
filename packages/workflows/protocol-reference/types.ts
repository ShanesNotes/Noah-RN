export type ProtocolFamily =
  | "acls"
  | "sepsis"
  | "stroke"
  | "rapid_response"
  | "rsi";

export type ProtocolReferenceDepth = "brief" | "standard" | "full_algorithm";

export type ProtocolKnowledgeSource =
  | "clinical-resources/protocols/acls.md"
  | "clinical-resources/protocols/sepsis-bundle.md"
  | "clinical-resources/protocols/acute-stroke.md"
  | "clinical-resources/protocols/rapid-response.md"
  | "clinical-resources/protocols/rsi.md";

export type ProtocolReferenceLimitation =
  | "adult_patients_only"
  | "five_protocols_only"
  | "national_guidelines_not_facility_specific"
  | "does_not_replace_clinical_judgment"
  | "no_pediatric_protocols";

export interface ProtocolReferenceInput {
  protocolFamily?: ProtocolFamily;
  depth?: ProtocolReferenceDepth;
  rhythm?: string;
  vitals?: string;
  patientWeight?: number;
  timeOfOnset?: string;
}

export interface ProtocolReferenceOutput {
  algorithmText: string;
  knowledgeSource: ProtocolKnowledgeSource;
  includesExactDosesAndTimings: boolean;
}

export interface ProtocolReferenceWorkflowContract {
  name: "protocol-reference";
  supportedScopes: readonly [
    "cardiac_arrest",
    "sepsis",
    "stroke",
    "rapid_response",
    "airway_management",
  ];
  requiredContext: {
    mandatory: readonly [];
    optional: readonly ["rhythm", "vitals", "patient_weight", "time_of_onset"];
  };
  controllableFields: {
    protocol_family: ProtocolFamily;
    depth: ProtocolReferenceDepth;
  };
  knowledgeSources: readonly ProtocolKnowledgeSource[];
  limitations: readonly ProtocolReferenceLimitation[];
  output: ProtocolReferenceOutput;
}

export const protocolReferenceContract: ProtocolReferenceWorkflowContract = {
  name: "protocol-reference",
  supportedScopes: [
    "cardiac_arrest",
    "sepsis",
    "stroke",
    "rapid_response",
    "airway_management",
  ],
  requiredContext: {
    mandatory: [],
    optional: ["rhythm", "vitals", "patient_weight", "time_of_onset"],
  },
  controllableFields: {
    protocol_family: "acls",
    depth: "standard",
  },
  knowledgeSources: [
    "clinical-resources/protocols/acls.md",
    "clinical-resources/protocols/sepsis-bundle.md",
    "clinical-resources/protocols/acute-stroke.md",
    "clinical-resources/protocols/rapid-response.md",
    "clinical-resources/protocols/rsi.md",
  ],
  limitations: [
    "adult_patients_only",
    "five_protocols_only",
    "national_guidelines_not_facility_specific",
    "does_not_replace_clinical_judgment",
    "no_pediatric_protocols",
  ],
  output: {
    algorithmText: "",
    knowledgeSource: "clinical-resources/protocols/acls.md",
    includesExactDosesAndTimings: true,
  },
};
