// Minimal FHIR R4 type definitions for resources used by Noah RN

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
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
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
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  component?: Array<{
    code: CodeableConcept;
    valueQuantity?: {
      value?: number;
      unit?: string;
    };
  }>;
}

export interface Condition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  code?: CodeableConcept;
  onsetDateTime?: string;
  recordedDate?: string;
  subject?: { reference?: string };
}

export interface MedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status?: string;
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

export interface Encounter extends FhirResource {
  resourceType: 'Encounter';
  status?: string;
  class?: Coding;
  type?: CodeableConcept[];
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: CodeableConcept[];
}

export type ClinicalResource = Observation | Condition | MedicationRequest | Encounter;

export interface FhirResult<T> {
  data: T | null;
  error: string | null;
}
