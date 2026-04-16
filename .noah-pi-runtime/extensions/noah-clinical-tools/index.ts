import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { buildCommandArgs, resolveFromRepo, safeJsonParse, shellQuote } from "../shared/noah-runtime.ts";

const scalarValue = Type.Union([Type.String(), Type.Number(), Type.Boolean()]);

const calculatorConfigs: Record<string, { script: string; keys: string[] }> = {
  gcs: { script: "gcs.sh", keys: ["eye", "verbal", "motor"] },
  nihss: { script: "nihss.sh", keys: ["1a", "1b", "1c", "2", "3", "4", "5a", "5b", "6a", "6b", "7", "8", "9", "10", "11"] },
  rass: { script: "rass.sh", keys: ["score"] },
  cpot: { script: "cpot.sh", keys: ["facial", "body", "muscle", "compliance"] },
  "wells-pe": { script: "wells-pe.sh", keys: ["dvt", "heartrate", "immobilization", "prior", "hemoptysis", "malignancy", "alternative"] },
  "wells-dvt": { script: "wells-dvt.sh", keys: ["cancer", "paralysis", "bedridden", "tenderness", "leg-swollen", "calf-swelling", "pitting-edema", "collateral-veins", "previous-dvt", "alternative-dx"] },
  curb65: { script: "curb65.sh", keys: ["confusion", "urea", "rr", "bp", "age"] },
  braden: { script: "braden.sh", keys: ["sensory", "moisture", "activity", "mobility", "nutrition", "friction"] },
  apache2: { script: "apache2.sh", keys: ["temp", "map", "hr", "rr", "oxygenation", "fio2", "ph", "sodium", "potassium", "creatinine", "hematocrit", "wbc", "gcs", "age", "chronic", "arf"] },
  news2: { script: "news2.sh", keys: ["rr", "spo2", "o2", "temp", "sbp", "hr", "avpu", "spo2-scale"] },
};

function normalizeCalculatorArguments(calculator: string, input: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (calculator === "nihss" && key.startsWith("item")) {
      normalized[key.slice(4).toLowerCase()] = value;
      continue;
    }
    if (calculator === "news2" && key === "spo2Scale") {
      normalized["spo2-scale"] = value;
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function execJson(pi: ExtensionAPI, command: string, args: string[], stdin?: string) {
  const shellCommand = stdin
    ? `cat <<'EOF' | ${shellQuote(command)} ${args.map(shellQuote).join(" ")}\n${stdin}\nEOF`
    : `${shellQuote(command)} ${args.map(shellQuote).join(" ")}`;
  const result = await pi.exec("bash", ["-lc", shellCommand]);
  const stdout = result.stdout.trim();
  let parsed: Record<string, unknown> | null = null;
  if (stdout) {
    try {
      parsed = safeJsonParse<Record<string, unknown>>(stdout);
    } catch {
      parsed = null;
    }
  }
  return {
    ...result,
    parsed,
  };
}

export default function noahClinicalToolsExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "noah_unit_conversion",
    label: "Noah Unit Conversion",
    description: "Run Noah RN unit conversion, weight-based dose, or drip-rate calculations through the deterministic shell tool.",
    promptSnippet: "Use deterministic Noah RN unit conversion and dosing math.",
    promptGuidelines: ["Use this tool instead of doing medication or unit arithmetic in the model."],
    parameters: Type.Object({
      mode: StringEnum(["dose", "drip", "unit"] as const, { description: "Which convert.sh subcommand to run" }),
      weightKg: Type.Optional(Type.Number()),
      dosePerKg: Type.Optional(Type.Number()),
      unit: Type.Optional(Type.String()),
      dose: Type.Optional(Type.Number()),
      doseUnit: Type.Optional(Type.String()),
      concentration: Type.Optional(Type.Number()),
      concUnit: Type.Optional(Type.String()),
      value: Type.Optional(Type.Number()),
      fromUnit: Type.Optional(Type.String()),
      toUnit: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params) {
      try {
        const script = resolveFromRepo("tools", "unit-conversions", "convert.sh");
        const args = [params.mode, ...buildCommandArgs({
          "weight-kg": params.weightKg,
          "dose-per-kg": params.dosePerKg,
          unit: params.unit,
          dose: params.dose,
          "dose-unit": params.doseUnit,
          concentration: params.concentration,
          "conc-unit": params.concUnit,
          value: params.value,
          from: params.fromUnit,
          to: params.toUnit,
        }, ["weight-kg", "dose-per-kg", "unit", "dose", "dose-unit", "concentration", "conc-unit", "value", "from", "to"] )];
        const result = await execJson(pi, script, args);
        if (result.code !== 0 || !result.parsed) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || "Unit conversion failed." }],
            details: { command: script, args, stdout: result.stdout, stderr: result.stderr },
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Noah RN conversion completed: ${params.mode}.` }],
          details: { command: script, args, result: result.parsed },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Unit conversion failed: ${getErrorMessage(error)}` }],
          details: { error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_clinical_score",
    label: "Noah Clinical Score",
    description: "Run Noah RN neuro, risk, or acuity calculators through deterministic shell scripts.",
    promptSnippet: "Use deterministic Noah RN clinical scoring tools instead of estimating scores in the model.",
    promptGuidelines: [
      "Use this tool for GCS, NIHSS, RASS, CPOT, Wells PE/DVT, CURB-65, Braden, APACHE II, and NEWS2.",
      "If the user gives totals without the required components, ask for the missing components instead of calling the tool.",
    ],
    parameters: Type.Object({
      calculator: StringEnum(["gcs", "nihss", "rass", "cpot", "wells-pe", "wells-dvt", "curb65", "braden", "apache2", "news2"] as const),
      arguments: Type.Record(Type.String(), scalarValue, { description: "Calculator arguments. For NIHSS you may use item1a..item11; for NEWS2 you may use spo2Scale." }),
    }),
    async execute(_toolCallId, params) {
      try {
        const config = calculatorConfigs[params.calculator];
        const normalized = normalizeCalculatorArguments(params.calculator, params.arguments as Record<string, string | number | boolean>);
        const missing = config.keys.filter((key) => !(key in normalized)).filter((key) => !(params.calculator === "apache2" && key === "arf"));
        if (missing.length > 0) {
          return {
            content: [{ type: "text", text: `Missing required ${params.calculator} arguments: ${missing.join(", ")}` }],
            details: { calculator: params.calculator, missing },
            isError: true,
          };
        }

        const script = resolveFromRepo("tools", "clinical-calculators", config.script);
        const args = buildCommandArgs(normalized, config.keys);
        const result = await execJson(pi, script, args);
        if (result.code !== 0 || !result.parsed) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || `Calculator ${params.calculator} failed.` }],
            details: { calculator: params.calculator, stdout: result.stdout, stderr: result.stderr, args },
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: `Calculated ${params.calculator}.` }],
          details: { calculator: params.calculator, args, result: result.parsed },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Calculator ${params.calculator} failed: ${getErrorMessage(error)}` }],
          details: { calculator: params.calculator, error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_io_tracker",
    label: "Noah I&O Tracker",
    description: "Run the Noah RN intake/output tracker on structured entries.",
    promptSnippet: "Use Noah RN's deterministic I&O tracker for fluid balance totals.",
    promptGuidelines: ["Use this tool when the user provides structured or partially structured intake/output entries that need exact totals and net balance."],
    parameters: Type.Object({
      entries: Type.Array(
        Type.Object({
          direction: StringEnum(["intake", "output"] as const),
          category: Type.String(),
          volume_ml: Type.Number(),
          label: Type.Optional(Type.String()),
          subcategory: Type.Optional(Type.String()),
          details: Type.Optional(Type.String()),
          estimate: Type.Optional(Type.Boolean()),
          tier: Type.Optional(Type.Number()),
        }),
      ),
      priorEntries: Type.Optional(Type.Array(Type.Any())),
    }),
    async execute(_toolCallId, params) {
      try {
        const script = resolveFromRepo("tools", "io-tracker", "track.sh");
        const payload = JSON.stringify({
          entries: params.entries,
          prior_state: params.priorEntries ? { entries: params.priorEntries } : { entries: [] },
        });
        const result = await execJson(pi, script, [], payload);
        if (result.code !== 0 || !result.parsed) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || "I&O tracker failed." }],
            details: { stdout: result.stdout, stderr: result.stderr },
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Tracked ${params.entries.length} I&O entries.` }],
          details: { result: result.parsed },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `I&O tracker failed: ${getErrorMessage(error)}` }],
          details: { error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_drug_lookup",
    label: "Noah Drug Lookup",
    description: "Query OpenFDA through Noah RN's deterministic drug lookup helper.",
    promptSnippet: "Use Noah RN drug lookup when the user asks for structured medication label information.",
    promptGuidelines: ["Use this tool for exact drug label fields instead of relying on memory."],
    parameters: Type.Object({
      drug: Type.String({ description: "Brand or generic drug name" }),
    }),
    async execute(_toolCallId, params) {
      try {
        const script = resolveFromRepo("tools", "drug-lookup", "lookup.sh");
        const result = await execJson(pi, script, [params.drug]);
        if (result.code !== 0 || !result.parsed) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || `Drug lookup failed for ${params.drug}.` }],
            details: { drug: params.drug, stdout: result.stdout, stderr: result.stderr },
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Lookup completed for ${params.drug}.` }],
          details: { drug: params.drug, result: result.parsed },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Drug lookup failed for ${params.drug}: ${getErrorMessage(error)}` }],
          details: { drug: params.drug, error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "noah_trace",
    label: "Noah Trace",
    description: "Write Noah RN workflow trace artifacts using tools/trace/trace.sh.",
    promptSnippet: "Record Noah RN workflow trace stages when a workflow needs explicit trace artifacts.",
    parameters: Type.Object({
      stage: StringEnum(["init", "input", "output", "hooks", "done"] as const),
      skill: Type.Optional(Type.String({ description: "Required for init." })),
      caseId: Type.Optional(Type.String({ description: "Required for non-init stages." })),
      payload: Type.Optional(Type.String({ description: "JSON string for input/hooks or plain text for output." })),
    }),
    async execute(_toolCallId, params) {
      try {
        const script = resolveFromRepo("tools", "trace", "trace.sh");
        const args = [params.stage];
        if (params.stage === "init") {
          if (!params.skill) {
            return {
              content: [{ type: "text", text: "Trace init requires skill." }],
              details: { stage: params.stage },
              isError: true,
            };
          }
          args.push(params.skill);
        } else {
          if (!params.caseId) {
            return {
              content: [{ type: "text", text: `Trace stage ${params.stage} requires caseId.` }],
              details: { stage: params.stage },
              isError: true,
            };
          }
          args.push(params.caseId);
          if (params.payload && params.stage !== "output") args.push(params.payload);
        }

        const result = params.stage === "output"
          ? await execJson(pi, script, args, params.payload ?? "")
          : await execJson(pi, script, args, params.payload);

        if (result.code !== 0) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || `Trace stage ${params.stage} failed.` }],
            details: { stage: params.stage, stdout: result.stdout, stderr: result.stderr },
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: result.stdout.trim() || `Trace stage ${params.stage} completed.` }],
          details: { stage: params.stage, stdout: result.stdout.trim() },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Trace stage ${params.stage} failed: ${getErrorMessage(error)}` }],
          details: { stage: params.stage, error: getErrorMessage(error) },
          isError: true,
        };
      }
    },
  });
}
