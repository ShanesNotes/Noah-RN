import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { detectWorkflowCandidates, evaluateWorkflowExecutionVerdict } from "../shared/noah-runtime.ts";

type CustomEntry = { type?: string; customType?: string; data?: { patientId?: string | null } };

type BashGuardrail = {
  pattern: RegExp;
  reason: string;
};

const bashGuardrails: BashGuardrail[] = [
  {
    pattern: /tools\/unit-conversions\/convert\.sh|tools\/clinical-calculators\//,
    reason: "Use Noah RN deterministic calculation tools (`noah_unit_conversion` or `noah_clinical_score`) instead of raw bash.",
  },
  {
    pattern: /tools\/io-tracker\/track\.sh/,
    reason: "Use `noah_io_tracker` instead of invoking track.sh through bash.",
  },
  {
    pattern: /tools\/drug-lookup\/lookup\.sh/,
    reason: "Use `noah_drug_lookup` instead of invoking lookup.sh through bash.",
  },
  {
    pattern: /tools\/trace\/trace\.sh/,
    reason: "Use `noah_trace` instead of invoking trace.sh through bash.",
  },
  {
    pattern: /services\/clinical-mcp\/get-context\.mjs/,
    reason: "Use `noah_get_patient_context` or `noah_inspect_patient_context` instead of the raw clinical-mcp helper script.",
  },
];

function hasExplicitPatientReference(prompt: string): boolean {
  return /patient[-_ ]?\d+|\bpatient id\b|\bmrn\b|\bencounter\b/i.test(prompt);
}

export default function noahGuardrailsExtension(pi: ExtensionAPI) {
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

  pi.on("before_agent_start", async (event) => {
    const top = detectWorkflowCandidates(event.prompt)[0];
    if (!top) return;

    const verdict = evaluateWorkflowExecutionVerdict(top, activePatientId ? ["active_patient"] : []);
    const notes: string[] = [
      "Noah RN guardrails:",
      "- Noah RN is the clinical workspace agent harness; Pi is the substrate used to build that harness.",
      "- Patient context can come from multiple sources: EHR/chart context, memory, clinical resources, and patient-monitor/simulation context.",
      "- Prefer Noah RN Pi-native tools over raw bash when a deterministic Noah tool exists.",
      "- Never do calculator or conversion math in-model when a Noah deterministic tool is available.",
      "- Read the workflow SKILL.md and dependencies.yaml before execution.",
    ];

    if (verdict.patientBound && !activePatientId && !hasExplicitPatientReference(event.prompt)) {
      notes.push("- This request appears patient-bound. Ask for a patient id or have the user set an active patient before proceeding unless the user already provided sufficient clinical narrative for a non-EHR execution path.");
    }

    if (!verdict.executable) {
      notes.push(`- Current execution verdict: ${verdict.clarificationPrompt}`);
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n${notes.join("\n")}`,
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;

    const command = String(event.input.command ?? "");
    for (const guardrail of bashGuardrails) {
      if (guardrail.pattern.test(command)) {
        if (ctx.hasUI) {
          ctx.ui.notify(`Blocked raw bash path. ${guardrail.reason}`, "warning");
        }
        return { block: true, reason: guardrail.reason };
      }
    }

    return undefined;
  });
}
