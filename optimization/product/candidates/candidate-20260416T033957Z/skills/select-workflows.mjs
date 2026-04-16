import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills } from "./list-skills.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function parseListBlock(frontmatter, parentKey, childKey) {
  const pattern = new RegExp(`${parentKey}:\\n(?:.*\\n)*?\\s{2}${childKey}:\\n((?:\\s{4}- .*\\n?)*)`, "m");
  const match = frontmatter.match(pattern);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function loadWorkflowMetadata(sourcePath) {
  const absolutePath = resolve(repoRoot, sourcePath);
  const frontmatter = extractFrontmatter(readFileSync(absolutePath, "utf8"));
  return {
    mandatory: parseListBlock(frontmatter, "required_context", "mandatory"),
    mandatoryOneOf: parseListBlock(frontmatter, "required_context", "mandatory_one_of"),
    hasContract: /^contract:/m.test(frontmatter),
  };
}

export function selectWorkflows({ scope, availableContext = [] } = {}) {
  const available = new Set(availableContext);

  return listSkills()
    .map((skill) => {
      const metadata = loadWorkflowMetadata(skill.source_path);
      const mandatorySatisfied = metadata.mandatory.every((item) => available.has(item));
      const oneOfSatisfied =
        metadata.mandatoryOneOf.length === 0 ||
        metadata.mandatoryOneOf.some((item) => available.has(item));
      const scopeMatch = !scope || skill.scope.includes(scope);

      return {
        ...skill,
        mandatory: metadata.mandatory,
        mandatory_one_of: metadata.mandatoryOneOf,
        mandatory_satisfied: mandatorySatisfied,
        mandatory_one_of_satisfied: oneOfSatisfied,
        scope_match: scopeMatch,
        selected: skill.has_contract && scopeMatch && mandatorySatisfied && oneOfSatisfied,
      };
    })
    .filter((skill) => skill.selected);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , scopeArg, ...contextArgs] = process.argv;
  console.log(
    JSON.stringify(
      selectWorkflows({
        scope: scopeArg || undefined,
        availableContext: contextArgs,
      }),
      null,
      2,
    ),
  );
}
