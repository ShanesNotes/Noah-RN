// Minimal FHIR R4 type definitions for resources used by Noah RN

export interface FhirBundle<T = FhirResource> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: BundleEntry<T>[];
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: Meta;
}

export interface Meta {
  versionId?: string;
  lastUpdated?: string;
  tag?: Coding[];
}

export interface BundleEntry<T = FhirResource> {
  fullUrl?: string;
  resource: T;
}

export interface Identifier {
  system?: string;
  value?: string;
}

export interface HumanName {
  family?: string;
  given?: string[];
  text?: string;
}

export interface Narrative {
  status?: string;
  div?: string;
}

export interface Patient extends FhirResource {
  resourceType: 'Patient';
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
  identifier?: Identifier[];
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

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface Observation extends FhirResource {
  resourceType: 'Observation';
  status?: string;
  category?: Array<{ coding?: Coding[] }>;
  code: CodeableConcept;
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  valueString?: string;
  component?: Array<{
    code: CodeableConcept;
    valueQuantity?: Quantity;
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
  subject?: Reference;
  encounter?: Reference;
  medicationReference?: Reference;
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
    route?: CodeableConcept;
    doseAndRate?: Array<{
      doseQuantity?: Quantity;
      rateQuantity?: Quantity;
    }>;
  }>;
}

export interface Medication extends FhirResource {
  resourceType: 'Medication';
  code?: CodeableConcept;
}

export interface MedicationAdministration extends FhirResource {
  resourceType: 'MedicationAdministration';
  status?: string;
  medicationCodeableConcept?: CodeableConcept;
  medicationReference?: Reference;
  subject?: Reference;
  context?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  dosage?: {
    text?: string;
    route?: CodeableConcept;
    dose?: Quantity;
    rateQuantity?: Quantity;
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
  subject?: Reference;
  period?: Period;
  reasonCode?: CodeableConcept[];
}

export interface DocumentReference extends FhirResource {
  resourceType: 'DocumentReference';
  identifier?: Identifier[];
  status?: string;
  docStatus?: string;
  type?: CodeableConcept;
  category?: CodeableConcept[];
  subject?: Reference;
  date?: string;
  author?: Reference[];
  description?: string;
  text?: Narrative;
  content?: Array<{
    attachment?: Attachment;
  }>;
  context?: {
    encounter?: Reference[];
    period?: Period;
  };
}

export interface TaskOutput {
  type?: CodeableConcept;
  valueReference?: Reference;
}

export interface Task extends FhirResource {
  resourceType: 'Task';
  status?: string;
  intent?: string;
  code?: CodeableConcept;
  for?: Reference;
  encounter?: Reference;
  focus?: Reference;
  requester?: Reference;
  owner?: Reference;
  authoredOn?: string;
  description?: string;
  statusReason?: CodeableConcept;
  output?: TaskOutput[];
}

export interface Provenance extends FhirResource {
  resourceType: 'Provenance';
  target?: Reference[];
  recorded?: string;
  agent?: Array<{
    who?: Reference;
    type?: CodeableConcept;
  }>;
}

export interface Device extends FhirResource {
  resourceType: 'Device';
  status?: string;
  type?: CodeableConcept;
  patient?: Reference;
  deviceName?: Array<{
    name?: string;
    type?: string;
  }>;
}

export type ClinicalResource =
  | Observation
  | Condition
  | Medication
  | MedicationRequest
  | MedicationAdministration
  | Encounter
  | DocumentReference
  | Patient
  | Task
  | Provenance
  | Device;

export interface FhirResult<T> {
  data: T | null;
  error: string | null;
}
