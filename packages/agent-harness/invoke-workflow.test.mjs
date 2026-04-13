import test from "node:test";
import assert from "node:assert/strict";

import { formatContextSBAR } from "./invoke-workflow.mjs";

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
