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

// Compact clinical abbreviations for token-efficient context bundles
// SQL-on-FHIR-style projection: ~60-80% token savings on verbose LOINC display names
const COMPACT_NAMES: Record<string, string> = {
  'Heart rate': 'HR',
  'Heart Rate': 'HR',
  'Respiratory rate': 'RR',
  'Respiratory Rate': 'RR',
  'Body temperature': 'Temp',
  'Body Temperature': 'Temp',
  'Systolic blood pressure': 'SBP',
  'Diastolic blood pressure': 'DBP',
  'Blood pressure systolic': 'SBP',
  'Blood pressure diastolic': 'DBP',
  'Body weight': 'Wt',
  'Body Weight': 'Wt',
  'Body height': 'Ht',
  'Body Height': 'Ht',
  'Oxygen saturation': 'SpO2',
  'Oxygen saturation in Arterial blood by Pulse oximetry': 'SpO2',
  'Mean blood pressure': 'MAP',
  'Mean Arterial Pressure': 'MAP',
  'Potassium [Moles/volume] in Serum or Plasma': 'K+',
  'Sodium [Moles/volume] in Serum or Plasma': 'Na+',
  'Creatinine [Mass/volume] in Serum or Plasma': 'Cr',
  'Glucose [Mass/volume] in Blood': 'Gluc',
  'Hemoglobin [Mass/volume] in Blood': 'Hgb',
  'Hematocrit [Volume Fraction] of Blood': 'Hct',
  'Leukocytes [#/volume] in Blood by Automated count': 'WBC',
  'Platelets [#/volume] in Blood by Automated count': 'Plt',
  'Lactate [Moles/volume] in Blood': 'Lactate',
  'Carbon dioxide, total [Moles/volume] in Serum or Plasma': 'CO2',
  'Calcium [Mass/volume] in Serum or Plasma': 'Ca',
  'Chloride [Moles/volume] in Serum or Plasma': 'Cl',
  'Urea nitrogen [Mass/volume] in Serum or Plasma': 'BUN',
  'pH of Arterial blood': 'ABG pH',
  'Weight-for-length Per age and sex': 'WFL %ile',
  'Head Occipital-frontal circumference Percentile': 'HC %ile',
  'Body mass index (BMI) [Ratio]': 'BMI',
};

export function compactDisplayName(display: string): string {
  return COMPACT_NAMES[display] ?? display;
}
