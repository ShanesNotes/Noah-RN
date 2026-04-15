# Sim-Harness Vitals Data Flow Architecture

## Purpose

Define how vital signs data flows from the simulation engine through to the FHIR record, modeling the same two-tier architecture used in real ICU environments with bedside monitor integration.

## Clinical reality this models

In a working clinical space (e.g., Corewell Health Grand Rapids running Epic + Philips IntelliVue):

1. **Bedside monitors** continuously stream vital signs to a **device integration middleware** (Capsule MDIS, Cerner CareAware ConnEx, Epic Bridges, etc.)

2. The middleware writes the continuous stream to a **clinical data repository (CDR)** at high temporal resolution — typically every 1–60 seconds depending on configuration and parameter.

3. The **EHR** (Epic, Cerner) can query this CDR to display historical device data at any timestamp. When a nurse navigates to a past time in the vitals flowsheet and adds a time column, the system auto-populates the cells with device-streamed values from that moment.

4. These auto-populated values appear with a **pending/unverified indicator** (Epic uses a triangle icon in the flowsheet cell corner). They are visible but not yet part of the official chart.

5. The nurse can then:
   - **Verify all** — accept the entire column of device-populated values
   - **Verify individual cells** — accept specific values
   - **Edit cells** — override a value (e.g., if the SpO2 was artifacted by motion)
   - **Leave unverified** — values remain in the pending state

6. Only **verified/charted vitals** become part of the official nursing documentation and the permanent medical record.

7. **Waveform data** (ECG strips, pleth, art line traces) is typically NOT stored in the EHR chart. Instead, the monitoring system (e.g., Philips IntelliCenter central station) retains waveforms in its own storage. Clinicians review waveforms on the central station or at the bedside, not in the EHR.

## Architecture mapping to sim-harness

### The patient monitor = sim-harness engine

The `SimulationEngine` IS the patient monitor. It produces continuous vital signs and waveform data at high frequency, just as a Philips IntelliVue or GE CARESCAPE would.

### The device integration middleware = sim-harness FHIR write-back layer

A new component (`src/device-bridge.ts`) acts as the middleware between the simulation engine and Medplum. It:

- Receives vital sign snapshots from the engine on a configurable cadence
- Writes them as FHIR `Observation` resources with a `device` source reference
- Tags them as **device-originated** (not nurse-charted) using FHIR metadata
- Maintains the continuous stream that can be queried retrospectively

### Two tiers of Observation in FHIR

#### Tier 1: Device-streamed Observations

Written automatically by the device bridge on cadence (default: every 60 seconds, or on state change — whichever comes first, per the sim-harness scaffold contract).

```
Observation {
  status: "preliminary"          // NOT final — device data, not yet nurse-validated
  category: vital-signs
  code: LOINC for the vital sign
  device: Reference(Device/sim-monitor-{encounterId})
  subject: Reference(Patient/{patientId})
  encounter: Reference(Encounter/{encounterId})
  effectiveDateTime: simulated timestamp
  meta.tag: [{ system: "https://noah-rn.dev/observation-origin", code: "device-stream" }]
}
```

Key properties:
- `status: "preliminary"` — marks these as unverified device data
- `device` reference — links to a FHIR `Device` resource representing the simulated bedside monitor
- `meta.tag` with `device-stream` — enables clean filtering between device and charted observations
- Written at high frequency — one batch per write cadence tick
- Queryable at any historical timestamp

#### Tier 2: Nurse-charted Observations

Written when the nurse (or Noah-RN agent) explicitly charts/validates vitals.

```
Observation {
  status: "final"                // Nurse-validated, part of the official record
  category: vital-signs
  code: LOINC for the vital sign
  subject: Reference(Patient/{patientId})
  encounter: Reference(Encounter/{encounterId})
  effectiveDateTime: timestamp of the charting moment
  performer: [{ display: "Noah RN Agent" }]   // or the nurse
  meta.tag: [{ system: "https://noah-rn.dev/observation-origin", code: "nurse-charted" }]
}
```

Key properties:
- `status: "final"` — this is validated, official documentation
- `performer` reference — who charted it (the nurse or the agent)
- No `device` reference — the nurse is the source of truth, not the device
- `meta.tag` with `nurse-charted` — clean filtering
- Written only on explicit charting action

### The simulated bedside monitor (FHIR Device)

A `Device` resource is created for each sim encounter to represent the virtual bedside monitor:

```
Device {
  status: "active"
  type: { coding: [{ system: "http://snomed.info/sct", code: "86184003", display: "Electrocardiographic monitor and target" }] }
  deviceName: [{ name: "Noah RN Simulated Bedside Monitor", type: "user-friendly-name" }]
  patient: Reference(Patient/{patientId})
  meta.tag: [{ system: "https://noah-rn.dev/device-origin", code: "sim-harness" }]
}
```

### Waveform storage

Per the clinical reality: waveforms are NOT stored in the FHIR record. They remain in the sim-harness in-memory buffer (the `WaveformBuffer` from Layer 3) and are accessible via the `sim_get_waveform_samples` and `sim_get_waveform_image` MCP tools.

If future requirements justify persistent waveform storage (for review purposes in the simulation context), this would be a separate spec. The overhead concern is real — 60 seconds of 12-lead ECG at 250 Hz = 180,000 float64 samples ≈ 1.4 MB per minute per encounter. For a 15-minute scenario, that's ~21 MB of waveform data. Not prohibitive for simulation, but worth a dedicated spec before building.

### Query patterns

**"Go back to 2000 and see what the monitor showed":**
```
GET /Observation?patient={id}&category=vital-signs&date=2000-01-01T20:00:00&_tag=device-stream&_sort=-date&_count=1
```

**"Show me all nurse-charted vitals for this shift":**
```
GET /Observation?patient={id}&category=vital-signs&_tag=nurse-charted&date=ge2026-04-14T19:00:00&date=le2026-04-15T07:00:00&_sort=date
```

**"Show me the continuous HR trend for the last hour":**
```
GET /Observation?patient={id}&code=8867-4&_tag=device-stream&date=ge{1-hour-ago}&_sort=date
```

## Write cadence

The device bridge writes on the same cadence as a real ICU flowsheet integration:

- **Default: every 60 seconds** — matches typical ICU device integration cadence
- **On state change** — if vitals change by more than a threshold (e.g., HR changes by >10 bpm, SpO2 drops by >3%), write immediately rather than waiting for the next cadence tick
- **Configurable** — the cadence is a constructor parameter, not hardcoded

Each write batches all current vital signs into individual `Observation` resources (one per parameter: HR, RR, SpO2, etc.) in a single FHIR transaction Bundle. This matches how real device integration middleware operates.

## Component boundary

| Component | Responsibility |
|-----------|---------------|
| `SimulationEngine` | Produces vitals + waveforms (the "monitor") |
| `DeviceBridge` (`src/device-bridge.ts`) | Writes device-stream Observations to Medplum on cadence (the "middleware") |
| `services/clinical-mcp/` | Exposes charting tools to the agent; handles nurse-charted Observation writes |
| Medplum | Stores both tiers of Observations; supports historical queries |
| `WaveformBuffer` | Retains waveforms in memory (not written to FHIR) |

The `DeviceBridge` lives in `services/sim-harness/` because it is part of the simulation infrastructure, not the agent-facing boundary. The agent never interacts with the device bridge directly — it sees Observations in Medplum (via `clinical-mcp`) just as it would in a real EHR.

## What this spec does NOT cover

- The nurse-charting workflow UX (pending indicator, verify-all button) — that is a future `apps/nursing-station/` or `apps/clinician-dashboard/` concern
- Waveform persistent storage — deferred, needs its own spec if pursued
- Multi-patient monitor assignment (nurse has 4-6 patients) — future work
- Alarm/alert generation from device data — future work
- The actual `services/clinical-mcp/` charting tool implementation — that is clinical-mcp's scope

## References

- `docs/foundations/sim-harness-scaffold.md` — Layer 4 (FHIR write-back)
- `docs/foundations/sim-harness-runtime-access-contract.md` — write cadence discussion
- `docs/foundations/sim-harness-waveform-vision-contract.md` — waveform buffer retention
- `docs/FHIR-INTEGRATION.md` — Medplum infrastructure and LOINC mappings
- `services/clinical-mcp/src/fhir/writes.ts` — existing FHIR write surface
- `services/clinical-mcp/src/fhir/client.ts` — existing FHIR client with auth
- IHE PCD (Patient Care Device) Technical Framework — Device Enterprise Communication (DEC) profile
- HL7 FHIR R4 Observation resource — vital-signs category, device reference, preliminary vs final status
