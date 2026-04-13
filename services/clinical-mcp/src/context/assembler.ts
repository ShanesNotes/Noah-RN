import { config } from '../config.js';
import {
  getPatient,
  getObservations,
  getConditions,
  getMedicationRequests,
  getMedicationAdministrations,
  getEncounters,
  getDocumentReferences,
  getDevices,
} from '../fhir/client.js';
import { compactDisplayName } from '../fhir/loinc-map.js';
import type { Device, Observation } from '../fhir/types.js';
import type { PatientContext, TimelineEntry, ObservationEntry } from './types.js';
import {
  computeRelativeMinutes, formatRelativeTime, findMostRecentTimestamp,
  sortTimeline, classifyObservation, computeTrends,
} from './temporal.js';

export async function assemblePatientContext(
  patientId: string,
  contextBudget?: number,
): Promise<PatientContext> {
  const budget = contextBudget ?? config.context.defaultBudgetTokens;
  const sources: string[] = [];
  const gaps: string[] = [];

  // Query all resources in parallel
  const [
    patientResult,
    vitalsResult,
    labsResult,
    conditionsResult,
    medsResult,
    medAdminsResult,
    encountersResult,
    documentReferencesResult,
    devicesResult,
  ] = await Promise.all([
    getPatient(patientId),
    getObservations(patientId, { category: 'vital-signs' }),
    getObservations(patientId, { category: 'laboratory' }),
    getConditions(patientId),
    getMedicationRequests(patientId),
    getMedicationAdministrations(patientId),
    getEncounters(patientId),
    getDocumentReferences(patientId),
    getDevices(patientId),
  ]);

  sources.push(
    'Patient',
    'Observation(vital-signs)',
    'Observation(laboratory)',
    'Condition',
    'MedicationRequest',
    'MedicationAdministration',
    'Encounter',
    'DocumentReference',
    'Device',
  );

  // Patient demographics
  if (patientResult.error || !patientResult.data) {
    throw new Error(`Failed to load patient ${patientId}: ${patientResult.error}`);
  }
  const p = patientResult.data;
  const nameEntry = p.name?.[0];
  const patientInfo = {
    id: p.id ?? patientId,
    name: nameEntry?.text ?? [nameEntry?.given?.join(' '), nameEntry?.family].filter(Boolean).join(' ') ?? 'Unknown',
    dob: p.birthDate ?? 'Unknown',
    gender: p.gender ?? 'Unknown',
  };

  // Report FHIR query failures in gaps
  if (vitalsResult.error) gaps.push(`Vital signs query failed: ${vitalsResult.error}`);
  if (labsResult.error) gaps.push(`Lab results query failed: ${labsResult.error}`);
  if (conditionsResult.error) gaps.push(`Conditions query failed: ${conditionsResult.error}`);
  if (medsResult.error) gaps.push(`Medications query failed: ${medsResult.error}`);
  if (medAdminsResult.error) gaps.push(`Medication administration query failed: ${medAdminsResult.error}`);
  if (encountersResult.error) gaps.push(`Encounters query failed: ${encountersResult.error}`);
  if (documentReferencesResult.error) gaps.push(`Provider notes query failed: ${documentReferencesResult.error}`);
  if (devicesResult.error) gaps.push(`Devices query failed: ${devicesResult.error}`);

  // Collect all timestamps to find reference point
  const allTimestamps: string[] = [];
  const vitals = (vitalsResult.data ?? []).map(compactObservationLabels);
  const labs = (labsResult.data ?? []).map(compactObservationLabels);
  const conditions = conditionsResult.data ?? [];
  const meds = medsResult.data ?? [];
  const medicationAdministrations = medAdminsResult.data ?? [];
  const encounters = encountersResult.data ?? [];
  const documentReferences = documentReferencesResult.data ?? [];
  const devices = devicesResult.data ?? [];

  for (const v of vitals) if (v.effectiveDateTime) allTimestamps.push(v.effectiveDateTime);
  for (const l of labs) if (l.effectiveDateTime) allTimestamps.push(l.effectiveDateTime);
  for (const c of conditions) if (c.recordedDate) allTimestamps.push(c.recordedDate);
  for (const m of meds) if (m.authoredOn) allTimestamps.push(m.authoredOn);
  for (const admin of medicationAdministrations) {
    const ts = admin.effectiveDateTime ?? admin.effectivePeriod?.start;
    if (ts) allTimestamps.push(ts);
  }
  for (const e of encounters) if (e.period?.start) allTimestamps.push(e.period.start);
  for (const doc of documentReferences) {
    const ts = getDocumentReferenceTimestamp(doc);
    if (ts) allTimestamps.push(ts);
  }

  const referenceTimestamp = findMostRecentTimestamp(allTimestamps);

  // Build timeline entries
  const timeline: TimelineEntry[] = [];

  // Observations (vitals + labs)
  const allObs: ObservationEntry[] = [];
  for (const obs of [...vitals, ...labs]) {
    const ts = obs.effectiveDateTime ?? '';
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    const entry: ObservationEntry = {
      type: 'observation',
      subtype: classifyObservation(obs),
      resource: obs,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    };
    allObs.push(entry);
    timeline.push(entry);
  }

  // Conditions
  for (const cond of conditions) {
    const ts = cond.recordedDate ?? cond.onsetDateTime ?? '';
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    timeline.push({
      type: 'condition',
      resource: cond,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    });
  }

  // Medications
  for (const med of meds) {
    const ts = med.authoredOn ?? '';
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    timeline.push({
      type: 'medication',
      resource: med,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    });
  }

  // Medication administrations / MAR
  for (const admin of medicationAdministrations) {
    const ts = admin.effectiveDateTime ?? admin.effectivePeriod?.start ?? '';
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    timeline.push({
      type: 'medicationAdministration',
      resource: admin,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    });
  }

  // Encounters
  for (const enc of encounters) {
    const ts = enc.period?.start ?? '';
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    timeline.push({
      type: 'encounter',
      resource: enc,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    });
  }

  // Provider notes
  for (const doc of documentReferences) {
    const ts = getDocumentReferenceTimestamp(doc);
    if (!ts) continue;
    const relMin = computeRelativeMinutes(ts, referenceTimestamp);
    timeline.push({
      type: 'note',
      resource: doc,
      timestamp: ts,
      relativeTime: formatRelativeTime(relMin),
      relativeMinutes: relMin,
    });
  }

  // Devices (Lines/Access — IV lines, central lines, airway devices)
  for (const dev of devices) {
    const ts = getDeviceTimestamp(dev);
    const relMin = ts ? computeRelativeMinutes(ts, referenceTimestamp) : Number.MAX_SAFE_INTEGER;
    timeline.push({
      type: 'device',
      resource: dev,
      timestamp: ts,
      relativeTime: ts ? formatRelativeTime(relMin) : 'T-unknown',
      relativeMinutes: relMin,
    });
  }

  // Sort by relative time (most recent first)
  const sorted = sortTimeline(timeline);

  // Compute trends for all LOINC codes with 3+ data points
  const trends = computeTrends(allObs);

  // Document observed read-path gaps
  if (!vitals.length) gaps.push('No vital signs found');
  if (!labs.length) gaps.push('No laboratory results found');
  if (!conditions.length) gaps.push('No conditions found');
  if (!meds.length) gaps.push('No medication requests found');
  if (!medicationAdministrations.length) gaps.push('No medication administration history found');
  if (!documentReferences.length) gaps.push('No provider notes found');
  if (!devices.length) gaps.push('[GAP: Lines/Access] No device data (IV lines, central lines, airway) found');

  // Apply context budget — 72h priority window protects recent entries from truncation
  const PRIORITY_WINDOW_MINUTES = 72 * 60; // 72 hours
  let truncated = sorted;
  let budgetTruncated = false;
  let truncatedCount = 0;
  const estimateTokens = (entries: TimelineEntry[]) =>
    Math.round(JSON.stringify(entries).length * config.context.tokenCharRatio);

  while (truncated.length > 10 && estimateTokens(truncated) > budget) {
    // Find the oldest entry outside the 72h priority window to drop
    const dropIdx = findOldestOutsidePriorityWindow(truncated, PRIORITY_WINDOW_MINUTES);
    if (dropIdx === -1) {
      // All remaining entries are within 72h — drop from the end as last resort
      truncated = truncated.slice(0, -1);
    } else {
      truncated = [...truncated.slice(0, dropIdx), ...truncated.slice(dropIdx + 1)];
    }
    budgetTruncated = true;
    truncatedCount++;
  }

  if (budgetTruncated) {
    gaps.push(`Context budget: ${truncatedCount} entries truncated to fit ~${budget} tokens (72h priority window active)`);
  }

  const tokenEstimate = estimateTokens(truncated);

  return {
    patient: patientInfo,
    timeline: truncated,
    trends,
    gaps,
    assembledAt: new Date().toISOString(),
    sources,
    tokenEstimate,
    budgetTruncated,
    truncatedCount,
  };
}

function getDocumentReferenceTimestamp(doc: { date?: string; content?: Array<{ attachment?: { creation?: string } }> }): string {
  return doc.date ?? doc.content?.[0]?.attachment?.creation ?? '';
}

function getDeviceTimestamp(device: Device): string {
  return device.meta?.lastUpdated ?? '';
}

function findOldestOutsidePriorityWindow(entries: TimelineEntry[], windowMinutes: number): number {
  // Search from the end (oldest) for the first entry outside the priority window
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].relativeMinutes > windowMinutes) {
      return i;
    }
  }
  return -1; // all entries within window
}

function compactObservationLabels(observation: Observation): Observation {
  const compactCode = compactCodeableConcept(observation.code);
  const compactComponents = observation.component?.map((component) => ({
    ...component,
    code: compactCodeableConcept(component.code),
  }));

  return {
    ...observation,
    code: compactCode,
    component: compactComponents,
  };
}

function compactCodeableConcept<T extends { text?: string; coding?: Array<{ display?: string }> }>(concept: T): T {
  return {
    ...concept,
    ...(concept.text ? { text: compactDisplayName(concept.text) } : {}),
    coding: concept.coding?.map((coding) => ({
      ...coding,
      ...(coding.display ? { display: compactDisplayName(coding.display) } : {}),
    })),
  };
}
