import { planShiftReportExecution } from "./plan-shift-report-execution.mjs";

export function buildShiftReportInvocationPayload(input = {}) {
  const plan = planShiftReportExecution(input);

  if (plan.status !== "planned") {
    return {
      bridge: "shift-report-invocation-payload",
      status: "blocked",
      next_step: plan.next_step,
      missing_context: plan.missing_context,
    };
  }

  if (plan.input_mode === "patient_id") {
    return {
      bridge: "shift-report-invocation-payload",
      status: "planned",
      input_mode: "patient_id",
      workflow: {
        authoritative_source: plan.authoritative_workflow,
        pi_skill_target: plan.pi_skill_target,
      },
      steps: [
        {
          type: "tool_call",
          name: "get_patient_context",
          args: {
            patient_id: plan.required_input.patient_id,
          },
        },
        {
          type: "workflow_handoff",
          workflow_name: "shift-report",
          input_mode: "patient_context",
          depends_on: "get_patient_context",
          knowledge_assets: plan.knowledge_assets,
        },
      ],
    };
  }

  return {
    bridge: "shift-report-invocation-payload",
    status: "planned",
    input_mode: "clinical_narrative",
    workflow: {
      authoritative_source: plan.authoritative_workflow,
      pi_skill_target: plan.pi_skill_target,
    },
    steps: [
      {
        type: "workflow_handoff",
        workflow_name: "shift-report",
        input_mode: "clinical_narrative",
        input: {
          clinical_narrative: plan.required_input.clinical_narrative,
        },
        knowledge_assets: plan.knowledge_assets,
      },
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  console.log(JSON.stringify(buildShiftReportInvocationPayload(parsed), null, 2));
}
