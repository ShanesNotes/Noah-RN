import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

type CustomEntry = { type?: string; customType?: string; data?: { patientId?: string | null } };

async function getPatientContext(patientId: string, contextBudget?: number) {
  const mod = await import("../../../services/clinical-mcp/dist/context/assembler.js");
  return mod.assemblePatientContext(patientId, contextBudget);
}

async function inspectPatientContext(patientId: string) {
  const mod = await import("../../../services/clinical-mcp/dist/tools/inspector.js");
  return mod.inspectContext(patientId);
}

async function listPatients(count: number) {
  const mod = await import("../../../services/clinical-mcp/dist/fhir/client.js");
  return mod.listPatients(count);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildPatientStateText(patientId: string | null): string {
  return patientId ? `Active Noah RN patient: ${patientId}` : "No active Noah RN patient selected.";
}

export default function medplumContextExtension(pi: ExtensionAPI) {
  let activePatientId: string | null = null;

  const persistActivePatient = (patientId: string | null) => {
    activePatientId = patientId;
    pi.appendEntry("noah-active-patient", { patientId });
  };

  pi.on("session_start", async (_event, ctx) => {
    activePatientId = null;
    for (const entry of ctx.sessionManager.getBranch()) {
      const custom = entry as CustomEntry;
      if (custom.type === "custom" && custom.customType === "noah-active-patient") {
        activePatientId = custom.data?.patientId ?? null;
      }
    }
    if (ctx.hasUI) {
      ctx.ui.setStatus("noah-patient", activePatientId ? `patient:${activePatientId}` : "patient:none");
    }
  });

  pi.registerTool({
    name: "set_active_patient",
    label: "Set Active Patient",
    description: "Set or clear the active Noah RN patient for this session.",
    promptSnippet: "Set the active Noah RN patient when the user works on a specific patient across multiple turns.",
    promptGuidelines: [
      "Use this tool when the user establishes a patient and later turns can safely default to that patient id.",
    ],
    parameters: Type.Object({
      patientId: Type.Optional(Type.String({ description: "FHIR Patient id. Omit to clear." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      persistActivePatient(params.patientId ?? null);
      if (ctx.hasUI) {
        ctx.ui.setStatus("noah-patient", activePatientId ? `patient:${activePatientId}` : "patient:none");
      }
      return {
        content: [{ type: "text", text: buildPatientStateText(activePatientId) }],
        details: { active_patient_id: activePatientId },
      };
    },
  });

  pi.registerTool({
    name: "get_active_patient",
    label: "Get Active Patient",
    description: "Show the active Noah RN patient for this session.",
    parameters: Type.Object({}),
    async execute() {
      return {
        content: [{ type: "text", text: buildPatientStateText(activePatientId) }],
        details: { active_patient_id: activePatientId },
      };
    },
  });

  pi.registerTool({
    name: "noah_get_patient_context",
    label: "Noah Patient Context",
    description: "Assemble structured patient context from the Noah RN clinical-mcp boundary.",
    promptSnippet: "Load structured Noah RN patient context before clinical workflow execution.",
    promptGuidelines: [
      "Use this tool when a workflow requires patient chart context and you have a patient id or active patient set.",
      "Prefer this tool over ad hoc chart summarization when working on Noah RN clinical workflows.",
    ],
    parameters: Type.Object({
      patientId: Type.Optional(Type.String({ description: "FHIR Patient id. Defaults to the active session patient." })),
      contextBudget: Type.Optional(Type.Number({ description: "Approximate token budget for the context bundle." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const patientId = params.patientId ?? activePatientId;
      if (!patientId) {
        return {
          content: [{ type: "text", text: "No patient id provided and no active patient is set." }],
          details: { active_patient_id: activePatientId },
          isError: true,
        };
      }

      try {
        const context = await getPatientContext(patientId, params.contextBudget);
        if (params.patientId && params.patientId !== activePatientId) {
          persistActivePatient(params.patientId);
          if (ctx.hasUI) ctx.ui.setStatus("noah-patient", `patient:${params.patientId}`);
        }
        return {
          content: [
            {
              type: "text",
              text: `Loaded patient context for ${patientId} with ${context.timeline.length} timeline entries and ${context.gaps.length} gaps.`,
            },
          ],
          details: { patient_id: patientId, context },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to load patient context for ${patientId}: ${getErrorMessage(error)}` }],
          details: { patient_id: patientId, error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_inspect_patient_context",
    label: "Inspect Noah Context",
    description: "Inspect the assembled Noah RN patient context bundle for counts, gaps, and token estimate.",
    parameters: Type.Object({
      patientId: Type.Optional(Type.String({ description: "FHIR Patient id. Defaults to the active session patient." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const patientId = params.patientId ?? activePatientId;
      if (!patientId) {
        return {
          content: [{ type: "text", text: "No patient id provided and no active patient is set." }],
          details: { active_patient_id: activePatientId },
          isError: true,
        };
      }

      try {
        const inspection = await inspectPatientContext(patientId);
        if (params.patientId && params.patientId !== activePatientId) {
          persistActivePatient(params.patientId);
          if (ctx.hasUI) ctx.ui.setStatus("noah-patient", `patient:${params.patientId}`);
        }
        return {
          content: [
            {
              type: "text",
              text: `Context inspection for ${patientId}: ${inspection.timelineLength} entries, ${inspection.trendCount} trends, ${inspection.gaps.length} gaps.`,
            },
          ],
          details: { patient_id: patientId, inspection },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to inspect patient context for ${patientId}: ${getErrorMessage(error)}` }],
          details: { patient_id: patientId, error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_list_patients",
    label: "List Noah Patients",
    description: "List available patients from the Noah RN FHIR boundary.",
    parameters: Type.Object({
      count: Type.Optional(Type.Number({ description: "Maximum patients to return (default 20)." })),
    }),
    async execute(_toolCallId, params) {
      try {
        const result = await listPatients(Math.max(1, Math.min(500, Math.round(params.count ?? 20))));
        if (result.error || !result.data) {
          return {
            content: [{ type: "text", text: result.error ?? "Failed to list patients." }],
            details: { error: result.error ?? "unknown_error" },
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Found ${result.data.length} patients.` }],
          details: { patients: result.data },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to list patients: ${getErrorMessage(error)}` }],
          details: { error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerCommand("patient", {
    description: "Set, show, or clear the active Noah RN patient: /patient <id|show|clear>",
    handler: async (args, ctx) => {
      const value = args.trim();
      if (!value || value === "show") {
        ctx.ui.notify(buildPatientStateText(activePatientId), "info");
        return;
      }
      if (value === "clear") {
        persistActivePatient(null);
        ctx.ui.setStatus("noah-patient", "patient:none");
        ctx.ui.notify("Cleared active Noah RN patient.", "info");
        return;
      }
      persistActivePatient(value);
      ctx.ui.setStatus("noah-patient", `patient:${value}`);
      ctx.ui.notify(`Active Noah RN patient set to ${value}.`, "success");
    },
  });

  pi.on("before_agent_start", async (event) => {
    if (!activePatientId) return;
    return {
      systemPrompt: `${event.systemPrompt}\n\nSession context: active Noah RN patient is ${activePatientId}. Use that patient when the user clearly continues the same clinical workflow, but do not silently override a new explicit patient id.`,
    };
  });
}
