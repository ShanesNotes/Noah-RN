#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeRoutingCandidates } from "./describe-routing-candidates.mjs";

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

function formatContextSBAR(context) {
  const { patient, timeline, trends, gaps } = context;
  const sections = [];

  // 1. PATIENT
  const patientLines = ["PATIENT"];
  patientLines.push(`- ${patient.name}`);
  patientLines.push(`- ${patient.gender}, DOB: ${patient.dob}`);

  const conditions = timeline.filter((e) => e.type === "condition");
  if (conditions.length > 0) {
    const pmh = conditions.map((c) => c.resource.code?.text || c.resource.code?.coding?.[0]?.display || "unknown").join(", ");
    patientLines.push(`- Hx: ${pmh}`);
  }

  const encounters = timeline.filter((e) => e.type === "encounter");
  if (encounters.length > 0) {
    const latest = encounters[0];
    const reason = latest.resource.reasonCode?.[0]?.text || latest.resource.type?.[0]?.text || "unknown";
    patientLines.push(`- Admit: ${latest.timestamp}, ${reason}`);
  }

  sections.push(patientLines.join("\n"));

  // 2. STORY
  const storyLines = ["STORY"];
  const storyEntries = timeline.slice(0, 20); // most recent events
  if (storyEntries.length > 0) {
    for (const entry of storyEntries) {
      const label = entryLabel(entry);
      storyLines.push(`- ${entry.relativeTime}: ${label}`);
    }
  } else {
    storyLines.push("- No timeline events available");
  }
  sections.push(storyLines.join("\n"));

  // 3. ASSESSMENT
  const assessmentLines = ["ASSESSMENT"];
  const vitals = timeline.filter((e) => e.type === "observation" && e.subtype === "vital");
  const labs = timeline.filter((e) => e.type === "observation" && e.subtype === "lab");

  if (vitals.length > 0) {
    assessmentLines.push("Vitals:");
    for (const v of vitals.slice(0, 10)) {
      const name = v.resource.code?.text || v.resource.code?.coding?.[0]?.display || "unknown";
      const value = formatObsValue(v.resource);
      assessmentLines.push(`  - ${name}: ${value} (${v.relativeTime})`);
    }
  }

  if (labs.length > 0) {
    assessmentLines.push("Labs:");
    for (const l of labs.slice(0, 10)) {
      const name = l.resource.code?.text || l.resource.code?.coding?.[0]?.display || "unknown";
      const value = formatObsValue(l.resource);
      assessmentLines.push(`  - ${name}: ${value} (${l.relativeTime})`);
    }
  }

  if (vitals.length === 0 && labs.length === 0) {
    assessmentLines.push("- No observations available");
  }
  sections.push(assessmentLines.join("\n"));

  // 4. LINES & ACCESS
  sections.push("LINES & ACCESS\n- [Data not available from current context assembly]");

  // 5. ACTIVE ISSUES & PLAN
  const issueLines = ["ACTIVE ISSUES & PLAN"];
  if (trends.length > 0) {
    for (const t of trends) {
      const flag = t.direction === "rising" || t.direction === "falling" ? "[!] " : "";
      const vals = t.values.map((v) => `${v.value}`).join(" → ");
      issueLines.push(`- ${flag}${t.name} ${t.direction}: ${vals}`);
    }
  }
  if (gaps.length > 0) {
    issueLines.push("Gaps:");
    for (const g of gaps) {
      issueLines.push(`  - ${g}`);
    }
  }
  if (trends.length === 0 && gaps.length === 0) {
    issueLines.push("- No active issues identified from available data");
  }
  sections.push(issueLines.join("\n"));

  // 6. HOUSEKEEPING
  sections.push("HOUSEKEEPING\n- [Requires bedside input]");

  // 7. FAMILY
  sections.push("FAMILY\n- [Requires bedside input]");

  return sections.join("\n\n");
}

function entryLabel(entry) {
  switch (entry.type) {
    case "observation": {
      const name = entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || "observation";
      return `${name}: ${formatObsValue(entry.resource)}`;
    }
    case "condition": {
      return `Dx: ${entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || "condition"}`;
    }
    case "medication": {
      return `Rx: ${entry.resource.medicationCodeableConcept?.text || entry.resource.medicationCodeableConcept?.coding?.[0]?.display || "medication"}`;
    }
    case "medicationAdministration": {
      return `MAR: ${entry.resource.medicationCodeableConcept?.text || "medication admin"}`;
    }
    case "encounter": {
      return `Encounter: ${entry.resource.type?.[0]?.text || entry.resource.reasonCode?.[0]?.text || "encounter"}`;
    }
    case "note": {
      return `Note: ${entry.resource.type?.coding?.[0]?.display || entry.resource.description || "document"}`;
    }
    default:
      return entry.type;
  }
}

function formatObsValue(obs) {
  if (obs.valueQuantity) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ""}`.trim();
  }
  if (obs.valueString) {
    return obs.valueString;
  }
  if (obs.component && obs.component.length > 0) {
    return obs.component
      .map((c) => {
        const label = c.code?.text || c.code?.coding?.[0]?.display || "";
        const val = c.valueQuantity ? `${c.valueQuantity.value}` : "?";
        return `${label} ${val}`;
      })
      .join(" / ");
  }
  return "no value";
}

function formatNarrativeOutput(candidate, rawInput) {
  const toolNames = candidate.tool_families.map((tool) => tool.name).join(", ") || "none";
  const resourceNames = candidate.knowledge_assets.map((asset) => asset.name).join(", ") || "none";
  const surfaces = candidate.service_surface_refs.join(", ") || "packages/workflows/";

  return [
    "Summary",
    `SBAR ${candidate.name} workflow invocation prepared for the Shift Report path.`,
    "",
    "Evidence",
    `Workflow: ${candidate.name}`,
    "Input mode: clinical_narrative",
    "Context boundary: services/clinical-mcp/",
    `Resource access: ${resourceNames}`,
    `Tool families: ${toolNames}`,
    `Service surfaces: ${surfaces}`,
    `User context: ${rawInput}`,
    "",
    "Confidence",
    "0.95",
    "",
    "Provenance",
    `Source: ${candidate.source_path}`,
    "Registry: packages/workflows/registry.json",
    "Dependencies: packages/agent-harness/workflow-dependencies.json",
  ].join("\n");
}

function formatPatientIdOutput(candidate, patientId, context) {
  const sbar = formatContextSBAR(context);

  return [
    "Summary",
    `Shift Report assembled from live Medplum context for patient ${patientId}.`,
    "",
    sbar,
    "",
    "Confidence",
    "0.90",
    "",
    "Provenance",
    `Source: ${candidate.source_path}`,
    `Context: services/clinical-mcp/ (${context.sources.join(", ")})`,
    `Assembled: ${context.assembledAt}`,
    `Token estimate: ${context.tokenEstimate}`,
    "Registry: packages/workflows/registry.json",
  ].join("\n");
}

async function main() {
  const [, , workflowName = "shift-report", rawInput = "", traceDirArg = ""] = process.argv;
  const inputMode = detectInputMode(rawInput);
  const availableContext = resolveAvailableContext(rawInput);
  const scope = resolveScope(workflowName);
  const candidates = describeRoutingCandidates({ scope, availableContext });
  const candidate = candidates.find((item) => item.name === workflowName);

  if (!candidate) {
    throw new Error(`No routing candidate found for workflow "${workflowName}"`);
  }

  // Resolve patient context if input is patient_id
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

  const env = traceBaseDir ? { ...process.env, TRACE_BASE_DIR: traceBaseDir } : process.env;
  const caseIdResult = spawnSync("bash", [traceScript, "init", workflowName], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });

  if (caseIdResult.status !== 0) {
    throw new Error(caseIdResult.stderr.trim() || "trace init failed");
  }

  const caseId = caseIdResult.stdout.trim();
  const generatedTraceDir = resolve(traceBaseDir, caseId);
  const inputPayload = JSON.stringify(
    {
      workflow: workflowName,
      input_mode: inputMode,
      patient_id: patientId,
      available_context: availableContext,
      raw_input: rawInput,
      context_assembled: !!patientContext,
    },
    null,
    2,
  );

  const inputResult = spawnSync("bash", [traceScript, "input", caseId, inputPayload], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });

  if (inputResult.status !== 0) {
    throw new Error(inputResult.stderr.trim() || "trace input failed");
  }

  // Format output based on input mode
  const output = patientContext
    ? formatPatientIdOutput(candidate, patientId, patientContext)
    : formatNarrativeOutput(candidate, rawInput);

  writeFileSync(resolve(generatedTraceDir, "skill-output.txt"), output);

  // Save patient context to trace if assembled
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
    },
    null,
    2,
  );
  const hooksResult = spawnSync("bash", [traceScript, "hooks", caseId, hooksPayload], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });

  if (hooksResult.status !== 0) {
    throw new Error(hooksResult.stderr.trim() || "trace hooks failed");
  }

  const doneResult = spawnSync("bash", [traceScript, "done", caseId], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });

  if (doneResult.status !== 0) {
    throw new Error(doneResult.stderr.trim() || "trace done failed");
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

main();
