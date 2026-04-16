import type {
  AllergyIntolerance,
  Condition,
  DocumentReference,
  Encounter,
  MedicationRequest,
  Observation,
  Patient,
  Task,
} from '@medplum/fhirtypes';

export const SHELL_FIXTURE_PARAM = 'fixture';
export const SHELL_FIXTURE_VALUE = 'shell';
export const SHELL_FIXTURE_PATIENT_ID = 'patient-123';

export function isShellFixtureMode(search: string): boolean {
  return new URLSearchParams(search).get(SHELL_FIXTURE_PARAM) === SHELL_FIXTURE_VALUE;
}

export function withShellFixture(path: string, enabled: boolean): string {
  if (!enabled) {
    return path;
  }

  const url = new URL(path, 'http://fixture.local');
  url.searchParams.set(SHELL_FIXTURE_PARAM, SHELL_FIXTURE_VALUE);
  return `${url.pathname}${url.search}`;
}

export const shellFixturePatient: Patient = {
  resourceType: 'Patient',
  id: SHELL_FIXTURE_PATIENT_ID,
  name: [{ given: ['Casey'], family: 'Morgan' }],
  gender: 'female',
  birthDate: '1988-04-17',
  identifier: [{ system: 'urn:noah:mrn', value: 'MRN-100045' }],
};

export const shellFixtureAssignmentPatients = [
  {
    id: SHELL_FIXTURE_PATIENT_ID,
    name: 'Casey Morgan',
    unit: 'MICU 12',
    summary: 'Pressor support, draft handoff review pending.',
  },
  {
    id: 'patient-456',
    name: 'Jordan Lee',
    unit: 'SICU 04',
    summary: 'Agent is preparing vasopressor titration review.',
  },
  {
    id: 'patient-789',
    name: 'Alex Rivera',
    unit: 'ED Hold 03',
    summary: 'Escalation needed on overdue follow-up item.',
  },
];

export const shellFixtureEncounter: Encounter = {
  resourceType: 'Encounter',
  id: 'encounter-123',
  status: 'in-progress',
  class: {
    system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    code: 'IMP',
    display: 'inpatient encounter',
  },
  serviceType: { text: 'MICU' },
  location: [{ location: { display: 'MICU 12' } }],
  participant: [{ individual: { display: 'Dr. Patel' } }],
};

export const shellFixtureAllergies: AllergyIntolerance[] = [
  {
    resourceType: 'AllergyIntolerance',
    id: 'allergy-penicillin',
    patient: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    code: { text: 'Penicillin' },
  },
  {
    resourceType: 'AllergyIntolerance',
    id: 'allergy-latex',
    patient: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    code: { text: 'Latex' },
  },
];

export const shellFixtureVitals: Observation[] = [
  {
    resourceType: 'Observation',
    id: 'obs-hr-older',
    status: 'final',
    code: { text: 'Heart Rate', coding: [{ code: '8867-4', display: 'Heart Rate' }] },
    valueQuantity: { value: 96, unit: 'bpm' },
    effectiveDateTime: '2026-04-15T13:40:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-hr',
    status: 'final',
    code: { text: 'Heart Rate', coding: [{ code: '8867-4', display: 'Heart Rate' }] },
    valueQuantity: { value: 108, unit: 'bpm' },
    effectiveDateTime: '2026-04-15T14:15:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-bp',
    status: 'final',
    code: { text: 'Blood Pressure', coding: [{ code: '55284-4', display: 'Blood Pressure' }] },
    component: [
      { code: { coding: [{ code: '8480-6', display: 'Systolic' }] }, valueQuantity: { value: 96, unit: 'mmHg' } },
      { code: { coding: [{ code: '8462-4', display: 'Diastolic' }] }, valueQuantity: { value: 58, unit: 'mmHg' } },
    ],
    effectiveDateTime: '2026-04-15T14:12:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-bp-older',
    status: 'final',
    code: { text: 'Blood Pressure', coding: [{ code: '55284-4', display: 'Blood Pressure' }] },
    component: [
      { code: { coding: [{ code: '8480-6', display: 'Systolic' }] }, valueQuantity: { value: 104, unit: 'mmHg' } },
      { code: { coding: [{ code: '8462-4', display: 'Diastolic' }] }, valueQuantity: { value: 64, unit: 'mmHg' } },
    ],
    effectiveDateTime: '2026-04-15T13:35:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-spo2-older',
    status: 'final',
    code: { text: 'SpO2', coding: [{ code: '2708-6', display: 'SpO2' }] },
    valueQuantity: { value: 96, unit: '%' },
    effectiveDateTime: '2026-04-15T13:50:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-spo2',
    status: 'final',
    code: { text: 'SpO2', coding: [{ code: '2708-6', display: 'SpO2' }] },
    valueQuantity: { value: 93, unit: '%' },
    effectiveDateTime: '2026-04-15T14:10:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-rr',
    status: 'final',
    code: { text: 'Respiratory Rate', coding: [{ code: '9279-1', display: 'Respiratory Rate' }] },
    valueQuantity: { value: 24, unit: '/min' },
    effectiveDateTime: '2026-04-15T14:08:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'obs-rr-older',
    status: 'final',
    code: { text: 'Respiratory Rate', coding: [{ code: '9279-1', display: 'Respiratory Rate' }] },
    valueQuantity: { value: 20, unit: '/min' },
    effectiveDateTime: '2026-04-15T13:28:00Z',
  },
];

export const shellFixtureLabs: Observation[] = [
  {
    resourceType: 'Observation',
    id: 'lab-lactate-older',
    status: 'final',
    code: { text: 'Lactate' },
    valueQuantity: { value: 2.6, unit: 'mmol/L' },
    referenceRange: [{ low: { value: 0.5 }, high: { value: 2.0 } }],
    effectiveDateTime: '2026-04-15T12:45:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'lab-lactate',
    status: 'final',
    code: { text: 'Lactate' },
    valueQuantity: { value: 3.4, unit: 'mmol/L' },
    referenceRange: [{ low: { value: 0.5 }, high: { value: 2.0 } }],
    effectiveDateTime: '2026-04-15T13:45:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'lab-wbc-older',
    status: 'final',
    code: { text: 'WBC' },
    valueQuantity: { value: 14.4, unit: 'K/uL' },
    referenceRange: [{ low: { value: 4.0 }, high: { value: 11.0 } }],
    effectiveDateTime: '2026-04-15T12:30:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'lab-wbc',
    status: 'final',
    code: { text: 'WBC' },
    valueQuantity: { value: 16.8, unit: 'K/uL' },
    referenceRange: [{ low: { value: 4.0 }, high: { value: 11.0 } }],
    effectiveDateTime: '2026-04-15T13:30:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'lab-creatinine',
    status: 'final',
    code: { text: 'Creatinine' },
    valueQuantity: { value: 2.1, unit: 'mg/dL' },
    referenceRange: [{ low: { value: 0.6 }, high: { value: 1.2 } }],
    effectiveDateTime: '2026-04-15T13:10:00Z',
  },
  {
    resourceType: 'Observation',
    id: 'lab-creatinine-older',
    status: 'final',
    code: { text: 'Creatinine' },
    valueQuantity: { value: 1.7, unit: 'mg/dL' },
    referenceRange: [{ low: { value: 0.6 }, high: { value: 1.2 } }],
    effectiveDateTime: '2026-04-15T12:05:00Z',
  },
];

export const shellFixtureMedications: MedicationRequest[] = [
  {
    resourceType: 'MedicationRequest',
    id: 'med-norepi',
    status: 'active',
    intent: 'order',
    subject: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    medicationCodeableConcept: { text: 'Norepinephrine infusion' },
    dosageInstruction: [{ text: '0.08 mcg/kg/min IV titrate to MAP > 65' }],
    authoredOn: '2026-04-15T12:20:00Z',
  },
  {
    resourceType: 'MedicationRequest',
    id: 'med-vanc',
    status: 'active',
    intent: 'order',
    subject: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    medicationCodeableConcept: { text: 'Vancomycin 1 g IV q12h' },
    dosageInstruction: [{ text: '1 g IV every 12 hours' }],
    authoredOn: '2026-04-15T11:00:00Z',
  },
];

export const shellFixtureConditions: Condition[] = [
  {
    resourceType: 'Condition',
    id: 'cond-sepsis',
    subject: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Septic shock' },
  },
  {
    resourceType: 'Condition',
    id: 'cond-aki',
    subject: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}` },
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Acute kidney injury' },
  },
];

export const shellFixtureTasks: Task[] = [
  {
    resourceType: 'Task',
    id: 'task-shift-report',
    status: 'completed',
    intent: 'order',
    priority: 'urgent',
    code: { text: 'Review AI shift report draft' },
    description: 'Shift report draft is ready for nurse review and signoff.',
    authoredOn: '2026-04-15T14:05:00Z',
    businessStatus: { text: 'review-required' },
    for: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}`, display: 'Casey Morgan' },
    output: [
      {
        type: { text: 'shift-report-draft' },
        valueReference: {
          reference: 'DocumentReference/draft-shift-report-123',
          display: 'Draft Shift Report',
        },
      },
    ],
  },
  {
    resourceType: 'Task',
    id: 'task-med-check',
    status: 'in-progress',
    intent: 'order',
    priority: 'stat',
    code: { text: 'Confirm vasopressor titration' },
    description: 'Agent is preparing a draft recommendation against current hemodynamics.',
    authoredOn: '2026-04-15T13:55:00Z',
    for: { reference: 'Patient/patient-456', display: 'Jordan Lee' },
  },
  {
    resourceType: 'Task',
    id: 'task-gap-review',
    status: 'requested',
    intent: 'order',
    code: { text: 'Review documentation gaps before finalizing handoff' },
    description: 'Missing allergy confirmation and attending acknowledgement still block finalization.',
    authoredOn: '2026-04-15T13:40:00Z',
    priority: 'routine',
    businessStatus: { text: 'gap-review' },
    for: { reference: 'Patient/patient-789', display: 'Alex Rivera' },
  },
  {
    resourceType: 'Task',
    id: 'task-escalation',
    status: 'failed',
    intent: 'order',
    priority: 'urgent',
    code: { text: 'Escalate overdue reassessment' },
    description: 'Previous callback window elapsed. Needs immediate clinician follow-up.',
    authoredOn: '2026-04-15T13:20:00Z',
    statusReason: { text: 'Provider callback overdue' },
    for: { reference: 'Patient/patient-789', display: 'Alex Rivera' },
  },
];

export const shellFixtureDrafts: DocumentReference[] = [
  {
    resourceType: 'DocumentReference',
    id: 'draft-shift-report-123',
    status: 'current',
    docStatus: 'preliminary',
    subject: { reference: `Patient/${SHELL_FIXTURE_PATIENT_ID}`, display: 'Casey Morgan' },
    type: {
      coding: [
        {
          system: 'https://noah-rn.dev/artifacts',
          code: 'shift-report-draft',
          display: 'Draft Shift Report',
        },
      ],
      text: 'Draft Shift Report',
    },
    description: 'Draft Shift Report - requires nurse review',
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          data: 'IyBTaGlmdCBSZXBvcnQKLSBPdmVybmlnaHQgdmFzb3ByZXNzb3IgdGl0cmF0aW9uIGtleSBlZmZlY3QgaXMgbm93IHN0YWJsZQotIExhY3RhdGUgcmVtYWlucyBlbGV2YXRlZCBhbmQgbmVlZHMgcmV2aWV3Ci0gTnVyc2UgYXR0ZXN0YXRpb24gcmVxdWlyZWQgYmVmb3JlIGZpbmFsIGhhbmRvZmY=',
        },
      },
    ],
  },
];
