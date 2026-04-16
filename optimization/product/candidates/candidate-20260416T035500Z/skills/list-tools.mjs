import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const toolsRegistryPath = resolve(repoRoot, "tools", "registry.json");

export function loadToolsRegistry() {
  return JSON.parse(readFileSync(toolsRegistryPath, "utf8"));
}

export function listTools() {
  const registry = loadToolsRegistry();
  return registry.registries.map((tool) => {
    const absolutePath = resolve(repoRoot, tool.source_path);
    return {
      name: tool.name,
      kind: tool.kind,
      source_path: tool.source_path,
      exists: existsSync(absolutePath),
      authoritative_surface: registry.authoritative_surface,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(listTools(), null, 2));
}
