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

// --- Tier 2: Nurse-charted vitals ---
// Per docs/foundations/sim-harness-vitals-data-flow.md:
// Nurse-charted observations use status: "final", have a performer reference,
// and are tagged with "nurse-charted" to distinguish from device-stream observations.

const OBSERVATION_ORIGIN_SYSTEM = "https://noah-rn.dev/observation-origin";

const VITAL_LOINC: Record<string, { code: string; display: string; unit: string }> = {
  hr: { code: "8867-4", display: "Heart rate", unit: "/min" },
  rr: { code: "9279-1", display: "Respiratory rate", unit: "/min" },
  spo2: { code: "2708-6", display: "Oxygen saturation in Arterial blood by Pulse oximetry", unit: "%" },
  etco2: { code: "33437-5", display: "End tidal CO2", unit: "mmHg" },
  sbp: { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg" },
  dbp: { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg" },
  map: { code: "8478-0", display: "Mean blood pressure", unit: "mmHg" },
  temp_c: { code: "8310-5", display: "Body temperature", unit: "Cel" },
};

export interface ChartVitalsInput {
  patientId: string;
  encounterId?: string;
  /** Vital sign values to chart. Keys must be from VITAL_LOINC (hr, rr, spo2, etc.). */
  vitals: Record<string, number>;
  /** Who charted these vitals. Default: "Noah RN Agent". */
  chartedBy?: string;
}

/**
 * Write nurse-charted (Tier 2) vital sign observations.
 *
 * These are the official, validated vitals that become part of the medical record.
 * status: "final", no device reference, tagged with "nurse-charted".
 */
export async function chartVitals(
  input: ChartVitalsInput,
): Promise<{ created: number; errors: string[] }> {
  const performer = input.chartedBy ?? "Noah RN Agent";
  const effectiveDateTime = new Date().toISOString();
  const errors: string[] = [];
  let created = 0;

  for (const [param, value] of Object.entries(input.vitals)) {
    const loinc = VITAL_LOINC[param];
    if (!loinc) {
      errors.push(`Unknown vital parameter: ${param}`);
      continue;
    }

    const observation = {
      resourceType: "Observation" as const,
      status: "final",
      category: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "vital-signs",
          display: "Vital Signs",
        }],
      }],
      code: {
        coding: [{
          system: "http://loinc.org",
          code: loinc.code,
          display: loinc.display,
        }],
      },
      subject: { reference: `Patient/${input.patientId}` },
      ...(input.encounterId && {
        encounter: { reference: `Encounter/${input.encounterId}` },
      }),
      performer: [{ display: performer }],
      effectiveDateTime,
      valueQuantity: {
        value: Math.round(value * 100) / 100,
        unit: loinc.unit,
        system: "http://unitsofmeasure.org",
        code: loinc.unit,
      },
      meta: {
        tag: [{ system: OBSERVATION_ORIGIN_SYSTEM, code: "nurse-charted" }],
      },
    };

    const result = await fhirPost("Observation", observation);
    if (result.error || !result.data) {
      errors.push(`Failed to chart ${param}: ${result.error}`);
    } else {
      created++;
    }
  }

  return { created, errors };
}

export function recordDraftProvenance(
  _target:
    | DocumentReference
    | MedicationAdministration
    | Task
    | Provenance,
): Promise<never> {
  return deferredWrite("recordDraftProvenance(Provenance)");
}
