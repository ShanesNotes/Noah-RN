import { loadMimicMappings, type MimicMappings } from '../config.js';

// Inverted index: LOINC code (or alias) → itemID[]
// O(1) lookup instead of O(n) linear scan per query
let invertedIndex: Map<string, string[]> | null = null;
let mappings: MimicMappings | null = null;

export function getLoincIndex(): Map<string, string[]> {
  if (invertedIndex) return invertedIndex;

  mappings = loadMimicMappings();
  invertedIndex = new Map();

  for (const [itemId, entry] of Object.entries(mappings.item_id_to_loinc)) {
    // Primary LOINC code → itemID
    const primary = entry.loinc;
    if (!invertedIndex.has(primary)) {
      invertedIndex.set(primary, []);
    }
    invertedIndex.get(primary)!.push(itemId);

    // Aliases → same itemID
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        if (!invertedIndex.has(alias)) {
          invertedIndex.set(alias, []);
        }
        invertedIndex.get(alias)!.push(itemId);
      }
    }
  }

  return invertedIndex;
}

// Translate LOINC codes to MIMIC itemIDs for FHIR queries
export function loincToItemIds(loincCodes: string[]): string[] {
  const index = getLoincIndex();
  const itemIds: string[] = [];

  for (const code of loincCodes) {
    const ids = index.get(code);
    if (ids) {
      itemIds.push(...ids);
    }
  }

  return [...new Set(itemIds)]; // deduplicate
}

// Get human-readable name for a LOINC code
export function getLoincName(loincCode: string): string | undefined {
  const index = getLoincIndex(); // ensures mappings is populated
  const itemIds = index.get(loincCode);
  if (!itemIds?.length || !mappings) return undefined;
  return mappings.item_id_to_loinc[itemIds[0]]?.name;
}

// Get all mapped LOINC codes
export function getAllMappedLoinc(): string[] {
  const index = getLoincIndex();
  return [...index.keys()];
}
