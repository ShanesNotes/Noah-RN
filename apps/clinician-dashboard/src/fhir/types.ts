// FHIR R4 types for dashboard — intentional subset of services/clinical-mcp/src/fhir/types.ts
// Kept separate: different build targets (Vite browser vs Node service), different FHIR surface areas

export interface FhirBundle<T = FhirResource> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{ resource: T }>;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
}

export interface Patient extends FhirResource {
  resourceType: 'Patient';
  name?: Array<{
    family?: string;
    given?: string[];
    text?: string;
  }>;
  gender?: string;
  birthDate?: string;
  identifier?: Array<{ system?: string; value?: string }>;
}

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Observation extends FhirResource {
  resourceType: 'Observation';
  status?: string;
  category?: Array<{ coding?: Coding[] }>;
  code: CodeableConcept;
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  subject?: { reference?: string };
  component?: Array<{
    code: CodeableConcept;
    valueQuantity?: { value?: number; unit?: string };
  }>;
  referenceRange?: Array<{
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
    text?: string;
  }>;
}

export interface Condition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  code?: CodeableConcept;
  onsetDateTime?: string;
  recordedDate?: string;
}

export interface MedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status?: string;
  subject?: { reference?: string };
  intent?: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: { reference?: string; display?: string };
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
    route?: CodeableConcept;
    doseAndRate?: Array<{
      doseQuantity?: { value?: number; unit?: string };
      rateQuantity?: { value?: number; unit?: string };
    }>;
  }>;
}

export interface MedicationAdministration extends FhirResource {
  resourceType: 'MedicationAdministration';
  status?: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: { reference?: string; display?: string };
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  dosage?: {
    text?: string;
    dose?: { value?: number; unit?: string };
    rateQuantity?: { value?: number; unit?: string };
  };
}

export interface Encounter extends FhirResource {
  resourceType: 'Encounter';
  status?: string;
  class?: Coding;
  type?: CodeableConcept[];
  period?: { start?: string; end?: string };
  reasonCode?: CodeableConcept[];
}

