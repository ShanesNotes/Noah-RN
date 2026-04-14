import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildShiftReportInvocationPayload } from "./build-shift-report-invocation-payload.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultFixtureDir = resolve(__dirname, "../../../services/clinical-mcp/fixtures");

async function loadPatientContext(patientId) {
  if (!process.env.FHIR_FIXTURE_DIR) {
    process.env.FHIR_FIXTURE_DIR = defaultFixtureDir;
  }

  const { assemblePatientContext } = await import("../../../services/clinical-mcp/dist/context/assembler.js");
  return assemblePatientContext(patientId);
}

export async function buildShiftReportWorkflowInput(input = {}) {
  const payload = buildShiftReportInvocationPayload(input);

  if (payload.status !== "planned") {
    return {
      bridge: "shift-report-workflow-input",
      status: "blocked",
      next_step: payload.next_step,
      missing_context: payload.missing_context,
    };
  }

  if (payload.input_mode === "clinical_narrative") {
    return {
      bridge: "shift-report-workflow-input",
      status: "ready",
      input_mode: "clinical_narrative",
      workflow: payload.workflow,
      workflow_input: {
        clinical_narrative: payload.steps[0].input.clinical_narrative,
        knowledge_assets: payload.steps[0].knowledge_assets,
      },
    };
  }

  const patientId = payload.steps[0]?.args?.patient_id;

  try {
    const patientContext = await loadPatientContext(patientId);
    return {
      bridge: "shift-report-workflow-input",
      status: "ready",
      input_mode: "patient_context",
      workflow: payload.workflow,
      workflow_input: {
        patient_context: patientContext,
        knowledge_assets: payload.steps[1].knowledge_assets,
      },
    };
  } catch (error) {
    return {
      bridge: "shift-report-workflow-input",
      status: "blocked",
      next_step: "fallback_to_clinical_narrative_or_fix_context_path",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , raw] = process.argv;
  const parsed = raw ? JSON.parse(raw) : {};
  const result = await buildShiftReportWorkflowInput(parsed);
  console.log(JSON.stringify(result, null, 2));
}
