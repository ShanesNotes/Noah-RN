import { describe, it, expect } from "vitest";
import { DeviceBridge, OBSERVATION_ORIGIN_SYSTEM } from "../device-bridge.js";
import { SimulationEngine } from "../engine.js";
import { loadScenario } from "../scenario.js";
import type { FhirTransactionBundle, WriterResult } from "../device-bridge.js";

function createMockWriter() {
  const writes: FhirTransactionBundle[] = [];
  const writer = async (bundle: FhirTransactionBundle): Promise<WriterResult> => {
    writes.push(bundle);
    return { success: true };
  };
  return { writer, writes };
}

function createEngine(scenarioFile: string) {
  const scenario = loadScenario(scenarioFile);
  return new SimulationEngine(scenario, {
    clockOptions: { mode: "frozen" },
    sampleRateHz: 250,
  });
}

describe("DeviceBridge", () => {
  describe("initialization", () => {
    it("creates Device and Encounter resources", async () => {
      const { writer, writes } = createMockWriter();
      const bridge = new DeviceBridge({
        patientId: "test-patient-1",
        encounterId: "test-encounter-1",
        fhirWriter: writer,
      });

      await bridge.initialize();

      expect(writes.length).toBe(1);
      const bundle = writes[0];
      expect(bundle.type).toBe("transaction");
      expect(bundle.entry.length).toBe(2);

      // Device
      const deviceEntry = bundle.entry.find(
        (e) => e.resource.resourceType === "Device",
      );
      expect(deviceEntry).toBeTruthy();
      expect(deviceEntry!.resource.resourceType).toBe("Device");
      expect(deviceEntry!.request.method).toBe("PUT");

      // Encounter
      const encounterEntry = bundle.entry.find(
        (e) => e.resource.resourceType === "Encounter",
      );
      expect(encounterEntry).toBeTruthy();
      expect((encounterEntry!.resource as any).status).toBe("in-progress");
    });
  });

  describe("cadence-based writing", () => {
    it("writes on first tick (no previous write)", async () => {
      const { writer, writes } = createMockWriter();
      const engine = createEngine("nsr-baseline.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 60,
        fhirWriter: writer,
      });

      engine.tick(1000); // 1 second
      const wrote = await bridge.maybeTick(engine, 1000);

      expect(wrote).toBe(true);
      expect(writes.length).toBe(1);
      // Should have 8 vital sign observations
      expect(writes[0].entry.length).toBe(8);
    });

    it("does not write before cadence is due", async () => {
      const { writer, writes } = createMockWriter();
      const engine = createEngine("nsr-baseline.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 60,
        fhirWriter: writer,
      });

      // First write at t=1s
      engine.tick(1000);
      await bridge.maybeTick(engine, 1000);
      expect(writes.length).toBe(1);

      // 30 seconds later — not due yet (stable vitals, no state change)
      engine.tick(30_000);
      const wrote = await bridge.maybeTick(engine, 31_000);
      expect(wrote).toBe(false);
      expect(writes.length).toBe(1);
    });

    it("writes when cadence is due", async () => {
      const { writer, writes } = createMockWriter();
      const engine = createEngine("nsr-baseline.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 60,
        fhirWriter: writer,
      });

      // First write
      engine.tick(1000);
      await bridge.maybeTick(engine, 1000);

      // 60 seconds later — cadence is due
      engine.tick(60_000);
      const wrote = await bridge.maybeTick(engine, 61_000);
      expect(wrote).toBe(true);
      expect(writes.length).toBe(2);
    });
  });

  describe("state-change detection", () => {
    it("writes early when vitals change significantly", async () => {
      const { writer, writes } = createMockWriter();
      const engine = createEngine("tension-pneumothorax.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 60,
        fhirWriter: writer,
      });

      // First write at t=1s (stable)
      engine.tick(1000);
      await bridge.maybeTick(engine, 1000);
      expect(writes.length).toBe(1);

      // Tick to 4 minutes — vitals are changing (t=3 event fired, mid-transition)
      engine.tick(3.5 * 60 * 1000);
      const wrote = await bridge.maybeTick(engine, 3.5 * 60 * 1000 + 1000);
      // Should trigger early write due to significant HR/SpO2 change
      expect(wrote).toBe(true);
      expect(writes.length).toBe(2);
    });
  });

  describe("observation format", () => {
    it("produces correct FHIR Observation shape", () => {
      const { writer } = createMockWriter();
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        fhirWriter: writer,
      });

      const obs = bridge.buildObservation("hr", 72, "2026-04-14T20:00:00Z");

      expect(obs.resourceType).toBe("Observation");
      expect(obs.status).toBe("preliminary"); // Device-streamed = preliminary
      expect(obs.category[0].coding[0].code).toBe("vital-signs");
      expect(obs.code.coding[0].system).toBe("http://loinc.org");
      expect(obs.code.coding[0].code).toBe("8867-4"); // HR LOINC
      expect(obs.subject.reference).toBe("Patient/p1");
      expect(obs.encounter.reference).toBe("Encounter/e1");
      expect(obs.valueQuantity.value).toBe(72);
      expect(obs.valueQuantity.unit).toBe("/min");
      expect(obs.meta.tag[0].system).toBe(OBSERVATION_ORIGIN_SYSTEM);
      expect(obs.meta.tag[0].code).toBe("device-stream");
    });

    it("all vital parameters have LOINC mappings", () => {
      const { writer } = createMockWriter();
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        fhirWriter: writer,
      });

      const params = ["hr", "rr", "spo2", "etco2", "sbp", "dbp", "map", "temp_c"];
      for (const param of params) {
        const obs = bridge.buildObservation(param, 100, "2026-04-14T20:00:00Z");
        expect(obs.code.coding[0].system).toBe("http://loinc.org");
        expect(obs.code.coding[0].code).toBeTruthy();
      }
    });

    it("throws for unknown vital parameter", () => {
      const { writer } = createMockWriter();
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        fhirWriter: writer,
      });

      expect(() => bridge.buildObservation("bogus", 42, "2026-04-14T20:00:00Z")).toThrow(
        "Unknown vital parameter",
      );
    });
  });

  describe("flush and close", () => {
    it("flush forces a write", async () => {
      const { writer, writes } = createMockWriter();
      const engine = createEngine("nsr-baseline.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 3600, // very long cadence
        fhirWriter: writer,
      });

      engine.tick(5000);
      await bridge.flush(engine, 5000);
      expect(writes.length).toBe(1);
      expect(writes[0].entry.length).toBe(8);
    });

    it("closeEncounter sets status to finished", async () => {
      const { writer, writes } = createMockWriter();
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        fhirWriter: writer,
      });

      await bridge.initialize();
      await bridge.closeEncounter();

      expect(writes.length).toBe(2);
      const closeBundle = writes[1];
      const encounter = closeBundle.entry[0].resource as any;
      expect(encounter.status).toBe("finished");
      expect(encounter.period.end).toBeTruthy();
    });
  });

  describe("writeCount tracking", () => {
    it("increments on successful writes", async () => {
      const { writer } = createMockWriter();
      const engine = createEngine("nsr-baseline.json");
      const bridge = new DeviceBridge({
        patientId: "p1",
        encounterId: "e1",
        writeCadenceSeconds: 10,
        fhirWriter: writer,
      });

      expect(bridge.writeCount).toBe(0);

      engine.tick(1000);
      await bridge.maybeTick(engine, 1000);
      expect(bridge.writeCount).toBe(1);

      engine.tick(10_000);
      await bridge.maybeTick(engine, 11_000);
      expect(bridge.writeCount).toBe(2);
    });
  });
});
