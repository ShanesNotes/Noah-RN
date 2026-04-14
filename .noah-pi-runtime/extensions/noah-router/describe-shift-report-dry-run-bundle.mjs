import { describeShiftReportBridgeStack } from "./describe-shift-report-bridge-stack.mjs";
import { buildShiftReportDryRunOutput } from "./build-shift-report-dry-run-output.mjs";

export async function describeShiftReportDryRunBundle(input = {}) {
  const stack = describeShiftReportBridgeStack(input);
  const output = await buildShiftReportDryRunOutput(input);

  return {
    bridge: "shift-report-dry-run-bundle",
    status: output.status === "ready" ? "ready" : "blocked",
    input_mode:
      output.status === "ready"
        ? output.input_mode
        : stack.request_resolution?.input_mode ?? "missing",
    stack,
    output,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  const result = await describeShiftReportDryRunBundle(parsed);
  console.log(JSON.stringify(result, null, 2));
}
