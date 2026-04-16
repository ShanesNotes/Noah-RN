// MAR read path (Product B — Agent-Native Nursing EHR).
//
// Assembles a medication-list view from MedicationRequest (active orders) +
// MedicationAdministration (recent and historical events). Produces the
// MedicationListView shape specified by clinical-MCP contract v1's
// get_medication_list tool. Planned surface per Phase 4 of the three-product
// alignment plan.
//
// High-alert flagging is coarse today (intentional for v1): a small inline
// table marks the pressors, insulin, heparin, opioids, and sedatives as
// ISMP-high-alert. Phase 5 replaces this with drug-reference-backed lookup
// via @noah-rn/contracts/drug-reference-client.

import {
  getMedicationRequests,
  getMedicationAdministrations,
} from '../fhir/client.js';
import type {
  MedicationRequest,
  MedicationAdministration,
} from '../fhir/types.js';

export interface MedicationListEntry {
  medicationRequestId: string;
  medicationName: string;
  medicationReference?: string;
  dosageText?: string;
  route?: string;
  frequency?: string;
  state: 'scheduled' | 'overdue' | 'prn' | 'held';
  nextDueAt?: string;
  lastAdministeredAt?: string;
  highAlert: boolean;
  highAlertReason?: string;
}

export interface MedicationListRecentAdministration {
  id: string;
  medicationName: string;
  effectiveDateTime?: string;
  status: string;
  performerDisplay?: string;
  dosageText?: string;
  reviewState: 'final' | 'draft-proposal' | 'pending-review';
}

export interface MedicationListView {
  patientId: string;
  encounterId?: string;
  assembledAt: string;
  active: MedicationListEntry[];
  recentAdministrations: MedicationListRecentAdministration[];
}

export interface GetMedicationListOptions {
  filter?: { status?: 'active' | 'held' | 'all' };
  nowMs?: number;
  recentWindowMs?: number;
}

// Inline v1 high-alert table. Phase 5 replaces with drug-reference lookup.
const HIGH_ALERT_KEYWORDS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /norepinephrine|levophed/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /epinephrine/i, reason: 'Adrenergic agonist (ISMP high-alert).' },
  { pattern: /vasopressin/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /dopamine|dobutamine/i, reason: 'Adrenergic (ISMP high-alert).' },
  { pattern: /phenylephrine/i, reason: 'Vasopressor (ISMP high-alert).' },
  { pattern: /insulin/i, reason: 'Insulin (ISMP high-alert).' },
  { pattern: /heparin|enoxaparin|warfarin/i, reason: 'Anticoagulant (ISMP high-alert).' },
  { pattern: /morphine|fentanyl|hydromorphone|oxycodone/i, reason: 'Opioid (ISMP high-alert).' },
  { pattern: /midazolam|propofol|ketamine/i, reason: 'Sedative (ISMP high-alert).' },
  { pattern: /potassium chloride|kcl/i, reason: 'Concentrated electrolyte (ISMP high-alert).' },
];

function highAlertFlag(medicationName: string): { highAlert: boolean; highAlertReason?: string } {
  for (const entry of HIGH_ALERT_KEYWORDS) {
    if (entry.pattern.test(medicationName)) {
      return { highAlert: true, highAlertReason: entry.reason };
    }
  }
  return { highAlert: false };
}

function extractMedicationName(req: MedicationRequest): string {
  return (
    req.medicationCodeableConcept?.text
    ?? req.medicationCodeableConcept?.coding?.[0]?.display
    ?? req.medicationReference?.display
    ?? 'Unknown medication'
  );
}

function extractDosageText(req: MedicationRequest): string | undefined {
  return req.dosageInstruction?.[0]?.text;
}

function extractRoute(req: MedicationRequest): string | undefined {
  const route = req.dosageInstruction?.[0]?.route;
  return route?.text ?? route?.coding?.[0]?.display;
}

function isHeld(req: MedicationRequest): boolean {
  return (req.status ?? '').toLowerCase() === 'on-hold';
}

function isActive(req: MedicationRequest): boolean {
  const status = (req.status ?? '').toLowerCase();
  return status === 'active' || status === 'draft';
}

function isPrn(_req: MedicationRequest): boolean {
  // MedicationRequest.dosageInstruction[0].asNeededBoolean is the FHIR-canonical flag.
  // The minimal FHIR type defined in this repo omits it; default to false and revisit
  // when the type expands in a later phase.
  return false;
}

function mostRecentAdminFor(
  req: MedicationRequest,
  administrations: MedicationAdministration[],
): MedicationAdministration | undefined {
  return administrations
    .filter((admin) => admin.request?.reference === `MedicationRequest/${req.id}`)
    .filter((admin) => (admin.status ?? '').toLowerCase() === 'completed')
    .sort((a, b) => (b.effectiveDateTime ?? '').localeCompare(a.effectiveDateTime ?? ''))[0];
}

function reviewStateFor(admin: MedicationAdministration): 'final' | 'draft-proposal' | 'pending-review' {
  if (admin.statusReason?.coding?.some((c) => c.code === 'draft-proposal')) {
    return 'draft-proposal';
  }
  if (admin.extension?.some((e) => e.url?.includes('review-state') && e.valueCode === 'pending-review')) {
    return 'pending-review';
  }
  return 'final';
}

function performerDisplay(admin: MedicationAdministration): string | undefined {
  return admin.performer?.[0]?.actor?.display ?? admin.performer?.[0]?.actor?.reference;
}

export async function getMedicationList(
  patientId: string,
  options: GetMedicationListOptions = {},
): Promise<MedicationListView> {
  const filter = options.filter?.status ?? 'active';
  const nowIso = new Date(options.nowMs ?? Date.now()).toISOString();
  const recentWindowMs = options.recentWindowMs ?? 24 * 60 * 60 * 1000;
  const recentCutoff = (options.nowMs ?? Date.now()) - recentWindowMs;

  const [requestsResult, adminsResult] = await Promise.all([
    getMedicationRequests(patientId),
    getMedicationAdministrations(patientId),
  ]);

  if (requestsResult.error) {
    throw new Error(`getMedicationList: MedicationRequest fetch failed: ${requestsResult.error}`);
  }
  const requests = requestsResult.data ?? [];
  const administrations = adminsResult.data ?? [];

  const active: MedicationListEntry[] = [];
  for (const req of requests) {
    if (!req.id) continue;
    if (filter === 'active' && !isActive(req) && !isHeld(req)) continue;
    if (filter === 'held' && !isHeld(req)) continue;

    const medicationName = extractMedicationName(req);
    const { highAlert, highAlertReason } = highAlertFlag(medicationName);
    const latestAdmin = mostRecentAdminFor(req, administrations);

    let state: MedicationListEntry['state'] = 'scheduled';
    if (isHeld(req)) state = 'held';
    else if (isPrn(req)) state = 'prn';

    active.push({
      medicationRequestId: req.id,
      medicationName,
      medicationReference: req.medicationReference?.reference,
      dosageText: extractDosageText(req),
      route: extractRoute(req),
      frequency: req.dosageInstruction?.[0]?.text,
      state,
      lastAdministeredAt: latestAdmin?.effectiveDateTime,
      highAlert,
      highAlertReason,
    });
  }

  const recentAdministrations: MedicationListRecentAdministration[] = administrations
    .filter((admin) => {
      const t = admin.effectiveDateTime ?? admin.effectivePeriod?.start;
      if (!t) return false;
      return new Date(t).getTime() >= recentCutoff;
    })
    .map((admin) => ({
      id: admin.id ?? '',
      medicationName:
        admin.medicationCodeableConcept?.text
        ?? admin.medicationCodeableConcept?.coding?.[0]?.display
        ?? admin.medicationReference?.display
        ?? 'Unknown medication',
      effectiveDateTime: admin.effectiveDateTime,
      status: admin.status ?? 'unknown',
      performerDisplay: performerDisplay(admin),
      dosageText: admin.dosage?.text,
      reviewState: reviewStateFor(admin),
    }));

  return {
    patientId,
    assembledAt: nowIso,
    active,
    recentAdministrations,
  };
}
