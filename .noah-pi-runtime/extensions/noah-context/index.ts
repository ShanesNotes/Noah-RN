import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { buildNoahContextPlan, buildRendererLaneCoverageFromContextPlan, detectWorkflowCandidates, getNoahContextLaneStatuses, loadWorkflowManifest } from "../shared/noah-runtime.ts";

type CustomEntry = { type?: string; customType?: string; data?: { patientId?: string | null } };

export default function noahContextExtension(pi: ExtensionAPI) {
  let activePatientId: string | null = null;

  pi.on("session_start", async (_event, ctx) => {
    activePatientId = null;
    for (const entry of ctx.sessionManager.getBranch()) {
      const custom = entry as CustomEntry;
      if (custom.type === "custom" && custom.customType === "noah-active-patient") {
        activePatientId = custom.data?.patientId ?? null;
      }
    }
  });

  pi.registerTool({
    name: "describe_noah_context_lanes",
    label: "Describe Noah Context Lanes",
    description: "Describe the major Noah RN context lanes and whether they are currently available in this workspace.",
    promptSnippet: "Inspect Noah RN context lanes before planning a workflow context bundle.",
    promptGuidelines: [
      "Use this tool when you need to understand which Noah RN context lanes are available for a workflow turn.",
    ],
    parameters: Type.Object({}),
    async execute() {
      const lanes = getNoahContextLaneStatuses();
      const text = Object.values(lanes)
        .map((lane) => `${lane.name}: ${lane.available ? "available" : "missing"}${lane.path ? ` (${lane.path})` : ""}`)
        .join("\n");
      return {
        content: [{ type: "text", text }],
        details: { active_patient_id: activePatientId, lanes },
      };
    },
  });

  pi.registerTool({
    name: "plan_noah_context_bundle",
    label: "Plan Noah Context Bundle",
    description: "Plan which Noah RN context lanes should be assembled for a workflow request.",
    promptSnippet: "Plan the Noah RN context bundle for a workflow before fetching context.",
    promptGuidelines: [
      "Use this tool after routing when you need to know which context lanes should be assembled next.",
      "Prefer lane planning over blindly loading all available context surfaces.",
    ],
    parameters: Type.Object({
      request: Type.Optional(Type.String({ description: "User request or workflow description" })),
      workflow: Type.Optional(Type.String({ description: "Explicit workflow name. Overrides request matching." })),
      availableContext: Type.Optional(Type.Array(Type.String(), { description: "Current context signals, e.g. clinical_narrative, patient_id" })),
    }),
    async execute(_toolCallId, params) {
      let workflow = params.workflow?.trim();
      if (!workflow) {
        if (!params.request?.trim()) {
          return {
            content: [{ type: "text", text: "Provide either a workflow name or a request to plan context." }],
            details: {},
            isError: true,
          };
        }
        workflow = detectWorkflowCandidates(params.request)[0]?.skill;
      }

      if (!workflow) {
        return {
          content: [{ type: "text", text: "No Noah RN workflow matched that request." }],
          details: { request: params.request ?? null },
          isError: true,
        };
      }

      const manifest = loadWorkflowManifest(workflow);
      if (!manifest) {
        return {
          content: [{ type: "text", text: `No dependency manifest found for ${workflow}.` }],
          details: { workflow, found: false },
          isError: true,
        };
      }

      const plan = buildNoahContextPlan(manifest, params.availableContext ?? [], activePatientId, params.request);
      const text = [
        `workflow: ${workflow}`,
        `patient-bound: ${plan.verdict.patientBound ? "yes" : "no"}`,
        `executable: ${plan.verdict.executable ? "yes" : "no"}`,
        `context lanes: ${manifest.contextSources.join(", ") || "(none declared)"}`,
        `clarification: ${plan.verdict.clarificationPrompt}`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
        details: {
          workflow,
          active_patient_id: plan.activePatientId,
          available_context: plan.availableContext,
          verdict: plan.verdict,
          lanes: plan.lanes,
          lane_plan: plan.lanePlan,
          renderer_lane_coverage: buildRendererLaneCoverageFromContextPlan(plan),
          next_actions: plan.nextActions,
          manifest: {
            path: manifest.path,
            context_sources: manifest.contextSources,
            services: manifest.services,
            tools: manifest.tools,
            knowledge_assets: manifest.knowledgeAssets,
          },
        },
      };
    },
  });

  pi.registerCommand("context-plan", {
    description: "Plan the Noah RN context bundle for a request: /context-plan <request>",
    handler: async (args, ctx) => {
      const request = args.trim();
      if (!request) {
        ctx.ui.notify("Usage: /context-plan <request>", "warning");
        return;
      }
      const workflow = detectWorkflowCandidates(request)[0]?.skill;
      if (!workflow) {
        ctx.ui.notify("No Noah RN workflow matched that request.", "warning");
        return;
      }
      const manifest = loadWorkflowManifest(workflow);
      if (!manifest) {
        ctx.ui.notify(`No dependency manifest found for ${workflow}.`, "warning");
        return;
      }
      const plan = buildNoahContextPlan(manifest, [], activePatientId, request);
      ctx.ui.setEditorText(
        [
          `workflow: ${workflow}`,
          `patient-bound: ${plan.verdict.patientBound ? "yes" : "no"}`,
          `executable: ${plan.verdict.executable ? "yes" : "no"}`,
          `clarification: ${plan.verdict.clarificationPrompt}`,
          `context lanes: ${manifest.contextSources.join(", ") || "(none declared)"}`,
        ].join("\n"),
      );
      ctx.ui.notify(`Context plan ready for ${workflow}.`, "info");
    },
  });
}
