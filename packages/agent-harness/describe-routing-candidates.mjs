import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { selectWorkflows } from "./select-workflows.mjs";
import { loadToolsRegistry } from "./list-tools.mjs";
import { loadClinicalResourcesRegistry } from "./list-clinical-resources.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const dependenciesPath = resolve(__dirname, "workflow-dependencies.json");

function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function parseTopLevelList(frontmatter, key) {
  const pattern = new RegExp(`${key}:\\n((?:\\s{2}- .*\\n?)*)`, "m");
  const match = frontmatter.match(pattern);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().replace(/^"|"$/g, ""));
}

function loadDependencies() {
  return JSON.parse(readFileSync(dependenciesPath, "utf8"));
}

function loadFrontmatterFor(sourcePath) {
  const absolutePath = resolve(repoRoot, sourcePath);
  return extractFrontmatter(readFileSync(absolutePath, "utf8"));
}

export function describeRoutingCandidates({ scope, availableContext = [] } = {}) {
  const selected = selectWorkflows({ scope, availableContext });
  const dependencyRegistry = loadDependencies().workflows;
  const toolRegistry = loadToolsRegistry().registries;
  const knowledgeRegistry = loadClinicalResourcesRegistry().assets;

  return selected.map((workflow) => {
    const deps = dependencyRegistry[workflow.name] ?? {
      tool_family_refs: [],
      knowledge_asset_refs: [],
      service_surface_refs: [],
    };
    const frontmatter = loadFrontmatterFor(workflow.source_path);
    const knowledgeSources = parseTopLevelList(frontmatter, "knowledge_sources");

    return {
      name: workflow.name,
      source_path: workflow.source_path,
      scope: workflow.scope,
      contract_ready: workflow.has_contract,
      required_context: {
        mandatory: workflow.mandatory,
        mandatory_one_of: workflow.mandatory_one_of,
      },
      tool_families: toolRegistry.filter((tool) => deps.tool_family_refs.includes(tool.name)),
      knowledge_assets: knowledgeRegistry.filter((asset) => deps.knowledge_asset_refs.includes(asset.name)),
      knowledge_sources_raw: knowledgeSources,
      service_surface_refs: deps.service_surface_refs,
      authoritative_surface: workflow.authoritative_surface,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , scopeArg, ...contextArgs] = process.argv;
  console.log(
    JSON.stringify(
      describeRoutingCandidates({
        scope: scopeArg || undefined,
        availableContext: contextArgs,
      }),
      null,
      2,
    ),
  );
}
