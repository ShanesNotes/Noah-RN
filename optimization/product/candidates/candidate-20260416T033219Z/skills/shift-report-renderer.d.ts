export interface RendererCandidate {
  name: string;
  source_path: string;
  tool_families: Array<{ name: string }>;
  knowledge_assets: Array<{ name: string }>;
  service_surface_refs: string[];
}

export interface RendererInput {
  candidate: RendererCandidate;
  patientId: string;
  context: unknown;
  laneCoverage?: Record<string, string>;
}

export function pickDisclaimer(seed?: string): string;
export function buildProvenanceFooter(skillName: string, skillVersion: string, primarySource: string): string;
export function formatContextSBAR(context: unknown): string;
export function formatNarrativeOutput(candidate: RendererCandidate, rawInput: string): string;
export function buildShiftReportRendererInput(
  candidate: RendererCandidate,
  patientId: string,
  context: unknown,
  options?: { laneCoverage?: Record<string, string> },
): RendererInput;
export function renderShiftReportFromPatientContext(input: RendererInput): string;
export function formatPatientIdOutput(
  candidate: RendererCandidate,
  patientId: string,
  context: unknown,
  options?: { laneCoverage?: Record<string, string> },
): string;
export function renderNarrativeDryRunOutput(summary: Record<string, unknown>): string;
export function renderPatientContextDryRunOutput(summary: Record<string, unknown>): string;
