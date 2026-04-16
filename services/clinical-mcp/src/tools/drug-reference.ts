// Drug reference lookup (clinical-MCP contract v1 — lookup_drug).
//
// Loads drug entries from the clinical-resources/drug-reference/drugs/
// directory on first call, caches in memory, and answers fuzzy lookups by
// generic name, brand name, or drug class.
//
// The drug-reference lane is subordinate shared substrate: this loader is
// the Product B plumbing that exposes it to agents. The content and schema
// are owned by clinical-resources/; this file only queries them.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DrugLookupResult, DrugReferenceEntry } from '@noah-rn/contracts/drug-reference';

const __dirname = dirname(fileURLToPath(import.meta.url));

// services/clinical-mcp/src/tools/ -> repo root -> clinical-resources/drug-reference/drugs/
const DEFAULT_DRUGS_DIR = resolve(__dirname, '..', '..', '..', '..', 'clinical-resources', 'drug-reference', 'drugs');

let cachedEntries: DrugReferenceEntry[] | null = null;
let cachedDrugsDir: string | null = null;

export function __resetDrugReferenceCacheForTests(): void {
  cachedEntries = null;
  cachedDrugsDir = null;
}

function loadDrugEntries(drugsDir: string): DrugReferenceEntry[] {
  if (cachedEntries && cachedDrugsDir === drugsDir) return cachedEntries;

  const entries: DrugReferenceEntry[] = [];
  let dirStat;
  try {
    dirStat = statSync(drugsDir);
  } catch {
    cachedEntries = [];
    cachedDrugsDir = drugsDir;
    return cachedEntries;
  }
  if (!dirStat.isDirectory()) {
    cachedEntries = [];
    cachedDrugsDir = drugsDir;
    return cachedEntries;
  }

  for (const filename of readdirSync(drugsDir)) {
    if (!filename.endsWith('.json')) continue;
    const filepath = join(drugsDir, filename);
    try {
      const raw = readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(raw) as DrugReferenceEntry;
      if (typeof parsed.generic_name === 'string' && Array.isArray(parsed.drug_class)) {
        entries.push(parsed);
      }
    } catch {
      // Skip malformed entries silently; the lookup tool should not crash
      // on a single bad JSON file. Consider adding a warning surface in a
      // later phase.
    }
  }

  cachedEntries = entries;
  cachedDrugsDir = drugsDir;
  return entries;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function matches(entry: DrugReferenceEntry, query: string): boolean {
  const q = normalize(query);
  if (q.length === 0) return false;
  if (normalize(entry.generic_name).includes(q)) return true;
  if (entry.brand_names?.some((b) => normalize(b).includes(q))) return true;
  if (entry.drug_class.some((c) => normalize(c).includes(q))) return true;
  return false;
}

function stalenessWarningsFor(entries: DrugReferenceEntry[], nowMs: number): string[] {
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
  const warnings: string[] = [];
  for (const entry of entries) {
    const reviewed = Date.parse(entry.provenance.last_reviewed);
    if (Number.isNaN(reviewed)) continue;
    if (nowMs - reviewed > twelveMonthsMs) {
      warnings.push(`${entry.generic_name}: last reviewed ${entry.provenance.last_reviewed} — exceeds 12-month freshness window; verify against current Lexicomp or FDA label.`);
    }
  }
  return warnings;
}

export interface LookupDrugOptions {
  drugsDir?: string;
  nowMs?: number;
}

export function lookupDrug(query: string, options: LookupDrugOptions = {}): DrugLookupResult {
  const drugsDir = options.drugsDir ?? DEFAULT_DRUGS_DIR;
  const entries = loadDrugEntries(drugsDir);
  const matched = entries.filter((entry) => matches(entry, query));
  return {
    query,
    matches: matched,
    staleness_warnings: stalenessWarningsFor(matched, options.nowMs ?? Date.now()),
  };
}
