import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const workflowRegistryPath = resolve(repoRoot, "packages", "workflows", "registry.json");

function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

export function loadWorkflowRegistry() {
  return JSON.parse(readFileSync(workflowRegistryPath, "utf8"));
}

export function listSkills() {
  const registry = loadWorkflowRegistry();
  return registry.skills.map((skill) => {
    const absolutePath = resolve(repoRoot, skill.source_path);
    const exists = existsSync(absolutePath);
    const frontmatter = exists ? extractFrontmatter(readFileSync(absolutePath, "utf8")) : "";

    return {
      name: skill.name,
      source_path: skill.source_path,
      scope: skill.scope,
      exists,
      has_contract: /^contract:/m.test(frontmatter),
      authoritative_surface: registry.authoritative_surface,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(listSkills(), null, 2));
}
