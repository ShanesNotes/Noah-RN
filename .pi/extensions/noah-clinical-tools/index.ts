/**
 * noah-clinical-tools extension scaffold
 *
 * This is intentionally non-functional.
 * It documents the future deterministic-tools registration surface.
 */

export interface NoahClinicalToolsExtensionContext {
  toolSources: string[];
  status: "scaffold";
}

export function describeNoahClinicalToolsExtension(): NoahClinicalToolsExtensionContext {
  return {
    toolSources: [
      "tools/clinical-calculators/",
      "tools/drug-lookup/",
      "tools/unit-conversions/",
      "tools/trace/",
      "tools/safety-hooks/",
    ],
    status: "scaffold",
  };
}

export default function noahClinicalToolsExtension() {
  return describeNoahClinicalToolsExtension();
}
