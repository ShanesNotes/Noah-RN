import { describeShiftReportRuntimeContract } from "./describe-shift-report-runtime-contract.mjs";

function detectInputMode(input = {}) {
  if (typeof input.patient_id === "string" && input.patient_id.trim()) {
    return "patient_id";
  }
  if (typeof input.clinical_narrative === "string" && input.clinical_narrative.trim()) {
    return "clinical_narrative";
  }
  return "missing";
}

export function resolveShiftReportRequest(input = {}) {
  const contract = describeShiftReportRuntimeContract();
  const inputMode = detectInputMode(input);

  if (inputMode === "missing") {
    return {
      ...contract,
      resolved: false,
      input_mode: "missing",
      next_step: "request_required_context",
      missing_context: contract.dependencies.required_context.mandatory_one_of,
    };
  }

  if (inputMode === "patient_id") {
    return {
      ...contract,
      resolved: true,
      input_mode: "patient_id",
      next_step: "fetch_patient_context_then_invoke_shift_report",
      patient_context_tool: contract.patient_context_bridge.primary_tool,
      required_input: {
        patient_id: input.patient_id,
      },
    };
  }

  return {
    ...contract,
    resolved: true,
    input_mode: "clinical_narrative",
    next_step: "invoke_shift_report_with_narrative",
    required_input: {
      clinical_narrative: input.clinical_narrative,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  console.log(JSON.stringify(resolveShiftReportRequest(parsed), null, 2));
}
