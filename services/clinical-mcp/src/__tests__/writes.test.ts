import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentReference, MedicationAdministration, Task } from "../fhir/types.js";

describe("FHIR draft write scaffolds", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T20:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.doUnmock("../fhir/client.js");
  });

  it("createDraftShiftReport posts a preliminary DocumentReference payload", async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: "DocumentReference",
        id: "doc-123",
        status: "current",
        docStatus: "preliminary",
      },
      error: null,
    });
    vi.doMock("../fhir/client.js", () => ({ fhirPost }));

    const { createDraftShiftReport } = await import("../fhir/writes.js");
    const result = await createDraftShiftReport({
      patientId: "patient-123",
      encounterId: "enc-456",
      taskId: "task-789",
      executionId: "shift-report:task-789:1776024000000",
      reportMarkdown: "# Shift Report",
    });

    expect(result).toMatchObject({
      resourceType: "DocumentReference",
      id: "doc-123",
      status: "current",
      docStatus: "preliminary",
    });
    expect(fhirPost).toHaveBeenCalledTimes(1);
    expect(fhirPost).toHaveBeenCalledWith(
      "DocumentReference",
      expect.objectContaining({
        resourceType: "DocumentReference",
        meta: expect.objectContaining({
          tag: expect.arrayContaining([
            {
              system: "https://noah-rn.dev/workflows",
              code: "shift-report",
              display: "Shift Report",
            },
            {
              system: "https://noah-rn.dev/review-status",
              code: "review-required",
              display: "Review Required",
            },
          ]),
        }),
        identifier: [
          {
            system: "https://noah-rn.dev/task-id",
            value: "task-789",
          },
          {
            system: "https://noah-rn.dev/execution-id",
            value: "shift-report:task-789:1776024000000",
          },
        ],
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
        subject: { reference: "Patient/patient-123" },
        description: "Draft Shift Report — requires nurse review",
        content: [{
          attachment: expect.objectContaining({
            contentType: "text/markdown",
            title: "shift-report-draft-task-789-1776024000000",
            data: Buffer.from("# Shift Report", "utf-8").toString("base64"),
          }),
        }],
        context: {
          encounter: [{ reference: "Encounter/enc-456" }],
        },
      }),
    );
  });

  it("createDraftShiftReport surfaces FHIR write failures", async () => {
    vi.doMock("../fhir/client.js", () => ({
      fhirPost: vi.fn().mockResolvedValue({
        data: null,
        error: "FHIR POST failed: fetch failed",
      }),
    }));

    const { createDraftShiftReport } = await import("../fhir/writes.js");

    await expect(
      createDraftShiftReport({
        patientId: "patient-123",
        reportMarkdown: "# Shift Report",
      }),
    ).rejects.toThrow(
      "createDraftShiftReport failed: FHIR POST failed: fetch failed",
    );
  });

  it("queueDraftTask posts a replay-scoped review Task payload", async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: "Task",
        id: "task-123",
        status: "requested",
      } satisfies Task,
      error: null,
    });
    vi.doMock("../fhir/client.js", () => ({ fhirPost }));

    const { queueDraftTask } = await import("../fhir/writes.js");
    const result = await queueDraftTask({
      patientId: "patient-123",
      encounterId: "enc-456",
      description: "Review draft norepinephrine titration proposal",
      executionId: "exec-123",
      focusReference: "MedicationAdministration/medadmin-789",
    });

    expect(result).toMatchObject({
      resourceType: "Task",
      id: "task-123",
      status: "requested",
    });
    expect(fhirPost).toHaveBeenCalledTimes(1);
    expect(fhirPost).toHaveBeenCalledWith(
      "Task",
      expect.objectContaining({
        resourceType: "Task",
        identifier: [
          {
            system: "https://noah-rn.dev/execution-id",
            value: "exec-123",
          },
        ],
        meta: expect.objectContaining({
          tag: expect.arrayContaining([
            {
              system: "https://noah-rn.dev/workflows",
              code: "draft-review-queue",
              display: "Draft Review Queue",
            },
            {
              system: "https://noah-rn.dev/review-status",
              code: "review-required",
              display: "Review Required",
            },
            {
              system: "https://noah-rn.dev/workflows",
              code: "replay-scoped",
              display: "Replay Scoped",
            },
            {
              system: "https://noah-rn.dev/artifacts",
              code: "review-task-draft",
              display: "Draft Review Task",
            },
          ]),
        }),
        status: "requested",
        intent: "order",
        priority: "routine",
        businessStatus: {
          coding: [
            {
              system: "https://noah-rn.dev/review-state",
              code: "pending-review",
              display: "Pending Review",
            },
          ],
          text: "Pending review",
        },
        for: { reference: "Patient/patient-123" },
        encounter: { reference: "Encounter/enc-456" },
        focus: { reference: "MedicationAdministration/medadmin-789" },
        requester: { display: "Noah RN Agent" },
        owner: { display: "Nurse Review Queue" },
        description: "Review draft norepinephrine titration proposal",
        input: [
          {
            type: {
              coding: [
                {
                  system: "https://noah-rn.dev/artifacts",
                  code: "review-context",
                  display: "Review Context",
                },
              ],
              text: "Review Context",
            },
            valueString: "Review draft norepinephrine titration proposal",
          },
        ],
      }),
    );
  });

  it("queueDraftMedicationAdministration posts a replay-scoped draft payload", async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: "MedicationAdministration",
        id: "medadmin-123",
        status: "not-done",
      } satisfies MedicationAdministration,
      error: null,
    });
    vi.doMock("../fhir/client.js", () => ({ fhirPost }));

    const { queueDraftMedicationAdministration } = await import("../fhir/writes.js");
    const result = await queueDraftMedicationAdministration({
      patientId: "patient-123",
      encounterId: "enc-456",
      medicationName: "Norepinephrine",
      medicationRequestId: "medreq-321",
      executionId: "exec-456",
      note: "Pending bedside verification before charting.",
    });

    expect(result).toMatchObject({
      resourceType: "MedicationAdministration",
      id: "medadmin-123",
      status: "not-done",
    });
    expect(fhirPost).toHaveBeenCalledTimes(1);
    expect(fhirPost).toHaveBeenCalledWith(
      "MedicationAdministration",
      expect.objectContaining({
        resourceType: "MedicationAdministration",
        identifier: [
          {
            system: "https://noah-rn.dev/execution-id",
            value: "exec-456",
          },
        ],
        meta: expect.objectContaining({
          tag: expect.arrayContaining([
            {
              system: "https://noah-rn.dev/workflows",
              code: "medication-review",
              display: "Medication Review",
            },
            {
              system: "https://noah-rn.dev/review-status",
              code: "review-required",
              display: "Review Required",
            },
            {
              system: "https://noah-rn.dev/workflows",
              code: "replay-scoped",
              display: "Replay Scoped",
            },
            {
              system: "https://noah-rn.dev/artifacts",
              code: "draft-medication-administration",
              display: "Draft Medication Administration",
            },
          ]),
        }),
        status: "not-done",
        statusReason: {
          coding: [
            {
              system: "https://noah-rn.dev/review-state",
              code: "draft-proposal",
              display: "Draft Proposal",
            },
          ],
          text: "Draft medication administration — requires nurse review",
        },
        extension: [
          {
            url: "https://noah-rn.dev/fhir/StructureDefinition/review-state",
            valueCode: "pending-review",
          },
        ],
        medicationCodeableConcept: {
          text: "Norepinephrine",
        },
        subject: { reference: "Patient/patient-123" },
        context: { reference: "Encounter/enc-456" },
        request: { reference: "MedicationRequest/medreq-321" },
        performer: [{ actor: { display: "Noah RN Agent" } }],
        dosage: {
          text: "Pending bedside verification before charting.",
        },
        note: [{ text: "Pending bedside verification before charting." }],
      }),
    );
    expect(fhirPost.mock.calls[0]?.[1]).not.toHaveProperty("effectiveDateTime");
  });

  it("recordDraftProvenance posts replay-scoped provenance", async () => {
    const fhirPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: "Provenance",
        id: "prov-123",
      },
      error: null,
    });
    vi.doMock("../fhir/client.js", () => ({ fhirPost }));

    const { recordDraftProvenance } = await import("../fhir/writes.js");
    const result = await recordDraftProvenance({
      resourceType: "DocumentReference",
      id: "doc-123",
      identifier: [
        {
          system: "https://noah-rn.dev/execution-id",
          value: "exec-789",
        },
      ],
    } as DocumentReference);

    expect(result).toMatchObject({
      resourceType: "Provenance",
      id: "prov-123",
    });
    expect(fhirPost).toHaveBeenCalledTimes(1);
    expect(fhirPost).toHaveBeenCalledWith(
      "Provenance",
      expect.objectContaining({
        resourceType: "Provenance",
        identifier: [
          {
            system: "https://noah-rn.dev/execution-id",
            value: "exec-789",
          },
        ],
        meta: expect.objectContaining({
          tag: expect.arrayContaining([
            {
              system: "https://noah-rn.dev/workflows",
              code: "draft-provenance",
              display: "Draft Provenance",
            },
            {
              system: "https://noah-rn.dev/review-status",
              code: "review-required",
              display: "Review Required",
            },
            {
              system: "https://noah-rn.dev/workflows",
              code: "replay-scoped",
              display: "Replay Scoped",
            },
            {
              system: "https://noah-rn.dev/artifacts",
              code: "draft-provenance",
              display: "Draft Provenance",
            },
          ]),
        }),
        target: [{ reference: "DocumentReference/doc-123" }],
        activity: {
          coding: [
            {
              system: "https://noah-rn.dev/provenance-activity",
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
                system: "https://noah-rn.dev/source-layer",
                value: "L3-original",
              },
              display: "Replay-scoped draft source",
            },
          },
        ],
        policy: [
          "https://noah-rn.dev/charting-policy/replay-scoped-draft-review",
        ],
      }),
    );
  });

  it("recordDraftProvenance rejects when the target has no id", async () => {
    const { recordDraftProvenance } = await import("../fhir/writes.js");

    await expect(
      recordDraftProvenance({
        resourceType: "DocumentReference",
      } as DocumentReference),
    ).rejects.toThrow("recordDraftProvenance requires a target resource with an id");
  });
});
