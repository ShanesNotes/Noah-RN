import test from "node:test";
import assert from "node:assert/strict";

import { buildShiftReportRendererInput, formatContextSBAR, formatPatientIdOutput, renderShiftReportFromPatientContext } from "./shift-report-renderer.mjs";
import { buildRendererLaneCoverageFromContextPlan } from "../../.noah-pi-runtime/extensions/shared/noah-runtime.ts";

test("formatContextSBAR renders device entries and truncation metadata", () => {
  const output = formatContextSBAR({
    patient: {
      id: "patient-123",
      name: "Jamie Doe",
      dob: "1970-01-01",
      gender: "female",
    },
    timeline: [
      {
        type: "observation",
        subtype: "vital",
        resource: {
          resourceType: "Observation",
          code: { text: "HR" },
          valueQuantity: { value: 88, unit: "bpm" },
        },
        timestamp: "2026-04-12T00:00:00Z",
        relativeTime: "T-0m",
        relativeMinutes: 0,
      },
      {
        type: "device",
        resource: {
          resourceType: "Device",
          deviceName: [{ name: "R IJ central line" }],
          type: { text: "Central line" },
        },
        timestamp: "",
        relativeTime: "T-unknown",
        relativeMinutes: Number.MAX_SAFE_INTEGER,
      },
    ],
    trends: [],
    gaps: ["[GAP: Lines/Access] No device data (IV lines, central lines, airway) found"],
    assembledAt: "2026-04-12T20:00:00.000Z",
    sources: ["Patient", "Device"],
    tokenEstimate: 1000,
    budgetTruncated: true,
    truncatedCount: 3,
  });

  assert.match(output, /LINES & ACCESS/);
  assert.match(output, /R IJ central line \(timing unknown\)/);
  assert.match(output, /Context budget truncated 3 older entries/);
  assert.doesNotMatch(output, /\[Data not available from current context assembly\]/);
  assert.equal(output.match(/Context budget truncated 3 older entries/g)?.length, 1);
});

test("formatPatientIdOutput includes context-lane provenance, bounded evidence, and trigger suggestions", () => {
  const output = formatPatientIdOutput(
    {
      name: "shift-report",
      source_path: "packages/workflows/shift-report/SKILL.md",
    },
    "patient-123",
    {
      patient: {
        id: "patient-123",
        name: "Jamie Doe",
        dob: "1970-01-01",
        gender: "female",
      },
      timeline: [
        {
          type: "observation",
          subtype: "vital",
          resource: {
            resourceType: "Observation",
            code: { text: "Mean blood pressure", coding: [{ code: "8478-0", display: "Mean blood pressure" }] },
            valueQuantity: { value: 59, unit: "mmHg" },
          },
          timestamp: "2026-04-12T20:00:00Z",
          relativeTime: "T-0m",
          relativeMinutes: 0,
        },
        {
          type: "observation",
          subtype: "lab",
          resource: {
            resourceType: "Observation",
            code: { text: "Lactate", coding: [{ code: "2524-7", display: "Lactate" }] },
            valueQuantity: { value: 3.8, unit: "mmol/L" },
          },
          timestamp: "2026-04-12T19:30:00Z",
          relativeTime: "T-30m",
          relativeMinutes: 30,
        },
        {
          type: "note",
          resource: {
            resourceType: "DocumentReference",
            type: { coding: [{ display: "Progress note" }] },
            description: "ICU progress note",
          },
          timestamp: "2026-04-12T19:00:00Z",
          relativeTime: "T-1h",
          relativeMinutes: 60,
        },
      ],
      trends: [],
      gaps: ["[GAP: Lines/Access] No device data (IV lines, central lines, airway) found"],
      assembledAt: "2026-04-12T20:00:00.000Z",
      sources: ["Patient", "Observation(vital-signs)", "Observation(laboratory)", "DocumentReference", "Device"],
      tokenEstimate: 100,
      budgetTruncated: false,
      truncatedCount: 0,
    },
    {
      laneCoverage: {
        'ehr/chart': 'present',
        memory: 'available but intentionally omitted',
        'clinical-resources': 'available but intentionally omitted',
        'patient-monitor/simulation': 'available but not used for this chart-driven draft',
      },
    },
  );

  assert.match(output, /^Summary/m);
  assert.match(output, /^Evidence/m);
  assert.match(output, /^Confidence/m);
  assert.match(output, /Context lane coverage:/);
  assert.match(output, /- ehr\/chart: present/);
  assert.match(output, /- memory: available but intentionally omitted/);
  assert.match(output, /- clinical-resources: available but intentionally omitted/);
  assert.match(output, /- patient-monitor\/simulation: available but not used for this chart-driven draft/);
  assert.match(output, /Latest MAP: 59 mmHg \(T-0m\)/);
  assert.match(output, /Latest lactate: 3.8 mmol\/L \(T-30m\)/);
  assert.match(output, /Provider note context present: yes \(T-1h\)/);
  assert.match(output, /Lines\/access context present: no — explicit device gap in assembled context\./);
  assert.match(output, /Based on MAP < 65 mmHg: consider reviewing sepsis bundle or ACLS\./);
  assert.match(output, /Based on Lactate > 2 mmol\/L: consider reviewing sepsis bundle\./);
  assert.match(output, /noah-rn v0.2 \| shift-report v1.1.0 \| clinical-mcp patient context/);
  assert.match(output, /Verify all findings against your assessment and facility policies\./);
});

test("buildShiftReportRendererInput and renderShiftReportFromPatientContext preserve lane coverage contract", () => {
  const input = buildShiftReportRendererInput(
    {
      name: 'shift-report',
      source_path: 'packages/workflows/shift-report/SKILL.md',
    },
    'patient-123',
    {
      patient: {
        id: 'patient-123',
        name: 'Jamie Doe',
        dob: '1970-01-01',
        gender: 'female',
      },
      timeline: [],
      trends: [],
      gaps: [],
      assembledAt: '2026-04-12T20:00:00.000Z',
      sources: ['Patient'],
      tokenEstimate: 100,
      budgetTruncated: false,
      truncatedCount: 0,
    },
    {
      laneCoverage: {
        'ehr/chart': 'present',
        memory: 'omitted',
        'clinical-resources': 'omitted',
        'patient-monitor/simulation': 'omitted',
      },
    },
  );

  assert.deepEqual(input.laneCoverage, {
    'ehr/chart': 'present',
    memory: 'omitted',
    'clinical-resources': 'omitted',
    'patient-monitor/simulation': 'omitted',
  });

  const output = renderShiftReportFromPatientContext(input);
  assert.match(output, /- memory: omitted/);
  assert.match(output, /- clinical-resources: omitted/);
});

test("buildRendererLaneCoverageFromContextPlan maps Noah context plans into renderer lane coverage", () => {
  const coverage = buildRendererLaneCoverageFromContextPlan({
    activePatientId: 'patient-123',
    availableContext: ['active_patient'],
    verdict: {
      executable: true,
      patientBound: true,
      acceptedInputModes: ['patient_id'],
      satisfiedInputModes: ['patient_id'],
      missingInputModes: [],
      missingRequiredContext: [],
      clarificationPrompt: 'Executable with current context.',
    },
    lanes: {},
    lanePlan: [
      { lane: 'ehr', available: true },
      { lane: 'memory', available: true },
      { lane: 'clinical-resources', available: false },
      { lane: 'patient-monitor', available: true },
    ],
    nextActions: [],
  });

  assert.deepEqual(coverage, {
    'ehr/chart': 'available but not yet assembled in current turn',
    memory: 'available but not yet assembled in current turn',
    'clinical-resources': 'required but unavailable in current workspace',
    'patient-monitor/simulation': 'available but not yet assembled in current turn',
  });
});

test("formatContextSBAR falls back to the lines gap when no devices exist", () => {
  const output = formatContextSBAR({
    patient: {
      id: "patient-456",
      name: "Alex Doe",
      dob: "1975-02-02",
      gender: "male",
    },
    timeline: [],
    trends: [],
    gaps: ["[GAP: Lines/Access] No device data (IV lines, central lines, airway) found"],
    assembledAt: "2026-04-12T20:00:00.000Z",
    sources: ["Patient"],
    tokenEstimate: 100,
    budgetTruncated: false,
    truncatedCount: 0,
  });

  assert.match(output, /\[GAP: Lines\/Access\] No device data/);
  assert.equal(output.match(/\[GAP: Lines\/Access\] No device data/g)?.length, 1);
});
