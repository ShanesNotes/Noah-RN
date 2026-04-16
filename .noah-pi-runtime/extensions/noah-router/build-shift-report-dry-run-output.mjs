import { buildShiftReportDryRunSummary } from "./build-shift-report-dry-run-summary.mjs";
import { renderNarrativeDryRunOutput, renderPatientContextDryRunOutput } from "../../../packages/agent-harness/shift-report-renderer.mjs";

export async function buildShiftReportDryRunOutput(input = {}) {
  const summaryArtifact = await buildShiftReportDryRunSummary(input);

  if (summaryArtifact.status !== "ready") {
    return {
      bridge: "shift-report-dry-run-output",
      status: "blocked",
      next_step: summaryArtifact.next_step,
      missing_context: summaryArtifact.missing_context,
    };
  }

  const output =
    summaryArtifact.input_mode === "clinical_narrative"
      ? renderNarrativeDryRunOutput(summaryArtifact.summary)
      : renderPatientContextDryRunOutput(summaryArtifact.summary);

  return {
    bridge: "shift-report-dry-run-output",
    status: "ready",
    input_mode: summaryArtifact.input_mode,
    authoritative_workflow: summaryArtifact.authoritative_workflow,
    output,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  const result = await buildShiftReportDryRunOutput(parsed);
  console.log(JSON.stringify(result, null, 2));
}
