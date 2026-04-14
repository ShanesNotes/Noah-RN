import { buildShiftReportDryRunSummary } from "./build-shift-report-dry-run-summary.mjs";

function renderNarrativeOutput(summary) {
  return [
    "PATIENT",
    "- [Needs patient identifiers from narrative or chart context]",
    "",
    "STORY",
    `- ${summary.story_seed}`,
    "",
    "ASSESSMENT",
    "- [Assessment details to be organized from the provided narrative]",
    "",
    "LINES & ACCESS",
    "- [Access details not yet extracted in this dry-run scaffold]",
    "",
    "ACTIVE ISSUES & PLAN",
    "- [Watch items and pending plan items to be derived from the narrative]",
    "",
    "HOUSEKEEPING",
    "- [Housekeeping details not provided]",
    "",
    "FAMILY",
    "- [Family communication details not provided]",
  ].join("\n");
}

function renderPatientContextOutput(summary) {
  const conditions = summary.active_conditions.length
    ? summary.active_conditions.map((item) => `- ${item}`).join("\n")
    : "- [No active conditions in dry-run context]";
  const meds = summary.active_medications.length
    ? summary.active_medications.map((item) => `- ${item}`).join("\n")
    : "- [No active medications in dry-run context]";

  return [
    "PATIENT",
    `- ${summary.patient_line}`,
    `- Encounter status: ${summary.encounter_status}`,
    "",
    "STORY",
    "- Dry-run context assembled from clinical-mcp fixture-backed patient context",
    `- Timeline entries available: ${summary.timeline_entries}`,
    "",
    "ASSESSMENT",
    conditions,
    "",
    "LINES & ACCESS",
    "- [No explicit access devices present in current dry-run context]",
    "",
    "ACTIVE ISSUES & PLAN",
    meds,
    `- Gap count requiring review: ${summary.gap_count}`,
    "",
    "HOUSEKEEPING",
    "- [Housekeeping details not present in current patient context bundle]",
    "",
    "FAMILY",
    "- [Family details not present in current patient context bundle]",
  ].join("\n");
}

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
      ? renderNarrativeOutput(summaryArtifact.summary)
      : renderPatientContextOutput(summaryArtifact.summary);

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
