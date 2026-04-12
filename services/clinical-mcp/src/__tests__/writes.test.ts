import { describe, expect, it } from "vitest";
import type { DocumentReference } from "../fhir/types.js";

import {
  createDraftShiftReport,
  queueDraftMedicationAdministration,
  queueDraftTask,
  recordDraftProvenance,
} from "../fhir/writes.js";

describe("FHIR draft write scaffolds", () => {
  it("rejects shift-report draft writes with the current scaffold contract", async () => {
    await expect(
      createDraftShiftReport({
        patientId: "patient-123",
        reportMarkdown: "# Shift Report",
        workflowName: "shift-report",
      }),
    ).rejects.toThrow(
      "TODO(volatile-draft-vs-fhir-queuing): createDraftShiftReport(DocumentReference) is intentionally unavailable in wave 1 scaffold hardening.",
    );
  });

  it("rejects task, medication, and provenance writes with explicit operation names", async () => {
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
