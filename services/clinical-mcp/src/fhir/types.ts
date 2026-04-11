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

export interface Reference {
  reference?: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Attachment {
  contentType?: string;
  title?: string;
  creation?: string;
  url?: string;
  data?: string;
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
  subject?: Reference;
}

export interface MedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status?: string;
  intent?: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
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
  medicationReference?: Reference;
  subject?: Reference;
  context?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  dosage?: {
    text?: string;
    route?: CodeableConcept;
    dose?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
    rateQuantity?: {
      value?: number;
      unit?: string;
      system?: string;
      code?: string;
    };
  };
  performer?: Array<{
    actor?: Reference;
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

export interface DocumentReference extends FhirResource {
  resourceType: 'DocumentReference';
  status?: string;
  type?: CodeableConcept;
  category?: CodeableConcept[];
  subject?: Reference;
  date?: string;
  author?: Reference[];
  description?: string;
  content?: Array<{
    attachment?: Attachment;
  }>;
  context?: {
    encounter?: Reference[];
    period?: {
      start?: string;
      end?: string;
    };
  };
}

export type ClinicalResource =
  | Observation
  | Condition
  | MedicationRequest
  | MedicationAdministration
  | Encounter
  | DocumentReference;

export interface FhirResult<T> {
  data: T | null;
  error: string | null;
}
