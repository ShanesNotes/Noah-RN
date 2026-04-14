import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planShiftReportExecution } from "./plan-shift-report-execution.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");
const repoHostedPiRuntimeRoot = resolve(repoRoot, ".noah-pi-runtime");

function resolveRepoHostedPath(path) {
  if (path.startsWith(".pi/")) {
    return resolve(repoHostedPiRuntimeRoot, path.slice(4));
  }
  return resolve(repoRoot, path);
}

export function evaluateShiftReportBridgeReadiness(input = {}) {
  const plan = planShiftReportExecution(input);

  if (plan.status !== "planned") {
    return {
      bridge: "shift-report-bridge-readiness",
      status: "blocked",
      reason: "missing_required_context",
      next_step: plan.next_step,
      missing_context: plan.missing_context,
    };
  }

  const workflowExists = existsSync(resolveRepoHostedPath(plan.authoritative_workflow));
  const piSkillExists = existsSync(resolveRepoHostedPath(plan.pi_skill_target));
  const serviceSurfacesExist = plan.service_surface_refs.every((surface) =>
    existsSync(resolveRepoHostedPath(surface)),
  );
  const knowledgeAssetsExist = plan.knowledge_assets.every((asset) => asset.length > 0);

  const ready = workflowExists && piSkillExists && serviceSurfacesExist && knowledgeAssetsExist;

  return {
    bridge: "shift-report-bridge-readiness",
    status: ready ? "ready" : "not_ready",
    input_mode: plan.input_mode,
    checks: {
      workflow_exists: workflowExists,
      pi_skill_exists: piSkillExists,
      service_surfaces_exist: serviceSurfacesExist,
      knowledge_assets_mapped: knowledgeAssetsExist,
    },
    execution_plan: plan,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  console.log(JSON.stringify(evaluateShiftReportBridgeReadiness(parsed), null, 2));
}
