import { getWorkflowCandidate } from "../invoke-workflow.mjs";
import {
  buildShiftReportRendererInput,
  renderShiftReportFromPatientContext,
} from "../shift-report-renderer.mjs";

export async function renderShiftReport(args) {
  const { patientId, context, laneCoverage } = args ?? {};
  if (typeof patientId !== "string" || patientId.length === 0) {
    throw new Error("renderShiftReport: patientId is required");
  }
  if (context == null || typeof context !== "object") {
    throw new Error("renderShiftReport: context is required");
  }

  const candidate = getWorkflowCandidate("shift-report", `patient_id: ${patientId}`);
  const rendererInput = buildShiftReportRendererInput(candidate, patientId, context, {
    laneCoverage,
  });
  const markdown = renderShiftReportFromPatientContext(rendererInput);

  return { markdown };
}
