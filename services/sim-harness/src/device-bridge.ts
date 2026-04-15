import type { SimulationEngine } from "./engine.js";
import type { SimLiveVitalsSnapshot } from "./index.js";

/**
 * LOINC codes for vital sign parameters.
 * These match the codes in docs/FHIR-INTEGRATION.md and clinical-resources/mimic-mappings.json.
 */
const VITAL_LOINC: Record<string, { code: string; display: string; unit: string }> = {
  hr: { code: "8867-4", display: "Heart rate", unit: "/min" },
  rr: { code: "9279-1", display: "Respiratory rate", unit: "/min" },
  spo2: { code: "2708-6", display: "Oxygen saturation in Arterial blood by Pulse oximetry", unit: "%" },
  etco2: { code: "33437-5", display: "End tidal CO2", unit: "mmHg" },
  sbp: { code: "8480-6", display: "Systolic blood pressure", unit: "mmHg" },
  dbp: { code: "8462-4", display: "Diastolic blood pressure", unit: "mmHg" },
  map: { code: "8478-0", display: "Mean blood pressure", unit: "mmHg" },
  temp_c: { code: "8310-5", display: "Body temperature", unit: "Cel" },
};

/** Tag system for distinguishing device-stream vs nurse-charted observations. */
export const OBSERVATION_ORIGIN_SYSTEM = "https://noah-rn.dev/observation-origin";
export const DEVICE_ORIGIN_SYSTEM = "https://noah-rn.dev/device-origin";

/** Thresholds for state-change detection (triggers early write). */
const CHANGE_THRESHOLDS: Record<string, number> = {
  hr: 10,
  rr: 4,
  spo2: 3,
  etco2: 5,
  sbp: 15,
  dbp: 10,
  map: 10,
  temp_c: 0.5,
};

export interface DeviceBridgeOptions {
  /** Patient FHIR ID. */
  patientId: string;
  /** Encounter FHIR ID (created or provided). */
  encounterId: string;
  /** Write cadence in seconds. Default: 60. */
  writeCadenceSeconds?: number;
  /** FHIR writer function — called with a transaction Bundle payload. */
  fhirWriter: (bundle: FhirTransactionBundle) => Promise<WriterResult>;
}

export interface WriterResult {
  success: boolean;
  error?: string;
}

// --- FHIR resource shapes (minimal, for what we produce) ---

export interface FhirTransactionBundle {
  resourceType: "Bundle";
  type: "transaction";
  entry: FhirBundleEntry[];
}

export interface FhirBundleEntry {
  resource: FhirObservation | FhirDevice | FhirEncounter;
  request: { method: "POST" | "PUT"; url: string };
}

export interface FhirObservation {
  resourceType: "Observation";
  status: "preliminary" | "final";
  category: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }> };
  subject: { reference: string };
  encounter: { reference: string };
  device?: { reference: string };
  performer?: Array<{ display: string }>;
  effectiveDateTime: string;
  valueQuantity: { value: number; unit: string; system: string; code: string };
  meta: { tag: Array<{ system: string; code: string }> };
}

export interface FhirDevice {
  resourceType: "Device";
  id?: string;
  status: "active" | "inactive";
  type: { coding: Array<{ system: string; code: string; display: string }> };
  deviceName: Array<{ name: string; type: string }>;
  patient: { reference: string };
  meta: { tag: Array<{ system: string; code: string }> };
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id?: string;
  status: "in-progress" | "finished";
  class: { system: string; code: string; display: string };
  subject: { reference: string };
  period: { start: string; end?: string };
  meta: { tag: Array<{ system: string; code: string }> };
}

/**
 * DeviceBridge acts as the device integration middleware between the
 * SimulationEngine (the "bedside monitor") and Medplum (the "EHR").
 *
 * It writes device-streamed Observations at a configurable cadence,
 * modeling the same two-tier vitals architecture used in real ICU environments.
 *
 * Device-streamed observations have:
 * - status: "preliminary" (not nurse-validated)
 * - device reference (to the simulated bedside monitor)
 * - meta.tag: device-stream
 *
 * Nurse-charted observations are NOT this component's responsibility —
 * those flow through services/clinical-mcp/ when the agent explicitly charts.
 */
export class DeviceBridge {
  readonly patientId: string;
  readonly encounterId: string;
  readonly writeCadenceSeconds: number;

  private _fhirWriter: (bundle: FhirTransactionBundle) => Promise<WriterResult>;
  private _deviceId: string | null = null;
  private _lastWrittenVitals: SimLiveVitalsSnapshot | null = null;
  private _lastWriteTimeMs = 0;
  private _writeCount = 0;
  private _scenarioStartTime: string;

  constructor(options: DeviceBridgeOptions) {
    this.patientId = options.patientId;
    this.encounterId = options.encounterId;
    this.writeCadenceSeconds = options.writeCadenceSeconds ?? 60;
    this._fhirWriter = options.fhirWriter;
    this._scenarioStartTime = new Date().toISOString();
  }

  /** Total observation writes performed. */
  get writeCount(): number {
    return this._writeCount;
  }

  /**
   * Create the FHIR Device and Encounter resources for this simulation.
   * Call once at scenario start before the tick loop.
   */
  async initialize(): Promise<void> {
    this._deviceId = `sim-monitor-${this.encounterId}`;
    this._scenarioStartTime = new Date().toISOString();

    const bundle: FhirTransactionBundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          resource: this._buildDevice(),
          request: { method: "PUT", url: `Device/${this._deviceId}` },
        },
        {
          resource: this._buildEncounter(),
          request: { method: "PUT", url: `Encounter/${this.encounterId}` },
        },
      ],
    };

    await this._fhirWriter(bundle);
  }

  /**
   * Check if a write is due and write if so.
   *
   * Call this on every engine tick. The bridge decides internally
   * whether to write based on cadence and state-change thresholds.
   *
   * @param engine - The simulation engine to read vitals from
   * @param simElapsedMs - Total simulated elapsed time in ms
   * @returns true if a write was performed
   */
  async maybeTick(engine: SimulationEngine, simElapsedMs: number): Promise<boolean> {
    const vitals = engine.getVitals();
    const timeSinceLastWrite = simElapsedMs - this._lastWriteTimeMs;
    const cadenceMs = this.writeCadenceSeconds * 1000;

    const cadenceDue = timeSinceLastWrite >= cadenceMs;
    const stateChanged = this._hasSignificantChange(vitals);

    if (!cadenceDue && !stateChanged) return false;

    await this._writeVitals(vitals, simElapsedMs);
    return true;
  }

  /**
   * Force a write of current vitals regardless of cadence.
   * Useful for scenario end or explicit flush.
   */
  async flush(engine: SimulationEngine, simElapsedMs: number): Promise<void> {
    const vitals = engine.getVitals();
    await this._writeVitals(vitals, simElapsedMs);
  }

  /**
   * Close the encounter (set status to finished).
   */
  async closeEncounter(): Promise<void> {
    const encounter: FhirEncounter = {
      ...this._buildEncounter(),
      status: "finished",
      period: {
        start: this._scenarioStartTime,
        end: new Date().toISOString(),
      },
    };

    const bundle: FhirTransactionBundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: [
        {
          resource: encounter,
          request: { method: "PUT", url: `Encounter/${this.encounterId}` },
        },
      ],
    };

    await this._fhirWriter(bundle);
  }

  /**
   * Build a single device-stream Observation for a vital sign parameter.
   */
  buildObservation(
    param: string,
    value: number,
    effectiveDateTime: string,
  ): FhirObservation {
    const loinc = VITAL_LOINC[param];
    if (!loinc) throw new Error(`Unknown vital parameter: ${param}`);

    return {
      resourceType: "Observation",
      status: "preliminary",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: loinc.code,
            display: loinc.display,
          },
        ],
      },
      subject: { reference: `Patient/${this.patientId}` },
      encounter: { reference: `Encounter/${this.encounterId}` },
      device: this._deviceId
        ? { reference: `Device/${this._deviceId}` }
        : undefined,
      effectiveDateTime,
      valueQuantity: {
        value: Math.round(value * 100) / 100,
        unit: loinc.unit,
        system: "http://unitsofmeasure.org",
        code: loinc.unit,
      },
      meta: {
        tag: [{ system: OBSERVATION_ORIGIN_SYSTEM, code: "device-stream" }],
      },
    };
  }

  // --- Internal ---

  private async _writeVitals(
    vitals: SimLiveVitalsSnapshot,
    simElapsedMs: number,
  ): Promise<void> {
    const effectiveDateTime = new Date(
      new Date(this._scenarioStartTime).getTime() + simElapsedMs,
    ).toISOString();

    const entries: FhirBundleEntry[] = [];
    const vitalsMap: Record<string, number> = {
      hr: vitals.hr,
      rr: vitals.rr,
      spo2: vitals.spo2,
      etco2: vitals.etco2,
      sbp: vitals.sbp,
      dbp: vitals.dbp,
      map: vitals.map,
      temp_c: vitals.temp_c,
    };

    for (const [param, value] of Object.entries(vitalsMap)) {
      entries.push({
        resource: this.buildObservation(param, value, effectiveDateTime),
        request: { method: "POST", url: "Observation" },
      });
    }

    const bundle: FhirTransactionBundle = {
      resourceType: "Bundle",
      type: "transaction",
      entry: entries,
    };

    const result = await this._fhirWriter(bundle);
    if (result.success) {
      this._lastWrittenVitals = vitals;
      this._lastWriteTimeMs = simElapsedMs;
      this._writeCount++;
    }
  }

  private _hasSignificantChange(current: SimLiveVitalsSnapshot): boolean {
    if (!this._lastWrittenVitals) return true; // First write always fires
    const prev = this._lastWrittenVitals;

    return (
      Math.abs(current.hr - prev.hr) >= CHANGE_THRESHOLDS.hr ||
      Math.abs(current.rr - prev.rr) >= CHANGE_THRESHOLDS.rr ||
      Math.abs(current.spo2 - prev.spo2) >= CHANGE_THRESHOLDS.spo2 ||
      Math.abs(current.etco2 - prev.etco2) >= CHANGE_THRESHOLDS.etco2 ||
      Math.abs(current.sbp - prev.sbp) >= CHANGE_THRESHOLDS.sbp ||
      Math.abs(current.dbp - prev.dbp) >= CHANGE_THRESHOLDS.dbp ||
      Math.abs(current.map - prev.map) >= CHANGE_THRESHOLDS.map ||
      Math.abs(current.temp_c - prev.temp_c) >= CHANGE_THRESHOLDS.temp_c
    );
  }

  private _buildDevice(): FhirDevice {
    return {
      resourceType: "Device",
      id: this._deviceId ?? undefined,
      status: "active",
      type: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "86184003",
            display: "Electrocardiographic monitor and target",
          },
        ],
      },
      deviceName: [
        {
          name: "Noah RN Simulated Bedside Monitor",
          type: "user-friendly-name",
        },
      ],
      patient: { reference: `Patient/${this.patientId}` },
      meta: {
        tag: [{ system: DEVICE_ORIGIN_SYSTEM, code: "sim-harness" }],
      },
    };
  }

  private _buildEncounter(): FhirEncounter {
    return {
      resourceType: "Encounter",
      id: this.encounterId,
      status: "in-progress",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "IMP",
        display: "inpatient encounter",
      },
      subject: { reference: `Patient/${this.patientId}` },
      period: { start: this._scenarioStartTime },
      meta: {
        tag: [{ system: DEVICE_ORIGIN_SYSTEM, code: "sim-harness" }],
      },
    };
  }
}
