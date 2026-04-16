import type {
  DocumentReference,
  MedicationAdministration,
  Procedure,
  Provenance,
  Task,
} from "./types.js";
import { fhirPost } from "./client.js";
import { VITAL_LOINC } from "./vital-loinc.js";

// --- Resolved: volatile-draft-vs-fhir-queuing → Option A (FHIR-queued) ---
// PLAN.md Decision Log 2026-04-12: preliminary DocumentReference as first review artifact.
// Replay-scoped Task / MedicationAdministration / Provenance draft writes are now implemented.

const WORKFLOW_SYSTEM = "https://noah-rn.dev/workflows";
const REVIEW_STATUS_SYSTEM = "https://noah-rn.dev/review-status";
const REVIEW_STATE_SYSTEM = "https://noah-rn.dev/review-state";
const ARTIFACT_SYSTEM = "https://noah-rn.dev/artifacts";
const TASK_ID_SYSTEM = "https://noah-rn.dev/task-id";
const EXECUTION_ID_SYSTEM = "https://noah-rn.dev/execution-id";
const PROVENANCE_ACTIVITY_SYSTEM =
  "https://noah-rn.dev/provenance-activity";
const PROVENANCE_POLICY_URL =
  "https://noah-rn.dev/charting-policy/replay-scoped-draft-review";
const SOURCE_LAYER_SYSTEM = "https://noah-rn.dev/source-layer";
const FHIR_EXTENSION_SYSTEM =
  "https://noah-rn.dev/fhir/StructureDefinition";

function buildDraftIdentifiers(
  taskId?: string,
  executionId?: string,
) {
  const identifiers = [
    ...(taskId
      ? [
          {
            system: TASK_ID_SYSTEM,
            value: taskId,
          },
        ]
      : []),
    ...(executionId
      ? [
          {
            system: EXECUTION_ID_SYSTEM,
            value: executionId,
          },
        ]
      : []),
  ];

  return identifiers.length > 0 ? identifiers : undefined;
}

function findExecutionId(
  identifiers?: Array<{ system?: string; value?: string }>,
) {
  return identifiers?.find((identifier) => identifier.system === EXECUTION_ID_SYSTEM)
    ?.value;
}

function buildDraftTags(
  workflowCode: string,
  workflowDisplay: string,
  artifactCode: string,
  artifactDisplay: string,
) {
  return [
    {
      system: WORKFLOW_SYSTEM,
      code: workflowCode,
      display: workflowDisplay,
    },
    {
      system: REVIEW_STATUS_SYSTEM,
      code: "review-required",
      display: "Review Required",
    },
    {
      system: WORKFLOW_SYSTEM,
      code: "replay-scoped",
      display: "Replay Scoped",
    },
    {
      system: ARTIFACT_SYSTEM,
      code: artifactCode,
      display: artifactDisplay,
    },
  ];
}

async function postRequiredResource<T>(
  resourceType: string,
  payload: unknown,
  operation: string,
): Promise<T> {
  const result = await fhirPost<T>(resourceType, payload);

  if (result.error || !result.data) {
    throw new Error(`${operation} failed: ${result.error}`);
  }

  return result.data;
}

export interface DraftShiftReportWriteInput {
  patientId: string;
  encounterId?: string;
  taskId?: string;
  executionId?: string;
  reportMarkdown: string;
}

export interface DraftTaskWriteInput {
  patientId: string;
  encounterId?: string;
  description: string;
  executionId?: string;
  focusReference?: string;
  ownerDisplay?: string;
  priority?: "routine" | "urgent" | "asap" | "stat";
  taskCode?: string;
}

export interface DraftMedicationAdministrationWriteInput {
  patientId: string;
  encounterId?: string;
  medicationName: string;
  executionId?: string;
  medicationRequestId?: string;
  note?: string;
}

export async function createDraftShiftReport(
  input: DraftShiftReportWriteInput,
): Promise<DocumentReference> {
  const identifiers = buildDraftIdentifiers(input.taskId, input.executionId);
  const payload = {
    resourceType: "DocumentReference" as const,
    meta: {
      tag: [
        {
          system: WORKFLOW_SYSTEM,
          code: "shift-report",
          display: "Shift Report",
        },
        {
          system: REVIEW_STATUS_SYSTEM,
          code: "review-required",
          display: "Review Required",
        },
      ],
    },
    ...(identifiers && { identifier: identifiers }),
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
        title: input.taskId ? `shift-report-draft-${input.taskId}-${Date.now()}` : `shift-report-draft-${Date.now()}`,
        data: Buffer.from(input.reportMarkdown, "utf-8").toString("base64"),
      },
    }],
    ...(input.encounterId && {
      context: {
        encounter: [{ reference: `Encounter/${input.encounterId}` }],
      },
    }),
  };

  return postRequiredResource<DocumentReference>(
    "DocumentReference",
    payload,
    "createDraftShiftReport",
  );
}

export async function queueDraftTask(
  input: DraftTaskWriteInput,
): Promise<Task> {
  const payload = {
    resourceType: "Task" as const,
    ...(input.executionId && {
      identifier: buildDraftIdentifiers(undefined, input.executionId),
    }),
    meta: {
      tag: buildDraftTags(
        "draft-review-queue",
        "Draft Review Queue",
        "review-task-draft",
        "Draft Review Task",
      ),
    },
    status: "requested",
    intent: "order",
    priority: input.priority ?? "routine",
    code: {
      coding: [
        {
          system: ARTIFACT_SYSTEM,
          code: input.taskCode ?? "draft-review",
          display: "Draft Review",
        },
      ],
      text: "Draft Review",
    },
    businessStatus: {
      coding: [
        {
          system: REVIEW_STATE_SYSTEM,
          code: "pending-review",
          display: "Pending Review",
        },
      ],
      text: "Pending review",
    },
    for: { reference: `Patient/${input.patientId}` },
    ...(input.encounterId && {
      encounter: { reference: `Encounter/${input.encounterId}` },
    }),
    ...(input.focusReference && {
      focus: { reference: input.focusReference },
    }),
    requester: { display: "Noah RN Agent" },
    owner: { display: input.ownerDisplay ?? "Nurse Review Queue" },
    authoredOn: new Date().toISOString(),
    description: input.description,
    input: [
      {
        type: {
          coding: [
            {
              system: ARTIFACT_SYSTEM,
              code: "review-context",
              display: "Review Context",
            },
          ],
          text: "Review Context",
        },
        valueString: input.description,
      },
    ],
  };

  return postRequiredResource<Task>("Task", payload, "queueDraftTask");
}

export async function queueDraftMedicationAdministration(
  input: DraftMedicationAdministrationWriteInput,
): Promise<MedicationAdministration> {
  const payload = {
    resourceType: "MedicationAdministration" as const,
    ...(input.executionId && {
      identifier: buildDraftIdentifiers(undefined, input.executionId),
    }),
    meta: {
      tag: buildDraftTags(
        "medication-review",
        "Medication Review",
        "draft-medication-administration",
        "Draft Medication Administration",
      ),
    },
    // MedicationAdministration has no preliminary status in FHIR R4. We keep
    // replay drafts unmistakably non-final via review tags plus a draft reason.
    status: "not-done",
    statusReason: {
      coding: [
        {
          system: REVIEW_STATE_SYSTEM,
          code: "draft-proposal",
          display: "Draft Proposal",
        },
      ],
      text: "Draft medication administration — requires nurse review",
    },
    extension: [
      {
        url: `${FHIR_EXTENSION_SYSTEM}/review-state`,
        valueCode: "pending-review",
      },
    ],
    medicationCodeableConcept: {
      text: input.medicationName,
    },
    subject: { reference: `Patient/${input.patientId}` },
    ...(input.encounterId && {
      context: { reference: `Encounter/${input.encounterId}` },
    }),
    ...(input.medicationRequestId && {
      request: {
        reference: `MedicationRequest/${input.medicationRequestId}`,
      },
    }),
    performer: [{ actor: { display: "Noah RN Agent" } }],
    dosage: {
      text:
        input.note ??
        "Draft medication proposal queued for nurse review",
    },
    ...(input.note && {
      note: [{ text: input.note }],
    }),
  };

  return postRequiredResource<MedicationAdministration>(
    "MedicationAdministration",
    payload,
    "queueDraftMedicationAdministration",
  );
}

// --- Tier 2: Nurse-charted vitals ---
// Per docs/foundations/sim-harness-vitals-data-flow.md:
// Nurse-charted observations use status: "final", have a performer reference,
// and are tagged with "nurse-charted" to distinguish from device-stream observations.

const OBSERVATION_ORIGIN_SYSTEM = "https://noah-rn.dev/observation-origin";

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

// ----- Phase 4: MAR write path -----
// Contract 5 + clinical-MCP contract v1 enforcement:
//   - Agent-proposed drafts go through queueDraftMedicationAdministration
//     (status=not-done, statusReason=draft-proposal).
//   - Finalized / held / procedure writes require a human Practitioner
//     performer reference. Agent attempts to finalize without human
//     attestation are rejected at this boundary, NOT in the UI layer.

const NOAH_AGENT_DISPLAY = "Noah RN Agent";
const HUMAN_PERFORMER_PATTERN = /^Practitioner\/[^/]+$/;

function assertHumanPerformer(performerRef: string, operation: string): void {
  if (!HUMAN_PERFORMER_PATTERN.test(performerRef)) {
    throw new Error(
      `${operation} requires a human Practitioner performer reference (Practitioner/{id}). Received: "${performerRef}". Agent-authored finalized writes are not permitted by clinical-MCP contract v1; use queueDraftMedicationAdministration or queueDraftTask instead.`,
    );
  }
  if (/noah.*agent/i.test(performerRef)) {
    throw new Error(
      `${operation} rejected: performer "${performerRef}" looks like an agent identifier. Finalized MARs require a human clinician.`,
    );
  }
}

export interface ChartMedicationAdministrationInput {
  patientId: string;
  encounterId?: string;
  medicationName: string;
  medicationRequestId?: string;
  performerRef: string;
  effectiveDateTime?: string;
  dosageText?: string;
  note?: string;
}

export async function chartMedicationAdministration(
  input: ChartMedicationAdministrationInput,
): Promise<MedicationAdministration> {
  assertHumanPerformer(input.performerRef, "chartMedicationAdministration");

  const effectiveDateTime = input.effectiveDateTime ?? new Date().toISOString();

  const payload = {
    resourceType: "MedicationAdministration" as const,
    meta: {
      tag: [
        {
          system: OBSERVATION_ORIGIN_SYSTEM,
          code: "nurse-charted",
          display: "Nurse Charted",
        },
        {
          system: WORKFLOW_SYSTEM,
          code: "medication-administration",
          display: "Medication Administration",
        },
      ],
    },
    status: "completed",
    medicationCodeableConcept: { text: input.medicationName },
    subject: { reference: `Patient/${input.patientId}` },
    ...(input.encounterId && {
      context: { reference: `Encounter/${input.encounterId}` },
    }),
    ...(input.medicationRequestId && {
      request: { reference: `MedicationRequest/${input.medicationRequestId}` },
    }),
    performer: [{ actor: { reference: input.performerRef } }],
    effectiveDateTime,
    ...(input.dosageText && { dosage: { text: input.dosageText } }),
    ...(input.note && { note: [{ text: input.note }] }),
  };

  const medadmin = await postRequiredResource<MedicationAdministration>(
    "MedicationAdministration",
    payload,
    "chartMedicationAdministration",
  );

  if (medadmin.id) {
    await recordHumanAttestedProvenance(medadmin, input.performerRef);
  }

  return medadmin;
}

export interface HoldMedicationAdministrationInput {
  patientId: string;
  encounterId?: string;
  medicationName: string;
  medicationRequestId?: string;
  performerRef: string;
  reason: string;
}

export async function holdMedicationAdministration(
  input: HoldMedicationAdministrationInput,
): Promise<MedicationAdministration> {
  assertHumanPerformer(input.performerRef, "holdMedicationAdministration");

  const payload = {
    resourceType: "MedicationAdministration" as const,
    meta: {
      tag: [
        {
          system: OBSERVATION_ORIGIN_SYSTEM,
          code: "nurse-charted",
          display: "Nurse Charted",
        },
        {
          system: WORKFLOW_SYSTEM,
          code: "medication-administration-hold",
          display: "Medication Administration Hold",
        },
      ],
    },
    status: "not-done",
    statusReason: {
      coding: [
        {
          system: REVIEW_STATE_SYSTEM,
          code: "held",
          display: "Held",
        },
      ],
      text: input.reason,
    },
    medicationCodeableConcept: { text: input.medicationName },
    subject: { reference: `Patient/${input.patientId}` },
    ...(input.encounterId && {
      context: { reference: `Encounter/${input.encounterId}` },
    }),
    ...(input.medicationRequestId && {
      request: { reference: `MedicationRequest/${input.medicationRequestId}` },
    }),
    performer: [{ actor: { reference: input.performerRef } }],
    note: [{ text: input.reason }],
  };

  const medadmin = await postRequiredResource<MedicationAdministration>(
    "MedicationAdministration",
    payload,
    "holdMedicationAdministration",
  );

  if (medadmin.id) {
    await recordHumanAttestedProvenance(medadmin, input.performerRef);
  }

  return medadmin;
}

export interface RecordProcedureInput {
  patientId: string;
  encounterId?: string;
  procedureCode: string;
  procedureDisplay: string;
  performerRef: string;
  performedDateTime?: string;
  note?: string;
  /** References to MedicationAdministration resources linked to this procedure (e.g., RSI medication bundle). */
  partOfMedAdminRefs?: string[];
}

export async function recordProcedure(
  input: RecordProcedureInput,
): Promise<Procedure> {
  assertHumanPerformer(input.performerRef, "recordProcedure");

  const performedDateTime = input.performedDateTime ?? new Date().toISOString();

  const payload = {
    resourceType: "Procedure" as const,
    meta: {
      tag: [
        {
          system: OBSERVATION_ORIGIN_SYSTEM,
          code: "nurse-charted",
          display: "Nurse Charted",
        },
        {
          system: WORKFLOW_SYSTEM,
          code: "procedure-record",
          display: "Procedure Record",
        },
      ],
    },
    status: "completed",
    code: {
      coding: [
        {
          system: ARTIFACT_SYSTEM,
          code: input.procedureCode,
          display: input.procedureDisplay,
        },
      ],
      text: input.procedureDisplay,
    },
    subject: { reference: `Patient/${input.patientId}` },
    ...(input.encounterId && {
      encounter: { reference: `Encounter/${input.encounterId}` },
    }),
    performer: [{ actor: { reference: input.performerRef } }],
    performedDateTime,
    ...(input.partOfMedAdminRefs && input.partOfMedAdminRefs.length > 0 && {
      partOf: input.partOfMedAdminRefs.map((ref) => ({ reference: ref })),
    }),
    ...(input.note && { note: [{ text: input.note }] }),
  };

  const procedure = await postRequiredResource<Procedure>(
    "Procedure",
    payload,
    "recordProcedure",
  );

  if (procedure.id) {
    await recordHumanAttestedProvenance(procedure, input.performerRef);
  }

  return procedure;
}

export async function recordHumanAttestedProvenance(
  target: DocumentReference | MedicationAdministration | Procedure | Task | Provenance,
  performerRef: string,
  attestationText?: string,
): Promise<Provenance> {
  if (!target.id) {
    throw new Error(
      "recordHumanAttestedProvenance requires a target resource with an id",
    );
  }
  assertHumanPerformer(performerRef, "recordHumanAttestedProvenance");

  const recorded = new Date().toISOString();
  const payload = {
    resourceType: "Provenance" as const,
    meta: {
      tag: [
        {
          system: WORKFLOW_SYSTEM,
          code: "human-attested-provenance",
          display: "Human Attested Provenance",
        },
      ],
    },
    target: [{ reference: `${target.resourceType}/${target.id}` }],
    recorded,
    occurredDateTime: recorded,
    activity: {
      coding: [
        {
          system: PROVENANCE_ACTIVITY_SYSTEM,
          code: "record",
          display: "Human Recorded",
        },
      ],
      text: "record (human-attested)",
    },
    agent: [
      {
        type: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "author",
              display: "Author",
            },
          ],
          text: "Author",
        },
        who: { reference: performerRef },
      },
    ],
    ...(attestationText && {
      entity: [
        {
          role: "source",
          what: {
            display: attestationText,
          },
        },
      ],
    }),
    policy: [PROVENANCE_POLICY_URL],
  };

  return postRequiredResource<Provenance>(
    "Provenance",
    payload,
    "recordHumanAttestedProvenance",
  );
}

export function recordDraftProvenance(
  target:
    | DocumentReference
    | MedicationAdministration
    | Task
    | Provenance,
  executionId?: string,
): Promise<Provenance> {
  if (!target.id) {
    return Promise.reject(
      new Error(
        "recordDraftProvenance requires a target resource with an id",
      ),
    );
  }

  const recorded = new Date().toISOString();
  const resolvedExecutionId = executionId ?? findExecutionId(target.identifier);
  const payload = {
    resourceType: "Provenance" as const,
    ...(resolvedExecutionId && {
      identifier: buildDraftIdentifiers(undefined, resolvedExecutionId),
    }),
    meta: {
      tag: buildDraftTags(
        "draft-provenance",
        "Draft Provenance",
        "draft-provenance",
        "Draft Provenance",
      ),
    },
    target: [
      {
        reference: `${target.resourceType}/${target.id}`,
      },
    ],
    recorded,
    occurredDateTime: recorded,
    activity: {
      coding: [
        {
          system: PROVENANCE_ACTIVITY_SYSTEM,
          code: "propose",
          display: "Agent Proposed",
        },
      ],
      text: "propose (L3-original)",
    },
    agent: [
      {
        type: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "author",
              display: "Author",
            },
          ],
          text: "Author",
        },
        who: { display: "Noah RN Agent" },
      },
    ],
    entity: [
      {
        role: "source",
        what: {
          identifier: {
            system: SOURCE_LAYER_SYSTEM,
            value: "L3-original",
          },
          display: "Replay-scoped draft source",
        },
      },
    ],
    policy: [PROVENANCE_POLICY_URL],
  };

  return postRequiredResource<Provenance>(
    "Provenance",
    payload,
    "recordDraftProvenance",
  );
}
