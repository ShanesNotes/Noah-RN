#!/usr/bin/env node
/**
 * Demo: run a tension pneumothorax scenario against live Medplum.
 *
 * Usage:
 *   cd services/sim-harness
 *   npx tsx src/demo.ts [patientId]
 *
 * If no patientId is provided, uses a placeholder ID.
 * Requires Medplum to be running at the configured URL.
 */

import { SimulationEngine } from "./engine.js";
import { DeviceBridge } from "./device-bridge.js";
import { loadScenario } from "./scenario.js";
import { createMedplumWriter } from "./medplum-writer.js";
import { simConfig } from "./config.js";

const patientId = process.argv[2] ?? "sim-demo-patient";
const scenario = loadScenario("tension-pneumothorax.json");

const engine = new SimulationEngine(scenario, {
  clockOptions: { mode: "frozen" },
  sampleRateHz: 250,
  encounterId: `sim-demo-${Date.now()}`,
});

const writer = createMedplumWriter();
const bridge = new DeviceBridge({
  patientId,
  encounterId: engine.encounterId,
  writeCadenceSeconds: simConfig.writeCadenceSeconds,
  fhirWriter: writer,
});

async function run() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Noah RN Simulation Demo                        ║");
  console.log("║  Scenario: Tension Pneumothorax                 ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Patient:    ${patientId}`);
  console.log(`  Encounter:  ${engine.encounterId}`);
  console.log(`  FHIR:       ${simConfig.fhir.serverUrl}`);
  console.log(`  Cadence:    ${simConfig.writeCadenceSeconds}s`);
  console.log();

  // Initialize — create Device + Encounter in Medplum
  console.log("▸ Initializing Device and Encounter...");
  try {
    await bridge.initialize();
    console.log("  ✓ Device and Encounter created\n");
  } catch (err) {
    console.error("  ✗ Failed to initialize:", (err as Error).message);
    console.error("\n  Is Medplum running at", simConfig.fhir.serverUrl, "?");
    process.exit(1);
  }

  // Run the scenario in 10-second increments
  const stepMs = 10_000;
  const totalMs = scenario.estimated_duration_minutes * 60 * 1000;
  let simElapsedMs = 0;

  while (simElapsedMs < totalMs) {
    engine.tick(stepMs);
    simElapsedMs += stepMs;

    const vitals = engine.getVitals();
    const min = (simElapsedMs / 60_000).toFixed(1);

    // Log vitals
    const line = [
      `t=${min.padStart(5)}min`,
      `HR=${String(vitals.hr).padStart(3)}`,
      `SpO2=${String(vitals.spo2).padStart(3)}%`,
      `BP=${vitals.sbp}/${vitals.dbp}`,
      `MAP=${vitals.map}`,
      `RR=${vitals.rr}`,
      `Rhythm=${vitals.rhythm_label}`,
    ].join("  ");

    const wrote = await bridge.maybeTick(engine, simElapsedMs);
    if (wrote) {
      console.log(`  ${line}  ◀ WRITE #${bridge.writeCount}`);
    } else {
      console.log(`  ${line}`);
    }
  }

  // Final flush
  await bridge.flush(engine, simElapsedMs);
  console.log();

  // Close encounter
  console.log("▸ Closing encounter...");
  await bridge.closeEncounter();
  console.log("  ✓ Encounter closed\n");

  // Summary
  console.log("╔══════════════════════════════════════════════════╗");
  console.log(`║  Complete: ${bridge.writeCount} writes (${bridge.writeCount * 8} observations)`.padEnd(51) + "║");
  console.log("╚══════════════════════════════════════════════════╝");
}

run().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
