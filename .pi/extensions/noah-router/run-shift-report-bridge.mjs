import { buildShiftReportInvocationPayload } from "./build-shift-report-invocation-payload.mjs";

async function tryAssemblePatientContext(patientId) {
  const { assemblePatientContext } = await import("../../../services/clinical-mcp/dist/context/assembler.js");
  return assemblePatientContext(patientId);
}

export async function runShiftReportBridge(input = {}) {
  const payload = buildShiftReportInvocationPayload(input);

  if (payload.status !== "planned") {
    return {
      bridge: "shift-report-runtime-runner",
      status: "blocked",
      next_step: payload.next_step,
      missing_context: payload.missing_context,
    };
  }

  if (payload.input_mode === "clinical_narrative") {
    return {
      bridge: "shift-report-runtime-runner",
      status: "narrative_ready",
      input_mode: "clinical_narrative",
      authoritative_workflow: payload.workflow.authoritative_source,
      handoff_payload: payload.steps[0],
    };
  }

  const patientId = payload.steps[0]?.args?.patient_id;

  try {
    const context = await tryAssemblePatientContext(patientId);
    return {
      bridge: "shift-report-runtime-runner",
      status: "patient_context_loaded",
      input_mode: "patient_id",
      authoritative_workflow: payload.workflow.authoritative_source,
      patient_context_summary: {
        patient_id: context.patient.id,
        timeline_entries: context.timeline.length,
        gaps: context.gaps.length,
        token_estimate: context.tokenEstimate,
      },
      next_step: payload.steps[1],
    };
  } catch (error) {
    return {
      bridge: "shift-report-runtime-runner",
      status: "patient_context_fetch_failed",
      input_mode: "patient_id",
      authoritative_workflow: payload.workflow.authoritative_source,
      patient_id: patientId,
      error: error instanceof Error ? error.message : String(error),
      next_step: "fallback_to_clinical_narrative_or_fix_context_path",
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  const result = await runShiftReportBridge(parsed);
  console.log(JSON.stringify(result, null, 2));
}
