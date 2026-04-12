import type {
  DocumentReference,
  MedicationAdministration,
  Provenance,
  Task,
} from "./types.js";

function unresolvedClinicalWrite(operation: string): Promise<never> {
  return Promise.reject(
    new Error(
      `TODO(volatile-draft-vs-fhir-queuing): ${operation} is intentionally unavailable in wave 1 scaffold hardening.`,
    ),
  );
}

function createUnavailableWrite<TInput>(operation: string) {
  return (_input: TInput): Promise<never> => unresolvedClinicalWrite(operation);
}

export interface DraftShiftReportWriteInput {
  patientId: string;
  encounterId?: string;
  reportMarkdown: string;
  workflowName: "shift-report";
}

export interface DraftTaskWriteInput {
  patientId: string;
  encounterId?: string;
  description: string;
}

export interface DraftMedicationAdministrationWriteInput {
  patientId: string;
  encounterId?: string;
  medicationName: string;
  note?: string;
}

export const createDraftShiftReport =
  createUnavailableWrite<DraftShiftReportWriteInput>(
    "createDraftShiftReport(DocumentReference)",
  );

export const queueDraftTask =
  createUnavailableWrite<DraftTaskWriteInput>("queueDraftTask(Task)");

export const queueDraftMedicationAdministration =
  createUnavailableWrite<DraftMedicationAdministrationWriteInput>(
    "queueDraftMedicationAdministration(MedicationAdministration)",
  );

export function recordDraftProvenance(
  _target:
    | DocumentReference
    | MedicationAdministration
    | Task
    | Provenance,
): Promise<never> {
  return unresolvedClinicalWrite("recordDraftProvenance(Provenance)");
}
