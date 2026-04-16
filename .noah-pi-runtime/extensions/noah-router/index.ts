import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { buildNoahContextPlan, buildRendererLaneCoverageFromContextPlan, detectWorkflowCandidates, evaluateWorkflowExecutionVerdict, loadWorkflowManifest, summarizeManifest } from "../shared/noah-runtime.ts";

type CustomEntry = { type?: string; customType?: string; data?: { patientId?: string | null } };

type RoutingCandidate = {
  name: string;
  source_path: string;
  scope: string[];
  contract_ready: boolean;
  required_context: {
    mandatory: string[];
    mandatory_one_of: string[];
  };
  tool_families: Array<{ name: string; kind: string; source_path: string }>;
  knowledge_assets: Array<{ name: string; kind?: string; source_path?: string }>;
  knowledge_sources_raw: string[];
  service_surface_refs: string[];
  authoritative_surface: string;
};

async function loadRoutingCandidates(availableContext: string[] = []): Promise<RoutingCandidate[]> {
  const mod = await import("../../../packages/agent-harness/describe-routing-candidates.mjs");
  return mod.describeRoutingCandidates({ availableContext }) as RoutingCandidate[];
}

function buildRoutingSummary(
  matches: ReturnType<typeof detectWorkflowCandidates>,
  routingCandidates: RoutingCandidate[],
  availableContext: string[],
  activePatientId: string | null,
  request: string,
) {
  const byName = new Map(routingCandidates.map((candidate) => [candidate.name, candidate]));
  return matches.map((match) => {
    const routing = byName.get(match.skill);
    const verdict = evaluateWorkflowExecutionVerdict(match, availableContext, routing?.required_context);
    const contextPlan = buildNoahContextPlan(match, availableContext, activePatientId, request, routing?.required_context);
    return {
      skill: match.skill,
      score: match.score,
      matched_phrases: match.matchedPhrases,
      manifest: {
        path: match.path,
        complexity_tier: match.complexityTier,
        input_modes: match.inputModes,
        extensions: match.extensions,
        services: match.services,
        context_sources: match.contextSources,
        tools: match.tools,
        knowledge_assets: match.knowledgeAssets,
        router_scope: match.routerScope,
      },
      verdict,
      routing: routing
        ? {
            required_context: routing.required_context,
            tool_families: routing.tool_families.map((tool) => tool.name),
            service_surface_refs: routing.service_surface_refs,
            knowledge_assets: routing.knowledge_assets.map((asset) => asset.name),
            authoritative_surface: routing.authoritative_surface,
          }
        : null,
      context_plan: {
        active_patient_id: contextPlan.activePatientId,
        lane_plan: contextPlan.lanePlan,
        renderer_lane_coverage: buildRendererLaneCoverageFromContextPlan(contextPlan),
        next_actions: contextPlan.nextActions,
      },
    };
  });
}

export default function noahRouterExtension(pi: ExtensionAPI) {
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
    name: "resolve_noah_request",
    label: "Resolve Noah Request",
    description: "Match a Noah RN request to likely workflow skills and surface the routing/dependency summary.",
    promptSnippet: "Resolve a Noah RN clinical request into workflow candidates before using a skill.",
    promptGuidelines: [
      "Use this tool when a bedside request could map to multiple Noah RN workflows or when you need the dependency summary before execution.",
      "After selecting a workflow, read the authoritative SKILL.md and its dependencies.yaml before continuing.",
    ],
    parameters: Type.Object({
      request: Type.String({ description: "The bedside request or workflow description to route" }),
      availableContext: Type.Optional(
        Type.Array(Type.String(), { description: "Context signals currently available, e.g. patient_id, component_values" }),
      ),
    }),
    async execute(_toolCallId, params) {
      const matches = detectWorkflowCandidates(params.request);
      const routingCandidates = await loadRoutingCandidates(params.availableContext ?? []);
      const summary = buildRoutingSummary(matches, routingCandidates, params.availableContext ?? [], activePatientId, params.request);
      const top = summary[0];
      const text = top
        ? `Selected workflow: ${top.skill}\nMatched phrases: ${top.matched_phrases.join(", ") || "(name match)"}\nExecutable now: ${top.verdict.executable ? "yes" : "no"}\nClarification: ${top.verdict.clarificationPrompt}\nContext lanes: ${top.manifest.context_sources.join(", ") || "(none declared)"}\nNext actions: ${top.context_plan.next_actions.join(" ")}\nManifest path: ${top.manifest.path}`
        : "No workflow manifest matched this request.";

      return {
        content: [{ type: "text", text }],
        details: {
          request: params.request,
          available_context: params.availableContext ?? [],
          selected: top ?? null,
          candidates: summary,
        },
      };
    },
  });

  pi.registerTool({
    name: "describe_noah_skill_dependencies",
    label: "Describe Noah Skill Dependencies",
    description: "Show the Noah RN dependency manifest summary for a workflow skill.",
    promptSnippet: "Inspect a Noah RN workflow dependencies.yaml manifest.",
    promptGuidelines: ["Use this tool before executing a Noah RN workflow when you need its extensions, services, tools, or input modes."],
    parameters: Type.Object({
      skill: Type.String({ description: "Workflow skill name, e.g. shift-report or neuro-calculator" }),
    }),
    async execute(_toolCallId, params) {
      const manifest = loadWorkflowManifest(params.skill);
      if (!manifest) {
        return {
          content: [{ type: "text", text: `No dependency manifest found for ${params.skill}.` }],
          details: { skill: params.skill, found: false },
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: summarizeManifest(manifest) }],
        details: { found: true, manifest },
      };
    },
  });

  pi.registerCommand("route", {
    description: "Resolve a Noah RN request into likely workflow candidates: /route <request>",
    handler: async (args, ctx) => {
      const request = args.trim();
      if (!request) {
        ctx.ui.notify("Usage: /route <request>", "warning");
        return;
      }
      const matches = detectWorkflowCandidates(request);
      if (matches.length === 0) {
        ctx.ui.notify("No Noah RN workflow matched that request.", "warning");
        return;
      }
      const plan = buildNoahContextPlan(matches[0], [], activePatientId, request);
      ctx.ui.notify(`Top workflow: ${matches[0].skill}`, "info");
      ctx.ui.setEditorText(`Top workflow: ${matches[0].skill}\nExecutable now: ${plan.verdict.executable ? "yes" : "no"}\nClarification: ${plan.verdict.clarificationPrompt}\nContext plan: ${plan.nextActions.join(" ")}\n\n${summarizeManifest(matches[0])}`);
    },
  });

  pi.on("before_agent_start", async (event) => {
    const matches = detectWorkflowCandidates(event.prompt).slice(0, 2);
    if (matches.length === 0) return;

    const summary = matches
      .map((match) => {
        const manifest = loadWorkflowManifest(match.skill);
        if (!manifest) return `- ${match.skill}`;
        const parts = [`- ${match.skill}`];
        const plan = buildNoahContextPlan(manifest, [], activePatientId, event.prompt);
        if (manifest.inputModes.length > 0) parts.push(`input_modes=${manifest.inputModes.join("/")}`);
        if (manifest.extensions.length > 0) parts.push(`extensions=${manifest.extensions.join(",")}`);
        if (manifest.services.length > 0) parts.push(`services=${manifest.services.join(",")}`);
        if (manifest.contextSources.length > 0) parts.push(`context=${manifest.contextSources.join(",")}`);
        if (manifest.tools.length > 0) parts.push(`tools=${manifest.tools.join(",")}`);
        if (!plan.verdict.executable) parts.push(`needs=${plan.verdict.clarificationPrompt}`);
        if (plan.nextActions.length > 0) parts.push(`next=${plan.nextActions.join(" /")}`);
        return parts.join(" | ");
      })
      .join("\n");

    return {
      systemPrompt:
        `${event.systemPrompt}\n\nLikely Noah RN workflow candidates for this request:\n${summary}\nBefore executing a Noah RN workflow, read both the authoritative SKILL.md and packages/workflows/<skill>/dependencies.yaml.`,
    };
  });
}
