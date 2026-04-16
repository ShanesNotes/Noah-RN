// Tool input/output shapes for the clinical-MCP contract v1 surface.
// The types here are the cross-product contracts — Product A (harness) and
// Product B (nursing EHR) both import them from this package so neither
// reaches into the other's code for types.

import type { PatientContextBundle } from './context-bundle.js';

// ---------- render_shift_report (Product A harness tool) ----------

export interface RenderShiftReportArgs {
  patientId: string;
  context: unknown;
  laneCoverage?: Record<string, string>;
}

export interface RenderShiftReportResult {
  markdown: string;
}

// ---------- get_patient_context (Product B read tool) ----------

export interface GetPatientContextArgs {
  patient_id: string;
  context_budget?: number;
}

export type GetPatientContextResult = PatientContextBundle;

// ---------- Draft write inputs (Contract 5 draft-review lifecycle) ----------

export interface DraftTaskWriteInput {
  patientId: string;
  encounterId?: string;
  description: string;
  executionId?: string;
  focusReference?: string;
  ownerDisplay?: string;
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  taskCode?: string;
}

export interface DraftDocumentWriteInput {
  patientId: string;
  encounterId?: string;
  taskId?: string;
  executionId?: string;
  reportMarkdown: string;
  artifactCode?: string;
  artifactDisplay?: string;
  workflowCode?: string;
}

export interface DraftMedicationAdministrationWriteInput {
  patientId: string;
  encounterId?: string;
  medicationName: string;
  executionId?: string;
  medicationRequestId?: string;
  note?: string;
}
