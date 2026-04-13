import type {
  DocumentReference,
  MedicationAdministration,
  Provenance,
  Task,
} from "./types.js";
import { fhirPost } from "./client.js";

// --- Resolved: volatile-draft-vs-fhir-queuing → Option A (FHIR-queued) ---
// PLAN.md Decision Log 2026-04-12: preliminary DocumentReference as first review artifact.
// Only createDraftShiftReport is implemented. Other writes remain stubs until needed.

function deferredWrite(operation: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${operation} is deferred — not required by the current first-workflow forcing path.`,
    ),
  );
}

function createDeferredWrite<TInput>(operation: string) {
  return (_input: TInput): Promise<never> => deferredWrite(operation);
}

export interface DraftShiftReportWriteInput {
  patientId: string;
  encounterId?: string;
  reportMarkdown: string;
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

export async function createDraftShiftReport(
  input: DraftShiftReportWriteInput,
): Promise<DocumentReference> {
  const payload = {
    resourceType: "DocumentReference" as const,
    status: "current",
    docStatus: "preliminary",
    type: {
      coding: [
        {
          system: "https://noah-rn.dev/artifacts",
          code: "shift-report-draft",
          display: "Draft Shift Report",
        },
        {
          system: "http://loinc.org",
          code: "28651-8",
          display: "Nurse transfer note",
        },
      ],
      text: "Draft Shift Report",
    },
    subject: { reference: `Patient/${input.patientId}` },
    author: [{ display: "Noah RN Agent" }],
    description: "Draft Shift Report — requires nurse review",
    content: [{
      attachment: {
        // Contract specifies text/plain; text/markdown is retained here because the artifact content is markdown-formatted.
        contentType: "text/markdown",
        title: `shift-report-draft-${Date.now()}`,
        data: Buffer.from(input.reportMarkdown, "utf-8").toString("base64"),
      },
    }],
    ...(input.encounterId && {
      context: {
        encounter: [{ reference: `Encounter/${input.encounterId}` }],
      },
    }),
  };

  const result = await fhirPost<DocumentReference>("DocumentReference", payload);

  if (result.error || !result.data) {
    throw new Error(`createDraftShiftReport failed: ${result.error}`);
  }

  return result.data;
}

export const queueDraftTask =
  createDeferredWrite<DraftTaskWriteInput>("queueDraftTask(Task)");

export const queueDraftMedicationAdministration =
  createDeferredWrite<DraftMedicationAdministrationWriteInput>(
    "queueDraftMedicationAdministration(MedicationAdministration)",
  );

export function recordDraftProvenance(
  _target:
    | DocumentReference
    | MedicationAdministration
    | Task
    | Provenance,
): Promise<never> {
  return deferredWrite("recordDraftProvenance(Provenance)");
}
