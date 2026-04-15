import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../engine.js";
import { loadScenario } from "../scenario.js";

describe("SimulationEngine", () => {
  const baseline = loadScenario("nsr-baseline.json");
  const pneumo = loadScenario("tension-pneumothorax.json");

  function createEngine(scenarioFile: string) {
    const scenario =
      scenarioFile === "nsr-baseline.json" ? baseline : pneumo;
    return new SimulationEngine(scenario, {
      clockOptions: { mode: "frozen" },
      sampleRateHz: 250,
    });
  }

  describe("NSR baseline scenario", () => {
    it("starts with correct vitals", () => {
      const engine = createEngine("nsr-baseline.json");
      const vitals = engine.getVitals();
      expect(vitals.hr).toBe(72);
      expect(vitals.rr).toBe(16);
      expect(vitals.spo2).toBe(98);
      expect(vitals.rhythm_label).toBe("NSR");
    });

    it("vitals remain stable after 60 seconds", () => {
      const engine = createEngine("nsr-baseline.json");
      // Tick 60 seconds in 1-second increments
      for (let i = 0; i < 60; i++) {
        engine.tick(1000);
      }
      const vitals = engine.getVitals();
      expect(vitals.hr).toBe(72);
      expect(vitals.spo2).toBe(98);
      expect(vitals.sbp).toBe(120);
    });

    it("populates waveform buffer after ticking", () => {
      const engine = createEngine("nsr-baseline.json");
      engine.tick(5000); // 5 seconds
      const samples = engine.getWaveformSamples(["II", "V1"], 5);
      expect(samples.leads["II"].length).toBe(1250); // 5s × 250 Hz
      expect(samples.leads["V1"].length).toBe(1250);
      expect(samples.sample_rate_hz).toBe(250);
    });

    it("getEncounterView returns correct shape", () => {
      const engine = createEngine("nsr-baseline.json");
      engine.tick(1000);
      const view = engine.getEncounterView();
      expect(view.scenario_id).toBe("nsr-baseline");
      expect(view.scenario_name).toBe("Stable NSR Baseline");
      expect(view.active_drugs).toEqual([]);
      expect(view.active_interventions).toEqual([]);
    });

    it("getScenarioState returns markdown and event history", () => {
      const engine = createEngine("nsr-baseline.json");
      engine.tick(1000);
      const state = engine.getScenarioState();
      expect(state.summary_markdown).toContain("Stable NSR Baseline");
      expect(state.event_history.length).toBeGreaterThanOrEqual(1);
    });

    it("getWaveformImage returns valid SVG response", () => {
      const engine = createEngine("nsr-baseline.json");
      engine.tick(3000);
      const image = engine.getWaveformImage(["II"], 3);
      expect(image.format).toBe("svg");
      expect(image.sweep_speed_mm_per_s).toBe(25);
      const svg = Buffer.from(image.image_bytes, "base64").toString("utf-8");
      expect(svg).toContain("<svg");
    });
  });

  describe("Tension pneumothorax scenario", () => {
    it("starts stable", () => {
      const engine = createEngine("tension-pneumothorax.json");
      engine.tick(1000); // 1 second — process t=0 events
      const vitals = engine.getVitals();
      expect(vitals.hr).toBe(78);
      expect(vitals.spo2).toBe(99);
      expect(vitals.rhythm_label).toBe("NSR");
    });

    it("vitals begin deteriorating after 3 minutes", () => {
      const engine = createEngine("tension-pneumothorax.json");
      // Tick to 3.5 minutes (past the t=3 event, mid-transition)
      engine.tick(3.5 * 60 * 1000);
      const vitals = engine.getVitals();
      // HR should be rising from 78 toward 110
      expect(vitals.hr).toBeGreaterThan(78);
      // SpO2 should be dropping from 99 toward 92
      expect(vitals.spo2).toBeLessThan(99);
    });

    it("vitals severely deteriorated at 5 minutes", () => {
      const engine = createEngine("tension-pneumothorax.json");
      // Tick to 5.5 minutes (past second deterioration event)
      engine.tick(5.5 * 60 * 1000);
      const vitals = engine.getVitals();
      // HR should be climbing toward 140+
      expect(vitals.hr).toBeGreaterThan(110);
      // SpO2 should be dropping below 92
      expect(vitals.spo2).toBeLessThan(92);
      // SBP should be dropping
      expect(vitals.sbp).toBeLessThan(100);
    });

    it("rhythm switches to VTach at 6 minutes", () => {
      const engine = createEngine("tension-pneumothorax.json");
      engine.tick(6.1 * 60 * 1000);
      expect(engine.rhythmId).toBe("vtach");
      const vitals = engine.getVitals();
      expect(vitals.rhythm_label).toBe("VTach");
    });

    it("waveform changes after rhythm switch", () => {
      const engine = createEngine("tension-pneumothorax.json");

      // Generate some NSR waveform
      engine.tick(2 * 60 * 1000);
      const nsrSamples = engine.getWaveformSamples(["II"], 2);
      const nsrPeak = Math.max(...nsrSamples.leads["II"].map(Math.abs));

      // Reset and tick past rhythm switch
      engine.reset();
      engine.tick(7 * 60 * 1000);
      const vtachSamples = engine.getWaveformSamples(["II"], 2);
      const vtachPeak = Math.max(...vtachSamples.leads["II"].map(Math.abs));

      // VTach should have higher amplitude
      expect(vtachPeak).toBeGreaterThan(nsrPeak);
    });

    it("event history accumulates correctly", () => {
      const engine = createEngine("tension-pneumothorax.json");
      engine.tick(4 * 60 * 1000);
      const state = engine.getScenarioState();
      // Should have fired t=0, t=2, t=3 events
      expect(state.event_history.length).toBeGreaterThanOrEqual(3);
    });

    it("upcoming visible events are filtered correctly", () => {
      const engine = createEngine("tension-pneumothorax.json");
      engine.tick(1000); // 1 second in — past t=0 events
      const view = engine.getEncounterView();
      // Only events with visible_to_agent=true that haven't fired yet
      if (view.upcoming_scheduled_events_visible_to_agent) {
        for (const e of view.upcoming_scheduled_events_visible_to_agent) {
          expect(e.minute).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("reset", () => {
    it("restores initial state", () => {
      const engine = createEngine("tension-pneumothorax.json");
      engine.tick(7 * 60 * 1000);
      expect(engine.rhythmId).toBe("vtach");

      engine.reset();
      expect(engine.rhythmId).toBe("nsr");
      expect(engine.clock.elapsedMs).toBe(0);
      const vitals = engine.getVitals();
      expect(vitals.hr).toBe(78);
      expect(vitals.spo2).toBe(99);
    });
  });

  describe("encounter isolation", () => {
    it("two engines run independently", () => {
      const engineA = createEngine("nsr-baseline.json");
      const engineB = createEngine("tension-pneumothorax.json");

      engineA.tick(60_000);
      engineB.tick(6 * 60 * 1000);

      expect(engineA.getVitals().hr).toBe(72);
      expect(engineB.rhythmId).toBe("vtach");
    });
  });

  describe("wall-clock mode", () => {
    it("uses wall time without double-counting explicit tick delta", async () => {
      const engine = new SimulationEngine(baseline, {
        clockOptions: { mode: "wall-clock" },
        sampleRateHz: 250,
      });

      engine.start();
      await new Promise((resolve) => setTimeout(resolve, 60));
      engine.tick(1000);

      const elapsedMs = engine.clock.elapsedMs;
      expect(elapsedMs).toBeGreaterThanOrEqual(40);
      expect(elapsedMs).toBeLessThan(200);
    });
  });
});
