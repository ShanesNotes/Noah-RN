import { describeShiftReportBridge } from "./describe-shift-report-bridge.mjs";
import { describePatientContextBridge } from "../medplum-context/describe-patient-context-bridge.mjs";

export function describeShiftReportRuntimeContract() {
  const workflowBridge = describeShiftReportBridge();
  const patientContextBridge = describePatientContextBridge();

  return {
    contract: "shift-report-runtime-bridge",
    status: "scaffold-bridge",
    authoritative_workflow: workflowBridge.authoritative_workflow,
    pi_skill_target: workflowBridge.pi_skill_target,
    router_extension_surface: workflowBridge.router_extension_surface,
    patient_context_bridge: {
      authoritative_service: patientContextBridge.authoritative_service,
      primary_tool: patientContextBridge.primary_tool,
      future_extension_surface: patientContextBridge.future_extension_surface,
    },
    dependencies: {
      knowledge_assets: workflowBridge.knowledge_assets,
      required_context: workflowBridge.required_context,
    },
    first_workflow_target: patientContextBridge.first_workflow_target,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(describeShiftReportRuntimeContract(), null, 2));
}
