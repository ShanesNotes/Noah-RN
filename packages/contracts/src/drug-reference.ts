// Drug reference entry shape. Mirrors
// clinical-resources/drug-reference/schema.json. Consumed by Product A
// workflows (five-rights verification, titration decision-support) and by
// Product B's lookup_drug MCP tool. Subordinate resource lane — owned by
// clinical-resources/, exposed to agents via clinical-mcp.

export type DrugControlledSubstance =
  | 'none'
  | 'schedule-II'
  | 'schedule-III'
  | 'schedule-IV'
  | 'schedule-V';

export type DrugRoute =
  | 'PO'
  | 'SL'
  | 'IV push'
  | 'IV infusion'
  | 'IV piggyback'
  | 'IM'
  | 'SQ'
  | 'PR'
  | 'inhaled'
  | 'topical'
  | 'nasal'
  | 'buccal';

export type DrugConfidenceTier =
  | 'tier-1-national-guideline'
  | 'tier-2-established-reference'
  | 'tier-3-consensus';

export interface DrugReferenceProvenance {
  source: string;
  last_reviewed: string;
  confidence_tier: DrugConfidenceTier;
  note?: string;
}

export interface DrugReferenceEntry {
  generic_name: string;
  brand_names?: string[];
  drug_class: string[];
  controlled_substance?: DrugControlledSubstance;
  high_alert: boolean;
  high_alert_reason?: string;
  routes: DrugRoute[];
  adult_dose: string;
  pediatric_dose?: string;
  renal_adjustment?: string;
  hepatic_adjustment?: string;
  max_dose?: string;
  indications?: string[];
  contraindications?: string[];
  key_monitoring?: string[];
  lasa_pairs?: string[];
  iv_incompatibilities?: string[];
  provenance: DrugReferenceProvenance;
}

export interface DrugLookupArgs {
  query: string;
}

export interface DrugLookupResult {
  query: string;
  matches: DrugReferenceEntry[];
  staleness_warnings: string[];
}
