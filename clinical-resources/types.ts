import drugRangesJson from "./drug-ranges.json";
import mimicMappingsJson from "./mimic-mappings.json";

export interface DrugRangeMeta {
  source: string;
  version: string;
  date: string;
  last_verified: string;
}

export interface DrugDoseRange {
  unit: string;
  typical_min: number;
  typical_max: number;
  plausible_max: number;
}

export interface DrugRangeEntry {
  alert: string;
  class: string;
  dose?: DrugDoseRange;
}

export interface DrugRangesCatalog {
  _meta: DrugRangeMeta;
  [medicationName: string]: DrugRangeMeta | DrugRangeEntry;
}

export interface MimicMappingReference {
  name: string;
  url: string;
}

export interface MimicMappingProvenance {
  source: string;
  version: string;
  date: string;
  last_verified: string;
  scope: string;
  references: MimicMappingReference[];
  compatibility_notes: string[];
}

export interface MimicMappingEntry {
  loinc: string;
  name: string;
  category?: string;
  aliases?: string[];
}

export interface MimicMappingsCatalog {
  provenance: MimicMappingProvenance;
  item_id_to_loinc: Record<string, MimicMappingEntry>;
}

export const drugRanges: DrugRangesCatalog = drugRangesJson;
export const mimicMappings: MimicMappingsCatalog = mimicMappingsJson;
