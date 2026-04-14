import { describeRoutingCandidates } from "../../../packages/agent-harness/describe-routing-candidates.mjs";
import { resolveShiftReportRequest } from "./resolve-shift-report-request.mjs";

export function planShiftReportExecution(input = {}) {
  const resolution = resolveShiftReportRequest(input);

  if (!resolution.resolved) {
    return {
      bridge: "shift-report-execution-plan",
      status: "blocked",
      input_mode: resolution.input_mode,
      next_step: resolution.next_step,
      missing_context: resolution.missing_context,
    };
  }

  const availableContext =
    resolution.input_mode === "patient_id" ? ["patient_id"] : ["clinical_narrative"];

  const candidates = describeRoutingCandidates({
    scope: "shift_handoff",
    availableContext,
  });

  const candidate = candidates.find((item) => item.name === "shift-report");
  if (!candidate) {
    throw new Error("shift-report candidate could not be resolved for execution planning");
  }

  const steps =
    resolution.input_mode === "patient_id"
      ? [
          "resolve shift-report workflow candidate",
          "fetch patient context via get_patient_context",
          "invoke authoritative shift-report workflow contract",
          "apply knowledge assets and provenance expectations",
        ]
      : [
          "resolve shift-report workflow candidate",
          "invoke authoritative shift-report workflow contract with narrative",
          "apply knowledge assets and provenance expectations",
        ];

  return {
    bridge: "shift-report-execution-plan",
    status: "planned",
    input_mode: resolution.input_mode,
    authoritative_workflow: candidate.source_path,
    pi_skill_target: candidate.pi_skill_target ?? ".pi/skills/shift-report/SKILL.md",
    service_surface_refs: candidate.service_surface_refs,
    tool_families: candidate.tool_families.map((tool) => tool.name),
    knowledge_assets: candidate.knowledge_assets.map((asset) => asset.name),
    next_step: resolution.next_step,
    required_input: resolution.required_input,
    steps,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  console.log(JSON.stringify(planShiftReportExecution(parsed), null, 2));
}
