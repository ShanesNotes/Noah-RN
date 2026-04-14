import { describeShiftReportBridge } from "./describe-shift-report-bridge.mjs";
import { describeShiftReportRuntimeContract } from "./describe-shift-report-runtime-contract.mjs";
import { resolveShiftReportRequest } from "./resolve-shift-report-request.mjs";
import { planShiftReportExecution } from "./plan-shift-report-execution.mjs";
import { evaluateShiftReportBridgeReadiness } from "./evaluate-shift-report-bridge-readiness.mjs";
import { buildShiftReportInvocationPayload } from "./build-shift-report-invocation-payload.mjs";

export function describeShiftReportBridgeStack(input = {}) {
  return {
    bridge: "shift-report-bridge-stack",
    status: "scaffold-stack",
    descriptor: describeShiftReportBridge(),
    runtime_contract: describeShiftReportRuntimeContract(),
    request_resolution: resolveShiftReportRequest(input),
    execution_plan: planShiftReportExecution(input),
    readiness: evaluateShiftReportBridgeReadiness(input),
    invocation_payload: buildShiftReportInvocationPayload(input),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  console.log(JSON.stringify(describeShiftReportBridgeStack(parsed), null, 2));
}
