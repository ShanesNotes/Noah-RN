import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentReference } from "../fhir/types.js";

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
        meta: {
          tag: [
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
          ],
        },
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

  it("deferred writes reject with explicit operation names", async () => {
    const {
      queueDraftMedicationAdministration,
      queueDraftTask,
      recordDraftProvenance,
    } = await import("../fhir/writes.js");

    await expect(
      queueDraftTask({
        patientId: "patient-123",
        description: "Follow up potassium",
      }),
    ).rejects.toThrow("queueDraftTask(Task)");

    await expect(
      queueDraftMedicationAdministration({
        patientId: "patient-123",
        medicationName: "Norepinephrine",
      }),
    ).rejects.toThrow(
      "queueDraftMedicationAdministration(MedicationAdministration)",
    );

    await expect(
      recordDraftProvenance({
        resourceType: "DocumentReference",
      } as DocumentReference),
    ).rejects.toThrow("recordDraftProvenance(Provenance)");
  });
});
