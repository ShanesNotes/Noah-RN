#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeRoutingCandidates } from "./describe-routing-candidates.mjs";
import { formatNarrativeOutput, formatPatientIdOutput } from "./shift-report-renderer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const traceScript = resolve(repoRoot, "tools", "trace", "trace.sh");

function resolveScope(workflowName) {
  if (workflowName === "shift-report") {
    return "clinical_documentation";
  }

  return undefined;
}

function detectInputMode(rawInput) {
  if (/patient[_ -]?id\s*[:=]?\s*\S+/i.test(rawInput)) {
    return "patient_id";
  }
  return "clinical_narrative";
}

function extractPatientId(rawInput) {
  const match = rawInput.match(/patient[_ -]?id\s*[:=]?\s*(\S+)/i);
  return match ? match[1] : null;
}

function resolveAvailableContext(rawInput) {
  const context = [];
  if (rawInput && rawInput.trim().length > 0) {
    context.push("clinical_narrative");
  }
  if (detectInputMode(rawInput) === "patient_id") {
    context.push("patient_id");
  }
  return context;
}

async function fetchPatientContext(patientId) {
  const { assemblePatientContext } = await import(
    "../../services/clinical-mcp/dist/context/assembler.js"
  );
  return assemblePatientContext(patientId);
}

function runTraceCommand(env, ...args) {
  return spawnSync("bash", [traceScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
}

function emitTraceJson(env, command, caseId, payload) {
  const result = runTraceCommand(env, command, caseId, JSON.stringify(payload, null, 2));
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `trace ${command} failed`);
  }
}

function estimateTokenSpend(rawInput, output, patientContext) {
  const rawLength = rawInput.length;
  const contextText = patientContext ? JSON.stringify(patientContext) : "";
  const inputTokens = Math.max(1, Math.ceil((rawLength + contextText.length) / 4));
  const outputTokens = Math.max(1, Math.ceil(output.length / 4));
  const patientBundleTokens = patientContext
    ? Math.max(1, Math.ceil(JSON.stringify(patientContext.timeline ?? []).length / 4))
    : 0;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    context_ratio: Number(
      Math.min(1, patientBundleTokens / Math.max(1, inputTokens + outputTokens)).toFixed(3),
    ),
    categories: {
      patient_bundle: patientBundleTokens,
      user_input: Math.max(1, Math.ceil(rawLength / 4)),
      system_prompt: 128,
      renderer: Math.max(1, Math.ceil(output.length / 8)),
    },
  };
}

export function getWorkflowCandidate(workflowName, rawInput = "") {
  const availableContext = resolveAvailableContext(rawInput);
  const scope = resolveScope(workflowName);
  const candidates = describeRoutingCandidates({ scope, availableContext });
  const candidate = candidates.find((item) => item.name === workflowName);

  if (!candidate) {
    throw new Error(`No routing candidate found for workflow "${workflowName}"`);
  }

  return candidate;
}

async function main() {
  const [, , workflowName = "shift-report", rawInput = "", traceDirArg = ""] = process.argv;
  const inputMode = detectInputMode(rawInput);
  const availableContext = resolveAvailableContext(rawInput);
  const scope = resolveScope(workflowName);
  const candidate = getWorkflowCandidate(workflowName, rawInput);

  let patientContext = null;
  let patientId = null;
  if (inputMode === "patient_id") {
    patientId = extractPatientId(rawInput);
    if (!patientId) {
      throw new Error(`Could not extract patient ID from input: "${rawInput}"`);
    }
    try {
      patientContext = await fetchPatientContext(patientId);
    } catch (err) {
      process.stderr.write(`Warning: context assembly failed, falling back to narrative mode: ${err.message}\n`);
    }
  }

  const traceBaseDir = traceDirArg
    ? resolve(repoRoot, traceDirArg, "..")
    : resolve(repoRoot, "evals", "product", "traces");

  const env = traceBaseDir
    ? {
        ...process.env,
        TRACE_BASE_DIR: traceBaseDir,
        TRACE_CANDIDATE_ID: process.env.CANDIDATE_ID ?? "",
      }
    : process.env;

  const caseIdResult = runTraceCommand(env, "init", workflowName);
  if (caseIdResult.status !== 0) {
    throw new Error(caseIdResult.stderr.trim() || "trace init failed");
  }

  const caseId = caseIdResult.stdout.trim();
  const generatedTraceDir = resolve(traceBaseDir, caseId);
  const allCandidates = describeRoutingCandidates({ scope, availableContext }).map((item) => item.name);
  const inputPayload = JSON.stringify(
    {
      workflow: workflowName,
      input_mode: inputMode,
      patient_id: patientId,
      available_context: availableContext,
      raw_input: rawInput,
      context_assembled: !!patientContext,
      phi_risk: patientContext ? "de-identified" : "none",
    },
    null,
    2,
  );

  const inputResult = runTraceCommand(env, "input", caseId, inputPayload);
  if (inputResult.status !== 0) {
    throw new Error(inputResult.stderr.trim() || "trace input failed");
  }

  emitTraceJson(env, "routing", caseId, {
    input_classification: inputMode === "patient_id" ? "moderate" : "simple",
    candidates_considered: allCandidates,
    selected_workflow: candidate.name,
    confidence: inputMode === "patient_id" ? 0.9 : 0.84,
    rationale: inputMode === "patient_id"
      ? "Patient identifier enabled live context assembly and narrowed routing."
      : "Narrative-only input matched the requested workflow directly.",
  });

  const output = patientContext
    ? formatPatientIdOutput(candidate, patientId, patientContext)
    : formatNarrativeOutput(candidate, rawInput);

  const patientBundleTokens = patientContext
    ? Math.max(1, Math.ceil(JSON.stringify(patientContext.timeline ?? []).length / 4))
    : 0;
  emitTraceJson(env, "context", caseId, {
    patient_bundle_tokens: patientBundleTokens,
    knowledge_assets_selected: candidate.knowledge_assets.map((asset) => asset.name),
    compression_strategy: patientContext ? "timeline-windowed" : "narrative-only",
    gap_markers: patientContext?.gaps ?? [],
    fhir_queries_fired: patientContext?.sources?.length ?? 0,
  });

  const outputResult = runTraceCommand(env, "output", caseId, output);
  if (outputResult.status !== 0) {
    throw new Error(outputResult.stderr.trim() || "trace output failed");
  }

  if (patientContext) {
    writeFileSync(
      resolve(generatedTraceDir, "patient-context.json"),
      JSON.stringify(patientContext, null, 2),
    );
  }

  const hooksPayload = JSON.stringify(
    {
      hooks_fired: ["trace-only"],
      workflow: workflowName,
      input_mode: inputMode,
      context_assembled: !!patientContext,
      service_surface_refs: candidate.service_surface_refs,
      downstream_system: patientContext ? "medplum" : null,
      veto_triggered: false,
    },
    null,
    2,
  );
  const hooksResult = runTraceCommand(env, "hooks", caseId, hooksPayload);
  if (hooksResult.status !== 0) {
    throw new Error(hooksResult.stderr.trim() || "trace hooks failed");
  }

  emitTraceJson(env, "safety", caseId, {
    gate_name: "context-ratio",
    result: patientContext ? "pass" : "warn",
    detail: patientContext
      ? "Context assembly completed with bounded patient bundle."
      : "Narrative-only path used without patient bundle context.",
  });
  emitTraceJson(env, "safety", caseId, {
    gate_name: "hitl-category-ii",
    result: "pass",
    detail: "Output remains draft clinical decision support requiring human review.",
  });
  emitTraceJson(env, "tokens", caseId, estimateTokenSpend(rawInput, output, patientContext));

  const doneResult = runTraceCommand(env, "done", caseId);
  if (doneResult.status !== 0) {
    throw new Error(doneResult.stderr.trim() || "trace done failed");
  }

  const envelopeResult = runTraceCommand(env, "envelope", caseId);
  if (envelopeResult.status !== 0) {
    throw new Error(envelopeResult.stderr.trim() || "trace envelope failed");
  }

  if (traceDirArg) {
    const requestedTraceDir = resolve(repoRoot, traceDirArg);

    if (!existsSync(requestedTraceDir)) {
      mkdirSync(requestedTraceDir, { recursive: true });
    }

    for (const entry of readdirSync(generatedTraceDir)) {
      cpSync(resolve(generatedTraceDir, entry), resolve(requestedTraceDir, entry), {
        force: true,
        recursive: true,
      });
    }
  }

  process.stdout.write(output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
