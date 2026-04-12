import type { DrugRangesCatalog } from "../../../clinical-resources/types.js";

export type DrugReferenceDepth = "quick_reference" | "full_label";

export type DrugReferenceLimitation =
  | "fda_labels_only"
  | "no_off_label_guidance"
  | "no_compounding"
  | "single_source_interactions"
  | "does_not_replace_pharmacist_consult"
  | "does_not_replace_clinical_judgment";

export interface DrugReferenceInput {
  medicationName: string;
  depth?: DrugReferenceDepth;
  clinicalContext?: string;
  patientWeight?: number;
  renalFunction?: string;
}

export interface DrugReferenceOutput {
  bedsideSummary: string;
  administrationHighlights: string[];
  keyWarnings: string[];
  monitoringParameters: string[];
  highAlert: boolean;
}

export interface DrugReferenceWorkflowContract {
  name: "drug-reference";
  supportedScopes: readonly [
    "medication_reference",
    "drug_interactions",
    "high_alert_medications",
    "dosing",
    "administration",
  ];
  requiredContext: {
    mandatory: readonly ["medication_name"];
    optional: readonly ["clinical_context", "patient_weight", "renal_function"];
  };
  controllableFields: {
    depth: DrugReferenceDepth;
    medication_name: "generic" | "brand" | "abbreviation";
  };
  resourceDependencies: readonly ["drug-ranges"];
  limitations: readonly DrugReferenceLimitation[];
  output: DrugReferenceOutput;
}

export interface DrugReferenceResourceProjection {
  drugRanges: DrugRangesCatalog;
}

export const drugReferenceContract: DrugReferenceWorkflowContract = {
  name: "drug-reference",
  supportedScopes: [
    "medication_reference",
    "drug_interactions",
    "high_alert_medications",
    "dosing",
    "administration",
  ],
  requiredContext: {
    mandatory: ["medication_name"],
    optional: ["clinical_context", "patient_weight", "renal_function"],
  },
  controllableFields: {
    depth: "quick_reference",
    medication_name: "generic",
  },
  resourceDependencies: ["drug-ranges"],
  limitations: [
    "fda_labels_only",
    "no_off_label_guidance",
    "no_compounding",
    "single_source_interactions",
    "does_not_replace_pharmacist_consult",
    "does_not_replace_clinical_judgment",
  ],
  output: {
    bedsideSummary: "",
    administrationHighlights: [],
    keyWarnings: [],
    monitoringParameters: [],
    highAlert: false,
  },
};
