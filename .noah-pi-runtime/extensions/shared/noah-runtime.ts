import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, "..", "..", "..");

export interface WorkflowManifestSummary {
  skill: string;
  path: string;
  complexityTier?: string;
  inputModes: string[];
  extensions: string[];
  services: string[];
  contextSources: string[];
  tools: string[];
  knowledgeAssets: string[];
  routerScope?: string;
  triggerPhrases: string[];
}

export interface WorkflowExecutionVerdict {
  executable: boolean;
  patientBound: boolean;
  acceptedInputModes: string[];
  satisfiedInputModes: string[];
  missingInputModes: string[];
  missingRequiredContext: string[];
  clarificationPrompt: string;
}

export interface LaneStatus {
  name: string;
  available: boolean;
  path?: string;
  reason?: string;
}

export interface PlannedLane {
  lane: string;
  available: boolean;
  path?: string;
  reason?: string;
}

export interface NoahContextPlan {
  activePatientId: string | null;
  availableContext: string[];
  verdict: WorkflowExecutionVerdict;
  lanes: Record<string, LaneStatus>;
  lanePlan: PlannedLane[];
  nextActions: string[];
}

export interface RendererLaneCoverage {
  "ehr/chart": string;
  memory: string;
  "clinical-resources": string;
  "patient-monitor/simulation": string;
}

function readFile(path: string): string {
  return readFileSync(path, "utf8");
}

function getTopLevelSection(text: string, key: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.match(new RegExp(`^${key}:\\s*(?:$|#)`)));
  if (startIndex === -1) return undefined;

  const collected: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[A-Za-z0-9_-]+:\s*(?:$|#|"|')/.test(line)) break;
    collected.push(line);
  }
  return collected.join("\n");
}

function getTopLevelScalar(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return undefined;
  return match[1].trim().replace(/^['\"]|['\"]$/g, "");
}

function parseIndentedMappingKeys(section: string | undefined, indent = 2): string[] {
  if (!section) return [];
  const pattern = new RegExp(`^\\s{${indent}}([A-Za-z0-9_-]+):`, "gm");
  return Array.from(section.matchAll(pattern)).map((match) => match[1]);
}

function parseNamedList(section: string | undefined): string[] {
  if (!section) return [];
  return Array.from(section.matchAll(/^\s*-\s+name:\s*(.+)$/gm)).map((match) => {
    return match[1].trim().replace(/^['\"]|['\"]$/g, "");
  });
}

function parseTriggerPhrases(routerSection: string | undefined): string[] {
  if (!routerSection) return [];
  const lines = routerSection.split(/\r?\n/);
  const triggerIndex = lines.findIndex((line) => /^\s{2}trigger_phrases:\s*$/.test(line));
  if (triggerIndex === -1) return [];

  const phrases: string[] = [];
  for (let i = triggerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s{2}[A-Za-z0-9_-]+:/.test(line)) break;
    const match = line.match(/^\s{4}-\s+(.+)$/);
    if (match) phrases.push(match[1].trim().replace(/^['\"]|['\"]$/g, ""));
  }
  return phrases;
}

export function loadWorkflowManifest(skill: string): WorkflowManifestSummary | undefined {
  const manifestPath = resolve(repoRoot, "packages", "workflows", skill, "dependencies.yaml");
  if (!existsSync(manifestPath)) return undefined;
  const text = readFile(manifestPath);
  const routerSection = getTopLevelSection(text, "router");
  const routerScope = routerSection?.match(/^\s{2}scope:\s*(.+)$/m)?.[1]?.trim().replace(/^['\"]|['\"]$/g, "");
  return {
    skill: getTopLevelScalar(text, "skill") ?? skill,
    path: manifestPath,
    complexityTier: getTopLevelScalar(text, "complexity_tier"),
    inputModes: parseIndentedMappingKeys(getTopLevelSection(text, "input_modes")),
    extensions: parseIndentedMappingKeys(getTopLevelSection(text, "extensions")),
    services: parseNamedList(getTopLevelSection(text, "services")),
    contextSources: parseNamedList(getTopLevelSection(text, "context_sources")),
    tools: parseNamedList(getTopLevelSection(text, "tools")),
    knowledgeAssets: parseNamedList(getTopLevelSection(text, "knowledge_assets")),
    routerScope,
    triggerPhrases: parseTriggerPhrases(routerSection),
  };
}

export function listWorkflowManifests(): WorkflowManifestSummary[] {
  const workflowsDir = resolve(repoRoot, "packages", "workflows");
  return readdirSync(workflowsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadWorkflowManifest(entry.name))
    .filter((entry): entry is WorkflowManifestSummary => Boolean(entry));
}

export function detectWorkflowCandidates(request: string): Array<WorkflowManifestSummary & { score: number; matchedPhrases: string[] }> {
  const normalized = request.toLowerCase();
  return listWorkflowManifests()
    .map((manifest) => {
      let score = 0;
      const matchedPhrases: string[] = [];

      if (normalized.includes(manifest.skill.toLowerCase())) {
        score += 4;
        matchedPhrases.push(manifest.skill);
      }

      for (const phrase of manifest.triggerPhrases) {
        const normalizedPhrase = phrase.toLowerCase();
        if (normalized.includes(normalizedPhrase)) {
          score += 2;
          matchedPhrases.push(phrase);
        }
      }

      return { ...manifest, score, matchedPhrases };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill));
}

function normalizeContextSignal(signal: string): string {
  return signal.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

export function normalizeLaneName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function evaluateWorkflowExecutionVerdict(
  manifest: WorkflowManifestSummary,
  availableContext: string[] = [],
  requiredContext?: { mandatory?: string[]; mandatory_one_of?: string[] },
): WorkflowExecutionVerdict {
  const context = new Set(availableContext.map(normalizeContextSignal));
  const acceptedInputModes = manifest.inputModes.filter((mode) => mode !== "missing");
  const satisfiedInputModes = acceptedInputModes.filter((mode) => {
    const normalizedMode = normalizeContextSignal(mode);
    if (context.has(normalizedMode)) return true;
    if (normalizedMode === "patient_id") return context.has("active_patient") || context.has("patient_id");
    return false;
  });

  const mandatory = (requiredContext?.mandatory ?? []).map(normalizeContextSignal);
  const mandatoryOneOf = (requiredContext?.mandatory_one_of ?? []).map(normalizeContextSignal);
  const missingRequiredContext = mandatory.filter((item) => !context.has(item));
  const mandatoryOneOfMissing = mandatoryOneOf.length > 0 && !mandatoryOneOf.some((item) => context.has(item));
  if (mandatoryOneOfMissing) {
    missingRequiredContext.push(`one_of:${mandatoryOneOf.join("|")}`);
  }

  const patientBound =
    acceptedInputModes.includes("patient_id") ||
    manifest.services.some((service) => service.includes("clinical-mcp")) ||
    manifest.contextSources.some((source) => ["ehr", "patient-monitor", "patient_monitor", "monitor"].includes(normalizeContextSignal(source)));
  const executable = (acceptedInputModes.length === 0 || satisfiedInputModes.length > 0) && missingRequiredContext.length === 0;
  const missingInputModes = acceptedInputModes.filter((mode) => !satisfiedInputModes.includes(mode));
  const clarificationPrompt = executable
    ? "Executable with current context."
    : acceptedInputModes.length > 0
      ? `Need one of: ${acceptedInputModes.join(", ")}${missingRequiredContext.length ? `; missing required context: ${missingRequiredContext.join(", ")}` : ""}`
      : `Missing required context: ${missingRequiredContext.join(", ")}`;

  return {
    executable,
    patientBound,
    acceptedInputModes,
    satisfiedInputModes,
    missingInputModes,
    missingRequiredContext,
    clarificationPrompt,
  };
}

export function getNoahContextLaneStatuses(): Record<string, LaneStatus> {
  const laneConfigs: Array<{ name: string; path: string; reason: string }> = [
    {
      name: "ehr",
      path: resolveFromRepo("services", "clinical-mcp"),
      reason: "Clinical MCP boundary for EHR/FHIR chart context",
    },
    {
      name: "memory",
      path: resolveFromRepo("docs", "foundations", "memory-layer-scaffold.md"),
      reason: "Memory architecture/spec lane for encounter/session context",
    },
    {
      name: "clinical-resources",
      path: resolveFromRepo("clinical-resources"),
      reason: "Curated clinical resources and reference material",
    },
    {
      name: "patient-monitor",
      path: resolveFromRepo("services", "sim-harness"),
      reason: "Monitor/simulation runtime boundary",
    },
  ];

  return Object.fromEntries(
    laneConfigs.map((lane) => [
      lane.name,
      {
        name: lane.name,
        available: existsSync(lane.path),
        path: relativeRepoPath(lane.path),
        reason: lane.reason,
      },
    ]),
  );
}

function buildNoahContextNextActions(
  lanesNeeded: string[],
  laneStatuses: Record<string, LaneStatus>,
  verdict: WorkflowExecutionVerdict,
  activePatientId: string | null,
  request?: string,
): string[] {
  const actions: string[] = [];
  const requestHasNarrative = Boolean(request && request.trim().length > 0);

  if (verdict.patientBound && !activePatientId && !requestHasNarrative) {
    actions.push("Ask for a patient id or sufficient clinical narrative before assembling patient-bound context.");
  }

  for (const lane of lanesNeeded) {
    const status = laneStatuses[lane];
    if (!status?.available) {
      actions.push(`Required context lane unavailable: ${lane}.`);
      continue;
    }

    switch (lane) {
      case "ehr":
        if (activePatientId) {
          actions.push(`Fetch EHR/chart context for active patient ${activePatientId} via noah_get_patient_context.`);
        } else if (verdict.patientBound) {
          actions.push("EHR lane is available, but a patient id or active patient is still needed.");
        }
        break;
      case "memory":
        actions.push("Inject encounter/session memory only if the workflow actually needs continuity beyond the current turn.");
        break;
      case "clinical-resources":
        actions.push("Load only the workflow-specific clinical resources and knowledge assets needed for this turn.");
        break;
      case "patient-monitor":
        actions.push("Use monitor/simulation context only as projection-layer input; do not leak hidden patient truth.");
        break;
      default:
        actions.push(`Review lane ${lane} before execution.`);
        break;
    }
  }

  if (actions.length === 0) {
    actions.push("Current request can proceed with the available context lanes.");
  }

  return actions;
}

export function buildNoahContextPlan(
  manifest: WorkflowManifestSummary,
  availableContext: string[] = [],
  activePatientId: string | null = null,
  request?: string,
  requiredContext?: { mandatory?: string[]; mandatory_one_of?: string[] },
): NoahContextPlan {
  const lanes = getNoahContextLaneStatuses();
  const lanesNeeded = manifest.contextSources.map(normalizeLaneName);
  const availableSignals = [...availableContext];
  if (activePatientId) availableSignals.push("active_patient");
  const verdict = evaluateWorkflowExecutionVerdict(manifest, availableSignals, requiredContext);
  const lanePlan = lanesNeeded.map((lane) => ({
    lane,
    available: lanes[lane]?.available ?? false,
    path: lanes[lane]?.path,
    reason: lanes[lane]?.reason,
  }));

  return {
    activePatientId,
    availableContext,
    verdict,
    lanes,
    lanePlan,
    nextActions: buildNoahContextNextActions(lanesNeeded, lanes, verdict, activePatientId, request),
  };
}

export function buildRendererLaneCoverageFromContextPlan(plan: NoahContextPlan): RendererLaneCoverage {
  const laneStatuses = new Map(plan.lanePlan.map((lane) => [lane.lane, lane]));
  const describeLane = (laneName: string, rendererName: keyof RendererLaneCoverage): string => {
    const lane = laneStatuses.get(laneName);
    if (!lane) return "not required for this workflow";
    return lane.available ? "available but not yet assembled in current turn" : "required but unavailable in current workspace";
  };

  return {
    "ehr/chart": describeLane("ehr", "ehr/chart"),
    memory: describeLane("memory", "memory"),
    "clinical-resources": describeLane("clinical-resources", "clinical-resources"),
    "patient-monitor/simulation": describeLane("patient-monitor", "patient-monitor/simulation"),
  };
}

export function summarizeManifest(manifest: WorkflowManifestSummary): string {
  const lines = [
    `skill: ${manifest.skill}`,
    `path: ${manifest.path.replace(`${repoRoot}/`, "")}`,
  ];
  if (manifest.complexityTier) lines.push(`complexity: ${manifest.complexityTier}`);
  if (manifest.routerScope) lines.push(`router scope: ${manifest.routerScope}`);
  if (manifest.inputModes.length > 0) lines.push(`input modes: ${manifest.inputModes.join(", ")}`);
  if (manifest.extensions.length > 0) lines.push(`extensions: ${manifest.extensions.join(", ")}`);
  if (manifest.services.length > 0) lines.push(`services: ${manifest.services.join(", ")}`);
  if (manifest.contextSources.length > 0) lines.push(`context sources: ${manifest.contextSources.join(", ")}`);
  if (manifest.tools.length > 0) lines.push(`tools: ${manifest.tools.join(", ")}`);
  if (manifest.knowledgeAssets.length > 0) lines.push(`knowledge assets: ${manifest.knowledgeAssets.join(", ")}`);
  return lines.join("\n");
}

export function safeJsonParse<T>(text: string): T {
  return JSON.parse(text) as T;
}

export function relativeRepoPath(path: string): string {
  return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path;
}

export function buildCommandArgs(flags: Record<string, string | number | boolean | undefined | null>, orderedKeys: string[]): string[] {
  const args: string[] = [];
  for (const key of orderedKeys) {
    const value = flags[key];
    if (value === undefined || value === null || value === "") continue;
    const flag = key.startsWith("--") ? key : `--${key}`;
    if (typeof value === "boolean") {
      if (value) args.push(flag, "1");
      continue;
    }
    args.push(flag, String(value));
  }
  return args;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function resolveFromRepo(...parts: string[]): string {
  return join(repoRoot, ...parts);
}
