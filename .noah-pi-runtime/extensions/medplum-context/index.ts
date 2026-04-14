/**
 * medplum-context extension scaffold
 *
 * This is intentionally non-functional.
 * It documents the future patient-context integration surface.
 */

export interface MedplumContextExtensionContext {
  serviceSurface: string;
  primaryTool: string;
  status: "scaffold";
}

export function describeMedplumContextExtension(): MedplumContextExtensionContext {
  return {
    serviceSurface: "services/clinical-mcp/",
    primaryTool: "get_patient_context",
    status: "scaffold",
  };
}

export default function medplumContextExtension() {
  return describeMedplumContextExtension();
}
