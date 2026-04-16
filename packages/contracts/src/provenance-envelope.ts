// FHIR Provenance envelope shape used by every write tool in the
// clinical-MCP contract v1. Author categories and source-layer values are
// closed sets (v1); additions require v1.minor + namespace.

export type ProvenanceSourceLayer =
  | 'L0-history'
  | 'L1-device-stream'
  | 'L2-events'
  | 'L3-original'
  | 'L4-obligation';

export type ProvenanceAuthorCategory = 'agent' | 'human' | 'device' | 'historical-seed';

export const PROVENANCE_AUTHOR_DISPLAY_CLOSED_SET = [
  'Noah RN Agent',
  'historical-seed',
  'device-auto',
] as const;

// Practitioner/{id} and Device/{deviceId} are also permitted as agent.who.display
// or agent.who.reference values; this closed set covers the non-reference forms.

export interface ProvenanceCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface ProvenanceCodeableConcept {
  coding?: ProvenanceCoding[];
  text?: string;
}

export interface ProvenanceAgent {
  type?: ProvenanceCodeableConcept;
  who?: { display?: string; reference?: string };
  onBehalfOf?: { display?: string; reference?: string };
}

export interface ProvenanceEntity {
  role?: string;
  what?: {
    identifier?: { system?: string; value?: string };
    reference?: string;
    display?: string;
  };
}

export interface ProvenanceEnvelope {
  resourceType: 'Provenance';
  id?: string;
  meta?: { tag?: ProvenanceCoding[] };
  identifier?: Array<{ system?: string; value?: string }>;
  target: Array<{ reference: string }>;
  recorded: string;
  occurredDateTime?: string;
  activity?: ProvenanceCodeableConcept;
  agent: ProvenanceAgent[];
  entity?: ProvenanceEntity[];
  policy?: string[];
}
