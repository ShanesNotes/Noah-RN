import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const clinicalResourcesRegistryPath = resolve(repoRoot, "clinical-resources", "registry.json");

export function loadClinicalResourcesRegistry() {
  return JSON.parse(readFileSync(clinicalResourcesRegistryPath, "utf8"));
}

export function listClinicalResources() {
  const registry = loadClinicalResourcesRegistry();
  return registry.assets.map((asset) => {
    const absolutePath = resolve(repoRoot, asset.source_path);
    return {
      name: asset.name,
      kind: asset.kind,
      source_path: asset.source_path,
      exists: existsSync(absolutePath),
      authoritative_surface: registry.authoritative_surface,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(listClinicalResources(), null, 2));
}
