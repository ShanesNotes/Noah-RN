import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeRoutingCandidates } from "../../../packages/agent-harness/describe-routing-candidates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

export function describeShiftReportBridge() {
  const candidates = describeRoutingCandidates({
    scope: "shift_handoff",
    availableContext: ["patient_id"],
  });

  const shiftReport = candidates.find((candidate) => candidate.name === "shift-report");
  if (!shiftReport) {
    throw new Error("shift-report bridge could not resolve a routing candidate");
  }

  return {
    bridge: "shift-report",
    status: "scaffold-bridge",
    authoritative_workflow: shiftReport.source_path,
    pi_skill_target: ".pi/skills/shift-report/SKILL.md",
    router_extension_surface: ".pi/extensions/noah-router/",
    service_surfaces: shiftReport.service_surface_refs,
    knowledge_assets: shiftReport.knowledge_assets.map((asset) => asset.name),
    required_context: shiftReport.required_context,
    repo_root: repoRoot,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(describeShiftReportBridge(), null, 2));
}
