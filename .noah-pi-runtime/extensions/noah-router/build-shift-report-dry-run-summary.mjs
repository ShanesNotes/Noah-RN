import { buildShiftReportWorkflowInput } from "./build-shift-report-workflow-input.mjs";

const SECTION_OUTLINE = [
  "PATIENT",
  "STORY",
  "ASSESSMENT",
  "LINES & ACCESS",
  "ACTIVE ISSUES & PLAN",
  "HOUSEKEEPING",
  "FAMILY",
];

function summarizePatientContext(patientContext) {
  const conditions = patientContext.timeline
    .filter((entry) => entry.type === "condition")
    .map((entry) => entry.resource.code?.text ?? entry.resource.code?.coding?.[0]?.display ?? "Unknown condition");

  const medications = patientContext.timeline
    .filter((entry) => entry.type === "medication")
    .map((entry) => entry.resource.medicationCodeableConcept?.text ?? entry.resource.medicationReference?.display ?? "Unknown medication");

  const encounter = patientContext.timeline.find((entry) => entry.type === "encounter");

  return {
    patient_line: `${patientContext.patient.name} | DOB ${patientContext.patient.dob} | ${patientContext.patient.gender}`,
    active_conditions: conditions,
    active_medications: medications,
    encounter_status: encounter?.resource?.status ?? "unknown",
    timeline_entries: patientContext.timeline.length,
    trend_count: patientContext.trends.length,
    gap_count: patientContext.gaps.length,
  };
}

export async function buildShiftReportDryRunSummary(input = {}) {
  const workflowInput = await buildShiftReportWorkflowInput(input);

  if (workflowInput.status !== "ready") {
    return {
      bridge: "shift-report-dry-run-summary",
      status: "blocked",
      next_step: workflowInput.next_step,
      missing_context: workflowInput.missing_context,
    };
  }

  if (workflowInput.input_mode === "clinical_narrative") {
    return {
      bridge: "shift-report-dry-run-summary",
      status: "ready",
      input_mode: "clinical_narrative",
      authoritative_workflow: workflowInput.workflow.authoritative_source,
      section_outline: SECTION_OUTLINE,
      summary: {
        story_seed: workflowInput.workflow_input.clinical_narrative,
        knowledge_assets: workflowInput.workflow_input.knowledge_assets,
      },
    };
  }

  return {
    bridge: "shift-report-dry-run-summary",
    status: "ready",
    input_mode: "patient_context",
    authoritative_workflow: workflowInput.workflow.authoritative_source,
    section_outline: SECTION_OUTLINE,
    summary: {
      ...summarizePatientContext(workflowInput.workflow_input.patient_context),
      knowledge_assets: workflowInput.workflow_input.knowledge_assets,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  const result = await buildShiftReportDryRunSummary(parsed);
  console.log(JSON.stringify(result, null, 2));
}
